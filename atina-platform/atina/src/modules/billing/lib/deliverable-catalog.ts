/** Sellable outputs — NOT platform access. Platform is internal; clients buy deliverables. */

export type DeliverableBilling = 'one_time' | 'monthly' | 'yearly';

export type ResourceProfile = {
  aiTokensK: number;
  scraperRuns: number;
  infraHours: number;
  supportHours: number;
  storageGbMonth: number;
  deployComplexity: number;
};

export type DeliverableDefinition = {
  id: string;
  name: string;
  nameSr: string;
  description: string;
  billing: DeliverableBilling;
  category: 'implementation' | 'consulting' | 'retainer' | 'growth' | 'vertical';
  anchorEur: number;
  resources: ResourceProfile;
  modules?: string[];
};

export const DELIVERABLE_CATALOG: DeliverableDefinition[] = [
  { id: 'setup-quick', name: 'Quick setup', nameSr: 'Brzo podešavanje', description: 'Portal, login, plaćanje, kontakt — spremno za rad za 5–7 dana.', billing: 'one_time', category: 'implementation', anchorEur: 390, resources: { aiTokensK: 8, scraperRuns: 0, infraHours: 3, supportHours: 2, storageGbMonth: 0, deployComplexity: 2 } },
  { id: 'setup-full', name: 'Full onboarding', nameSr: 'Pun onboarding', description: 'CRM, automatizacije, migracija, obuka, 30 dana podrške.', billing: 'one_time', category: 'implementation', anchorEur: 1290, resources: { aiTokensK: 45, scraperRuns: 2, infraHours: 12, supportHours: 8, storageGbMonth: 2, deployComplexity: 3 } },
  { id: 'setup-custom', name: 'Custom deploy', nameSr: 'Custom deploy', description: 'Produkcija: domen, SSL, backup, monitoring, SLA.', billing: 'one_time', category: 'implementation', anchorEur: 3900, resources: { aiTokensK: 20, scraperRuns: 0, infraHours: 24, supportHours: 12, storageGbMonth: 10, deployComplexity: 5 } },
  { id: 'audit', name: 'Technical audit', nameSr: 'Tehnički audit', description: 'Sigurnost, stack, plan migracije i ROI procena.', billing: 'one_time', category: 'consulting', anchorEur: 690, resources: { aiTokensK: 25, scraperRuns: 1, infraHours: 4, supportHours: 4, storageGbMonth: 0, deployComplexity: 1 } },
  { id: 'integration', name: 'Custom integration', nameSr: 'Integracija po meri', description: 'API, AI, email, plaćanja — povezivanje sa vašim alatima.', billing: 'one_time', category: 'consulting', anchorEur: 1190, resources: { aiTokensK: 30, scraperRuns: 3, infraHours: 8, supportHours: 6, storageGbMonth: 1, deployComplexity: 4 } },
  { id: 'workflow-design', name: 'Workflow design', nameSr: 'Dizajn workflow-a', description: 'Mapiranje procesa u automatizacije i SOP dokumentacija.', billing: 'one_time', category: 'consulting', anchorEur: 790, resources: { aiTokensK: 35, scraperRuns: 0, infraHours: 6, supportHours: 5, storageGbMonth: 0, deployComplexity: 2 } },
  { id: 'support-priority', name: 'Priority support', nameSr: 'Prioritetna podrška', description: 'Odgovor do 24h, manje izmene uključene.', billing: 'monthly', category: 'retainer', anchorEur: 199, resources: { aiTokensK: 5, scraperRuns: 0, infraHours: 1, supportHours: 3, storageGbMonth: 0, deployComplexity: 1 } },
  { id: 'support-dedicated', name: 'Dedicated support', nameSr: 'Dedicated podrška', description: 'Viber/Slack kanal, mesečni health check.', billing: 'monthly', category: 'retainer', anchorEur: 490, resources: { aiTokensK: 10, scraperRuns: 0, infraHours: 2, supportHours: 8, storageGbMonth: 1, deployComplexity: 1 } },
  { id: 'landing', name: 'Landing + copy', nameSr: 'Landing + copy', description: 'Profesionalna stranica i prodajni tekstovi za nišu.', billing: 'one_time', category: 'growth', anchorEur: 890, resources: { aiTokensK: 40, scraperRuns: 2, infraHours: 5, supportHours: 3, storageGbMonth: 0, deployComplexity: 2 } },
  { id: 'website-business', name: 'Business website', nameSr: 'Poslovni sajt (5–10 str)', description: 'Multi-page sajt sa uslugama, cenovnikom i kontaktom — hostovan na /sites/{slug}.', billing: 'one_time', category: 'growth', anchorEur: 2490, resources: { aiTokensK: 55, scraperRuns: 2, infraHours: 12, supportHours: 6, storageGbMonth: 1, deployComplexity: 3 } },
  { id: 'website-ecommerce', name: 'E-commerce website', nameSr: 'E-commerce sajt', description: 'Katalog, prodavnica i checkout tok — integracija plaćanja i multi-tenant hosting.', billing: 'one_time', category: 'growth', anchorEur: 3900, resources: { aiTokensK: 70, scraperRuns: 4, infraHours: 18, supportHours: 8, storageGbMonth: 3, deployComplexity: 4 } },
  { id: 'white-label-setup', name: 'White-label packaging', nameSr: 'White-label pakovanje', description: 'Brending, domen, prodajni materijali.', billing: 'one_time', category: 'growth', anchorEur: 1990, resources: { aiTokensK: 25, scraperRuns: 0, infraHours: 10, supportHours: 6, storageGbMonth: 2, deployComplexity: 4 } },
  { id: 'sales-enablement', name: 'Sales enablement', nameSr: 'Sales enablement', description: 'Demo skripte, FAQ, onboarding za vaš tim.', billing: 'one_time', category: 'growth', anchorEur: 1290, resources: { aiTokensK: 50, scraperRuns: 1, infraHours: 6, supportHours: 5, storageGbMonth: 0, deployComplexity: 2 } },
  { id: 'vertical-package', name: 'Vertical solution package', nameSr: 'Vertikalni paket rešenja', description: 'CRM + automatizacije + AI podrška po industriji.', billing: 'monthly', category: 'vertical', anchorEur: 179, resources: { aiTokensK: 80, scraperRuns: 8, infraHours: 4, supportHours: 2, storageGbMonth: 3, deployComplexity: 3 }, modules: ['crm', 'automation', 'support-avatar', 'billing'] },
  { id: 'lead-gen-retainer', name: 'Lead generation retainer', nameSr: 'Lead gen retainer', description: 'Leadovi, outreach i CRM pipeline mesečno.', billing: 'monthly', category: 'vertical', anchorEur: 349, resources: { aiTokensK: 60, scraperRuns: 20, infraHours: 2, supportHours: 1, storageGbMonth: 1, deployComplexity: 2 }, modules: ['client-hunter', 'titanis', 'outreach', 'scraper'] },
  { id: 'ai-support-retainer', name: 'AI support retainer', nameSr: 'AI podrška retainer', description: 'AI avatar + video sastanci za vaše klijente.', billing: 'monthly', category: 'vertical', anchorEur: 249, resources: { aiTokensK: 120, scraperRuns: 0, infraHours: 2, supportHours: 2, storageGbMonth: 2, deployComplexity: 2 }, modules: ['support-avatar', 'video-meetings', 'ai-rag'] },
  { id: 'custom-software', name: 'Custom software', nameSr: 'Softver po meri', description: 'Greenfield aplikacija, izolovana narudžbina, testirana pre isporuke.', billing: 'one_time', category: 'implementation', anchorEur: 4900, resources: { aiTokensK: 120, scraperRuns: 5, infraHours: 40, supportHours: 16, storageGbMonth: 5, deployComplexity: 5 } },
];

const BY_ID = new Map(DELIVERABLE_CATALOG.map((d) => [d.id, d]));

export function getDeliverable(id: string): DeliverableDefinition | null {
  return BY_ID.get(id.trim()) ?? null;
}

export function listDeliverables(category?: DeliverableDefinition['category']): DeliverableDefinition[] {
  if (!category) return [...DELIVERABLE_CATALOG];
  return DELIVERABLE_CATALOG.filter((d) => d.category === category);
}
