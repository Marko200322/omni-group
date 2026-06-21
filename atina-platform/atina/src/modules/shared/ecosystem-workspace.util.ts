import { query } from '../../database/connection';

export const HUNTING_ECOSYSTEM_SLUGS = [
  'client-hunter',
  'lead-scoring',
  'outreach',
  'titanis',
  'follow-up-automation',
  'proxy-rotation',
  'craftor',
] as const;

export type HuntingEcosystemSlug = (typeof HUNTING_ECOSYSTEM_SLUGS)[number];

const DEFAULT_WORKSPACES: Record<
  HuntingEcosystemSlug,
  { name: string; config: Record<string, unknown> }
> = {
  'client-hunter': { name: 'Omni Client Hunter', config: { hunt_strategy: 'targeted' } },
  'lead-scoring': { name: 'Omni Lead Scoring', config: { model_preset: 'standard' } },
  outreach: { name: 'Omni Outreach', config: { channel_focus: 'email' } },
  titanis: { name: 'Omni Titanis', config: { outreach_channel: 'email' } },
  'follow-up-automation': { name: 'Omni Follow-up', config: { follow_up_strategy: 'balanced' } },
  'proxy-rotation': { name: 'Omni Proxy Pool', config: { rotation_mode: 'warm' } },
  craftor: { name: 'Omni Craftor', config: { platform: 'upwork', niche: 'general' } },
};

export async function findEcosystemWorkspace(userId: string, systemSlug: string) {
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM ecosystem_systems
     WHERE user_id = $1 AND system_slug = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, systemSlug]
  );
  return rows[0]?.id ?? null;
}

export async function ensureEcosystemWorkspace(userId: string, systemSlug: string): Promise<string> {
  const existing = await findEcosystemWorkspace(userId, systemSlug);
  if (existing) return existing;

  const defaults = DEFAULT_WORKSPACES[systemSlug as HuntingEcosystemSlug] ?? {
    name: `Omni ${systemSlug}`,
    config: {},
  };

  const { rows } = await query<{ id: string }>(
    `INSERT INTO ecosystem_systems
     (user_id, system_slug, name, budget_allocated, config, metrics)
     VALUES ($1, $2, $3, 0, $4, $5)
     RETURNING id`,
    [
      userId,
      systemSlug,
      defaults.name,
      JSON.stringify(defaults.config),
      JSON.stringify({ runs_completed: 0, bootstrapped: true }),
    ]
  );
  return rows[0].id;
}

export async function bootstrapHuntingWorkspaces(userId: string) {
  const created: Array<{ slug: string; id: string; created: boolean }> = [];
  for (const slug of HUNTING_ECOSYSTEM_SLUGS) {
    const before = await findEcosystemWorkspace(userId, slug);
    const id = await ensureEcosystemWorkspace(userId, slug);
    created.push({ slug, id, created: !before });
  }
  return {
    total: created.length,
    created: created.filter((r) => r.created).length,
    workspaces: created,
  };
}

export function mergeWorkflowHuntingInput(
  stepConfig: Record<string, unknown>,
  input: Record<string, unknown>
): Record<string, unknown> {
  const keys = [
    'verticalSlug',
    'category',
    'verticalName',
    'intensity',
    'mode',
    'revenueEstimate',
    'targetCount',
    'platform',
  ] as const;
  const merged = { ...stepConfig };
  for (const key of keys) {
    if (input[key] !== undefined && input[key] !== null) {
      merged[key] = input[key];
    }
  }
  return merged;
}
