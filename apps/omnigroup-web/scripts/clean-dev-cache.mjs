import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const targets = [
  path.join(__dirname, '..', '.next'),
  path.join(__dirname, '..', 'node_modules', '.cache', 'omnigroup-next'),
  path.join(__dirname, '..', '..', '..', '.tmp', 'omnigroup-next'),
];

for (const target of targets) {
  try {
    fs.rmSync(target, { recursive: true, force: true });
  } catch {
    // ignore locked or missing paths
  }
}
