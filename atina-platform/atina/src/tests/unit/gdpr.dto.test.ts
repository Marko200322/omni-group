import {
  CreateGdprRequestDto,
  GdprListAllQueryDto,
  GdprListMineQueryDto,
  GdprProcessIdParamsDto,
  MAX_GDPR_JSON_CHARS,
  ProcessGdprRequestDto,
} from '../../modules/gdpr/dto/gdpr.dto';

describe('GdprListMineQueryDto', () => {
  it('accepts empty query', () => {
    expect(GdprListMineQueryDto.parse({})).toEqual({});
  });

  it('accepts scope=mine', () => {
    expect(GdprListMineQueryDto.parse({ scope: 'mine' })).toEqual({ scope: 'mine' });
  });

  it('trims scope string', () => {
    expect(GdprListMineQueryDto.parse({ scope: '  mine  ' })).toEqual({ scope: 'mine' });
  });

  it('accepts single-element scope array (Express duplicate key form)', () => {
    expect(GdprListMineQueryDto.parse({ scope: ['mine'] })).toEqual({ scope: 'mine' });
  });

  it('treats empty string as absent scope', () => {
    expect(GdprListMineQueryDto.parse({ scope: '' })).toEqual({});
  });

  it('rejects scope=all', () => {
    expect(() => GdprListMineQueryDto.parse({ scope: 'all' })).toThrow();
  });

  it('rejects duplicate scope values (ambiguous query)', () => {
    expect(() => GdprListMineQueryDto.parse({ scope: ['mine', 'all'] })).toThrow();
  });

  it('rejects unknown keys (strict)', () => {
    expect(() => GdprListMineQueryDto.parse({ page: '1' })).toThrow();
  });
});

describe('GdprListAllQueryDto', () => {
  it('accepts empty query', () => {
    expect(GdprListAllQueryDto.parse({})).toEqual({});
  });

  it('accepts scope=all', () => {
    expect(GdprListAllQueryDto.parse({ scope: 'all' })).toEqual({ scope: 'all' });
  });

  it('trims scope string', () => {
    expect(GdprListAllQueryDto.parse({ scope: '  all  ' })).toEqual({ scope: 'all' });
  });

  it('accepts single-element scope array (Express duplicate key form)', () => {
    expect(GdprListAllQueryDto.parse({ scope: ['all'] })).toEqual({ scope: 'all' });
  });

  it('treats empty string as absent scope', () => {
    expect(GdprListAllQueryDto.parse({ scope: '' })).toEqual({});
  });

  it('rejects scope=mine', () => {
    expect(() => GdprListAllQueryDto.parse({ scope: 'mine' })).toThrow();
  });

  it('rejects duplicate scope values', () => {
    expect(() => GdprListAllQueryDto.parse({ scope: ['all', 'all'] })).toThrow();
  });

  it('rejects ambiguous multi-value scope', () => {
    expect(() => GdprListAllQueryDto.parse({ scope: ['all', 'mine'] })).toThrow();
  });

  it('rejects unknown keys (strict)', () => {
    expect(() => GdprListAllQueryDto.parse({ page: '1' })).toThrow();
  });
});

describe('CreateGdprRequestDto', () => {
  it('accepts each requestType and defaults payload to {}', () => {
    for (const requestType of ['export', 'delete', 'rectify', 'restrict'] as const) {
      const r = CreateGdprRequestDto.parse({ requestType });
      expect(r.requestType).toBe(requestType);
      expect(r.payload).toEqual({});
    }
  });

  it('preserves arbitrary payload keys', () => {
    expect(
      CreateGdprRequestDto.parse({
        requestType: 'export',
        payload: { email: 'a@b.com', meta: { x: 1 } },
      })
    ).toEqual({
      requestType: 'export',
      payload: { email: 'a@b.com', meta: { x: 1 } },
    });
  });

  it('rejects invalid requestType', () => {
    expect(() => CreateGdprRequestDto.parse({ requestType: 'erase' })).toThrow();
  });

  it('rejects unknown keys (strict)', () => {
    expect(() =>
      CreateGdprRequestDto.parse({ requestType: 'export', extra: true } as Record<string, unknown>)
    ).toThrow();
  });

  it('rejects non-object payload', () => {
    expect(() => CreateGdprRequestDto.parse({ requestType: 'export', payload: 'oops' })).toThrow();
  });

  it('rejects payload larger than serialized cap', () => {
    const big = 'x'.repeat(MAX_GDPR_JSON_CHARS);
    expect(() =>
      CreateGdprRequestDto.parse({ requestType: 'export', payload: { data: big } })
    ).toThrow(/at most/i);
  });
});

describe('ProcessGdprRequestDto', () => {
  it('defaults response to {}', () => {
    expect(ProcessGdprRequestDto.parse({ status: 'approved' })).toEqual({
      status: 'approved',
      response: {},
    });
  });

  it('accepts each status with response', () => {
    for (const status of ['approved', 'rejected', 'completed'] as const) {
      expect(ProcessGdprRequestDto.parse({ status, response: { ok: true } })).toEqual({
        status,
        response: { ok: true },
      });
    }
  });

  it('rejects invalid status', () => {
    expect(() => ProcessGdprRequestDto.parse({ status: 'pending' })).toThrow();
  });

  it('rejects unknown keys (strict)', () => {
    expect(() =>
      ProcessGdprRequestDto.parse({ status: 'approved', extra: 1 } as Record<string, unknown>)
    ).toThrow();
  });

  it('rejects response larger than serialized cap', () => {
    const big = 'y'.repeat(MAX_GDPR_JSON_CHARS);
    expect(() =>
      ProcessGdprRequestDto.parse({ status: 'approved', response: { data: big } })
    ).toThrow(/at most/i);
  });
});

describe('GdprProcessIdParamsDto', () => {
  it('accepts uuid', () => {
    expect(
      GdprProcessIdParamsDto.parse({ id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' })
    ).toEqual({ id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' });
  });

  it('rejects non-uuid id', () => {
    expect(() => GdprProcessIdParamsDto.parse({ id: 'not-uuid' })).toThrow();
  });

  it('rejects unknown param keys (strict)', () => {
    expect(() =>
      GdprProcessIdParamsDto.parse({
        id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
        extra: 'x',
      } as Record<string, unknown>)
    ).toThrow();
  });
});
