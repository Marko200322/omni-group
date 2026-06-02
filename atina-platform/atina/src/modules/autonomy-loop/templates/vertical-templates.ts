export type VerticalTemplateVars = {
  slug: string;
  name: string;
  category: string;
  keywords: string;
  valueProp: string;
};

export function renderVerticalModuleTs(v: VerticalTemplateVars): string {
  const className = v.slug
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
  return `/** Auto-generated vertical module — ${v.name} */
export const verticalSlug = '${v.slug}';
export const verticalCategory = '${v.category}';

export type ${className}Config = {
  slug: typeof verticalSlug;
  name: string;
  keywords: string[];
  crmPipeline: string;
  defaultPlan: 'starter' | 'pro' | 'enterprise';
};

export const ${className}Vertical: ${className}Config = {
  slug: verticalSlug,
  name: ${JSON.stringify(v.name)},
  keywords: ${JSON.stringify(v.keywords.split(',').map((k) => k.trim()).filter(Boolean))},
  crmPipeline: '${v.category}-pipeline',
  defaultPlan: 'pro',
};

export function ${className}WorkflowSteps() {
  return [
    { step: 'Lead capture', module: 'crm', action: 'create-contact' },
    { step: 'Follow-up', module: 'follow-up', action: 'schedule' },
    { step: 'Offer', module: 'deal-offer', action: 'create' },
    { step: 'Billing', module: 'billing', action: 'invoice' },
  ];
}
`;
}

export function renderVerticalPageTsx(v: VerticalTemplateVars): string {
  return `'use client';

/** Auto-generated landing snippet — ${v.name} */
export default function ${v.slug
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('')}Page() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm uppercase tracking-wide text-emerald-400">${v.category}</p>
      <h1 className="mt-2 text-3xl font-semibold text-white">${v.name}</h1>
      <p className="mt-4 text-slate-300">${v.valueProp}</p>
      <ul className="mt-6 list-disc space-y-2 pl-5 text-slate-400">
        <li>CRM + automatizacije prilagođene vertikali</li>
        <li>AI podrška i follow-up sekvence</li>
        <li>Fakturisanje i praćenje uplata</li>
      </ul>
      <a
        href="/login?next=/dashboard%23billing&vertical=${v.slug}"
        className="mt-8 inline-block rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white"
      >
        Započni — ${v.name}
      </a>
    </main>
  );
}
`;
}

export function renderVerticalWorkflowJson(v: VerticalTemplateVars): string {
  return JSON.stringify(
    {
      templateKey: `vertical-${v.slug}`,
      name: `${v.name} acquisition loop`,
      verticalSlug: v.slug,
      category: v.category,
      steps: [
        { moduleSlug: 'client-hunter', action: 'discover', config: { vertical: v.slug } },
        { moduleSlug: 'lead-scoring', action: 'score', config: { vertical: v.slug } },
        { moduleSlug: 'crm', action: 'create-contact', config: { source: v.slug } },
        { moduleSlug: 'outreach', action: 'send', config: { vertical: v.slug } },
        { moduleSlug: 'analytics', action: 'track', config: { eventName: `vertical_${v.slug}_converted` } },
      ],
    },
    null,
    2
  );
}
