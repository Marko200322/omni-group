'use client';

// Placeholder Dashboard UI — D.1 (2026-05-13, OneDrive dehidracija).
// Pun runbook: docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md.
// Helper `loadAtinaPublicSnapshot` (lib/atina.ts) je rekonstruisan po dokumentovanom
// ugovoru (apps/omnigroup-web/README.md, .env.example) pa Dashboard sad prikazuje
// realan podatak sa Atina API-ja kad je `NEXT_PUBLIC_ATINA_API_BASE` dostupan.
// PRAVI Dashboard UI (KPI panel, status widget-i) je i dalje izgubljen — vrati ga
// iz OneDrive cloud-a / Git remote-a pre produkcionog deploy-a.
// TODO[D.1-restore]: rekonstruisati pravi DashboardClient (KPI grid, snapshot summary).

import type { AtinaPublicSnapshot } from '@/lib/atina';
import { describeSource, formatPlanLine } from '@/lib/atina-display';

type Props = { snapshot: AtinaPublicSnapshot };

export default function DashboardClient({ snapshot }: Props) {
  return (
    <main
      data-placeholder="dashboard-client"
      style={{
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 960,
        margin: '0 auto',
      }}
    >
      <h1 style={{ marginBottom: '0.5rem' }}>Dashboard (placeholder)</h1>
      <p style={{ marginTop: 0 }}>
        Ovaj ekran je <strong>privremeni placeholder</strong> dok se ne vrati pravi
        UI iz OneDrive cloud-a / Git remote-a (D.1). Runbook:{' '}
        <code>docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md</code>.
      </p>

      <section
        aria-labelledby="atina-status-h2"
        style={{
          marginTop: '1.5rem',
          padding: '1rem',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          background: '#fafafa',
        }}
      >
        <h2 id="atina-status-h2" style={{ marginTop: 0 }}>
          Atina health
        </h2>
        <p>
          <strong>Source:</strong> <code>{snapshot.source}</code> · <strong>Base:</strong>{' '}
          <code>{snapshot.apiBase}</code>
        </p>
        <p>{describeSource(snapshot)}</p>
        {snapshot.errors.length > 0 && (
          <details>
            <summary>Greške ({snapshot.errors.length})</summary>
            <ul>
              {snapshot.errors.map((e, i) => (
                <li key={i}>
                  <code>{e}</code>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section
        aria-labelledby="atina-plans-h2"
        style={{
          marginTop: '1.5rem',
          padding: '1rem',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
        }}
      >
        <h2 id="atina-plans-h2" style={{ marginTop: 0 }}>
          Billing plans
        </h2>
        <p>
          <strong>Plans count:</strong> {snapshot.plansCount}
        </p>
        {snapshot.plans.length > 0 ? (
          <ul>
            {snapshot.plans.map((p, i) => (
              <li key={p.slug ?? i}>{formatPlanLine(p)}</li>
            ))}
          </ul>
        ) : (
          <p style={{ fontStyle: 'italic', color: '#6b7280' }}>
            Nema dostupnih planova (Atina API nije dohvatljiv ili lista je prazna).
          </p>
        )}
      </section>

      <details style={{ marginTop: '1.5rem' }}>
        <summary>Sirov snapshot (JSON)</summary>
        <pre
          style={{
            background: '#f3f4f6',
            padding: '1rem',
            borderRadius: 8,
            overflow: 'auto',
          }}
        >
          {JSON.stringify(snapshot, null, 2)}
        </pre>
      </details>
    </main>
  );
}
