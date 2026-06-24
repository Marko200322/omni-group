import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import logger from '../../utils/logger';
import { PhaseLaunchController } from './controller/phase-launch.controller';
import { SetPhaseDto, PdfLegalSignoffDto } from './dto/phase-launch.dto';
import { getEffectivePhaseForBoot } from './middleware/phase-activation.middleware';
import { PhaseLaunchRepository } from './repository/phase-launch.repository';
import { PhaseBootService } from './service/phase-boot.service';
import { parsePhase } from '../../core/phase-env';

export class PhaseLaunchModule implements IModule {
  name = 'Phase Launch';
  slug = 'phase-launch';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private readonly controller = new PhaseLaunchController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    const bootService = new PhaseBootService();
    let bootPhase = getEffectivePhaseForBoot();

    if (process.env.PHASE?.trim()) {
      try {
        const repo = new PhaseLaunchRepository();
        bootPhase = getEffectivePhaseForBoot();
        await repo.ensureFlag();
        await repo.setFlag(bootPhase, 'Boot sync from process.env.PHASE');
      } catch (error) {
        logger.warn('Phase env boot sync skipped', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else {
      try {
        const repo = new PhaseLaunchRepository();
        await repo.ensureFlag();
        const { rows } = await repo.getFlag();
        const config = (rows[0]?.config ?? {}) as Record<string, unknown>;
        bootPhase = parsePhase(String(config.current_phase ?? 'v1')) ?? 'v1';
      } catch {
        bootPhase = 'v1';
      }
    }

    try {
      const boot = await bootService.runBootSequence(bootPhase);
      logger.info('Phase boot sequence complete', {
        phase: bootPhase,
        edgeSwarmEnabled: boot.edgeSwarmEnabled,
        k8sVisionEnabled: boot.k8sVisionEnabled,
        completedPhases: boot.completedPhases,
      });
    } catch (error) {
      logger.error('Phase boot sequence failed — server may run with reduced vision features', {
        phase: bootPhase,
        error: error instanceof Error ? error.message : String(error),
      });
      if (process.env.NODE_ENV === 'production' && bootPhase === 'v6') {
        throw error;
      }
    }

    this.router.get(
      '/',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.get
    );
    this.router.post('/', authenticate, requireAdmin, validateQuery(StrictEmptyQueryDto), validateBody(SetPhaseDto), this.controller.set);
    this.router.get(
      '/boot-status',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.bootStatus
    );
    this.router.get(
      '/pdf-signoff',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getPdfSignoff
    );
    this.router.post(
      '/pdf-signoff',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(PdfLegalSignoffDto),
      this.controller.pdfSignoff
    );
  }
}
