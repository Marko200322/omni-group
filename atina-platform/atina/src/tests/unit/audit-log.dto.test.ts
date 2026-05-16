import { RecordAuditEventDto } from '../../modules/audit-log/dto/audit-log.dto';

describe('RecordAuditEventDto', () => {
  it('parses valid payload with default severity and payload', () => {
    const r = RecordAuditEventDto.safeParse({
      eventType: 'user.login',
      entityType: 'User',
      entityId: 'uuid-1',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.severity).toBe('info');
      expect(r.data.payload).toEqual({});
    }
  });

  it('accepts explicit severity and payload', () => {
    const r = RecordAuditEventDto.safeParse({
      eventType: 'billing',
      entityType: 'Invoice',
      entityId: 'inv-1',
      severity: 'error',
      payload: { amount: 10 },
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.severity).toBe('error');
      expect(r.data.payload).toEqual({ amount: 10 });
    }
  });

  it('rejects short eventType', () => {
    const r = RecordAuditEventDto.safeParse({
      eventType: 'x',
      entityType: 'User',
      entityId: 'id',
    });
    expect(r.success).toBe(false);
  });

  it('rejects eventType over max length', () => {
    const r = RecordAuditEventDto.safeParse({
      eventType: 'e'.repeat(81),
      entityType: 'User',
      entityId: 'id-1',
    });
    expect(r.success).toBe(false);
  });

  it('rejects entityId over max length', () => {
    const r = RecordAuditEventDto.safeParse({
      eventType: 'ok.event',
      entityType: 'User',
      entityId: 'x'.repeat(121),
    });
    expect(r.success).toBe(false);
  });

  it('rejects invalid severity', () => {
    const r = RecordAuditEventDto.safeParse({
      eventType: 'ok',
      entityType: 'User',
      entityId: '1',
      severity: 'critical',
    });
    expect(r.success).toBe(false);
  });

  it('accepts all enum severities', () => {
    for (const severity of ['debug', 'info', 'warn', 'error'] as const) {
      const r = RecordAuditEventDto.safeParse({
        eventType: 'evt',
        entityType: 'Ent',
        entityId: 'e1',
        severity,
      });
      expect(r.success).toBe(true);
    }
  });

  it('rejects empty entityId', () => {
    const r = RecordAuditEventDto.safeParse({
      eventType: 'evt',
      entityType: 'User',
      entityId: '',
    });
    expect(r.success).toBe(false);
  });
});
