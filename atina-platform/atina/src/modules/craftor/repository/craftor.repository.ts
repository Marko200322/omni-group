import { query } from '../../../database/connection';
import type { CreateCraftorDtoType } from '../dto/craftor.dto';
import type { CraftorNiche, CraftorPlatform, AntiDetectionLevel } from '../craftor.constants';

export type CraftorMetrics = {
  lead_target?: number;
  leads_collected?: unknown;
  deals_closed?: unknown;
  proposals_sent?: unknown;
  jobs_scored?: unknown;
  niche?: CraftorNiche;
  platforms?: CraftorPlatform[];
  anti_detection_level?: AntiDetectionLevel;
  anti_detection_score?: number;
  workflow_stage?: string;
  agent_memory_entries?: number;
  conversion_probability_avg?: number;
  last_mode?: string;
  last_leads?: number;
  craftor_version?: string;
};

export type CraftorSystemRow = {
  id: string;
  metrics?: CraftorMetrics | null;
};

export class CraftorRepository {
  listByUser(userId: string) {
    return query(
      `SELECT * FROM ecosystem_systems
       WHERE user_id = $1 AND system_slug = 'craftor'
       ORDER BY created_at DESC`,
      [userId]
    );
  }

  create(userId: string, dto: CreateCraftorDtoType) {
    const metrics = {
      lead_target: dto.leadTarget,
      leads_collected: 0,
      deals_closed: 0,
      proposals_sent: 0,
      jobs_scored: 0,
      niche: dto.niche,
      platforms: dto.platforms,
      anti_detection_level: dto.antiDetectionLevel,
      anti_detection_score: dto.antiDetectionLevel === 'high' ? 92 : dto.antiDetectionLevel === 'low' ? 72 : 85,
      workflow_stage: 'job-detection',
      agent_memory_entries: 0,
      conversion_probability_avg: 0,
      craftor_version: '7.0.0',
    };
    return query(
      `INSERT INTO ecosystem_systems
       (user_id, system_slug, name, budget_allocated, metrics)
       VALUES ($1, 'craftor', $2, $3, $4)
       RETURNING *`,
      [userId, dto.name, dto.budgetAllocated, JSON.stringify(metrics)]
    );
  }

  getOwned(systemId: string, userId: string) {
    return query<CraftorSystemRow>(
      `SELECT * FROM ecosystem_systems
       WHERE id = $1 AND user_id = $2 AND system_slug = 'craftor'`,
      [systemId, userId]
    );
  }

  insertRun(systemId: string, runType: string, inputPayload: unknown, outputPayload: unknown) {
    return query(
      `INSERT INTO ecosystem_runs
       (ecosystem_system_id, run_type, status, input_payload, output_payload, started_at, finished_at)
       VALUES ($1, $2, 'completed', $3, $4, NOW(), NOW())
       RETURNING *`,
      [systemId, runType, JSON.stringify(inputPayload), JSON.stringify(outputPayload)]
    );
  }

  updateAfterRun(
    systemId: string,
    revenue: number,
    mode: string,
    leads: number,
    newLeadsCollected: number,
    extraMetrics: Record<string, unknown>
  ) {
    return query(
      `UPDATE ecosystem_systems
       SET revenue_generated = revenue_generated + $2,
           efficiency_score = LEAST(100, efficiency_score + 2.2),
           metrics = COALESCE(metrics, '{}'::jsonb)
             || jsonb_build_object(
               'last_mode', $3::text,
               'last_leads', $4::int,
               'leads_collected', $5::int,
               'craftor_version', '7.0.0'
             )
             || $6::jsonb,
           last_run_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [systemId, revenue, mode, leads, newLeadsCollected, JSON.stringify(extraMetrics)]
    );
  }

  auditCreated(userId: string, systemId: string, name: string) {
    return query(
      `INSERT INTO audit_events
       (actor_user_id, event_type, entity_type, entity_id, severity, payload)
       VALUES ($1, 'craftor_v7_created', 'ecosystem_system', $2, 'info', $3)`,
      [userId, systemId, JSON.stringify({ name, version: '7.0.0' })]
    );
  }

  auditRunCompleted(userId: string, runId: string, payload: Record<string, unknown>) {
    return query(
      `INSERT INTO audit_events
       (actor_user_id, event_type, entity_type, entity_id, severity, payload)
       VALUES ($1, 'craftor_v7_run_completed', 'ecosystem_run', $2, 'info', $3)`,
      [userId, runId, JSON.stringify(payload)]
    );
  }
}
