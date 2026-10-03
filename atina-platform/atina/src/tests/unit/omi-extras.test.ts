import {
  OMI_AB_VERSION,
  OMI_PROMPT_VERSION,
  OMI_RECOMMEND_ENGINE_VERSION,
  buildOmiRecommendReasons,
  buildOmiResponseMeta,
  detectOmiReplyLanguage,
  guardOmiAssistantReply,
  needsOmiLongChatSummary,
  shouldOfferOmiHumanHandoff,
  summarizeOmiConversation,
  validateOmiCatalogSourceOfTruth,
} from '../../modules/omi/omi-extras';
import { recommendOmiProducts } from '../../modules/omi/omi-recommend';
import { buildOmiConsultPacket, sanitizeOmiPageContext } from '../../modules/omi/omi-page-context';

describe('omi-extras', () => {
  it('versions are present for response metadata / A/B scaffolding', () => {
    expect(OMI_PROMPT_VERSION).toMatch(/^omi-prompt-/);
    expect(OMI_RECOMMEND_ENGINE_VERSION).toMatch(/^omi-recommend-/);
    expect(OMI_AB_VERSION).toBe('omi-ab-control');
  });

  it('detects Serbian vs English for reply language', () => {
    expect(detectOmiReplyLanguage('Koliko košta Quick Setup?')).toBe('sr');
    expect(detectOmiReplyLanguage('What does Launch include?')).toBe('en');
  });

  it('validates catalog source of truth before prices are quoted', () => {
    const rec = recommendOmiProducts({ message: 'Koliko košta Quick Setup?' });
    expect(validateOmiCatalogSourceOfTruth(rec)).toBe(true);
    const bad = {
      ...rec,
      products: [{ ...rec.products[0]!, priceEur: 99999, name: 'Fake Platinum' }],
      noSuitable: false,
    };
    expect(validateOmiCatalogSourceOfTruth(bad)).toBe(false);
  });

  it('builds structured recommend reasons for observability', () => {
    const rec = recommendOmiProducts({
      message: 'I run a restaurant and lose leads. Budget €1500.',
    });
    const reasons = buildOmiRecommendReasons(rec);
    expect(reasons.every((r) => r.skuId && r.why && r.priceEur > 0)).toBe(true);
    const meta = buildOmiResponseMeta(rec, 'I run a restaurant and lose leads. Budget €1500.', 2);
    expect(meta.catalogValidated).toBe(true);
    expect(meta.promptVersion).toBe(OMI_PROMPT_VERSION);
    expect(meta.abVersion).toBe(OMI_AB_VERSION);
  });

  it('offers handoff when no fit or user asks for a human', () => {
    const noFitMeta = buildOmiResponseMeta(
      {
        understood: 'orbit',
        sourceMessage: 'orbit',
        problems: [],
        products: [],
        saas: [],
        noSuitable: true,
        confidence: 'low',
        consultStage: 'unavailable',
      },
      'orbit reactor control',
      1,
    );
    expect(noFitMeta.offerHandoff).toBe(true);
    const ok = recommendOmiProducts({ message: 'packages for a restaurant' });
    expect(shouldOfferOmiHumanHandoff('I need a human please', ok, 2)).toBe(true);
  });

  it('guards hallucinated promises and secret leaks', () => {
    expect(guardOmiAssistantReply('We guarantee 500 leads and 40% off Platinum')).toMatch(
      /don't have verified information/i,
    );
    expect(guardOmiAssistantReply('Here is sk_live_abc and DATABASE_URL')).toMatch(/cannot reveal/i);
    expect(guardOmiAssistantReply('See Launch on /pricing')).toMatch(/Launch/);
  });

  it('summarizes conversations and flags long-chat hook', () => {
    expect(needsOmiLongChatSummary(11)).toBe(false);
    expect(needsOmiLongChatSummary(12)).toBe(true);
    const summary = summarizeOmiConversation([
      { role: 'user', content: 'We lose leads.' },
      { role: 'assistant', content: 'Where do they drop off?' },
    ]);
    expect(summary).toMatch(/Visitor: We lose leads/);
    expect(summary).toMatch(/Omi: Where do they drop off/);
  });

  it('strips forged tenant fields from portal page context', () => {
    expect(
      sanitizeOmiPageContext({
        path: '/dashboard/billing',
        customerId: '00000000-0000-4000-8000-000000000099',
        tenantId: 'other-tenant',
        productId: 'not-real',
      }),
    ).toEqual({ path: '/dashboard/billing' });
  });

  it('consult packet refuses invalid catalog prices and keeps commercial no-fit', () => {
    const packet = buildOmiConsultPacket('orbit reactor control for satellites', { path: '/' }, [], 0);
    expect(packet.meta.catalogValidated).toBe(true);
    expect(packet.meta.noSuitable || packet.meta.consultStage === 'unavailable').toBe(true);
    expect(packet.context).toMatch(/no verified|Reply in/i);
  });
});
