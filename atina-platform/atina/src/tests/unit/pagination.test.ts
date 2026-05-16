import { totalPagesFromCount } from '../../utils/pagination';

describe('totalPagesFromCount', () => {
  it('returns 0 when total is 0', () => {
    expect(totalPagesFromCount(0, 20)).toBe(0);
  });

  it('returns 1 when total fits in one page', () => {
    expect(totalPagesFromCount(20, 20)).toBe(1);
    expect(totalPagesFromCount(5, 20)).toBe(1);
  });

  it('rounds up partial pages', () => {
    expect(totalPagesFromCount(21, 20)).toBe(2);
    expect(totalPagesFromCount(41, 20)).toBe(3);
  });

  it('treats non-positive limit as 1', () => {
    expect(totalPagesFromCount(5, 0)).toBe(5);
    expect(totalPagesFromCount(5, -1)).toBe(5);
  });

  it('covers exact multiples of limit', () => {
    expect(totalPagesFromCount(100, 100)).toBe(1);
    expect(totalPagesFromCount(200, 100)).toBe(2);
  });

  it('uses limit 1 for per-item pages', () => {
    expect(totalPagesFromCount(7, 1)).toBe(7);
  });

  it('handles negative total like Math.ceil (non-physical but stable)', () => {
    expect(totalPagesFromCount(-5, 10)).toBe(0);
  });

  it('returns NaN when total is NaN', () => {
    expect(Number.isNaN(totalPagesFromCount(NaN, 10))).toBe(true);
  });
});
