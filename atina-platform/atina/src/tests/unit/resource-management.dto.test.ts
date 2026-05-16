import { AllocateBudgetDto } from '../../modules/resource-management/dto/resource-management.dto';

describe('AllocateBudgetDto', () => {
  it('accepts valid payload', () => {
    const r = AllocateBudgetDto.safeParse({
      systemSlug: 'craftor',
      amount: 25,
      reason: 'Q1 push',
    });
    expect(r.success).toBe(true);
  });

  it('rejects unknown keys (strict)', () => {
    expect(
      AllocateBudgetDto.safeParse({
        systemSlug: 'craftor',
        amount: 10,
        reason: 'ok reason',
        extra: true,
      }).success
    ).toBe(false);
  });

  it('rejects systemSlug too short', () => {
    expect(AllocateBudgetDto.safeParse({ systemSlug: 'a', amount: 1, reason: 'abc' }).success).toBe(false);
  });

  it('rejects non-positive amount', () => {
    expect(
      AllocateBudgetDto.safeParse({ systemSlug: 'ab', amount: 0, reason: 'abc' }).success
    ).toBe(false);
  });

  it('rejects reason too short', () => {
    expect(
      AllocateBudgetDto.safeParse({ systemSlug: 'ab', amount: 5, reason: 'ab' }).success
    ).toBe(false);
  });

  it('accepts systemSlug at max length 64', () => {
    const systemSlug = 'a'.repeat(64);
    const r = AllocateBudgetDto.safeParse({
      systemSlug,
      amount: 1,
      reason: 'abc',
    });
    expect(r.success).toBe(true);
  });

  it('rejects systemSlug longer than 64', () => {
    const systemSlug = 'a'.repeat(65);
    expect(
      AllocateBudgetDto.safeParse({ systemSlug, amount: 1, reason: 'abc' }).success
    ).toBe(false);
  });

  it('accepts reason at max length 255', () => {
    const reason = 'x'.repeat(255);
    const r = AllocateBudgetDto.safeParse({
      systemSlug: 'ab',
      amount: 1,
      reason,
    });
    expect(r.success).toBe(true);
  });

  it('rejects reason longer than 255', () => {
    const reason = 'x'.repeat(256);
    expect(
      AllocateBudgetDto.safeParse({ systemSlug: 'ab', amount: 1, reason }).success
    ).toBe(false);
  });

  it('rejects negative amount', () => {
    expect(
      AllocateBudgetDto.safeParse({ systemSlug: 'ab', amount: -1, reason: 'abc' }).success
    ).toBe(false);
  });
});
