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
    name?: string;
    category?: string;
    valueProp?: string | null;
    hasPage: boolean;
    hasOutreach: boolean;
    updatedAt: string;
    href?: string;
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
    name: string | null;
    category: string | null;
    research_data: Record<string, unknown> | null;
    has_page: boolean;
    has_outreach: boolean;
    updated_at: Date;
  }>(
    `SELECT ga.vertical_slug AS slug,
            iv.name,
            iv.category,
            iv.research_data,
            BOOL_OR(ga.artifact_type = 'page_tsx') AS has_page,
            BOOL_OR(ga.artifact_type = 'outreach_md') AS has_outreach,
            MAX(ga.created_at) AS updated_at
     FROM generated_artifacts ga
     LEFT JOIN industry_verticals iv ON iv.slug = ga.vertical_slug
     GROUP BY ga.vertical_slug, iv.name, iv.category, iv.research_data
     ORDER BY ga.vertical_slug`
  );

  const payload: GeneratedVerticalsIndex = {
    generatedAt: new Date().toISOString(),
    count: rows.length,
    source: 'postgres:generated_artifacts',
    verticals: rows.map((r) => {
      const research = r.research_data ?? {};
      const valueProp =
        typeof research.value_proposition === 'string' ? research.value_proposition : null;
      return {
        slug: r.slug,
        name: r.name ?? r.slug,
        category: r.category ?? undefined,
        valueProp,
        hasPage: Boolean(r.has_page),
        hasOutreach: Boolean(r.has_outreach),
        updatedAt: new Date(r.updated_at).toISOString(),
        href: `/solutions/${r.slug}`,
      };
    }),
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
