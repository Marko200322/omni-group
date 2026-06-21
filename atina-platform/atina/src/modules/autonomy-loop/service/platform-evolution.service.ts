import { query } from '../../../database/connection';

export type PlatformEvolutionTaskType =
  | 'research_gap'
  | 'ui_improvement'
  | 'test_fix'
  | 'outreach_tune'
  | 'deploy_prep'
  | 'catalog_sync';

export type PlatformEvolutionTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export type PlatformEvolutionTask = {
  id: string;
  task_type: PlatformEvolutionTaskType;
  priority: number;
  status: PlatformEvolutionTaskStatus;
  title: string;
  description: string | null;
  target_paths: string[];
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
};

/** Planira zadatke ka 100% — poziva se iz autonomy tick-a ili admin API-ja. */
export class PlatformEvolutionService {
  async seedDefaultTasksIfEmpty(): Promise<{ inserted: number }> {
    const { rows: existing } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM platform_evolution_tasks WHERE status IN ('pending', 'running')`
    );
    if (parseInt(existing[0]?.count ?? '0', 10) > 0) {
      return { inserted: 0 };
    }

    const defaults: Array<{
      task_type: PlatformEvolutionTaskType;
      priority: number;
      title: string;
      description: string;
      target_paths: string[];
    }> = [
      {
        task_type: 'catalog_sync',
        priority: 90,
        title: 'Sync generated verticals into web catalog',
        description: 'Run scripts/sync-generated-verticals.ps1 and wire the index into the marketing catalog.',
        target_paths: ['apps/omnigroup-web/src/lib/generated-verticals-index.json'],
      },
      {
        task_type: 'outreach_tune',
        priority: 85,
        title: 'Enable outbound sending (warmup + SMTP/COMMS)',
        description: 'OUTREACH_DOMAIN_WARMUP_COMPLETE + COMMS or SMTP; verify process-send.',
        target_paths: ['atina-platform/atina/src/modules/autonomy-loop/service/outbound-queue.service.ts'],
      },
      {
        task_type: 'ui_improvement',
        priority: 70,
        title: 'Autonomy panel — show freelance 25/25 as primary KPI',
        description: 'AutonomyLoopPanel focus on online jobs; hide legacy or mark as add-on.',
        target_paths: ['apps/omnigroup-web/src/components/platform/AutonomyLoopPanel.tsx'],
      },
      {
        task_type: 'test_fix',
        priority: 65,
        title: 'Evolution gate — npm test before deploy commit',
        description: 'Platform evolution tick must pass jest before git commit.',
        target_paths: ['atina-platform/atina/package.json'],
      },
      {
        task_type: 'deploy_prep',
        priority: 60,
        title: 'INFRASTRUCTURE aggregator + production APP_URL',
        description: 'Prepare deploy to the internet before AUTO_DEPLOY=true.',
        target_paths: ['atina-platform/atina/.env'],
      },
    ];

    let inserted = 0;
    for (const task of defaults) {
      await query(
        `INSERT INTO platform_evolution_tasks
         (task_type, priority, title, description, target_paths, payload)
         VALUES ($1, $2, $3, $4, $5::jsonb, '{}'::jsonb)`,
        [task.task_type, task.priority, task.title, task.description, JSON.stringify(task.target_paths)]
      );
      inserted += 1;
    }
    return { inserted };
  }

  async listPending(limit = 20): Promise<PlatformEvolutionTask[]> {
    const { rows } = await query<PlatformEvolutionTask>(
      `SELECT * FROM platform_evolution_tasks
       WHERE status = 'pending'
       ORDER BY priority DESC, created_at ASC
       LIMIT $1`,
      [limit]
    );
    return rows;
  }

  async markRunning(id: string): Promise<void> {
    await query(
      `UPDATE platform_evolution_tasks SET status = 'running', started_at = NOW() WHERE id = $1`,
      [id]
    );
  }

  async markCompleted(id: string, result: Record<string, unknown>): Promise<void> {
    await query(
      `UPDATE platform_evolution_tasks
       SET status = 'completed', completed_at = NOW(), result = $2::jsonb
       WHERE id = $1`,
      [id, JSON.stringify(result)]
    );
  }

  async markFailed(id: string, error: string): Promise<void> {
    await query(
      `UPDATE platform_evolution_tasks
       SET status = 'failed', completed_at = NOW(), error = $2
       WHERE id = $1`,
      [id, error.slice(0, 2000)]
    );
  }
}
