import fs from 'fs/promises';
import path from 'path';
import { config } from '../../../config';

export async function deployCraftorArtifactLocal(
  systemId: string,
  mode: string,
  payload: Record<string, unknown>
): Promise<string | null> {
  const root = config.craftor.deployPath.trim();
  if (!root) return null;

  const dir = path.isAbsolute(root) ? path.join(root, systemId) : path.resolve(process.cwd(), root, systemId);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${mode}-${Date.now()}.json`);
  await fs.writeFile(file, JSON.stringify(payload, null, 2), 'utf-8');
  return file;
}
