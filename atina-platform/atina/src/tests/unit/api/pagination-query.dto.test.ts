import { StrictPaginationQueryDto } from '../../../api/dto/pagination-query.dto';

describe('StrictPaginationQueryDto', () => {
  it('defaults page to 1 and limit to 20 when absent', () => {
    expect(StrictPaginationQueryDto.parse({})).toEqual({ page: 1, limit: 20 });
  });

  it('rejects limit above 100', () => {
    expect(() => StrictPaginationQueryDto.parse({ limit: 101 })).toThrow();
  });

  it('rejects unknown keys (strict)', () => {
    expect(() => StrictPaginationQueryDto.parse({ page: 1, limit: 10, extra: 'x' })).toThrow();
  });
});
