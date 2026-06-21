export type ResourceCatalogItem = {
  sku: string;
  providerId: string;
  name: string;
  description: string;
  priceEur: number;
  creditEur: number;
  creditUsd: number;
  category: 'ai' | 'voice' | 'video' | 'comms' | 'scraper' | 'lead_db' | 'email_verify';
};

export const RESOURCE_CATALOG: ResourceCatalogItem[] = [
  {
    sku: 'openrouter_10',
    providerId: 'openrouter',
    name: 'OpenRouter credit',
    description: 'AI engine — ~$10 equivalent for chat and automations',
    priceEur: 10,
    creditEur: 10,
    creditUsd: 10,
    category: 'ai',
  },
  {
    sku: 'openrouter_25',
    providerId: 'openrouter',
    name: 'OpenRouter credit Plus',
    description: 'Larger AI pack — ~$25 for hunting and evolution ticks',
    priceEur: 24,
    creditEur: 24,
    creditUsd: 25,
    category: 'ai',
  },
  {
    sku: 'elevenlabs_10',
    providerId: 'elevenlabs',
    name: 'ElevenLabs voice',
    description: 'TTS credit for support/sales avatars',
    priceEur: 10,
    creditEur: 10,
    creditUsd: 10,
    category: 'voice',
  },
  {
    sku: 'heygen_starter',
    providerId: 'heygen',
    name: 'HeyGen video avatar',
    description: 'Ultra-realistic talking video — activates HeyGen in the chain when API key is set',
    priceEur: 29,
    creditEur: 29,
    creditUsd: 30,
    category: 'video',
  },
  {
    sku: 'did_starter',
    providerId: 'd-id',
    name: 'D-ID video avatar',
    description: 'Faster video from portrait — activates D-ID in the chain',
    priceEur: 15,
    creditEur: 15,
    creditUsd: 15,
    category: 'video',
  },
  {
    sku: 'cartesia_10',
    providerId: 'cartesia',
    name: 'Cartesia voice',
    description: 'Alternative TTS in the avatar chain',
    priceEur: 10,
    creditEur: 10,
    creditUsd: 10,
    category: 'voice',
  },
  {
    sku: 'comms_10',
    providerId: 'comms',
    name: 'Comms / email credit',
    description: 'Outreach and notifications (Courier gateway)',
    priceEur: 10,
    creditEur: 10,
    creditUsd: 10,
    category: 'comms',
  },
  {
    sku: 'scraper_10',
    providerId: 'scraper',
    name: 'Scraper credit',
    description: 'Apify / lead hunting compute',
    priceEur: 10,
    creditEur: 10,
    creditUsd: 10,
    category: 'scraper',
  },
  {
    sku: 'apollo_25',
    providerId: 'apollo',
    name: 'Apollo.io credit',
    description: 'B2B lead database — people search (~$25 prepaid)',
    priceEur: 23,
    creditEur: 23,
    creditUsd: 25,
    category: 'lead_db',
  },
  {
    sku: 'hunter_10',
    providerId: 'hunter',
    name: 'Hunter.io credit',
    description: 'Email by domain — lower-cost Apollo alternative',
    priceEur: 10,
    creditEur: 10,
    creditUsd: 10,
    category: 'lead_db',
  },
  {
    sku: 'neverbounce_10',
    providerId: 'neverbounce',
    name: 'NeverBounce verify',
    description: 'Email verification before outbound',
    priceEur: 10,
    creditEur: 10,
    creditUsd: 10,
    category: 'email_verify',
  },
];

export function catalogBySku(sku: string): ResourceCatalogItem | undefined {
  return RESOURCE_CATALOG.find((c) => c.sku === sku);
}
