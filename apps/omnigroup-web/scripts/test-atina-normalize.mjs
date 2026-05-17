/**
 * Lightweight check for Atina plans envelope parsing (no Jest in this app).
 * Run: node scripts/test-atina-normalize.mjs
 */

function unwrapPlansList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.plans)) return payload.plans;
  return [];
}

function normalizePlans(payload) {
  return unwrapPlansList(payload).map((p) => {
    const o = p ?? {};
    const priceRaw = o.priceMonthly ?? o.price_monthly;
    const priceMonthly =
      typeof priceRaw === 'number' || typeof priceRaw === 'string' ? priceRaw : null;
    return {
      slug: typeof o.slug === 'string' ? o.slug : undefined,
      name: typeof o.name === 'string' ? o.name : undefined,
      priceMonthly,
      currency: typeof o.currency === 'string' ? o.currency : null,
    };
  });
}

const sample = {
  success: true,
  data: [{ slug: 'pro', name: 'Pro', price_monthly: '49.99', currency: 'USD' }],
};

const plans = normalizePlans(sample);
if (plans.length !== 1) throw new Error(`expected 1 plan, got ${plans.length}`);
if (plans[0].slug !== 'pro') throw new Error('slug mismatch');
if (plans[0].priceMonthly !== '49.99') throw new Error('price_monthly not mapped');

console.log('test-atina-normalize: ok');
