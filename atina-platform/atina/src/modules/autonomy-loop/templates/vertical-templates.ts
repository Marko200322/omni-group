import type { VerticalDeliveryPack } from '../lib/vertical-delivery-resolver';

export type VerticalTemplateVars = {
  slug: string;
  name: string;
  category: string;
  keywords: string;
  valueProp: string;
  monthlyPriceEur: number;
  coreModules: string[];
  outreachHooks: string[];
  recommendedDeliverables: Array<{ id: string; nameSr: string; clientPriceEur: number; billing: string }>;
};

export function deliveryPackToTemplateVars(pack: VerticalDeliveryPack): VerticalTemplateVars {
  return {
    slug: pack.verticalSlug,
    name: pack.displayName,
    category: pack.category,
    keywords: pack.keywords.join(', '),
    valueProp: pack.valueProp,
    monthlyPriceEur: pack.verticalPackageQuoteEur,
    coreModules: pack.coreModules,
    outreachHooks: pack.outreachHooks,
    recommendedDeliverables: pack.recommendedDeliverables,
  };
}

function classNameFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

export function renderVerticalModuleTs(v: VerticalTemplateVars): string {
  const className = classNameFromSlug(v.slug);
  const keywordArr = v.keywords.split(',').map((k) => k.trim()).filter(Boolean);
  const workflowLines = v.coreModules
    .slice(0, 6)
    .map((m) => `    { step: '${m}', module: '${m}', action: 'run' },`)
    .join('\n');

  return `/** Auto-generated vertical module — ${v.name} */
export const verticalSlug = '${v.slug}';
export const verticalCategory = '${v.category}';

export type ${className}Config = {
  slug: typeof verticalSlug;
  name: string;
  keywords: string[];
  crmPipeline: string;
  coreModules: string[];
  monthlyPriceEur: number;
};

export const ${className}Vertical: ${className}Config = {
  slug: verticalSlug,
  name: ${JSON.stringify(v.name)},
  keywords: ${JSON.stringify(keywordArr)},
  crmPipeline: '${v.category.replace(/_/g, '-')}-pipeline',
  coreModules: ${JSON.stringify(v.coreModules)},
  monthlyPriceEur: ${v.monthlyPriceEur},
};

export function ${className}WorkflowSteps() {
  return [
${workflowLines}
  ];
}
`;
}

export function renderVerticalPageTsx(v: VerticalTemplateVars): string {
  const fn = classNameFromSlug(v.slug);
  const deliverableLines = v.recommendedDeliverables
    .map((d) => `        <li>${d.nameSr} — od €${d.clientPriceEur} (${d.billing})</li>`)
    .join('\n');
  const hookLines = v.outreachHooks
    .slice(0, 3)
    .map((h) => `        <li>${h}</li>`)
    .join('\n');

  return `'use client';

/** Auto-generated landing — ${v.name} */
export default function ${fn}Page() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm uppercase tracking-wide text-emerald-400">${v.category.replace(/_/g, ' ')}</p>
      <h1 className="mt-2 text-3xl font-semibold text-white">${v.name}</h1>
      <p className="mt-4 text-slate-300">{${JSON.stringify(v.valueProp)}}</p>
      <p className="mt-4 text-sm text-emerald-300">
        Vertikalni paket: od €${v.monthlyPriceEur}/mes (tržište + resursi + provizija)
      </p>
      <h2 className="mt-8 text-lg font-medium text-white">Preporučene isporuke</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-400">
${deliverableLines}
      </ul>
      <h2 className="mt-8 text-lg font-medium text-white">Zašto ova niša</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-400">
${hookLines}
      </ul>
      <a
        href="/contact?service=vertical-package&category=${encodeURIComponent(v.category)}&vertical=${v.slug}"
        className="mt-8 inline-block rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white"
      >
        Zatraži ponudu — ${v.name}
      </a>
    </main>
  );
}
`;
}

export function renderVerticalWorkflowJson(pack: VerticalDeliveryPack): string {
  return JSON.stringify(
    {
      templateKey: `vertical-${pack.verticalSlug}`,
      name: `${pack.displayName} — full delivery loop`,
      verticalSlug: pack.verticalSlug,
      category: pack.category,
      subtype: pack.subtype,
      steps: pack.workflowSteps,
    },
    null,
    2,
  );
}

export function renderOutreachEmailMarkdown(pack: VerticalDeliveryPack): string {
  const hook = pack.outreachHooks[0] ?? pack.valueProp;
  const niche = pack.displayName.split('(')[0]?.trim() ?? pack.displayName;
  return `# Outreach — ${niche}

**Subject A:** ${hook} — spremno za ${niche}
**Subject B:** Kratka ponuda: CRM + automatizacije za ${niche}

---

Zdravo {{first_name}},

Primećujem da radite u niši **${niche}**. Pomažem timovima da dobiju gotovu isporuku (ne SaaS pretplatu):

- ${pack.outreachHooks[0] ?? 'CRM + automatizacije po vertikali'}
- ${pack.outreachHooks[1] ?? 'AI podrška i follow-up sekvence'}
- ${pack.outreachHooks[2] ?? 'Fakturisanje i praćenje uplata'}

Vertikalni paket za ovu nišu kreće od **€${pack.verticalPackageQuoteEur}/mes** — cena uključuje tržišnu vrednost, potrošnju resursa i proviziju platnog kanala.

Ako ima smisla, mogu poslati kratku ponudu prilagođenu {{company}}.

Pozdrav,
{{sender_name}}

---
vertical: \`${pack.verticalSlug}\`
category: \`${pack.category}\`
status: draft — šalji tek kad je domen zagrejan
`;
}

export function renderQualityChecklistJson(pack: VerticalDeliveryPack): string {
  return JSON.stringify(
    {
      verticalSlug: pack.verticalSlug,
      category: pack.category,
      displayName: pack.displayName,
      generatedAt: new Date().toISOString(),
      gates: pack.qualityGates.map((gate, i) => ({
        id: `gate-${i + 1}`,
        label: gate,
        required: true,
        status: 'pending',
      })),
      signOff: {
        ownerApproved: false,
        clientDelivered: false,
        notes: '',
      },
    },
    null,
    2,
  );
}

export function renderDeliverablePackJson(pack: VerticalDeliveryPack): string {
  return JSON.stringify(
    {
      verticalSlug: pack.verticalSlug,
      category: pack.category,
      valueProp: pack.valueProp,
      keywords: pack.keywords,
      coreModules: pack.coreModules,
      researchFocus: pack.researchFocus,
      recommendedDeliverables: pack.recommendedDeliverables,
      verticalPackageQuoteEur: pack.verticalPackageQuoteEur,
      contactUrl: `/contact?service=vertical-package&category=${encodeURIComponent(pack.category)}&vertical=${encodeURIComponent(pack.verticalSlug)}`,
    },
    null,
    2,
  );
}
