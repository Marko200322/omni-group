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
  bestFor?: string;
  billing: DeliverableBilling;
  category: 'implementation' | 'consulting' | 'retainer' | 'growth' | 'vertical';
  anchorEur: number;
  resources: ResourceProfile;
  modules?: string[];
  baseDeliverableId?: string;
  industrySlug?: string;
  problemsSolved?: string[];
  isIndustryPackage?: boolean;
};
