import { CreateMonitorProbeDto } from '../../modules/titan-monitor/dto/titan-monitor.dto';

describe('Titan Monitor DTOs', () => {
  it('CreateMonitorProbeDto applies default note', () => {
    const r = CreateMonitorProbeDto.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.note).toBe('manual probe');
  });

  it('CreateMonitorProbeDto accepts custom note', () => {
    const r = CreateMonitorProbeDto.safeParse({ note: 'custom check' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.note).toBe('custom check');
  });

  it('CreateMonitorProbeDto rejects short or long note', () => {
    expect(CreateMonitorProbeDto.safeParse({ note: 'x' }).success).toBe(false);
    expect(CreateMonitorProbeDto.safeParse({ note: 'a'.repeat(256) }).success).toBe(false);
  });

  it('CreateMonitorProbeDto rejects unknown keys (strict)', () => {
    expect(CreateMonitorProbeDto.safeParse({ note: 'ok', extra: true } as Record<string, unknown>).success).toBe(false);
  });
});
