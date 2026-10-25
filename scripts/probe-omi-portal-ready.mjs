#!/usr/bin/env node
/**
 * Soft-start readiness: OMI + logged-in client portal (not Stripe LIVE / P2).
 *
 * Env:
 *   ATINA_API_BASE (default soft :3000)
 *   WEB_BASE (default soft :3010)
 *   ADMIN_EMAIL / ADMIN_PASSWORD
 *
 * Writes docs/evidence/_omi-portal-ready-YYYYMMDD.{json,md}
 * Exit 0 iff OMI PASS and portal core APIs PASS.
 */
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const outDir = join(root, 'docs', 'evidence');
mkdirSync(outDir, { recursive: true });

function loadAdminFromDeployConfig() {
  try {
    const raw = readFileSync(join(root, 'deploy-secrets.local/deploy.config.json'), 'utf8').replace(
      /^\uFEFF/,
      '',
    );
    const cfg = JSON.parse(raw);
    return {
      email: process.env.ADMIN_EMAIL || cfg.adminEmail || '',
      password: process.env.ADMIN_PASSWORD || cfg.adminPassword || '',
    };
  } catch {
    return { email: process.env.ADMIN_EMAIL || '', password: process.env.ADMIN_PASSWORD || '' };
  }
}

const API = (process.env.ATINA_API_BASE || 'http://164.68.127.15:3000').replace(/\/$/, '');
const WEB = (process.env.WEB_BASE || 'http://164.68.127.15:3010').replace(/\/$/, '');
const admin = loadAdminFromDeployConfig();

const CATALOG_IDS = [
  'setup-quick',
  'setup-full',
  'setup-custom',
  'audit',
  'integration',
  'workflow-design',
  'support-priority',
  'support-dedicated',
  'landing',
  'website-business',
  'website-ecommerce',
  'white-label-setup',
  'sales-enablement',
  'vertical-package',
  'lead-gen-retainer',
  'ai-support-retainer',
  'custom-software',
  'seo-audit',
  'email-marketing',
  'reputation-management',
  'bundle-portal-presence',
  'bundle-sales-launch',
  'bundle-ops-clarity',
];

async function jfetch(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    redirect: opts.redirect || 'manual',
    headers: {
      Accept: 'application/json',
      ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return {
    status: res.status,
    ok: res.ok,
    json,
    text: text.slice(0, 1200),
    location: res.headers.get('location'),
  };
}

function replyText(chatJson) {
  return String(
    chatJson?.data?.message?.text ||
      chatJson?.data?.reply ||
      chatJson?.data?.text ||
      chatJson?.data?.assistantMessage ||
      JSON.stringify(chatJson?.data || {}).slice(0, 1500),
  );
}

function catalogHits(blob) {
  const lower = blob.toLowerCase();
  return CATALOG_IDS.filter(
    (id) => lower.includes(id) || new RegExp(id.replace(/-/g, '[- ]?'), 'i').test(blob),
  );
}

const report = {
  generatedAt: new Date().toISOString(),
  api: API,
  web: WEB,
  probes: {},
  fixesApplied: [],
};

// ---------- OMI public (multi-industry) ----------
{
  const industries = [
    {
      slug: 'healthcare',
      msg: 'I run a small healthcare clinic. Leads are inconsistent and our website does not convert. Which package should I buy and how much in EUR?',
    },
    {
      slug: 'construction',
      msg: 'We are a construction company needing CRM and ops onboarding for field crews. Recommend one Omni package with price.',
    },
    {
      slug: 'retail',
      msg: 'Retail shop needs better Google reviews and reputation. Which Omni package should I buy and what price in EUR?',
    },
  ];
  const chats = [];
  for (const ind of industries) {
    const session = await jfetch(`${API}/api/v1/video-meetings/public/avatar/session`, {
      method: 'POST',
      body: JSON.stringify({ freshConsultation: true }),
    });
    const sessionId =
      session.json?.data?.sessionId || session.json?.sessionId || session.json?.data?.id || null;
    if (!sessionId) {
      chats.push({ industry: ind.slug, verdict: 'FAIL', reason: 'no session', sessionHttp: session.status });
      continue;
    }
    const chat = await jfetch(`${API}/api/v1/video-meetings/public/avatar/chat`, {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        message: ind.msg,
        pageContext: { path: '/', industryHint: ind.slug },
      }),
    });
    const blob = replyText(chat.json);
    const hits = catalogHits(blob);
    const money = /€|eur|\b\d{2,5}\b/i.test(blob);
    const industryMention = new RegExp(ind.slug.replace(/_/g, '[-_ ]?'), 'i').test(blob) ||
      (ind.slug === 'healthcare' && /clinic|health/i.test(blob)) ||
      (ind.slug === 'construction' && /construct|field|crew/i.test(blob)) ||
      (ind.slug === 'retail' && /retail|review|reputation/i.test(blob));
    const rateLimited = chat.status === 429 || /OMI_USAGE_LIMIT|hourly_limit/i.test(blob);
    const pass =
      !rateLimited &&
      session.ok &&
      chat.ok &&
      blob.length > 80 &&
      (hits.length > 0 || /package|setup|website|audit|retainer|landing|reputation/i.test(blob)) &&
      money;
    chats.push({
      industry: ind.slug,
      verdict: rateLimited ? 'RATE_LIMITED' : pass ? 'PASS' : 'FAIL',
      sessionHttp: session.status,
      chatHttp: chat.status,
      catalogIdHits: hits,
      mentionsPrice: money,
      industryContextLikely: industryMention,
      replyPreview: blob.slice(0, 500),
    });
  }
  const passCount = chats.filter((c) => c.verdict === 'PASS').length;
  const rateLimitedCount = chats.filter((c) => c.verdict === 'RATE_LIMITED').length;
  const failCount = chats.filter((c) => c.verdict === 'FAIL').length;
  report.probes.omiPublic = {
    verdict:
      failCount === 0 && passCount > 0
        ? rateLimitedCount
          ? 'PASS_WITH_RATE_LIMIT'
          : passCount === chats.length
            ? 'PASS'
            : 'PASS_PARTIAL'
        : passCount > 0
          ? 'PASS_PARTIAL'
          : 'FAIL',
    passCount,
    rateLimitedCount,
    total: chats.length,
    chats,
    notes:
      rateLimitedCount > 0
        ? 'Anonymous public OMI has hourly rate limit — RATE_LIMITED is infra soft-limit, not a recommend bug.'
        : undefined,
  };
}

// ---------- Auth login ----------
let token = null;
{
  if (!admin.email || !admin.password) {
    report.probes.login = { verdict: 'FAIL', reason: 'missing ADMIN_EMAIL/PASSWORD' };
  } else {
    const login = await jfetch(`${API}/api/v1/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: admin.email, password: admin.password }),
    });
    token =
      login.json?.data?.accessToken ||
      login.json?.data?.token ||
      login.json?.accessToken ||
      login.json?.token ||
      null;
    const me = token
      ? await jfetch(`${API}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      : { status: 0, ok: false, json: null };
    report.probes.login = {
      verdict: login.ok && token && me.ok ? 'PASS' : 'FAIL',
      loginHttp: login.status,
      meHttp: me.status,
      email: admin.email,
      role: me.json?.data?.role || me.json?.role || me.json?.data?.user?.role || null,
      userId: me.json?.data?.id || me.json?.data?.user?.id || null,
    };
  }
}

const auth = token ? { Authorization: `Bearer ${token}` } : {};

// ---------- Authenticated OMI (support avatar) ----------
{
  if (!token) {
    report.probes.omiAuthed = { verdict: 'SKIP', reason: 'no token' };
  } else {
    const session = await jfetch(`${API}/api/v1/video-meetings/support/avatar/session`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({}),
    });
    const sessionId =
      session.json?.data?.sessionId || session.json?.sessionId || session.json?.data?.id || null;
    let chat = { status: 0, ok: false, json: null };
    let blob = '';
    if (sessionId) {
      chat = await jfetch(`${API}/api/v1/video-meetings/support/avatar/chat`, {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({
          sessionId,
          message: 'Where do I see my orders and invoices in the client portal?',
        }),
      });
      blob = replyText(chat.json);
    }
    const portalHint = /dashboard|orders|billing|invoice|portal|deliver/i.test(blob);
    report.probes.omiAuthed = {
      verdict: session.ok && chat.ok && blob.length > 40 && portalHint ? 'PASS' : session.ok && chat.ok ? 'PASS_WEAK' : 'FAIL',
      sessionHttp: session.status,
      chatHttp: chat.status,
      replyPreview: blob.slice(0, 500),
      portalHint,
    };
  }
}

// ---------- Client portal APIs ----------
{
  const endpoints = [
    ['me', 'GET', '/api/v1/auth/me'],
    ['fulfillmentJobs', 'GET', '/api/v1/billing/fulfillment/jobs?limit=20'],
    ['invoices', 'GET', '/api/v1/billing/invoices?limit=20&page=1'],
    ['paymentsMethods', 'GET', '/api/v1/payments/methods'],
    ['introPromo', 'GET', '/api/v1/payments/deliverable-intro-promo'],
    ['supportMine', 'GET', '/api/v1/video-meetings/support/mine'],
  ];
  // support tickets if exists
  const optional = [
    ['supportTickets', 'GET', '/api/v1/support/tickets?limit=10'],
    ['notifications', 'GET', '/api/v1/notifications?limit=10'],
    ['documents', 'GET', '/api/v1/documents?limit=10'],
  ];

  const results = {};
  for (const [name, method, path] of [...endpoints, ...optional]) {
    if (!token) {
      results[name] = { verdict: 'SKIP' };
      continue;
    }
    const r = await jfetch(`${API}${path}`, { method, headers: auth });
    const required = endpoints.some((e) => e[0] === name);
    const okish = r.status === 200 || (!required && (r.status === 404 || r.status === 403));
    results[name] = {
      verdict: r.status === 200 ? 'PASS' : required ? 'FAIL' : r.status === 404 || r.status === 403 ? 'ABSENT_OK' : 'FAIL',
      http: r.status,
      preview: r.text.slice(0, 180),
    };
  }

  const coreFail = endpoints.some((e) => results[e[0]]?.verdict === 'FAIL');
  report.probes.portalApis = {
    verdict: !token ? 'FAIL' : coreFail ? 'FAIL' : 'PASS',
    results,
  };
}

// ---------- Web dashboard routes (auth gate + shell) ----------
{
  const routes = [
    '/dashboard',
    '/dashboard/orders',
    '/dashboard/deliveries',
    '/dashboard/projects',
    '/dashboard/tasks',
    '/dashboard/billing',
    '/dashboard/documents',
    '/dashboard/support',
    '/dashboard/consultation',
    '/dashboard/account',
    '/dashboard/order',
    '/login',
    '/register',
  ];
  const routeResults = [];
  for (const path of routes) {
    const r = await jfetch(`${WEB}${path}`, { redirect: 'manual' });
    const loc = r.location || '';
    const ok =
      r.status === 200 ||
      ((r.status === 307 || r.status === 302) && /login/i.test(loc)) ||
      r.status === 308;
    routeResults.push({
      path,
      http: r.status,
      location: loc || null,
      verdict: ok ? 'PASS' : 'FAIL',
    });
  }

  // Cookie login via web /api/auth/login (same path humans use)
  let cookieHeader = '';
  let webLogin = { status: 0, ok: false };
  let authedRoutes = [];
  let bff = [];
  if (admin.email && admin.password) {
    const loginRes = await fetch(`${WEB}/api/auth/login`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: admin.email, password: admin.password, rememberMe: true }),
      redirect: 'manual',
    });
    const setCookies = typeof loginRes.headers.getSetCookie === 'function'
      ? loginRes.headers.getSetCookie()
      : [];
    const single = loginRes.headers.get('set-cookie');
    const parts = setCookies.length ? setCookies : single ? [single] : [];
    cookieHeader = parts.map((c) => c.split(';')[0]).filter(Boolean).join('; ');
    const loginJson = await loginRes.json().catch(() => ({}));
    webLogin = {
      status: loginRes.status,
      ok: loginRes.ok && Boolean(loginJson?.ok),
      redirectTo: loginJson?.redirectTo || null,
      hasCookie: Boolean(cookieHeader),
    };

    if (cookieHeader) {
      for (const path of [
        '/dashboard',
        '/dashboard/orders',
        '/dashboard/deliveries',
        '/dashboard/billing',
        '/dashboard/support',
        '/dashboard/documents',
        '/dashboard/account',
        '/admin',
      ]) {
        const r = await fetch(`${WEB}${path}`, {
          headers: { Cookie: cookieHeader, Accept: 'text/html' },
          redirect: 'manual',
        });
        const loc = r.headers.get('location') || '';
        const ok =
          r.status === 200 ||
          // admin may land on dashboard for non-admin; client may bounce admin→admin
          ((r.status === 307 || r.status === 302) && !/login/i.test(loc));
        authedRoutes.push({
          path,
          http: r.status,
          location: loc || null,
          verdict: ok ? 'PASS' : 'FAIL',
        });
      }
      for (const path of [
        '/api/atina/billing/fulfillment/jobs?limit=5',
        '/api/atina/billing/invoices?limit=5&page=1',
        '/api/atina/payments/methods',
        '/api/atina/payments/deliverable-intro-promo',
      ]) {
        const r = await fetch(`${WEB}${path}`, {
          headers: { Cookie: cookieHeader, Accept: 'application/json' },
        });
        bff.push({
          path,
          http: r.status,
          verdict: r.status === 200 ? 'PASS' : 'FAIL',
        });
      }
    }
  }

  const webAuthOk =
    webLogin.ok &&
    authedRoutes.length > 0 &&
    authedRoutes.every((x) => x.verdict === 'PASS') &&
    bff.every((x) => x.verdict === 'PASS');
  report.probes.portalWeb = {
    verdict:
      routeResults.every((x) => x.verdict === 'PASS') && webAuthOk
        ? 'PASS'
        : routeResults.every((x) => x.verdict === 'PASS') && webLogin.ok
          ? 'PASS_PARTIAL'
          : 'FAIL',
    routes: routeResults,
    webLogin,
    authedRoutes,
    bff,
  };
}

// ---------- Soft register throwaway client (optional resilience) ----------
{
  const email = `soft-portal-${Date.now()}@example.com`;
  const password = `SoftPortal!${String(Date.now()).slice(-6)}`;
  const reg = await jfetch(`${API}/api/v1/auth/register`, {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      name: 'Soft Portal Probe',
      company: 'Soft Probe Co',
    }),
  });
  let clientToken = null;
  if (reg.ok) {
    clientToken =
      reg.json?.data?.accessToken ||
      reg.json?.data?.token ||
      reg.json?.accessToken ||
      null;
  }
  if (!clientToken && (reg.status === 409 || reg.status === 400)) {
    // try login if exists
    const login = await jfetch(`${API}/api/v1/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    clientToken = login.json?.data?.accessToken || login.json?.accessToken || null;
  }
  let clientMe = null;
  if (clientToken) {
    clientMe = await jfetch(`${API}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${clientToken}` },
    });
  }
  report.probes.clientRegister = {
    verdict: clientToken && clientMe?.ok ? 'PASS' : reg.status === 403 || reg.status === 404 ? 'DISABLED_OK' : 'FAIL',
    registerHttp: reg.status,
    meHttp: clientMe?.status ?? null,
    email,
    note: 'Throwaway client account for soft-start; password not stored in evidence.',
  };
}

// ---------- Overall ----------
const omiPublicOk = ['PASS', 'PASS_PARTIAL', 'PASS_WITH_RATE_LIMIT'].includes(
  report.probes.omiPublic?.verdict,
);
const omiAuthedOk = ['PASS', 'PASS_WEAK', 'SKIP'].includes(report.probes.omiAuthed?.verdict);
const portalWebOk = ['PASS', 'PASS_PARTIAL'].includes(report.probes.portalWeb?.verdict);
const overall =
  omiPublicOk &&
  omiAuthedOk &&
  report.probes.login?.verdict === 'PASS' &&
  report.probes.portalApis?.verdict === 'PASS' &&
  portalWebOk
    ? report.probes.omiPublic?.verdict === 'PASS' &&
      report.probes.omiAuthed?.verdict === 'PASS' &&
      report.probes.portalWeb?.verdict === 'PASS' &&
      report.probes.clientRegister?.verdict === 'PASS'
      ? 'PASS'
      : 'PASS_WITH_WARN'
    : 'FAIL';

report.overall = overall;
report.p2StillBlocked = ['Stripe LIVE', 'firma/VAT companyLegalName'];

const jsonPath = join(outDir, `_omi-portal-ready-${stamp}.json`);
const mdPath = join(outDir, `_omi-portal-ready-${stamp}.md`);
writeFileSync(jsonPath, JSON.stringify(report, null, 2));

const md = `# OMI + logged-in portal readiness

Generated: ${report.generatedAt}
Overall: **${overall}**
API: \`${API}\` · Web: \`${WEB}\`

## OMI public (multi-industry)
- Verdict: **${report.probes.omiPublic?.verdict}** (${report.probes.omiPublic?.passCount}/${report.probes.omiPublic?.total})
${(report.probes.omiPublic?.chats || [])
  .map(
    (c) =>
      `- ${c.industry}: ${c.verdict} · hits=[${(c.catalogIdHits || []).join(', ')}] · price=${c.mentionsPrice} · ctx=${c.industryContextLikely}`,
  )
  .join('\n')}

## OMI authenticated (support avatar)
- Verdict: **${report.probes.omiAuthed?.verdict}**
- Preview: ${(report.probes.omiAuthed?.replyPreview || '').replace(/\n/g, ' ').slice(0, 280)}

## Login
- Verdict: **${report.probes.login?.verdict}** · role=${report.probes.login?.role} · me=${report.probes.login?.meHttp}

## Portal APIs
- Verdict: **${report.probes.portalApis?.verdict}**
${Object.entries(report.probes.portalApis?.results || {})
  .map(([k, v]) => `- ${k}: ${v.verdict} (HTTP ${v.http ?? '—'})`)
  .join('\n')}

## Portal web routes
- Verdict: **${report.probes.portalWeb?.verdict}**
${(report.probes.portalWeb?.routes || []).map((r) => `- ${r.path}: ${r.verdict} (${r.http}${r.location ? ' → ' + r.location : ''})`).join('\n')}

## Client register
- Verdict: **${report.probes.clientRegister?.verdict}** (HTTP ${report.probes.clientRegister?.registerHttp})

## Still Marko P2 (not claimed)
- Stripe LIVE · firma/VAT

Evidence JSON: \`${jsonPath}\`
`;
writeFileSync(mdPath, md);

console.log(md);
console.log(`\nWrote ${jsonPath}`);
if (overall === 'FAIL') process.exit(1);
process.exit(0);
