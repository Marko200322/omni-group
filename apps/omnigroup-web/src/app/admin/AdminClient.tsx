'use client';

// Placeholder Admin UI — D.1 (2026-05-13, OneDrive dehidracija).
// Pun runbook: docs/OMNIGROUP-WEB-EMPTY-FILES-RUNBOOK.md.
// Helper `loadAtinaPublicSnapshot` (lib/atina.ts) je rekonstruisan po dokumentovanom
// ugovoru (apps/omnigroup-web/README.md, .env.example) pa Admin sad prikazuje
// realan podatak sa Atina API-ja kad je `NEXT_PUBLIC_ATINA_API_BASE` dostupan.
// PRAVI Admin UI (auth gate, panels, akcije) je i dalje izgubljen — vrati ga
// iz OneDrive cloud-a / Git remote-a pre produkcionog deploy-a.
// TODO[D.1-restore]: rekonstruisati pravi AdminClient (auth gate, snapshot panel, akcije).

import type { AtinaPublicSnapshot } from '@/lib/atina';
import { describeSource, formatPlanLine } from '@/lib/atina-display';

type Props = { snapshot: AtinaPublicSnapshot };

export default function AdminClient({ snapshot }: Props) {
  return (
    <main
      data-placeholder="admin-client"
      style={{
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 960,
        margin: '0 auto',
      }}
    >
      <h1 style={{ marginBottom: '0.5rem' }}>Admin (placeholder)</h1>
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
          Atina API status
        </h2>
        <p>
          <strong>Source:</strong> <code>{snapshot.source}</code> · <strong>Base:</strong>{' '}
          <code>{snapshot.apiBase}</code> · <strong>Plans:</strong> {snapshot.plansCount}
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

      {snapshot.plans.length > 0 && (
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
            Billing plans (javni katalog)
          </h2>
          <ul>
            {snapshot.plans.map((p, i) => (
              <li key={p.slug ?? i}>{formatPlanLine(p)}</li>
            ))}
          </ul>
        </section>
      )}

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
