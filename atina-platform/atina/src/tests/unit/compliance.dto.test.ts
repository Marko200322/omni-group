import {
  ComplianceListQueryDto,
  MAX_COMPLIANCE_EVIDENCE_JSON_CHARS,
  RecordComplianceDto,
} from '../../modules/compliance/dto/compliance.dto';

describe('ComplianceListQueryDto', () => {
  it('accepts empty query', () => {
    expect(ComplianceListQueryDto.parse({})).toEqual({});
  });

  it('accepts each framework value', () => {
    for (const framework of ['gdpr', 'iso27001', 'soc2', 'internal'] as const) {
      expect(ComplianceListQueryDto.parse({ framework })).toEqual({ framework });
    }
  });

  it('trims framework string', () => {
    expect(ComplianceListQueryDto.parse({ framework: '  gdpr  ' })).toEqual({ framework: 'gdpr' });
  });

  it('accepts single-element framework array (Express duplicate key form)', () => {
    expect(ComplianceListQueryDto.parse({ framework: ['soc2'] })).toEqual({ framework: 'soc2' });
  });

  it('treats empty string as absent framework', () => {
    expect(ComplianceListQueryDto.parse({ framework: '' })).toEqual({});
  });

  it('rejects invalid framework', () => {
    expect(() => ComplianceListQueryDto.parse({ framework: 'hipaa' })).toThrow();
  });

  it('rejects duplicate framework values (ambiguous query)', () => {
    expect(() => ComplianceListQueryDto.parse({ framework: ['gdpr', 'soc2'] })).toThrow();
  });

  it('rejects unknown keys (strict)', () => {
    expect(() => ComplianceListQueryDto.parse({ page: '1' })).toThrow();
  });
});

describe('RecordComplianceDto (Zod)', () => {
  it('applies defaults for minimal payload', () => {
    const r = RecordComplianceDto.safeParse({ controlKey: 'A.5.1' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.framework).toBe('internal');
      expect(r.data.status).toBe('pass');
      expect(r.data.evidence).toEqual({});
    }
  });

  it('accepts all framework and status enum values', () => {
    for (const framework of ['gdpr', 'iso27001', 'soc2', 'internal'] as const) {
      for (const status of ['pass', 'warn', 'fail'] as const) {
        const parsed = RecordComplianceDto.safeParse({
          framework,
          controlKey: 'ctrl',
          status,
          notes: 'ok',
          evidence: { ref: '1' },
        });
        expect(parsed.success).toBe(true);
      }
    }
  });

  it('rejects controlKey too short or too long', () => {
    expect(RecordComplianceDto.safeParse({ controlKey: 'x' }).success).toBe(false);
    expect(RecordComplianceDto.safeParse({ controlKey: 'y'.repeat(81) }).success).toBe(false);
  });

  it('rejects notes over max length', () => {
    expect(
      RecordComplianceDto.safeParse({
        controlKey: 'ok',
        notes: 'n'.repeat(501),
      }).success
    ).toBe(false);
  });

  it('rejects invalid framework', () => {
    expect(
      RecordComplianceDto.safeParse({ controlKey: 'ok', framework: 'hipaa' }).success
    ).toBe(false);
  });

  it('rejects controlKey that is only whitespace', () => {
    expect(RecordComplianceDto.safeParse({ controlKey: '     ' }).success).toBe(false);
  });

  it('trims controlKey for validation', () => {
    const r = RecordComplianceDto.safeParse({ controlKey: '  AB  ' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.controlKey).toBe('AB');
  });

  it('rejects evidence larger than serialized cap', () => {
    const big = 'z'.repeat(MAX_COMPLIANCE_EVIDENCE_JSON_CHARS);
    expect(
      RecordComplianceDto.safeParse({ controlKey: 'ok', evidence: { blob: big } }).success
    ).toBe(false);
  });
});
