import {
  FinishUpdateDto,
  ListUpdaterJobsQueryDto,
  QueueUpdateDto,
} from '../../modules/system-updater/dto/system-updater.dto';

describe('System updater DTOs (Zod)', () => {
  describe('ListUpdaterJobsQueryDto', () => {
    it('accepts an empty query object', () => {
      expect(ListUpdaterJobsQueryDto.safeParse({}).success).toBe(true);
    });

    it('rejects any query keys', () => {
      expect(ListUpdaterJobsQueryDto.safeParse({ page: '1' }).success).toBe(false);
    });
  });

  describe('QueueUpdateDto', () => {
    it('rejects targetVersion shorter than min', () => {
      expect(QueueUpdateDto.safeParse({ targetVersion: 'x' }).success).toBe(false);
    });

    it('rejects targetVersion longer than max', () => {
      expect(QueueUpdateDto.safeParse({ targetVersion: 'a'.repeat(41) }).success).toBe(false);
    });

    it('accepts minimal payload without notes', () => {
      const r = QueueUpdateDto.safeParse({ targetVersion: 'v1.0' });
      expect(r.success).toBe(true);
    });

    it('rejects notes longer than 500 chars', () => {
      expect(
        QueueUpdateDto.safeParse({ targetVersion: 'v2.0', notes: 'n'.repeat(501) }).success
      ).toBe(false);
    });

    it('rejects strict unknown keys', () => {
      expect(
        QueueUpdateDto.safeParse({ targetVersion: 'v1.0', extra: true } as Record<string, unknown>).success
      ).toBe(false);
    });
  });

  describe('FinishUpdateDto', () => {
    it('rejects invalid status enum', () => {
      expect(FinishUpdateDto.safeParse({ status: 'pending', result: {} }).success).toBe(false);
    });

    it('applies default empty result', () => {
      const r = FinishUpdateDto.safeParse({ status: 'failed' });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.result).toEqual({});
      }
    });

    it('accepts completed with payload', () => {
      const r = FinishUpdateDto.safeParse({ status: 'completed', result: { log: ['ok'] } });
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.result).toEqual({ log: ['ok'] });
      }
    });

    it('rejects strict unknown keys', () => {
      expect(
        FinishUpdateDto.safeParse({ status: 'completed', result: {}, extra: 1 } as Record<string, unknown>).success
      ).toBe(false);
    });
  });
});
