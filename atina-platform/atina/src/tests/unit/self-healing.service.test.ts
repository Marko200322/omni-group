import * as db from '../../database/connection';
import {
  SelfHealingService,
  normalizeAutoHealMaxEvents,
} from '../../modules/self-healing/service/self-healing.service';

jest.mock('../../database/connection');

// eslint-disable-next-line no-var
var selfHealingRepo: {
  list: jest.Mock;
  getById: jest.Mock;
  markHealed: jest.Mock;
  retryTask: jest.Mock;
  insertAuditEvent: jest.Mock;
};

jest.mock('../../modules/self-healing/repository/self-healing.repository', () => {
  selfHealingRepo = {
    list: jest.fn(),
    getById: jest.fn(),
    markHealed: jest.fn(),
    retryTask: jest.fn(),
    insertAuditEvent: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  };
  return {
    SelfHealingRepository: jest.fn().mockImplementation(() => selfHealingRepo),
  };
});

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('SelfHealingService', () => {
  let service: SelfHealingService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 } as never);
    service = new SelfHealingService();
  });

  it('autoHeal with maxEvents 0 attempts no heals', async () => {
    selfHealingRepo.list.mockResolvedValue({
      rows: [{ id: 'e1', status: 'detected' }],
      rowCount: 1,
    });

    const result = await service.autoHeal('user-1', 0);

    expect(result).toEqual({ attempted: 0, healed: 0, events: [] });
    expect(selfHealingRepo.getById).not.toHaveBeenCalled();
    expect(selfHealingRepo.insertAuditEvent).toHaveBeenCalledWith(
      'user-1',
      'self_healing_auto_heal',
      'self_heal_events',
      'bulk',
      'warning',
      expect.any(String)
    );
    const payload = JSON.parse(selfHealingRepo.insertAuditEvent.mock.calls[0][5] as string);
    expect(payload).toEqual(expect.objectContaining({ requested: 0, cap: 0, healed: 0 }));
  });

  it('autoHeal treats NaN maxEvents as default cap (20)', async () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ id: `e${i}`, status: 'detected' }));
    selfHealingRepo.list.mockResolvedValue({ rows, rowCount: rows.length });
    selfHealingRepo.getById.mockImplementation(async (id: string) => ({
      rows: [{ id, status: 'detected', subsystem: 'x', details: {} }],
      rowCount: 1,
    }));
    selfHealingRepo.markHealed.mockResolvedValue({
      rows: [{ id: 'x', status: 'healed' }],
      rowCount: 1,
    });

    const result = await service.autoHeal('user-1', Number.NaN);

    expect(result.attempted).toBe(20);
    expect(result.healed).toBe(20);
    expect(selfHealingRepo.getById).toHaveBeenCalledTimes(20);
  });

  it('autoHeal clamps negative maxEvents to default cap', async () => {
    const rows = [
      { id: 'a', status: 'detected' },
      { id: 'b', status: 'detected' },
    ];
    selfHealingRepo.list.mockResolvedValue({ rows, rowCount: 2 });
    selfHealingRepo.getById.mockImplementation(async (id: string) => ({
      rows: [{ id, status: 'detected', subsystem: 'x', details: {} }],
      rowCount: 1,
    }));
    selfHealingRepo.markHealed.mockResolvedValue({
      rows: [{ id: 'x', status: 'healed' }],
      rowCount: 1,
    });

    const result = await service.autoHeal('user-1', -1);

    expect(result.attempted).toBe(2);
    expect(selfHealingRepo.getById).toHaveBeenCalledTimes(2);
  });

  it('autoHeal caps Infinity at 100', async () => {
    const rows = Array.from({ length: 120 }, (_, i) => ({ id: `e${i}`, status: 'detected' }));
    selfHealingRepo.list.mockResolvedValue({ rows, rowCount: rows.length });
    selfHealingRepo.getById.mockImplementation(async (id: string) => ({
      rows: [{ id, status: 'detected', subsystem: 'x', details: {} }],
      rowCount: 1,
    }));
    selfHealingRepo.markHealed.mockResolvedValue({
      rows: [{ id: 'x', status: 'healed' }],
      rowCount: 1,
    });

    const result = await service.autoHeal('user-1', Number.POSITIVE_INFINITY);

    expect(result.attempted).toBe(100);
    expect(selfHealingRepo.getById).toHaveBeenCalledTimes(100);
  });

  it('autoHeal floors fractional maxEvents', async () => {
    const rows = [
      { id: 'a', status: 'detected' },
      { id: 'b', status: 'detected' },
      { id: 'c', status: 'detected' },
    ];
    selfHealingRepo.list.mockResolvedValue({ rows, rowCount: 3 });
    selfHealingRepo.getById.mockImplementation(async (id: string) => ({
      rows: [{ id, status: 'detected', subsystem: 'x', details: {} }],
      rowCount: 1,
    }));
    selfHealingRepo.markHealed.mockResolvedValue({
      rows: [{ id: 'x', status: 'healed' }],
      rowCount: 1,
    });

    const result = await service.autoHeal('user-1', 2.9);

    expect(result.attempted).toBe(2);
    expect(selfHealingRepo.getById).toHaveBeenCalledTimes(2);
  });

  it('heal skips subsystem-specific remediation for unknown subsystem', async () => {
    selfHealingRepo.getById.mockResolvedValue({
      rows: [
        {
          id: 'issue-1',
          subsystem: 'unknown-subsystem',
          issue_key: 'custom:1',
          details: {},
        },
      ],
      rowCount: 1,
    });
    selfHealingRepo.markHealed.mockResolvedValue({
      rows: [{ id: 'issue-1', status: 'healed' }],
      rowCount: 1,
    });

    const row = await service.heal('issue-1', 'Manual close', 'actor-1');

    expect(row).toEqual(expect.objectContaining({ id: 'issue-1', status: 'healed' }));
    expect(selfHealingRepo.retryTask).not.toHaveBeenCalled();
    expect(selfHealingRepo.markHealed).toHaveBeenCalledWith(
      'issue-1',
      'Manual close',
      expect.objectContaining({ mode: 'manual', action: 'Manual close' })
    );
  });
});

describe('normalizeAutoHealMaxEvents', () => {
  it.each([
    [0, 0],
    [Number.NaN, 20],
    [Number.NEGATIVE_INFINITY, 20],
    [Number.POSITIVE_INFINITY, 100],
    [-3, 20],
    [0.4, 20],
    [2.9, 2],
    [101, 100],
    [100, 100],
    [1, 1],
  ] as const)('maps %p to %p', (input, expected) => {
    expect(normalizeAutoHealMaxEvents(input)).toBe(expected);
  });
});
