import { query } from '../../database/connection';
import {
  ECOSYSTEM_IDEMPOTENCY_RUN_LOOKBACK_SQL,
  findRecentEcosystemRunByIdempotencyKey,
  normalizeEcosystemIdempotencyKey,
  normalizeIdempotencyKeyHeader,
  withEcosystemIdempotencyLock,
} from '../../utils/ecosystem-idempotency';

jest.mock('../../database/connection', () => ({
  query: jest.fn(),
}));

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('ecosystem-idempotency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeEcosystemIdempotencyKey', () => {
    it('trims and returns empty for blank or missing', () => {
      expect(normalizeEcosystemIdempotencyKey('  k  ')).toBe('k');
      expect(normalizeEcosystemIdempotencyKey('')).toBe('');
      expect(normalizeEcosystemIdempotencyKey(undefined)).toBe('');
      expect(normalizeEcosystemIdempotencyKey(null)).toBe('');
    });
  });

  describe('normalizeIdempotencyKeyHeader', () => {
    it('matches ecosystem normalizer for Idempotency-Key-style inputs', () => {
      expect(normalizeIdempotencyKeyHeader(undefined)).toBe('');
      expect(normalizeIdempotencyKeyHeader(null)).toBe('');
      expect(normalizeIdempotencyKeyHeader('')).toBe('');
      expect(normalizeIdempotencyKeyHeader('  abc  ')).toBe('abc');
      expect(normalizeIdempotencyKeyHeader('  abc  ')).toBe(normalizeEcosystemIdempotencyKey('  abc  '));
    });
  });

  describe('withEcosystemIdempotencyLock', () => {
    it('runs work without advisory calls when key is empty', async () => {
      const work = jest.fn().mockResolvedValue(42);
      const out = await withEcosystemIdempotencyLock('sys-1', '', work);
      expect(out).toBe(42);
      expect(work).toHaveBeenCalledTimes(1);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('treats whitespace-only key as empty (no advisory lock)', async () => {
      const work = jest.fn().mockResolvedValue(1);
      const out = await withEcosystemIdempotencyLock('sys-1', '   \t  ', work);
      expect(out).toBe(1);
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('acquires lock, runs work, then unlocks', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const work = jest.fn().mockResolvedValue('ok');
      const out = await withEcosystemIdempotencyLock('sys-1', 'idem-1', work);
      expect(out).toBe('ok');
      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery.mock.calls[0][0]).toContain('pg_advisory_lock');
      expect(mockQuery.mock.calls[0][1]).toEqual(['sys-1', 'idem-1']);
      expect(mockQuery.mock.calls[1][0]).toContain('pg_advisory_unlock');
      expect(mockQuery.mock.calls[1][1]).toEqual(['sys-1', 'idem-1']);
      expect(work).toHaveBeenCalledTimes(1);
    });

    it('unlocks when work rejects', async () => {
      mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
      const err = new Error('boom');
      const work = jest.fn().mockRejectedValue(err);
      await expect(withEcosystemIdempotencyLock('s', 'k', work)).rejects.toThrow('boom');
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('findRecentEcosystemRunByIdempotencyKey', () => {
    it('queries ecosystem_runs with system id, lookback, and idempotency key', async () => {
      mockQuery.mockResolvedValue({ rows: [{ id: 'r1' }], rowCount: 1 });
      const res = await findRecentEcosystemRunByIdempotencyKey('ws-9', 'key-a');
      expect(res.rows[0]).toEqual({ id: 'r1' });
      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toContain('ecosystem_runs');
      expect(sql).toContain(ECOSYSTEM_IDEMPOTENCY_RUN_LOOKBACK_SQL);
      expect(sql).toContain("output_payload->>'idempotency_key'");
      expect(params).toEqual(['ws-9', 'key-a']);
    });
  });
});
