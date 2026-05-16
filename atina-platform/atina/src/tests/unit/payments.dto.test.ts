import { PaymentHistoryQueryDto } from '../../modules/payments/dto/payments.dto';

describe('payments.dto (Zod)', () => {
  describe('PaymentHistoryQueryDto', () => {
    it('applies defaults for empty query object', () => {
      const r = PaymentHistoryQueryDto.safeParse({});
      expect(r.success).toBe(true);
      if (r.success) {
        expect(r.data.page).toBe(1);
        expect(r.data.limit).toBe(20);
      }
    });

    it('rejects limit above 100', () => {
      expect(PaymentHistoryQueryDto.safeParse({ limit: 101 }).success).toBe(false);
    });

    it('rejects unknown keys (strict)', () => {
      expect(
        PaymentHistoryQueryDto.safeParse({ page: 1, limit: 20, sort: 'asc' } as Record<string, unknown>).success
      ).toBe(false);
    });

    it('rejects non-positive limit', () => {
      expect(PaymentHistoryQueryDto.safeParse({ limit: 0 }).success).toBe(false);
    });
  });
});
