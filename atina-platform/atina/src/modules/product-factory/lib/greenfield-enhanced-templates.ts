import type { GreenfieldSpec } from './greenfield-templates';

export function renderEnhancedPackageJson(spec: GreenfieldSpec): string {
  return `${JSON.stringify(
    {
      name: `@factory/${spec.lane}-${spec.slug}`,
      version: '1.0.0',
      private: true,
      type: 'module',
      description: spec.description,
      scripts: {
        start: 'node src/server.js',
        test: 'node --test tests/**/*.test.js',
        'test:smoke': 'node --test tests/enhanced.test.js',
        dev: 'node --watch src/server.js',
      },
      engines: { node: '>=20' },
      dependencies: {},
      factory: { lane: spec.lane, isolationKey: spec.isolationKey, tier: 'enhanced' },
    },
    null,
    2,
  )}\n`;
}

export function renderEnvExample(spec: GreenfieldSpec): string {
  return `# ${spec.projectName} — environment template
# Copy to .env and fill values. Never commit real secrets.

PORT=4100
NODE_ENV=development

# Optional Postgres (apply src/db/schema.sql after setting)
DATABASE_URL=postgres://user:pass@localhost:5432/${spec.slug.replace(/-/g, '_')}

# Session / JWT (generate a long random string for staging/prod)
JWT_SECRET=change-me-before-deploy

# Browser origin allowed to call the API (comma-separated in prod)
CORS_ORIGIN=http://localhost:4100

# Client context (informational)
CLIENT_NAME=${(spec.clientName ?? 'Client').replace(/\n/g, ' ')}
APP_SLUG=${spec.slug}
`;
}

export function renderEnhancedServerJs(spec: GreenfieldSpec): string {
  return `import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appMeta } from './config.js';
import { handleApi } from './routes/api.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4100);
const publicDir = join(__dirname, '..', 'public');

const server = http.createServer(async (req, res) => {
  const url = req.url ?? '/';
  if (url.startsWith('/api/')) {
    return handleApi(req, res, appMeta);
  }
  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, ...appMeta }));
  }
  const file = url === '/' ? 'index.html' : url.replace(/^\\//, '');
  const path = join(publicDir, file);
  if (existsSync(path) && !file.includes('..')) {
    const html = readFileSync(path, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => console.log(\`[\${appMeta.lane}] \${appMeta.name} on \${PORT}\`));
export { server };
`;
}

export function renderApiRoutesJs(spec: GreenfieldSpec): string {
  return `/** REST API scaffold — extend per client requirements */
export async function handleApi(req, res, meta) {
  const url = req.url ?? '';
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }
  if (url === '/api/v1/meta' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, project: meta.name, client: meta.clientName, slug: meta.slug }));
  }
  if (url === '/api/v1/items' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ items: [{ id: '1', title: 'Sample record', status: 'active' }] }));
  }
  if (url === '/api/v1/items' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    res.writeHead(201, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, created: true, payload: body.slice(0, 200) }));
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Unknown route', path: url }));
}
`;
}

export function renderDbSchemaSql(spec: GreenfieldSpec): string {
  return `-- ${spec.projectName} — starter schema
CREATE TABLE IF NOT EXISTS app_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  client_name VARCHAR(255),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;
}

export function renderPublicIndexHtml(spec: GreenfieldSpec): string {
  const client = spec.clientName ?? 'Client';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${spec.projectName}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.6}
    header{padding:2rem;text-align:center;background:linear-gradient(135deg,#1e293b,#0f172a)}
    h1{font-size:2rem;margin-bottom:.5rem}
    main{max-width:720px;margin:2rem auto;padding:0 1rem}
    .card{background:#1e293b;border-radius:12px;padding:1.5rem;margin-bottom:1rem;border:1px solid #334155}
    button{background:#2563eb;color:#fff;border:0;padding:.75rem 1.25rem;border-radius:8px;cursor:pointer}
    pre{background:#0b1220;padding:1rem;border-radius:8px;overflow:auto;font-size:.85rem}
  </style>
</head>
<body>
  <header>
    <h1>${spec.projectName}</h1>
    <p>Custom application for ${client}</p>
  </header>
  <main>
    <div class="card">
      <h2>Application status</h2>
      <p id="status">Loading…</p>
    </div>
    <div class="card">
      <h2>API demo</h2>
      <button id="load">Load sample data</button>
      <pre id="out"></pre>
    </div>
  </main>
  <script>
    fetch('/api/v1/meta').then(r=>r.json()).then(d=>{
      document.getElementById('status').textContent = 'Connected — ' + d.project;
    });
    document.getElementById('load').onclick = () =>
      fetch('/api/v1/items').then(r=>r.json()).then(d=>{
        document.getElementById('out').textContent = JSON.stringify(d,null,2);
      });
  </script>
</body>
</html>`;
}

export function renderEnhancedReadme(spec: GreenfieldSpec): string {
  return `# ${spec.projectName}

Productized starter software for **${spec.clientName ?? 'client'}** (lane \`${spec.lane}\`, isolation \`${spec.isolationKey}\`).

This is a **complete starter deliverable** — Node API + SPA shell + schema + tests — not an unfinished unlimited build.

## Prerequisites
- Node.js 20+
- Optional: PostgreSQL if you apply \`src/db/schema.sql\`

## Quick start (local)
\`\`\`bash
cp .env.example .env
# edit .env — set JWT_SECRET before any shared deploy
npm test
npm start
# open http://localhost:4100  (or PORT from .env)
curl http://localhost:4100/health
curl http://localhost:4100/api/v1/meta
\`\`\`

## Stack
- Node.js 20+ HTTP server (\`src/server.js\`) with REST API scaffold
- Static client shell in \`public/\`
- SQL schema starter in \`src/db/schema.sql\`
- Env template: \`.env.example\`

## Deploy (staging / VPS)
1. Copy project to the host (or build a container from this tree).
2. Set env from \`.env.example\` (\`PORT\`, \`JWT_SECRET\`, \`DATABASE_URL\`, \`CORS_ORIGIN\`, \`NODE_ENV=production\`).
3. Apply \`src/db/schema.sql\` if using Postgres.
4. Run \`npm test\` then \`npm start\` under a process manager (systemd, PM2, or Docker).
5. Put TLS in front (Caddy/nginx); probe \`/health\`.
6. Record deploy tag + rollback image.

## Extend
- Add routes in \`src/routes/api.js\`
- Replace \`public/index.html\` with your UI framework
- Run migrations against PostgreSQL using \`src/db/schema.sql\`

## What this is / is not
- **Is:** bounded starter codebase with smoke tests and handoff docs
- **Is not:** unlimited feature development, app-store packaging, or managed ops on your infra

Generated by Omni Group Product Factory (enhanced tier).
`;
}

export function renderEnhancedSmokeTestJs(spec: GreenfieldSpec): string {
  return `import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApi } from '../src/routes/api.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('enhanced scaffold files exist', () => {
  assert.ok(existsSync(join(root, 'src', 'server.js')));
  assert.ok(existsSync(join(root, 'src', 'routes', 'api.js')));
  assert.ok(existsSync(join(root, 'public', 'index.html')));
  assert.ok(existsSync(join(root, 'src', 'db', 'schema.sql')));
  assert.ok(existsSync(join(root, '.env.example')));
  assert.ok(existsSync(join(root, 'README.md')));
});

test('public index references client', () => {
  const html = readFileSync(join(root, 'public', 'index.html'), 'utf8');
  assert.ok(html.includes('${spec.projectName.replace(/'/g, "\\'")}'));
});

test('.env.example documents required keys', () => {
  const env = readFileSync(join(root, '.env.example'), 'utf8');
  assert.ok(env.includes('PORT='));
  assert.ok(env.includes('JWT_SECRET='));
  assert.ok(env.includes('DATABASE_URL='));
});

test('README documents run and deploy', () => {
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  assert.ok(/npm (test|start)/i.test(readme));
  assert.ok(/Deploy/i.test(readme));
  assert.ok(/\\.env\\.example/.test(readme) || readme.includes('.env.example'));
});

test('GET /api/v1/meta returns project payload', async () => {
  const meta = {
    name: '${spec.projectName.replace(/'/g, "\\'")}',
    clientName: ${JSON.stringify(spec.clientName ?? null)},
    slug: '${spec.slug}',
  };
  let status = 0;
  let body = '';
  const res = {
    setHeader() {},
    writeHead(code) {
      status = code;
    },
    end(chunk) {
      body = String(chunk ?? '');
    },
  };
  await handleApi({ method: 'GET', url: '/api/v1/meta' }, res, meta);
  assert.equal(status, 200);
  const parsed = JSON.parse(body);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.project, meta.name);
});
`;
}
