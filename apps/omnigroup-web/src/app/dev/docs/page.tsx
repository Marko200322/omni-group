import type { Metadata } from 'next';
import { Suspense } from 'react';

import { DevDocsSections, type DocSection } from './DevDocsSections';

export const metadata: Metadata = {
  title: 'Repo docs',
  description:
    'Internal browse of repo paths by section: search (#dev-docs-search), anchors #sec-…, link copying (noindex).',
  robots: { index: false, follow: false },
};

const sections: DocSection[] = [
  {
    title: 'Entry and navigation',
    paths: [
      'README.md',
      'NIVO-1-START.md',
      'NIVO-1-MASTER-CHECKLIST.md',
      'NIVO-2-START.md',
      'NIVO-2-MASTER-CHECKLIST.md',
      'NIVO-3-START.md',
      'NIVO-3-MASTER-CHECKLIST.md',
      'CONTRIBUTING.md',
      'SYSTEM-MAP.md',
      'AGENT-RADNI-PLAN.md',
      'docs/MASTER-WORK-LIST.md',
      'docs/EVIDENCE-INDEX.md',
      'docs/NIVO-1-DRYRUN-LOG.md',
      'docs/TYPEORM-PROD-EVIDENCE-LATEST.md',
      'docs/GIT-A-EVIDENCE-LATEST.md',
      'docs/CEO-G-PRODUCTION-EVIDENCE-LATEST.md',
      'CHECKLIST-CEO-SISTEM.md',
      'docs/CEO-OPEN-BULLETS-RUNBOOK.md',
      'docs/COMPLETE-SYSTEM-PLAN-AND-CHECKLIST.md',
      'docs/NIVO-3-VISION-K8S-AI.md',
      'docs/AKCIONI-PLAN-NOVITETI-I-CEO.md',
      'docs/NIVO-3-STATUS.md',
      'docs/NIVO-3-AGENT-WAVES.md',
      'docs/NIVO-2-AGENT-WAVES.md',
      'docs/NIVO-3-AUDIT-ROADMAP.md',
      'docs/NIVO-3-PLAN-RADA-OSTALO.md',
      'docs/VLASNIK-ZAVRSAVA.md',
      'docs/VAULT-B-INTEGRATED-RUNBOOK.md',
      'docs/VAULT-B-EVIDENCE-LATEST.md',
      'docs/VAULT-ALIGNMENT-NOTES.md',
      'docs/NIVO-2-DISCOVERY-AUDIT.md',
      'docs/NIVO-3-SVE-INVENTORY.md',
      'docs/NIVO-2-CEO-PDF-RULES-CLOSURE.md',
      'docs/NIVO-2-CEO-D-TRACE.md',
      'docs/NIVO-3-PDF-TRACE.md',
      'docs/NIVO-3-PDF-FULL-AUDIT-COMPLETE.md',
      'docs/NIVO-3-CEO-F-PR-BODY.md',
      'docs/TEHNICKI-AUDIT-2026-05-13.md',
      'docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md',
      'docs/VLASNIK-PAKET.md',
      'docs/D1-ITER2-PR-BODY.md',
      'docs/NPM-AUDIT-MONOREPO.md',
      'atina-system/docs/NPM-AUDIT-NIVO1.md',
      'scripts/audit-npm-monorepo.ps1',
      'docs/EMPTY-DOCS-RUNBOOK.md',
      'scripts/check-doc-links.ps1',
      'docs/AGENT-WORK-2026-05-14-SUMMARY.md',
      'docs/MONOREPO-HEALTH-SNAPSHOT-LATEST.md',
      'docs/OWNER-ACTION-CHECKLIST.md',
      'scripts/check-pytest-config-consistency.ps1',
      'scripts/check-vscode-settings-presence.ps1',
      'scripts/check-prettier-config-consistency.ps1',
      'scripts/check-shared-deps-consistency.ps1',
      'scripts/check-tailwind-config-consistency.ps1',
      'scripts/check-next-config-consistency.ps1',
      'scripts/check-jest-config-consistency.ps1',
      'scripts/check-jest-e2e-config-consistency.ps1',
      'scripts/check-nest-cli-config-consistency.ps1',
      'scripts/check-typeorm-data-source-consistency.ps1',
      'scripts/check-dev-docs-coverage.ps1',
      'scripts/scan-todo-markers.ps1',
      'scripts/run-all-audits.ps1',
      'scripts/regenerate-help-snapshot.ps1',
      'scripts/check-talas-cross-references.ps1',
      'scripts/check-script-readme-coverage.ps1',
      'scripts/check-help-blocks-position.ps1',
      'scripts/check-ps-encoding.ps1',
      'scripts/check-package-json-consistency.ps1',
      'scripts/check-workflow-consistency.ps1',
      'scripts/check-readme-presence.ps1',
      'scripts/check-markdown-code-blocks.ps1',
      'scripts/check-codeblock-skip-consistency.ps1',
      'scripts/check-tsconfig-consistency.ps1',
      'scripts/check-dev-docs-stale-entries.ps1',
      'scripts/check-eslint-consistency.ps1',
      'scripts/check-gitignore-consistency.ps1',
      'scripts/check-env-example-presence.ps1',
      'scripts/check-package-scripts-consistency.ps1',
      'scripts/check-repo-meta-files-presence.ps1',
      'scripts/check-dev-deps-versions-consistency.ps1',
      'scripts/check-github-meta-files-presence.ps1',
      'scripts/check-package-lock-presence.ps1',
      'scripts/check-docker-files-presence.ps1',
      'scripts/check-docker-compose-consistency.ps1',
      'scripts/check-docker-compose-typeorm-sync-consistency.ps1',
      'scripts/check-docker-node-image-vs-engines.ps1',
      'scripts/check-python-package-consistency.ps1',
      'docs/TALAS-INDEX.md',
      'docs/README.md',
      'scripts/AGENT-AUTOMATION-GUIDE.md',
      'docs/SCRIPTS-HELP-SNAPSHOT.md',
      'docs/SCRIPTS-HELP-SNAPSHOT-ATINA.md',
      'docs/MASTER-FINAL-ROADMAP.md',
      'docs/MASTER-SEQUENCE-HUB.md',
      'docs/MASTER-SEQUENCE-01-BASELINE.md',
      'docs/MASTER-SEQUENCE-02-GATE-GREEN.md',
      'docs/MASTER-SEQUENCE-03-STAGING-LIVE.md',
      'docs/MASTER-SEQUENCE-04-PROD-CUTOVER.md',
      'docs/MASTER-SEQUENCE-05-SUSTAIN-AND-DEPTH.md',
      'docs/N2-0-3-EVIDENCE-LATEST.md',
      'docs/SECRETS-MATRIX.md',
    ],
  },
  {
    title: 'Level 3 — Wave A (master spec documents)',
    paths: [
      'docs/nivo3-wave-a/01-master-spec-final.md',
      'docs/nivo3-wave-a/02-ultimate-ultra.md',
      'docs/nivo3-wave-a/03-titanix-astra.md',
      'docs/nivo3-wave-a/04-craftor-supply-dominus.md',
      'docs/nivo3-wave-a/05-omnitube-apex.md',
      'docs/nivo3-wave-a/06-g-ops-audit-vision.md',
    ],
  },
  {
    title: 'Phase 4 and dashboard (design)',
    paths: [
      'docs/DASHBOARD-AUTH-ROADMAP.md',
      'docs/FAZA-4-F4-6-NEXT.md',
      'docs/F4-6-UPLOAD-SPIKE.md',
      'docs/API-CONTRACTS-INDEX.md',
      'docs/FAZA-4-BACKLOG-ISSUES.md',
      'docs/FAZA-4-SAAS-DECISION.md',
      'docs/FAZA-6-BACKLOG.md',
    ],
  },
  {
    title: 'CI, Git, monorepo gate',
    paths: [
      'docs/CI-GREEN-ON-MAIN.md',
      '.github/workflows/ci-monorepo.yml',
      'docs/GIT-BRANCH-PROTECTION.md',
      'docs/NIVO-1-F4-TIM-CHECKLIST.md',
      'docs/WAVE-AGENT-EXECUTION-PLAN.md',
      'scripts/README.md',
      'scripts/verify-monorepo.ps1',
      'scripts/smoke-stack.ps1',
      'scripts/audit-doc-gate-references.ps1',
      'docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE-LATEST.md',
      'docs/NIVO-1-VERIFY-MONOREPO-EVIDENCE.template.md',
      'docs/NIVO-1-SMOKE-EVIDENCE-LATEST.md',
    ],
  },
  {
    title: 'Staging i observability',
    paths: [
      'docs/STAGING-RELEASE-CHECKLIST.md',
      'docs/STAGING-MIRROR-PROD.md',
      'docs/STAGING-EXECUTION-LOG.template.md',
      'docs/SMTP-STAGING-RUNBOOK.md',
      'docs/NIVO-2-STAGING-WEBHOOKS.md',
      'docs/OBSERVABILITY-RUNBOOK.md',
    ],
  },
  {
    title: 'Python (monorepo root)',
    paths: [
      'docs/PYTHON-ASTRA-OPS.md',
      'tests/README.md',
      'pytest.ini',
      'requirements.txt',
      'docker-compose.yml',
      'docker-compose.override.yml',
      'docker-compose.atina.yml',
      'docker-compose.nest-port-3001.yml',
      'Dockerfile',
    ],
  },
  {
    title: 'Nest (atina-system)',
    paths: [
      'atina-system/README.md',
      'atina-system/docs/HEALTH-AND-OPS.md',
      'atina-system/docs/TYPEORM-PRODUCTION-CHECKLIST.md',
      'atina-system/docs/QUEUE-SMOKE-DEV.md',
      'atina-system/docs/MIGRATIONS-PLAN.md',
      'atina-system/docs/NIVO-3-SUPPLY-CORE-PDF.md',
      'atina-system/Dockerfile',
      'atina-system/package.json',
      'atina-system/tsconfig.json',
    ],
  },
  {
    title: 'Atina Node (SaaS)',
    paths: [
      'atina-platform/atina/README.md',
      'atina-platform/atina/docs/operations/deploy-rollback-checklist.md',
      'atina-platform/atina/docs/operations/release-gate-checklist.md',
      'atina-platform/atina/docs/operations/NIVO-2-E2E.md',
      'atina-platform/atina/docs/operations/production-config-matrix.md',
      'atina-platform/atina/docs/operations/EMAIL-SURFACE.md',
      'atina-platform/atina/docs/operations/LOGGING-NOTES.md',
      'atina-platform/atina/docs/operations/db-backup-restore-runbook.md',
      'atina-platform/atina/docs/operations/db-rollback-drill-runbook.md',
      'atina-platform/atina/docs/operations/digital-signature-wiring-checklist.md',
      'atina-platform/atina/docs/operations/monitoring-alert-channel-policy.md',
      'atina-platform/atina/docs/operations/NIVO-1-GATE.md',
      'atina-platform/atina/docs/operations/NIVO-3-G-ALIGNMENT.md',
      'atina-platform/atina/docs/operations/release-signoff-template.md',
      'atina-platform/atina/docker-compose.yml',
      'atina-platform/atina/Dockerfile',
      'atina-platform/atina/.env.example',
      'atina-platform/atina/package.json',
      'atina-platform/atina/tsconfig.json',
    ],
  },
  {
    title: 'Tools (monorepo)',
    paths: ['tools/youtube-pipeline/RUNBOOK.md'],
  },
  {
    title: 'Omnigroup Next (this app)',
    paths: [
      'apps/omnigroup-web/README.md',
      'apps/omnigroup-web/src/app/layout.tsx',
      'apps/omnigroup-web/src/app/globals.css',
      'apps/omnigroup-web/package.json',
      'apps/omnigroup-web/package-lock.json',
      'apps/omnigroup-web/.eslintrc.json',
      'apps/omnigroup-web/.nvmrc',
      'apps/omnigroup-web/next.config.mjs',
      'apps/omnigroup-web/postcss.config.mjs',
      'apps/omnigroup-web/tailwind.config.ts',
      'apps/omnigroup-web/tsconfig.json',
      'apps/omnigroup-web/.env.example',
      'apps/omnigroup-web/src/app/dev/layout.tsx',
      'apps/omnigroup-web/src/app/dev/docs/page.tsx',
      'apps/omnigroup-web/src/app/dev/docs/section-heading-id.ts',
      'apps/omnigroup-web/src/app/dev/docs/DevDocsSections.tsx',
      'apps/omnigroup-web/src/lib/atina.ts',
      'apps/omnigroup-web/src/lib/atina-display.ts',
      'apps/omnigroup-web/src/components/Navbar.tsx',
      'apps/omnigroup-web/src/components/Footer.tsx',
      'apps/omnigroup-web/src/components/LogoRing.tsx',
      'apps/omnigroup-web/src/app/page.tsx',
      'apps/omnigroup-web/src/app/services/page.tsx',
      'apps/omnigroup-web/src/app/pricing/page.tsx',
      'apps/omnigroup-web/src/app/contact/page.tsx',
      'apps/omnigroup-web/src/app/dashboard/page.tsx',
      'apps/omnigroup-web/src/app/dashboard/DashboardClient.tsx',
      'apps/omnigroup-web/src/app/admin/page.tsx',
      'apps/omnigroup-web/src/app/admin/AdminClient.tsx',
      'apps/omnigroup-web/src/app/api/contact/route.ts',
      'apps/omnigroup-web/src/app/api/health/route.ts',
      'apps/omnigroup-web/src/app/robots.ts',
      'apps/omnigroup-web/src/app/sitemap.ts',
    ],
  },
];

export default function DevDocsPage() {
  return (
    <div className="px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold text-gradient">Dev — repo docs</h1>
        <p className="mt-4 text-sm text-gray-500">
          List source: <code className="text-violet-400">src/app/dev/docs/page.tsx</code> — split by
          sections; search in <code className="text-violet-400">DevDocsSections.tsx</code> filters
          titles and paths, visually highlights matches, clears the query on Esc, focuses search with
          Ctrl/⌘+K or the <code className="text-violet-400">/</code> key (outside other fields), syncs the query with the URL parameter <code className="text-violet-400">q</code>,
          copies paths, copies the full page link, copies only the hash fragment from the address when present (button state follows **hashchange** and **popstate**), and shows a visible button to clear the query; when there are no matches, a panel with the quoted query and a button to clear the filter; section/path count in the{' '}
          <code className="text-violet-400">&lt;output htmlFor=&quot;dev-docs-filter&quot;&gt;</code> (
          <code className="text-violet-400">aria-live=&quot;polite&quot;</code>,{' '}
          <code className="text-violet-400">aria-relevant=&quot;text&quot;</code>,{' '}
          <code className="text-violet-400">aria-label</code> for statistics); search has{' '}
          <code className="text-violet-400">role=&quot;search&quot;</code>, a link to the result list, and{' '}
          <code className="text-violet-400">aria-describedby</code> pointing to the section/path count; the field has{' '}
          <code className="text-violet-400">aria-keyshortcuts</code> (Ctrl/⌘+K and{' '}
          <code className="text-violet-400">/</code> outside other fields);{' '}
          <code className="text-violet-400">aria-controls</code> includes{' '}
          <code className="text-violet-400">dev-docs-empty</code> when an empty result is shown, and{' '}
          <code className="text-violet-400">dev-docs-quick-jump</code> when{' '}
          <strong className="font-normal text-gray-400">Quick jump</strong> navigation is in the DOM.
          Section headings have anchors of the form <code className="text-violet-400">#sec-…</code> (e.g.{' '}
          <code className="text-violet-400">#sec-entry-and-navigation</code>); for hash{' '}
          <code className="text-violet-400">#sec-…</code> the page scrolls and focuses the heading if it is
          visible; for <code className="text-violet-400">#dev-docs-filter</code> focus moves to the search field; for{' '}
          <code className="text-violet-400">#dev-docs-search</code> scroll to the entire search region (
          <code className="text-violet-400">role=&quot;search&quot;</code>). Scroll to anchor is{' '}
          <code className="text-violet-400">smooth</code> only if the user does not have{' '}
          <code className="text-violet-400">prefers-reduced-motion: reduce</code>.
          Updating{' '}
          <code className="text-violet-400">?q=</code> preserves the existing hash; next to each section title you can
          copy the full URL including <code className="text-violet-400">#sec-…</code>. Page tab
          title: <strong className="font-normal text-gray-400">Repo docs</strong> and short description
          via Next <code className="text-violet-400">metadata</code> (noindex). Along with search in{' '}
          <code className="text-violet-400">DevDocsSections.tsx</code>:{' '}
          <strong className="font-normal text-gray-400">Quick jump</strong> navigation (
          <code className="text-violet-400">#dev-docs-quick-jump</code>,{' '}
          <code className="text-violet-400">#sec-…</code>) — with an active filter, only sections that are
          visible. Keyboard skip links in{' '}
          <code className="text-violet-400">DevDocsSections.tsx</code>:{' '}
          <code className="text-violet-400">#dev-docs-filter</code>,{' '}
          <code className="text-violet-400">#dev-docs-search</code>, optionally{' '}
          <code className="text-violet-400">#dev-docs-quick-jump</code>,{' '}
          <code className="text-violet-400">#dev-docs-list</code>. The fixed skip block has no CSS{' '}
          <code className="text-violet-400">transition</code> with{' '}
          <code className="text-violet-400">prefers-reduced-motion: reduce</code> (
          <code className="text-violet-400">motion-reduce:transition-none</code>).
        </p>
        <Suspense fallback={<p className="mt-6 text-sm text-gray-500">Loading search…</p>}>
          <DevDocsSections sections={sections} />
        </Suspense>
        <p className="mt-10 text-gray-400">
          <code className="text-violet-300">/robots.txt</code> and{' '}
          <code className="text-violet-300">/sitemap.xml</code> are generated from{' '}
          <code className="text-violet-300">app/robots.ts</code> and{' '}
          <code className="text-violet-300">app/sitemap.ts</code>. Set the canonical base for the sitemap in
          production via <code className="text-violet-300">NEXT_PUBLIC_SITE_URL</code> (see{' '}
          <code className="text-violet-300">apps/omnigroup-web/README.md</code> and{' '}
          <code className="text-violet-300">.env.example</code>).
        </p>
        <p className="mt-4 text-gray-400">Repo paths from the list — open in your editor or on GitHub.</p>
      </div>
    </div>
  );
}

