import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** OneDrive kvari `.next` symlink-e — keš u node_modules (obično lokalno). */
const distDir = 'node_modules/.cache/omnigroup-next';

function loadOmnigroupEnvFromAggregator() {
  let dir = path.resolve(__dirname, '..', '..');
  for (let i = 0; i < 6; i++) {
    const aggPath = path.join(dir, 'config', 'env-aggregator.json');
    if (fs.existsSync(aggPath)) {
      const parsed = JSON.parse(fs.readFileSync(aggPath, 'utf8'));
      const block = parsed.omnigroupWeb ?? {};
      return {
        NEXT_PUBLIC_ATINA_API_BASE:
          process.env.NEXT_PUBLIC_ATINA_API_BASE ??
          block.NEXT_PUBLIC_ATINA_API_BASE ??
          'http://127.0.0.1:3000',
      };
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return {
    NEXT_PUBLIC_ATINA_API_BASE:
      process.env.NEXT_PUBLIC_ATINA_API_BASE ?? 'http://127.0.0.1:3000',
  };
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir,
  env: loadOmnigroupEnvFromAggregator(),
};

export default nextConfig;
