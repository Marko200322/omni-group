/** CEO matrix: Dominus v3–v6 capability map (structural registry, not full PDF parity). */
export const DOMINUS_SUBMODULES = [
  {
    id: 'v3-swarm',
    version: 'v3',
    label: 'Swarm orchestration',
    ceo_status: 'n/a' as const,
    note: 'Distributed agent mesh — requires infra aggregator + live cluster credentials',
  },
  {
    id: 'v4-forecast',
    version: 'v4',
    label: 'Multi-horizon forecasting',
    ceo_status: 'partial' as const,
    note: 'Exposed via Dominus run mode forecast; full Monte Carlo deferred',
  },
  {
    id: 'v5-risk',
    version: 'v5',
    label: 'Risk shield & compliance scan',
    ceo_status: 'partial' as const,
    note: 'risk-scan mode + AI enrichment when AI_URL configured',
  },
  {
    id: 'v6-allocation',
    version: 'v6',
    label: 'Resource allocation optimizer',
    ceo_status: 'partial' as const,
    note: 'resource-allocation mode; live FinOps hooks need FINANCE_URL',
  },
] as const;

export type DominusSubmodule = (typeof DOMINUS_SUBMODULES)[number];
