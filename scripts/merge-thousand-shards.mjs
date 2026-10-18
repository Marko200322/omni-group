import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, '..', 'docs', 'evidence');
const rows = [];
const shardMeta = [];

for (let i = 0; i < 10; i += 1) {
  const p = path.join(dir, `_tmp-thousand-shard-${i}.json`);
  if (!fs.existsSync(p)) {
    console.error('missing', p);
    process.exit(1);
  }
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  shardMeta.push({ shard: i, total: j.totalInShard, passed: j.passed, failed: j.failed });
  rows.push(...(j.rows || []));
}

const passed = rows.filter((r) => r.status === 'PASS').length;
const failed = rows.filter((r) => r.status === 'FAIL').length;
const fails = rows.filter((r) => r.status === 'FAIL');
const byBase = {};
for (const r of rows) {
  byBase[r.baseId] = byBase[r.baseId] || { pass: 0, fail: 0 };
  byBase[r.baseId][r.status === 'PASS' ? 'pass' : 'fail'] += 1;
}

const summary = {
  generatedAt: new Date().toISOString(),
  mode: 'local-generators+catalog+handler+acceptance+delivery-spec',
  prodLive: false,
  shardCount: 10,
  total: rows.length,
  passed,
  failed,
  shards: shardMeta,
  byBase,
  fails: fails.slice(0, 100),
};

fs.writeFileSync(path.join(dir, 'THOUSAND-PACKAGES-QUALITY-20261012.json'), JSON.stringify(summary, null, 2));

const md = [
  '# Thousand packages quality matrix — 2026-10-12',
  '',
  `**${passed}/${rows.length} PASS** · failed=${failed} · shards=10`,
  '',
  '> Local generators (AI off) + catalog / handler / acceptance / delivery-spec / substance / order-bind. Prod VPS unreachable for live fulfill.',
  '',
  '## Shards',
  '',
  '| Shard | Total | PASS | FAIL |',
  '|---:|---:|---:|---:|',
  ...shardMeta.map((s) => `| ${s.shard} | ${s.total} | ${s.passed} | ${s.failed} |`),
  '',
  '## By base package',
  '',
  '| Base | PASS | FAIL |',
  '|---|---:|---:|',
  ...Object.entries(byBase)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, v]) => `| \`${id}\` | ${v.pass} | ${v.fail} |`),
  '',
  fails.length
    ? ['## Failures', '', ...fails.map((f) => `- \`${f.id}\`: ${f.failures.join(', ')}`)].join('\n')
    : '## Failures\n\nNone.',
  '',
  'JSON: `THOUSAND-PACKAGES-QUALITY-20261012.json`',
].join('\n');

fs.writeFileSync(path.join(dir, 'THOUSAND-PACKAGES-QUALITY-20261012.md'), md);
console.log(JSON.stringify({ total: rows.length, passed, failed }, null, 2));
if (failed > 0 || rows.length !== 1000) process.exit(1);
