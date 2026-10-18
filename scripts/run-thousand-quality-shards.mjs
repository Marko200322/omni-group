#!/usr/bin/env node
/**
 * Orchestrate SHARD_COUNT parallel Jest shards for the 1000-package quality matrix,
 * then merge evidence into docs/evidence/THOUSAND-PACKAGES-QUALITY-20261012.{json,md}
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const atinaRoot = path.join(repoRoot, 'atina-platform', 'atina');
const evidenceDir = path.join(repoRoot, 'docs', 'evidence');
const SHARD_COUNT = Math.max(1, Number(process.env.SHARD_COUNT ?? '10') || 10);

function runShard(i) {
  return new Promise((resolve) => {
    const child = spawn(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      [
        'jest',
        'src/tests/unit/thousand-packages-quality-matrix.test.ts',
        '--runInBand',
        '--no-coverage',
        '--forceExit',
      ],
      {
        cwd: atinaRoot,
        env: { ...process.env, SHARD_INDEX: String(i), SHARD_COUNT: String(SHARD_COUNT) },
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    let out = '';
    child.stdout.on('data', (d) => {
      out += d.toString();
      process.stdout.write(`[shard ${i}] ${d}`);
    });
    child.stderr.on('data', (d) => {
      out += d.toString();
      process.stderr.write(`[shard ${i}] ${d}`);
    });
    child.on('close', (code) => resolve({ i, code: code ?? 1, out }));
  });
}

async function main() {
  console.log(`Starting ${SHARD_COUNT} shards for 1000-package quality matrix…`);
  const started = Date.now();
  const results = await Promise.all(
    Array.from({ length: SHARD_COUNT }, (_, i) => runShard(i)),
  );

  const shardPayloads = [];
  for (let i = 0; i < SHARD_COUNT; i += 1) {
    const p = path.join(evidenceDir, `_tmp-thousand-shard-${i}.json`);
    if (!fs.existsSync(p)) {
      console.error(`Missing shard file: ${p}`);
      continue;
    }
    shardPayloads.push(JSON.parse(fs.readFileSync(p, 'utf8')));
  }

  const rows = shardPayloads.flatMap((s) => s.rows ?? []);
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
    shardCount: SHARD_COUNT,
    elapsedMs: Date.now() - started,
    total: rows.length,
    passed,
    failed,
    shardExitCodes: results.map((r) => ({ shard: r.i, code: r.code })),
    byBase,
    fails: fails.slice(0, 100),
  };

  fs.mkdirSync(evidenceDir, { recursive: true });
  const jsonPath = path.join(evidenceDir, 'THOUSAND-PACKAGES-QUALITY-20261012.json');
  const mdPath = path.join(evidenceDir, 'THOUSAND-PACKAGES-QUALITY-20261012.md');
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2), 'utf8');

  const md = [
    '# Thousand packages quality matrix — 2026-10-12',
    '',
    `**${passed}/${rows.length} PASS** · failed=${failed} · shards=${SHARD_COUNT} · elapsed=${Math.round(summary.elapsedMs / 1000)}s`,
    '',
    '> Local generators (AI off) + catalog / handler / acceptance / delivery-spec / substance / order-bind. Prod VPS was unreachable for live fulfill.',
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
      ? ['## Failures (first 100)', '', ...fails.map((f) => `- \`${f.id}\`: ${f.failures.join(', ')}`)].join(
          '\n',
        )
      : '## Failures\n\nNone.',
    '',
    `JSON: \`${path.basename(jsonPath)}\``,
  ].join('\n');
  fs.writeFileSync(mdPath, md, 'utf8');

  console.log(md);
  const badShards = results.filter((r) => r.code !== 0);
  if (failed > 0 || badShards.length || rows.length !== 1000) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
