import { comparePhase, parsePhase, type Phase } from '../../../core/phase-env';
import {
  edgeSwarmProfileCap,
  manifestStepsUpTo,
  phaseRequiresPdfSignoff,
  PHASE_BOOT_MANIFEST,
} from '../../../core/phase-boot-manifest';
import { PhaseLaunchRepository } from '../repository/phase-launch.repository';
import logger from '../../../utils/logger';

export type BootState = {
  completedPhases: Phase[];
  edgeSwarmEnabled: boolean;
  edgeSwarmMaxProfiles: number;
  k8sVisionEnabled: boolean;
  pdfLegalRequired: boolean;
  lastBootAt: string | null;
};

export type PdfLegalSignoff = {
  signed: boolean;
  signedAt: string | null;
  signedByUserId: string | null;
  trackerVersion: string | null;
  notes: string;
};

export class PhaseBootService {
  private readonly repo = new PhaseLaunchRepository();

  async getBootState(): Promise<{ phase: Phase; boot: BootState; manifest: typeof PHASE_BOOT_MANIFEST }> {
    await this.repo.ensureFlag();
    const config = await this.repo.getFullConfig();
    const phase = parsePhase(String(config.current_phase ?? 'v1')) ?? 'v1';
    const bootRaw = (config.boot ?? {}) as Record<string, unknown>;
    return {
      phase,
      boot: {
        completedPhases: Array.isArray(bootRaw.completedPhases)
          ? (bootRaw.completedPhases as Phase[])
          : [],
        edgeSwarmEnabled: Boolean(bootRaw.edgeSwarmEnabled),
        edgeSwarmMaxProfiles: Number(bootRaw.edgeSwarmMaxProfiles ?? edgeSwarmProfileCap(phase)),
        k8sVisionEnabled: Boolean(bootRaw.k8sVisionEnabled),
        pdfLegalRequired: phaseRequiresPdfSignoff(phase),
        lastBootAt: bootRaw.lastBootAt ? String(bootRaw.lastBootAt) : null,
      },
      manifest: PHASE_BOOT_MANIFEST,
    };
  }

  async getPdfLegalSignoff(): Promise<PdfLegalSignoff> {
    await this.repo.ensureFlag();
    const config = await this.repo.getFullConfig();
    const raw = (config.pdfLegalSignoff ?? {}) as Record<string, unknown>;
    return {
      signed: Boolean(raw.signed),
      signedAt: raw.signedAt ? String(raw.signedAt) : null,
      signedByUserId: raw.signedByUserId ? String(raw.signedByUserId) : null,
      trackerVersion: raw.trackerVersion ? String(raw.trackerVersion) : null,
      notes: raw.notes ? String(raw.notes) : '',
    };
  }

  async recordPdfLegalSignoff(input: {
    actorUserId: string;
    trackerVersion: string;
    notes?: string;
  }): Promise<PdfLegalSignoff> {
    await this.repo.ensureFlag();
    const signoff: PdfLegalSignoff = {
      signed: true,
      signedAt: new Date().toISOString(),
      signedByUserId: input.actorUserId,
      trackerVersion: input.trackerVersion,
      notes: input.notes ?? '',
    };
    await this.repo.mergeConfig({ pdfLegalSignoff: signoff });
    logger.info('PDF legal alignment sign-off recorded', {
      trackerVersion: signoff.trackerVersion,
      actorUserId: input.actorUserId,
    });
    return signoff;
  }

  /**
   * Paljenje sistema kroz phase-launch: v1 → target, redom.
   * v6 zahteva PDF legal sign-off (osim DEPLOY_BOOT_SKIP_PDF_SIGNOFF=1 u dev).
   */
  async runBootSequence(targetPhase: Phase): Promise<BootState> {
    await this.repo.ensureFlag();
    const skipPdf = process.env.DEPLOY_BOOT_SKIP_PDF_SIGNOFF === '1';

    if (phaseRequiresPdfSignoff(targetPhase) && !skipPdf) {
      const signoff = await this.getPdfLegalSignoff();
      if (!signoff.signed) {
        throw new Error(
          `Phase ${targetPhase} requires PDF legal sign-off before boot. POST /api/v1/phase-launch/pdf-signoff first.`
        );
      }
    }

    const completed: Phase[] = [];
    for (const step of manifestStepsUpTo(targetPhase)) {
      completed.push(step.phase);
      logger.info('Phase boot step', {
        phase: step.phase,
        label: step.label,
        activates: step.activates,
      });
    }

    const edgeSwarmEnabled = comparePhase(targetPhase, 'v6') >= 0;
    const k8sVisionEnabled = comparePhase(targetPhase, 'v5') >= 0;
    const boot: BootState = {
      completedPhases: completed,
      edgeSwarmEnabled,
      edgeSwarmMaxProfiles: edgeSwarmProfileCap(targetPhase),
      k8sVisionEnabled,
      pdfLegalRequired: phaseRequiresPdfSignoff(targetPhase),
      lastBootAt: new Date().toISOString(),
    };

    await this.repo.mergeConfig({ boot });
    return boot;
  }
}
