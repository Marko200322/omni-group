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

jest.mock('../../utils/plan-module-access', () => ({
  assertPlanIncludesModule: jest.fn().mockResolvedValue(undefined),
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;
const { assertPlanIncludesModule } = jest.requireMock('../../utils/plan-module-access') as {
  assertPlanIncludesModule: jest.Mock;
};

describe('AiMemoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAi.isConfigured.mockReturnValue(false);
    assertPlanIncludesModule.mockResolvedValue(undefined);
    mockQuery.mockResolvedValue({ rows: [{ id: 'log-1', created_at: new Date() }], rowCount: 1 } as never);
  });

  it('remember rejects users without ai-memory plan', async () => {
    const { PaymentError } = await import('../../utils/errors');
    assertPlanIncludesModule.mockRejectedValue(
      new PaymentError('AI memory requires Partner (Enterprise) plan or higher'),
    );
    const service = new AiMemoryService();
    await expect(
      service.remember('u1', { key: 'prefs', value: { theme: 'dark' }, namespace: 'global' }),
    ).rejects.toThrow(/Enterprise/);
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

  it('recall falls back to local rows when remote fails', async () => {
    mockAi.isConfigured.mockReturnValue(true);
    mockAi.recall.mockResolvedValue(null);
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'local-1' }], rowCount: 1 } as never);
    const service = new AiMemoryService();
    await expect(service.recall('u1', { namespace: 'ns', key: 'k' })).resolves.toEqual([{ id: 'local-1' }]);
    expect(mockAi.recall).toHaveBeenCalledWith('ns', 'k', {
      timeoutMs: 2500,
      maxAttempts: 1,
    });
  });
});
