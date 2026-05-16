import { parseCreatedAtSort, parseOnboardingDateRange } from '../../utils/onboarding-query';

describe('parseOnboardingDateRange', () => {
  it('returns nulls and no warnings when from/to omitted', () => {
    const r = parseOnboardingDateRange(undefined, undefined);
    expect(r.fromIso).toBeNull();
    expect(r.toIso).toBeNull();
    expect(r.warnings).toEqual([]);
  });

  it('parses valid ISO strings', () => {
    const r = parseOnboardingDateRange('2026-01-01T00:00:00.000Z', '2026-01-31T23:59:59.999Z');
    expect(r.fromIso).toBe('2026-01-01T00:00:00.000Z');
    expect(r.toIso).toBe('2026-01-31T23:59:59.999Z');
    expect(r.warnings).toEqual([]);
  });

  it('warns on invalid from', () => {
    const r = parseOnboardingDateRange('not-a-date', undefined);
    expect(r.fromIso).toBeNull();
    expect(r.warnings.some((w) => w.includes('from is invalid'))).toBe(true);
  });

  it('drops to when from > to', () => {
    const r = parseOnboardingDateRange(
      '2026-06-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z'
    );
    expect(r.fromIso).toBeTruthy();
    expect(r.toIso).toBeNull();
    expect(r.warnings.some((w) => w.includes('from is later than to'))).toBe(true);
  });

  it('warns on invalid to when from is valid', () => {
    const r = parseOnboardingDateRange('2026-01-01T00:00:00.000Z', 'bad-to');
    expect(r.fromIso).toBeTruthy();
    expect(r.toIso).toBeNull();
    expect(r.warnings.some((w) => w.includes('to is invalid'))).toBe(true);
  });

  it('does not warn when from/to are empty strings', () => {
    const r = parseOnboardingDateRange('', '');
    expect(r.fromIso).toBeNull();
    expect(r.toIso).toBeNull();
    expect(r.warnings).toEqual([]);
  });
});

describe('parseCreatedAtSort', () => {
  it('defaults to desc', () => {
    expect(parseCreatedAtSort(undefined).label).toBe('desc');
    expect(parseCreatedAtSort(undefined).sql).toBe('DESC');
  });

  it('accepts asc and synonyms', () => {
    expect(parseCreatedAtSort('asc').label).toBe('asc');
    expect(parseCreatedAtSort('ASCENDING').sql).toBe('ASC');
  });

  it('warns on garbage sort', () => {
    const r = parseCreatedAtSort('nope');
    expect(r.label).toBe('desc');
    expect(r.sql).toBe('DESC');
    expect(r.warning).toContain('invalid');
  });

  it('treats empty string as desc', () => {
    const r = parseCreatedAtSort('');
    expect(r.label).toBe('desc');
    expect(r.sql).toBe('DESC');
    expect(r.warning).toBeUndefined();
  });

  it('accepts desc and descending', () => {
    expect(parseCreatedAtSort('desc').label).toBe('desc');
    expect(parseCreatedAtSort('DESCENDING').label).toBe('desc');
  });

  it('stringifies non-string sort values (invalid becomes desc + warning)', () => {
    const r = parseCreatedAtSort(0);
    expect(r.sql).toBe('DESC');
    expect(r.warning).toContain('invalid');
  });
});
