/**
 * Inventory of processors the public product actually touches.
 * Privacy copy must stay inside this list. Do not invent vendors.
 */
export type DataProcessor = {
  id: string;
  name: string;
  purpose: string;
  data: string;
  when: string;
};

export const DATA_PROCESSORS: readonly DataProcessor[] = [
  {
    id: 'vps-hosting',
    name: 'Hosting / VPS',
    purpose: 'Serve the marketing site, client portal, and application logs',
    data: 'Technical logs, session cookies, account and order records stored on the same stack',
    when: 'Always while the site is online',
  },
  {
    id: 'postgres',
    name: 'Application database',
    purpose: 'Accounts, organizations, orders, projects, CRM contact rows',
    data: 'Name, email, company, order snapshots, project files metadata',
    when: 'After registration, checkout, or a contact submission that reaches CRM',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    purpose: 'Card checkout, payment confirmation, and subscription billing',
    data: 'Email, name, payment references, Stripe customer / session IDs',
    when: 'When the buyer starts card checkout',
  },
  {
    id: 'resend',
    name: 'Resend',
    purpose: 'Transactional and inbound-contact email',
    data: 'Name, email, message, order or contact metadata',
    when: 'When RESEND_API_KEY and contact/from addresses are configured',
  },
  {
    id: 'slack',
    name: 'Slack (incoming webhook)',
    purpose: 'Operator notification for contact form submissions',
    data: 'Contact form fields',
    when: 'When a Slack webhook is configured',
  },
  {
    id: 'telegram',
    name: 'Telegram (bot notify)',
    purpose: 'Operator notification for contact form submissions',
    data: 'Contact form fields',
    when: 'When Telegram notify credentials are configured',
  },
  {
    id: 'openrouter',
    name: 'Configured AI provider (OpenRouter or equivalent)',
    purpose: 'In-app assistant drafts for signed-in workspace users',
    data: 'Prompts the signed-in user sends in the assistant',
    when: 'When a signed-in user uses the assistant and a provider key is present',
  },
  {
    id: 'video-providers',
    name: 'HeyGen / D-ID (optional)',
    purpose: 'Video avatar renders for the AI support retainer',
    data: 'Script text and render metadata',
    when: 'Only when those provider keys are configured and the retainer is active',
  },
  {
    id: 'marketing-pixels',
    name: 'Google Tag Manager / Google Ads / Meta Pixel',
    purpose: 'Marketing measurement and conversion events',
    data: 'Page views, UTM values, begin_checkout / generate_lead events',
    when: 'Only if the matching NEXT_PUBLIC_* IDs are set and the visitor accepted analytics cookies',
  },
] as const;

export const DATA_CATEGORIES = [
  'Contact form fields (name, email, company, industry, budget, timeline, message, consent)',
  'Account registration (name, email, password hash, organization membership)',
  'Billing references (product ID, price snapshot, currency, Stripe session / payment status)',
  'Workspace records the signed-in user creates (orders, projects, documents metadata, support threads)',
  'Technical logs (request path, status, IP used for rate limits, user-agent)',
  'Cookie and session identifiers (og_session, og_csrf, cookie preference)',
  'Optional analytics / ad pixels when public IDs are configured and analytics cookies are accepted',
] as const;
