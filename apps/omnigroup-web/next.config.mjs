import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * OneDrive (local Windows dev) corrupts `.next` symlinks, so by default we keep
 * dist inside app but under node_modules.
 *
 * Inside the Docker/Linux build there is NO OneDrive, so the Dockerfile sets
 * NEXT_DIST_DIR=.next to get the standard Next layout. This matters for
 * `output: 'standalone'`: nesting the standalone/static output inside
 * node_modules/.cache is fragile (the tracer copies node_modules), whereas a
 * plain `.next` gives the well-documented, robust standalone layout.
 */
const distDir = process.env.NEXT_DIST_DIR || 'node_modules/.cache/omnigroup-next';

/**
 * Standalone output ships a minimal server.js plus ONLY the node_modules the app
 * actually traces, instead of the full dependency tree loaded by `next start`.
 * That is the core cold-start fix (far fewer files to read on boot). Gated by env
 * so local `npm run build` on OneDrive keeps its current behavior untouched.
 */
const useStandalone = process.env.NEXT_OUTPUT_STANDALONE === 'true';

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
  ...(useStandalone ? { output: 'standalone' } : {}),
  experimental: {
    instrumentationHook: true,
  },
  env: loadOmnigroupEnvFromAggregator(),
  async redirects() {
    return [
      { source: '/industries', destination: '/solutions', permanent: true },
      { source: '/industries/:slug', destination: '/solutions/:slug', permanent: true },
    ];
  },
  webpack(config, { dev }) {
    // Filesystem webpack cache on OneDrive causes stale/missing chunk errors.
    if (dev) {
      config.cache = { type: 'memory' };
    }
    return config;
  },
};

export default nextConfig;
