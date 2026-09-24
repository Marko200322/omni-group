/**
 * Public SEO source checks. Does not crawl production HTTP.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return readFileSync(join(root, rel), 'utf8');
}
function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const sitemap = read('src/app/sitemap.ts');
const robots = read('src/app/robots.ts');
const solutions = read('src/app/(marketing)/solutions/[slug]/page.tsx');
const metadata = read('src/lib/site-metadata.ts');

assert(sitemap.includes("'/status'"), 'Sitemap must include /status');
assert(sitemap.includes('listOnlineVerticalSlugs'), 'Sitemap must include industry landings');
assert(robots.includes("'/admin'"), 'Robots must disallow admin');
assert(robots.includes("'/dashboard'"), 'Robots must disallow dashboard');
assert(solutions.includes('alternates: { canonical:'), 'Industry pages must set a canonical');
assert(solutions.includes('marketingCanonical(path)'), 'Industry canonical must be per-slug');
assert(metadata.includes('marketingCanonical'), 'Shared canonical helper must exist');
assert(solutions.includes("robots: { index: false, follow: true }"), 'Draft industry pages must stay noindex');

console.log('test-seo-public: ok');
