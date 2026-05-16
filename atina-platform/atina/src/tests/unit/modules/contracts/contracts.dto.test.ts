import {
  ContractIdParamsDto,
  ContractsListQueryDto,
  CreateContractDto,
  SignContractDto,
  UpdateContractDto,
} from '../../../../modules/contracts/contracts.module';

describe('Contracts DTOs', () => {
  it('CreateContractDto applies defaults', () => {
    const r = CreateContractDto.safeParse({ title: 'Agreement' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.status).toBe('draft');
      expect(r.data.currency).toBe('USD');
      expect(r.data.metadata).toEqual({});
    }
  });

  it('CreateContractDto accepts all status values', () => {
    for (const status of ['draft', 'sent', 'signed', 'expired', 'canceled'] as const) {
      const r = CreateContractDto.safeParse({ title: 'T', status });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.status).toBe(status);
    }
  });

  it('CreateContractDto rejects empty or oversized title', () => {
    expect(CreateContractDto.safeParse({ title: '' }).success).toBe(false);
    expect(CreateContractDto.safeParse({ title: 'a'.repeat(256) }).success).toBe(false);
  });

  it('CreateContractDto rejects invalid status and contact id', () => {
    expect(CreateContractDto.safeParse({ title: 'ok', status: 'pending' }).success).toBe(false);
    expect(CreateContractDto.safeParse({ title: 'ok', contactId: 'not-a-uuid' }).success).toBe(false);
  });

  it('CreateContractDto rejects non-positive value and NaN', () => {
    expect(CreateContractDto.safeParse({ title: 'ok', value: 0 }).success).toBe(false);
    expect(CreateContractDto.safeParse({ title: 'ok', value: -1 }).success).toBe(false);
    expect(CreateContractDto.safeParse({ title: 'ok', value: Number.NaN }).success).toBe(false);
  });

  it('CreateContractDto rejects wrong currency length', () => {
    expect(CreateContractDto.safeParse({ title: 'ok', currency: 'US' }).success).toBe(false);
    expect(CreateContractDto.safeParse({ title: 'ok', currency: 'USDD' }).success).toBe(false);
  });

  it('UpdateContractDto allows empty partial and partial fields', () => {
    expect(UpdateContractDto.safeParse({}).success).toBe(true);
    const r = UpdateContractDto.safeParse({ title: 'Only title' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.title).toBe('Only title');
  });

  it('UpdateContractDto rejects invalid patch values', () => {
    expect(UpdateContractDto.safeParse({ status: 'unknown' }).success).toBe(false);
    expect(UpdateContractDto.safeParse({ value: 0 }).success).toBe(false);
  });

  it('SignContractDto requires non-empty signedBy', () => {
    expect(SignContractDto.safeParse({ signedBy: 'Jane' }).success).toBe(true);
    expect(SignContractDto.safeParse({ signedBy: '' }).success).toBe(false);
  });

  it('CreateContractDto, UpdateContractDto, SignContractDto reject unknown keys (strict)', () => {
    expect(CreateContractDto.safeParse({ title: 'T', extra: 1 } as Record<string, unknown>).success).toBe(false);
    expect(UpdateContractDto.safeParse({ title: 'T', foo: 'bar' } as Record<string, unknown>).success).toBe(false);
    expect(SignContractDto.safeParse({ signedBy: 'J', x: 1 } as Record<string, unknown>).success).toBe(false);
  });

  it('ContractIdParamsDto requires uuid', () => {
    expect(
      ContractIdParamsDto.safeParse({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }).success
    ).toBe(true);
    expect(ContractIdParamsDto.safeParse({ id: 'nope' }).success).toBe(false);
    expect(
      ContractIdParamsDto.safeParse({
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        extra: 'x',
      } as Record<string, unknown>).success
    ).toBe(false);
  });

  it('ContractsListQueryDto coerces page and applies catch/default for pagination', () => {
    const defaults = ContractsListQueryDto.safeParse({});
    expect(defaults.success).toBe(true);
    if (defaults.success) {
      expect(defaults.data.page).toBe(1);
      expect(defaults.data.limit).toBe(20);
    }

    const badPage = ContractsListQueryDto.safeParse({ page: 'not-a-number' });
    expect(badPage.success).toBe(true);
    if (badPage.success) expect(badPage.data.page).toBe(1);

    expect(ContractsListQueryDto.safeParse({ limit: '101' }).success).toBe(false);
    expect(ContractsListQueryDto.safeParse({ limit: 0 }).success).toBe(false);
  });

  it('ContractsListQueryDto rejects unknown keys (strict)', () => {
    expect(
      ContractsListQueryDto.safeParse({ page: 1, limit: 20, sort: 'asc' } as Record<string, unknown>).success
    ).toBe(false);
  });

  it('ContractsListQueryDto rejects invalid status filter', () => {
    expect(ContractsListQueryDto.safeParse({ status: 'pending' }).success).toBe(false);
  });

  it('ContractsListQueryDto accepts each valid optional status', () => {
    for (const status of ['draft', 'sent', 'signed', 'expired', 'canceled'] as const) {
      const r = ContractsListQueryDto.safeParse({ status });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.status).toBe(status);
    }
  });

  it('UpdateContractDto rejects value NaN', () => {
    expect(UpdateContractDto.safeParse({ value: Number.NaN }).success).toBe(false);
  });

  it('ContractsListQueryDto clamps page below 1 via catch default', () => {
    const p0 = ContractsListQueryDto.safeParse({ page: 0 });
    expect(p0.success).toBe(true);
    if (p0.success) expect(p0.data.page).toBe(1);

    const pNeg = ContractsListQueryDto.safeParse({ page: -3 });
    expect(pNeg.success).toBe(true);
    if (pNeg.success) expect(pNeg.data.page).toBe(1);
  });

  it('CreateContractDto accepts large finite positive value', () => {
    const r = CreateContractDto.safeParse({ title: 'Enterprise', value: Number.MAX_SAFE_INTEGER });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.value).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('CreateContractDto rejects endDate before startDate', () => {
    const r = CreateContractDto.safeParse({
      title: 'R',
      startDate: '2026-06-10T00:00:00.000Z',
      endDate: '2026-06-01T00:00:00.000Z',
    });
    expect(r.success).toBe(false);
  });

  it('CreateContractDto rejects invalid startDate', () => {
    expect(
      CreateContractDto.safeParse({ title: 'R', startDate: 'not-a-date' }).success
    ).toBe(false);
  });

  it('UpdateContractDto rejects endDate before startDate when both present', () => {
    expect(
      UpdateContractDto.safeParse({
        startDate: '2026-06-10T00:00:00.000Z',
        endDate: '2026-06-01T00:00:00.000Z',
      }).success
    ).toBe(false);
  });
});
