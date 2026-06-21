import { query } from '../../../database/connection';

export type HotClientRow = {
  id: string;
  user_id: string;
  crm_contact_id: string | null;
  outbound_message_id: string | null;
  platform_slug: string;
  platform_name: string | null;
  locale: string;
  region: string;
  company_name: string | null;
  role_title: string | null;
  city: string | null;
  job_url: string | null;
  job_posting_excerpt: string | null;
  salary_gross_monthly_eur: number | null;
  atina_monthly_eur: number | null;
  heat_score: number;
  heat_band: string;
  status: string;
  vertical_slug: string | null;
  source_run_id: string | null;
  metadata: Record<string, unknown>;
  discovered_at: Date;
  updated_at: Date;
};

export type InsertHotClientInput = {
  userId: string;
  crmContactId?: string | null;
  outboundMessageId?: string | null;
  platformSlug: string;
  platformName?: string | null;
  locale: string;
  region: string;
  companyName?: string | null;
  roleTitle?: string | null;
  city?: string | null;
  jobUrl?: string | null;
  jobPostingExcerpt?: string | null;
  salaryGrossMonthlyEur?: number | null;
  atinaMonthlyEur?: number | null;
  heatScore: number;
  heatBand: string;
  verticalSlug?: string | null;
  sourceRunId?: string | null;
  metadata?: Record<string, unknown>;
};

export class HotClientsRepository {
  async insert(input: InsertHotClientInput) {
    return query<HotClientRow>(
      `INSERT INTO hot_clients (
         user_id, crm_contact_id, outbound_message_id, platform_slug, platform_name,
         locale, region, company_name, role_title, city, job_url, job_posting_excerpt,
         salary_gross_monthly_eur, atina_monthly_eur, heat_score, heat_band,
         vertical_slug, source_run_id, metadata
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
       ) RETURNING *`,
      [
        input.userId,
        input.crmContactId ?? null,
        input.outboundMessageId ?? null,
        input.platformSlug,
        input.platformName ?? null,
        input.locale,
        input.region,
        input.companyName ?? null,
        input.roleTitle ?? null,
        input.city ?? null,
        input.jobUrl ?? null,
        input.jobPostingExcerpt?.slice(0, 2000) ?? null,
        input.salaryGrossMonthlyEur ?? null,
        input.atinaMonthlyEur ?? null,
        input.heatScore,
        input.heatBand,
        input.verticalSlug ?? null,
        input.sourceRunId ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }

  async listByUser(userId: string, opts?: { limit?: number; minHeat?: number; status?: string }) {
    const limit = Math.min(200, Math.max(1, opts?.limit ?? 50));
    const params: unknown[] = [userId];
    let where = 'WHERE user_id = $1';
    if (opts?.minHeat != null) {
      params.push(opts.minHeat);
      where += ` AND heat_score >= $${params.length}`;
    }
    if (opts?.status) {
      params.push(opts.status);
      where += ` AND status = $${params.length}`;
    }
    params.push(limit);
    return query<HotClientRow>(
      `SELECT * FROM hot_clients ${where} ORDER BY heat_score DESC, discovered_at DESC LIMIT $${params.length}`,
      params,
    );
  }

  async countByUser(userId: string) {
    return query<{ heat_band: string; count: string }>(
      `SELECT heat_band, COUNT(*)::text AS count FROM hot_clients WHERE user_id = $1 GROUP BY heat_band`,
      [userId],
    );
  }
}
