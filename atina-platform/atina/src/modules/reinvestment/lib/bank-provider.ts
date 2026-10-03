/**
 * Abstract bank account provider.
 *
 * Real banking integrations require credentials + encrypted secrets at rest.
 * This module ships only a MockBankAccountProvider sandbox — NO real bank SDK.
 */

export type BankBalance = {
  accountId: string;
  currency: string;
  availableCents: number;
  ledgerCents: number;
  asOf: string;
};

export type BankTransaction = {
  id: string;
  accountId: string;
  amountCents: number;
  currency: string;
  bookedAt: string;
  description: string;
  counterparty?: string;
};

export type CreateTransferInput = {
  sourceAccountId: string;
  destAccountId: string;
  amountCents: number;
  currency: string;
  idempotencyKey: string;
  reference?: string;
};

export type TransferRecord = {
  transferId: string;
  status: 'pending' | 'settled' | 'failed' | 'cancelled';
  sourceAccountId: string;
  destAccountId: string;
  amountCents: number;
  currency: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  failureReason?: string;
};

export type AccountLimits = {
  maxSingleTransferCents: number;
  maxDailyTransferCents: number;
  minTransferCents: number;
};

export type ProviderStatus = {
  healthy: boolean;
  mode: 'sandbox' | 'live';
  message: string;
  checkedAt: string;
};

export interface BankAccountProvider {
  getBalance(accountId: string): Promise<BankBalance>;
  getTransactions(accountId: string, sinceIso?: string): Promise<BankTransaction[]>;
  createTransfer(input: CreateTransferInput): Promise<TransferRecord>;
  getTransferStatus(transferId: string): Promise<TransferRecord>;
  cancelTransfer?(transferId: string): Promise<TransferRecord>;
  verifyAccount(accountId: string): Promise<boolean>;
  getAccountLimits(accountId: string): Promise<AccountLimits>;
  getCurrency(accountId: string): Promise<string>;
  getProviderStatus(): Promise<ProviderStatus>;
}

type MockAccount = {
  currency: string;
  availableCents: number;
  ledgerCents: number;
  limits: AccountLimits;
};

/**
 * In-memory sandbox provider for dry-runs and unit tests.
 * Not connected to any real bank.
 */
export class MockBankAccountProvider implements BankAccountProvider {
  private readonly accounts = new Map<string, MockAccount>();
  private readonly transfers = new Map<string, TransferRecord>();
  private readonly byIdempotency = new Map<string, string>();
  private readonly transactions = new Map<string, BankTransaction[]>();
  private seq = 0;

  seedAccount(
    accountId: string,
    opts: {
      currency?: string;
      availableCents?: number;
      ledgerCents?: number;
      limits?: Partial<AccountLimits>;
    } = {},
  ): void {
    const availableCents = opts.availableCents ?? 0;
    this.accounts.set(accountId, {
      currency: opts.currency ?? 'EUR',
      availableCents,
      ledgerCents: opts.ledgerCents ?? availableCents,
      limits: {
        maxSingleTransferCents: opts.limits?.maxSingleTransferCents ?? 500_000_00,
        maxDailyTransferCents: opts.limits?.maxDailyTransferCents ?? 2_000_000_00,
        minTransferCents: opts.limits?.minTransferCents ?? 1,
      },
    });
    if (!this.transactions.has(accountId)) this.transactions.set(accountId, []);
  }

  async getBalance(accountId: string): Promise<BankBalance> {
    const a = this.requireAccount(accountId);
    return {
      accountId,
      currency: a.currency,
      availableCents: a.availableCents,
      ledgerCents: a.ledgerCents,
      asOf: new Date().toISOString(),
    };
  }

  async getTransactions(accountId: string, sinceIso?: string): Promise<BankTransaction[]> {
    this.requireAccount(accountId);
    const all = this.transactions.get(accountId) ?? [];
    if (!sinceIso) return [...all];
    const since = Date.parse(sinceIso);
    return all.filter((t) => Date.parse(t.bookedAt) >= since);
  }

  async createTransfer(input: CreateTransferInput): Promise<TransferRecord> {
    const existingId = this.byIdempotency.get(input.idempotencyKey);
    if (existingId) {
      const existing = this.transfers.get(existingId);
      if (existing) return { ...existing };
    }

    const source = this.requireAccount(input.sourceAccountId);
    const dest = this.requireAccount(input.destAccountId);
    if (source.currency !== input.currency || dest.currency !== input.currency) {
      throw new Error('currency mismatch');
    }
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      throw new Error('amountCents must be a positive integer');
    }
    if (input.amountCents < source.limits.minTransferCents) {
      throw new Error('below minimum transfer');
    }
    if (input.amountCents > source.limits.maxSingleTransferCents) {
      throw new Error('exceeds single-transfer limit');
    }
    if (source.availableCents < input.amountCents) {
      throw new Error('insufficient funds');
    }

    const now = new Date().toISOString();
    const transferId = `mock_xfer_${++this.seq}`;
    source.availableCents -= input.amountCents;
    source.ledgerCents -= input.amountCents;
    dest.availableCents += input.amountCents;
    dest.ledgerCents += input.amountCents;

    const record: TransferRecord = {
      transferId,
      status: 'settled',
      sourceAccountId: input.sourceAccountId,
      destAccountId: input.destAccountId,
      amountCents: input.amountCents,
      currency: input.currency,
      idempotencyKey: input.idempotencyKey,
      createdAt: now,
      updatedAt: now,
    };
    this.transfers.set(transferId, record);
    this.byIdempotency.set(input.idempotencyKey, transferId);

    this.pushTx(input.sourceAccountId, {
      id: `${transferId}_out`,
      accountId: input.sourceAccountId,
      amountCents: -input.amountCents,
      currency: input.currency,
      bookedAt: now,
      description: input.reference ?? 'transfer out',
      counterparty: input.destAccountId,
    });
    this.pushTx(input.destAccountId, {
      id: `${transferId}_in`,
      accountId: input.destAccountId,
      amountCents: input.amountCents,
      currency: input.currency,
      bookedAt: now,
      description: input.reference ?? 'transfer in',
      counterparty: input.sourceAccountId,
    });

    return { ...record };
  }

  async getTransferStatus(transferId: string): Promise<TransferRecord> {
    const t = this.transfers.get(transferId);
    if (!t) throw new Error(`transfer not found: ${transferId}`);
    return { ...t };
  }

  async cancelTransfer(transferId: string): Promise<TransferRecord> {
    const t = this.transfers.get(transferId);
    if (!t) throw new Error(`transfer not found: ${transferId}`);
    if (t.status === 'settled') {
      throw new Error('settled transfers cannot be cancelled in sandbox');
    }
    t.status = 'cancelled';
    t.updatedAt = new Date().toISOString();
    return { ...t };
  }

  async verifyAccount(accountId: string): Promise<boolean> {
    return this.accounts.has(accountId);
  }

  async getAccountLimits(accountId: string): Promise<AccountLimits> {
    return { ...this.requireAccount(accountId).limits };
  }

  async getCurrency(accountId: string): Promise<string> {
    return this.requireAccount(accountId).currency;
  }

  async getProviderStatus(): Promise<ProviderStatus> {
    return {
      healthy: true,
      mode: 'sandbox',
      message: 'MockBankAccountProvider — no real bank credentials required',
      checkedAt: new Date().toISOString(),
    };
  }

  private requireAccount(accountId: string): MockAccount {
    const a = this.accounts.get(accountId);
    if (!a) throw new Error(`unknown account: ${accountId}`);
    return a;
  }

  private pushTx(accountId: string, tx: BankTransaction): void {
    const list = this.transactions.get(accountId) ?? [];
    list.push(tx);
    this.transactions.set(accountId, list);
  }
}

/**
 * Resolve bank provider by name. Only `mock` is supported — no live bank SDKs.
 */
export function getBankProvider(name = 'mock'): BankAccountProvider {
  const normalized = String(name || 'mock').trim().toLowerCase();
  if (normalized === 'mock' || normalized === 'sandbox') {
    return new MockBankAccountProvider();
  }
  throw new Error(
    `Unsupported bank provider "${name}". Real bank providers are not configured; use mock.`
  );
}
