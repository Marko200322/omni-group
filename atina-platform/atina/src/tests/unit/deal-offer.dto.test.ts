import {
  CreateDealOfferDto,
  DealOfferRunParamsDto,
  RunDealOfferDto,
} from '../../modules/deal-offer/dto/deal-offer.dto';

describe('Deal Offer DTOs', () => {
  it('CreateDealOfferDto applies defaults', () => {
    const r = CreateDealOfferDto.safeParse({ name: 'abc' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.mode).toBe('draft');
      expect(r.data.budgetAllocated).toBe(0);
    }
  });

  it('CreateDealOfferDto accepts all modes', () => {
    for (const mode of ['draft', 'negotiate', 'close'] as const) {
      const r = CreateDealOfferDto.safeParse({ name: 'Offer name', mode });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.mode).toBe(mode);
    }
  });

  it('RunDealOfferDto applies defaults', () => {
    const r = RunDealOfferDto.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.mode).toBe('draft');
      expect(r.data.intensity).toBe(25);
    }
  });

  it('rejects short workspace name', () => {
    expect(CreateDealOfferDto.safeParse({ name: 'ab' }).success).toBe(false);
  });

  it('rejects unknown fields for strict schemas', () => {
    expect(CreateDealOfferDto.safeParse({ name: 'valid', unexpected: true }).success).toBe(false);
    expect(RunDealOfferDto.safeParse({ intensity: 5, extra: 1 }).success).toBe(false);
  });

  it('rejects invalid mode and param id', () => {
    expect(CreateDealOfferDto.safeParse({ name: 'valid', mode: 'pending' }).success).toBe(false);
    expect(RunDealOfferDto.safeParse({ mode: 'open' }).success).toBe(false);
    expect(DealOfferRunParamsDto.safeParse({ id: '!!!' }).success).toBe(false);
  });

  it('rejects intensity outside 1–100 and non-integer', () => {
    expect(RunDealOfferDto.safeParse({ intensity: 0 }).success).toBe(false);
    expect(RunDealOfferDto.safeParse({ intensity: 101 }).success).toBe(false);
    expect(RunDealOfferDto.safeParse({ intensity: 3.5 }).success).toBe(false);
  });

  it('rejects non-finite budget and oversized name', () => {
    expect(CreateDealOfferDto.safeParse({ name: 'abc', budgetAllocated: Number.NaN }).success).toBe(false);
    expect(CreateDealOfferDto.safeParse({ name: 'abc', budgetAllocated: Number.POSITIVE_INFINITY }).success).toBe(
      false
    );
    expect(CreateDealOfferDto.safeParse({ name: 'a'.repeat(121) }).success).toBe(false);
  });

  it('rejects revenueEstimate when zero or negative', () => {
    expect(RunDealOfferDto.safeParse({ revenueEstimate: 0 }).success).toBe(false);
    expect(RunDealOfferDto.safeParse({ revenueEstimate: -1 }).success).toBe(false);
  });

  it('DealOfferRunParamsDto rejects short or empty id', () => {
    expect(DealOfferRunParamsDto.safeParse({ id: 'a' }).success).toBe(false);
    expect(DealOfferRunParamsDto.safeParse({ id: '  ' }).success).toBe(false);
  });
});
