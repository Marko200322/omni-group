import * as db from '../../database/connection';
import { AiRagService } from '../../modules/ai-rag/service/ai-rag.service';

jest.mock('../../database/connection');

const mockAi = {
  isConfigured: jest.fn().mockReturnValue(false),
  chatCompletions: jest.fn(),
};

jest.mock('../../integrations', () => ({
  getAiClient: () => mockAi,
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('AiRagService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAi.isConfigured.mockReturnValue(false);
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);
  });

  it('ingest splits text into chunks and inserts each', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'c1' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'c2' }], rowCount: 1 } as never);

    const service = new AiRagService();
    const out = await service.ingest('u1', {
      sourceId: 'doc-1',
      text: 'a'.repeat(1600),
      chunkSize: 1500,
      metadata: { tag: 'x' },
    });

    expect(out.sourceId).toBe('doc-1');
    expect(out.chunks).toBe(2);
    expect(out.ids).toEqual(['c1', 'c2']);
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });

  it('search returns hits without summary when enrich off', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'h1', content: 'billing info', source_id: 'doc-1' }],
      rowCount: 1,
    } as never);

    const service = new AiRagService();
    const out = await service.search('u1', { q: 'billing', limit: 5, enrich: false });

    expect(out.hits).toHaveLength(1);
    expect(out.summary).toBeNull();
    expect(mockAi.chatCompletions).not.toHaveBeenCalled();
  });

  it('search adds summary when enrich on and AI configured', async () => {
    mockAi.isConfigured.mockReturnValue(true);
    mockAi.chatCompletions.mockResolvedValue({ content: 'Short summary' });
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'h1', content: 'excerpt', source_id: 'doc-1' }],
      rowCount: 1,
    } as never);

    const service = new AiRagService();
    const out = await service.search('u1', { q: 'billing', limit: 5, enrich: true });

    expect(out.summary).toBe('Short summary');
    expect(mockAi.chatCompletions).toHaveBeenCalled();
  });
});
