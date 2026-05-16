import fs from 'fs';
import path from 'path';

const AGGREGATOR_REL = path.join('config', 'env-aggregator.json');

function findRepoRoot(startDir: string): string | null {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, AGGREGATOR_REL))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return null;
}

export function applyEnvAggregator(section: 'nest' | 'integrations'): void {
  const root = findRepoRoot(process.cwd());
  if (!root) {
    return;
  }

  const filePath = path.join(root, AGGREGATOR_REL);
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  } catch {
    return;
  }

  const block = parsed[section];
  if (!block || typeof block !== 'object' || Array.isArray(block)) {
    return;
  }

  for (const [key, value] of Object.entries(block as Record<string, unknown>)) {
    if (key.startsWith('_')) {
      continue;
    }
    if (process.env[key] !== undefined) {
      continue;
    }
    if (value === null || value === undefined) {
      continue;
    }
    process.env[key] = String(value);
  }
}
