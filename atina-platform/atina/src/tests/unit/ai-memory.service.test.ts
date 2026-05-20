import * as db from '../../database/connection';
import { AiMemoryService } from '../../modules/ai-memory/service/ai-memory.service';

jest.mock('../../database/connection');

const mockAi = {
  isConfigured: jest.fn().mockReturnValue(false),
  remember: jest.fn().mockResolvedValue({ ok: true }),
  recall: jest.fn(),
};

jest.mock('../../integrations', () => ({
  getAiClient: () => mockAi,
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('AiMemoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAi.isConfigured.mockReturnValue(false);
    mockQuery.mockResolvedValue({ rows: [{ id: 'log-1', created_at: new Date() }], rowCount: 1 } as never);
  });

  it('remember stores locally and skips remote when AI off', async () => {
    const service = new AiMemoryService();
    const row = await service.remember('u1', { key: 'prefs', value: { theme: 'dark' }, namespace: 'global' });
    expect(row).toEqual({ id: 'log-1', created_at: expect.any(Date) });
    expect(mockAi.remember).not.toHaveBeenCalled();
  });

  it('remember fires remote remember when AI configured', async () => {
    mockAi.isConfigured.mockReturnValue(true);
    const service = new AiMemoryService();
    await service.remember('u1', { key: 'prefs', value: { x: 1 }, namespace: 'tenant' });
    await new Promise((r) => setImmediate(r));
    expect(mockAi.remember).toHaveBeenCalledWith(
      expect.objectContaining({ namespace: 'tenant', key: 'prefs', userId: 'u1' })
    );
  });

  it('recall returns merged local and remote payloads', async () => {
    mockAi.isConfigured.mockReturnValue(true);
    mockAi.recall.mockResolvedValue({ items: [{ key: 'prefs' }] });
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'local-1' }], rowCount: 1 } as never);
    const service = new AiMemoryService();
    const out = await service.recall('u1', { namespace: 'ns', key: 'k' });
    expect(out).toEqual({ local: [{ id: 'local-1' }], remote: { items: [{ key: 'prefs' }] } });
  });
});
