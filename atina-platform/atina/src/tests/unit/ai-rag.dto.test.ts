import { IngestRagDto, SearchRagQueryDto } from '../../modules/ai-rag/dto/ai-rag.dto';

describe('ai-rag dto', () => {
  it('IngestRagDto accepts valid payload', () => {
    const r = IngestRagDto.safeParse({
      sourceId: 'doc-1',
      text: 'Hello world '.repeat(10),
    });
    expect(r.success).toBe(true);
  });

  it('SearchRagQueryDto parses enrich flag', () => {
    const r = SearchRagQueryDto.safeParse({ q: 'billing', enrich: 'true' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.enrich).toBe(true);
  });
});
