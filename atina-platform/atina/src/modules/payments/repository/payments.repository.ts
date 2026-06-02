import { query, transaction } from '../../../database/connection';
import type { PoolClient } from 'pg';

/** All SQL for payments module — service has no direct DB import. */
export class PaymentsRepository {
  execute<T = unknown>(text: string, params?: unknown[]) {
    return query<T>(text, params);
  }

  runInTransaction<T>(fn: (client: PoolClient) => Promise<T>) {
    return transaction(fn);
  }

  getUserById(userId: string) {
    return query<{ email: string; name: string }>(
      'SELECT email, name FROM users WHERE id = $1',
      [userId]
    );
  }

  getPaymentByIdForUser(paymentId: string, userId: string, provider: string) {
    return query<{
      id: string;
      user_id: string;
      amount: number;
      currency: string;
      metadata: Record<string, unknown> | string;
    }>(
      `SELECT id, user_id, amount, currency, metadata
       FROM payments WHERE id = $1 AND user_id = $2 AND provider = $3`,
      [paymentId, userId, provider]
    );
  }
}
