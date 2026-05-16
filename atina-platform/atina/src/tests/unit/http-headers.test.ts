import type { IncomingHttpHeaders } from 'http';
import { clientIpFromForwardedFor, firstCommaSegment, headerFirst } from '../../utils/http-headers';

describe('headerFirst', () => {
  it('returns undefined when value is undefined', () => {
    expect(headerFirst(undefined)).toBeUndefined();
  });

  it('returns plain string unchanged', () => {
    expect(headerFirst('Bearer tok')).toBe('Bearer tok');
    expect(headerFirst('')).toBe('');
  });

  it('returns first element of a non-empty array', () => {
    expect(headerFirst(['first', 'second'])).toBe('first');
  });

  it('returns undefined for an empty array', () => {
    expect(headerFirst([])).toBeUndefined();
  });

  it('returns undefined when first array slot is nullish', () => {
    expect(headerFirst([undefined as unknown as string])).toBeUndefined();
    expect(headerFirst([null as unknown as string])).toBeUndefined();
  });
});

describe('firstCommaSegment', () => {
  it('returns undefined when value is undefined', () => {
    expect(firstCommaSegment(undefined)).toBeUndefined();
  });

  it('returns single token unchanged', () => {
    expect(firstCommaSegment('abc')).toBe('abc');
    expect(firstCommaSegment('  id-1  ')).toBe('id-1');
  });

  it('returns first comma-separated segment trimmed', () => {
    expect(firstCommaSegment('a, b')).toBe('a');
    expect(firstCommaSegment('dup-client-first, dup-client-second')).toBe('dup-client-first');
  });

  it('returns undefined for empty or whitespace-only first segment', () => {
    expect(firstCommaSegment('')).toBeUndefined();
    expect(firstCommaSegment('  ')).toBeUndefined();
    expect(firstCommaSegment(' , second')).toBeUndefined();
  });
});

describe('clientIpFromForwardedFor', () => {
  it('prefers first IP from x-forwarded-for chain', () => {
    const h = { 'x-forwarded-for': '1.1.1.1, 2.2.2.2' } as IncomingHttpHeaders;
    expect(clientIpFromForwardedFor(h, '9.9.9.9')).toBe('1.1.1.1');
  });

  it('falls back to remoteAddress when header absent', () => {
    expect(clientIpFromForwardedFor({}, '10.0.0.1')).toBe('10.0.0.1');
  });

  it('returns empty string when both absent', () => {
    expect(clientIpFromForwardedFor({}, undefined)).toBe('');
  });

  it('uses headerFirst then firstCommaSegment when forwarded-for is an array', () => {
    const h = { 'x-forwarded-for': ['5.5.5.5, 6.6.6.6', '7.7.7.7'] } as unknown as IncomingHttpHeaders;
    expect(clientIpFromForwardedFor(h, undefined)).toBe('5.5.5.5');
  });
});
