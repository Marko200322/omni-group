/**
 * Public commerce catalog — single source of truth.
 * Marketing pages, CTAs, industry landings, and dashboard list prices
 * must read name / price / billing / availability from here.
 */
export {
  getClientOffer,
  getPublicCatalogStats,
  getPublicListPriceEur,
  listClientOffers,
  listPublicProducts,
  publicOfferWhen,
  saleStatusFromAvailability,
  type ClientOffer,
  type OfferSaleStatus,
} from './client-offers';
export { saleStatusFromFlags } from './sale-status';
export { formatPlanMoney, getSaaSPlan, getSaaSPlanPrice, SAAS_PLANS } from './saas-plans';
