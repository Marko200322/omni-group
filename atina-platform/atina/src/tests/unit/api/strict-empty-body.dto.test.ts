import { StrictEmptyBodyDto } from '../../../api/dto/strict-empty-body.dto';

describe('StrictEmptyBodyDto', () => {
  it('accepts empty object, null, and undefined', () => {
    expect(StrictEmptyBodyDto.parse({})).toEqual({});
    expect(StrictEmptyBodyDto.parse(null)).toEqual({});
    expect(StrictEmptyBodyDto.parse(undefined)).toEqual({});
  });

  it('rejects any body key', () => {
    expect(StrictEmptyBodyDto.safeParse({ a: 1 }).success).toBe(false);
  });
});
