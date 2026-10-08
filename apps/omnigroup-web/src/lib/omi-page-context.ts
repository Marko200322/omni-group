import { getDeliverable } from '@/lib/deliverable-catalog';
import { resolveIndustryCategory } from '@/lib/industry-sku-map';

export type OmiUiPageContext = {
  path: string;
  productId?: string;
  industryCategory?: string;
};

function catalogIdFromFragment(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const id = raw.replace(/^#/, '').replace(/^offer-/, '').trim();
  return getDeliverable(id) ? id : undefined;
}

export function buildOmiUiPageContext(pathname: string, hash?: string): OmiUiPageContext {
  const path = pathname.split('?')[0] ?? '/';
  const ctx: OmiUiPageContext = { path };
  const querySku = path.match(/[?&]sku=([a-z0-9_-]+)/i);
  const hashSku = catalogIdFromFragment(hash);
  const productId = hashSku ?? (querySku?.[1] && catalogIdFromFragment(querySku[1]));
  if (productId) ctx.productId = productId;
  const industry = path.match(/^\/solutions\/([a-z0-9-]+)/i);
  if (industry?.[1]) {
    const category = resolveIndustryCategory(industry[1]);
    if (category) ctx.industryCategory = category;
  }
  return ctx;
}

export function omiQuickActions(pathname: string): Array<{ label: string; message: string }> {
  if (pathname.startsWith('/dashboard/support')) {
    return [
      { label: 'Help me solve this', message: 'Help me solve this issue using verified Omni steps.' },
      { label: 'Talk to a human', message: 'I need a human. How do I escalate without repeating everything?' },
    ];
  }
  if (pathname.startsWith('/dashboard')) {
    return [
      { label: 'Project status', message: 'What is the status of my project?' },
      { label: 'What next?', message: 'What do I need to do next in the portal?' },
      { label: 'Billing', message: 'Where do I see invoices and payment status?' },
    ];
  }
  if (pathname.startsWith('/pricing') || pathname.includes('checkout')) {
    return [
      { label: 'What am I buying?', message: 'What SaaS plans am I buying on this page? Launch, Growth, and Scale.' },
      { label: 'After payment', message: 'What happens after payment on this SaaS page?' },
      { label: 'Compare plans', message: 'How do Launch, Growth, and Scale differ?' },
    ];
  }
  if (pathname.startsWith('/products') || pathname.startsWith('/services')) {
    return [
      { label: 'What is included?', message: 'What is included in this package?' },
      { label: 'Is this for my business?', message: 'Is this suitable for my business?' },
      { label: 'Delivery', message: 'How does delivery work?' },
    ];
  }
  if (pathname.startsWith('/solutions')) {
    return [
      { label: 'Typical issues', message: 'What operational problems do you usually see in this industry? Do not assume I have them.' },
      { label: 'Start from my problem', message: 'I am not sure what we need. Everything feels messy.' },
    ];
  }
  return [
    { label: 'A business problem', message: 'I have a business problem but I am not sure which Omni package I need.' },
    { label: 'Manual work', message: 'Our employees spend all day copying data between systems.' },
    { label: 'Talk to a human', message: 'I want to contact your team.' },
  ];
}
