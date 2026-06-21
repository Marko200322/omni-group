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
    name: 'OpenRouter kredit',
    description: 'AI mozak — ~$10 ekvivalent za chat i automatizacije',
    priceEur: 10,
    creditEur: 10,
    creditUsd: 10,
    category: 'ai',
  },
  {
    sku: 'openrouter_25',
    providerId: 'openrouter',
    name: 'OpenRouter kredit Plus',
    description: 'Veći AI paket — ~$25 za hunting i evolution tick',
    priceEur: 24,
    creditEur: 24,
    creditUsd: 25,
    category: 'ai',
  },
  {
    sku: 'elevenlabs_10',
    providerId: 'elevenlabs',
    name: 'ElevenLabs glas',
    description: 'TTS kredit za support/sales avatare',
    priceEur: 10,
    creditEur: 10,
    creditUsd: 10,
    category: 'voice',
  },
  {
    sku: 'heygen_starter',
    providerId: 'heygen',
    name: 'HeyGen video avatar',
    description: 'Ultra-realističan talking video — aktivira HeyGen u lancu kad ima API ključ',
    priceEur: 29,
    creditEur: 29,
    creditUsd: 30,
    category: 'video',
  },
  {
    sku: 'did_starter',
    providerId: 'd-id',
    name: 'D-ID video avatar',
    description: 'Brži video iz portreta — aktivira D-ID u lancu',
    priceEur: 15,
    creditEur: 15,
    creditUsd: 15,
    category: 'video',
  },
  {
    sku: 'cartesia_10',
    providerId: 'cartesia',
    name: 'Cartesia glas',
    description: 'Alternativni TTS u avatar lancu',
    priceEur: 10,
    creditEur: 10,
    creditUsd: 10,
    category: 'voice',
  },
  {
    sku: 'comms_10',
    providerId: 'comms',
    name: 'Comms / email kredit',
    description: 'Outreach i notifikacije (Courier gateway)',
    priceEur: 10,
    creditEur: 10,
    creditUsd: 10,
    category: 'comms',
  },
  {
    sku: 'scraper_10',
    providerId: 'scraper',
    name: 'Scraper kredit',
    description: 'Apify / lead hunting compute',
    priceEur: 10,
    creditEur: 10,
    creditUsd: 10,
    category: 'scraper',
  },
  {
    sku: 'apollo_25',
    providerId: 'apollo',
    name: 'Apollo.io kredit',
    description: 'B2B lead baza — people search (~$25 prepaid)',
    priceEur: 23,
    creditEur: 23,
    creditUsd: 25,
    category: 'lead_db',
  },
  {
    sku: 'hunter_10',
    providerId: 'hunter',
    name: 'Hunter.io kredit',
    description: 'Email po domenu — jeftinija alternativa Apollo',
    priceEur: 10,
    creditEur: 10,
    creditUsd: 10,
    category: 'lead_db',
  },
  {
    sku: 'neverbounce_10',
    providerId: 'neverbounce',
    name: 'NeverBounce verify',
    description: 'Verifikacija email adresa pre outbound-a',
    priceEur: 10,
    creditEur: 10,
    creditUsd: 10,
    category: 'email_verify',
  },
];

export function catalogBySku(sku: string): ResourceCatalogItem | undefined {
  return RESOURCE_CATALOG.find((c) => c.sku === sku);
}
