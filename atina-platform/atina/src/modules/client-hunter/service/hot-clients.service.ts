import type { JobBoardPlatform } from '../data/job-board-catalog';
import { getJobBoardPlatform } from '../data/job-board-catalog';
import { computeJobHuntEconomics } from '../lib/job-hunt-copy';
import { HotClientsRepository, type InsertHotClientInput } from '../repository/hot-clients.repository';

export type HotClientHeatInput = {
  userId: string;
  platformSlug: string;
  locale?: string;
  region?: string;
  companyName?: string | null;
  roleTitle?: string | null;
  city?: string | null;
  jobUrl?: string | null;
  jobPostingExcerpt?: string | null;
  salaryGrossMonthlyEur?: number | null;
  hasEmail?: boolean;
  huntIntensity?: number;
  verticalSlug?: string | null;
  sourceRunId?: string | null;
  crmContactId?: string | null;
  outboundMessageId?: string | null;
  metadata?: Record<string, unknown>;
};

export function computeHeatScore(input: HotClientHeatInput, platform?: JobBoardPlatform): number {
  let score = 42;
  if (input.jobPostingExcerpt && input.jobPostingExcerpt.length > 80) score += 18;
  if (input.salaryGrossMonthlyEur && input.salaryGrossMonthlyEur >= 1500) score += 16;
  if (input.companyName) score += 10;
  if (input.roleTitle) score += 6;
  if (input.city) score += 4;
  if (input.hasEmail) score += 18;
  if (input.jobUrl) score += 5;
  if (platform?.kind === 'job_board') score += 5;
  else if (platform?.kind === 'freelance') score += 4;
  else if (platform?.kind === 'aggregator') score += 3;
  // government platforms are excluded from commercial hunts — no heat boost
  if (input.huntIntensity) score += Math.min(12, Math.round(input.huntIntensity / 8));
  return Math.min(100, Math.max(0, score));
}

export function resolveHeatBand(score: number): 'cold' | 'warm' | 'hot' | 'burning' {
  if (score >= 85) return 'burning';
  if (score >= 70) return 'hot';
  if (score >= 50) return 'warm';
  return 'cold';
}

export class HotClientsService {
  private readonly repo = new HotClientsRepository();

  async recordFromHunt(input: HotClientHeatInput) {
    const platform = getJobBoardPlatform(input.platformSlug);
    const heatScore = computeHeatScore(input, platform);
    const heatBand = resolveHeatBand(heatScore);
    const salary = input.salaryGrossMonthlyEur ?? null;
    const atinaMonthlyEur = salary ? computeJobHuntEconomics(salary).atinaMonthlyEur : null;

    const payload: InsertHotClientInput = {
      userId: input.userId,
      crmContactId: input.crmContactId,
      outboundMessageId: input.outboundMessageId,
      platformSlug: input.platformSlug,
      platformName: platform?.name ?? input.platformSlug,
      locale: input.locale ?? platform?.locale ?? 'en',
      region: input.region ?? platform?.region ?? 'GLOBAL',
      companyName: input.companyName,
      roleTitle: input.roleTitle,
      city: input.city,
      jobUrl: input.jobUrl,
      jobPostingExcerpt: input.jobPostingExcerpt,
      salaryGrossMonthlyEur: salary,
      atinaMonthlyEur,
      heatScore,
      heatBand,
      verticalSlug: input.verticalSlug,
      sourceRunId: input.sourceRunId,
      metadata: {
        ...(input.metadata ?? {}),
        platform_kind: platform?.kind ?? 'job_board',
      },
    };

    const { rows } = await this.repo.insert(payload);
    return rows[0];
  }

  async list(userId: string, opts?: { limit?: number; minHeat?: number; status?: string }) {
    const { rows } = await this.repo.listByUser(userId, opts);
    return rows;
  }

  async stats(userId: string) {
    const { rows } = await this.repo.countByUser(userId);
    const byBand: Record<string, number> = {};
    let total = 0;
    for (const row of rows) {
      const n = parseInt(row.count, 10);
      byBand[row.heat_band] = n;
      total += n;
    }
    return { total, byBand };
  }
}
