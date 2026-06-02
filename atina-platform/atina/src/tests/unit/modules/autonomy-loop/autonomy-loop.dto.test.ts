import { TickAutonomyDto, VerticalSlugParamDto } from '../../../../modules/autonomy-loop/dto/autonomy-loop.dto';

describe('autonomy-loop.dto', () => {
  it('parses vertical slug param', () => {
    const parsed = VerticalSlugParamDto.parse({ slug: 'healthcare-dental' });
    expect(parsed.slug).toBe('healthcare-dental');
  });

  it('rejects invalid slug', () => {
    expect(() => VerticalSlugParamDto.parse({ slug: 'Bad Slug!' })).toThrow();
  });

  it('defaults tick maxVerticals', () => {
    const parsed = TickAutonomyDto.parse({});
    expect(parsed.maxVerticals).toBe(3);
  });
});
