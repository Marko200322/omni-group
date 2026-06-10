import fs from 'fs';
import path from 'path';
import { config } from '../../../config';
import { query } from '../../../database/connection';

export type GeneratedVerticalsIndex = {
  generatedAt: string;
  count: number;
  source: string;
  verticals: Array<{
    slug: string;
    hasPage: boolean;
    hasOutreach: boolean;
    updatedAt: string;
  }>;
};

function resolveWebIndexPath(): string | null {
  const custom = config.autonomy.webGeneratedIndexPath?.trim();
  if (custom) return path.resolve(custom);
  const root = config.autonomy.gitRepoPath?.trim()
    ? path.resolve(config.autonomy.gitRepoPath)
    : path.resolve(process.cwd(), '..', '..');
  return path.join(root, 'apps', 'omnigroup-web', 'src', 'lib', 'generated-verticals-index.json');
}

/** Sync generated_artifacts → web JSON (works in Docker + host). */
export async function syncGeneratedVerticalsIndexFromDb(): Promise<{
  count: number;
  outFile: string | null;
  written: boolean;
}> {
  const { rows } = await query<{
    slug: string;
    has_page: boolean;
    has_outreach: boolean;
    updated_at: Date;
  }>(
    `SELECT vertical_slug AS slug,
            BOOL_OR(artifact_type = 'page_tsx') AS has_page,
            BOOL_OR(artifact_type = 'outreach_md') AS has_outreach,
            MAX(created_at) AS updated_at
     FROM generated_artifacts
     GROUP BY vertical_slug
     ORDER BY vertical_slug`
  );

  const payload: GeneratedVerticalsIndex = {
    generatedAt: new Date().toISOString(),
    count: rows.length,
    source: 'postgres:generated_artifacts',
    verticals: rows.map((r) => ({
      slug: r.slug,
      hasPage: Boolean(r.has_page),
      hasOutreach: Boolean(r.has_outreach),
      updatedAt: new Date(r.updated_at).toISOString(),
    })),
  };

  const outFile = resolveWebIndexPath();
  if (!outFile) {
    return { count: payload.count, outFile: null, written: false };
  }

  try {
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    return { count: payload.count, outFile, written: true };
  } catch {
    return { count: payload.count, outFile, written: false };
  }
}
