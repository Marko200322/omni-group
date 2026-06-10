import {
  CategoryBatchDto,
  CategoryParamDto,
  CategoryRolloutDto,
  GenerateVerticalDto,
  TickAutonomyDto,
  VerticalSlugParamDto,
} from '../../../../modules/autonomy-loop/dto/autonomy-loop.dto';

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

  it('parses category batch defaults', () => {
    const parsed = CategoryBatchDto.parse({});
    expect(parsed.mode).toBe('generate');
    expect(parsed.limit).toBe(25);
  });

  it('parses category param slug', () => {
    const parsed = CategoryParamDto.parse({ category: 'development_it' });
    expect(parsed.category).toBe('development_it');
  });

  it('defaults generate queueOutbound to true', () => {
    const parsed = GenerateVerticalDto.parse({});
    expect(parsed.queueOutbound).toBe(true);
    expect(parsed.includeOutreach).toBe(true);
  });

  it('parses category rollout defaults', () => {
    const parsed = CategoryRolloutDto.parse({});
    expect(parsed.mode).toBe('full');
    expect(parsed.maxCategories).toBe(1);
    expect(parsed.processAllVerticals).toBe(true);
  });

  it('parses category batch processAll flag', () => {
    const parsed = CategoryBatchDto.parse({ processAllVerticals: true });
    expect(parsed.processAllVerticals).toBe(true);
  });
});
