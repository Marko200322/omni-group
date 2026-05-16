import { StrictEmptyQueryDto } from '../../../api/dto/strict-empty-query.dto';

describe('StrictEmptyQueryDto', () => {
  it('accepts empty query object', () => {
    expect(StrictEmptyQueryDto.parse({})).toEqual({});
  });

  it('rejects any query key', () => {
    expect(() => StrictEmptyQueryDto.parse({ x: '1' })).toThrow();
  });
});
