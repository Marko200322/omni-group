import { AdminSubscriptionsQueryDto } from '../../modules/subscriptions/dto/subscriptions.dto';

describe('subscriptions.dto (Zod)', () => {
  describe('AdminSubscriptionsQueryDto', () => {
    it('applies defaults for empty query object', () => {
      const r = AdminSubscriptionsQueryDto.safeParse({});
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.page).toBe(1);
        expect(r.data.limit).toBe(20);
      }
    });

    it('rejects limit above 100', () => {
      expect(AdminSubscriptionsQueryDto.safeParse({ limit: 101 }).success).toBe(false);
    });

    it('rejects unknown keys (strict)', () => {
      expect(
        AdminSubscriptionsQueryDto.safeParse({ page: 1, limit: 20, filter: 'x' } as Record<string, unknown>).success
      ).toBe(false);
    });

    it('rejects non-positive limit', () => {
      expect(AdminSubscriptionsQueryDto.safeParse({ limit: 0 }).success).toBe(false);
    });
  });
});
