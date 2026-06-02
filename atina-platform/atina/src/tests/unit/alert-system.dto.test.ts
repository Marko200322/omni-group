import { CreateAlertDto, AlertListQueryDto } from '../../modules/alert-system/dto/alert-system.dto';

describe('Alert System DTOs', () => {
  it('CreateAlertDto accepts valid payload', () => {
    const r = CreateAlertDto.safeParse({
      title: 'High load',
      message: 'Node pool above 90%',
      severity: 'warning',
    });
    expect(r.success).toBe(true);
  });

  it('CreateAlertDto rejects unknown keys', () => {
    expect(
      CreateAlertDto.safeParse({ title: 'x', message: 'y', extra: true } as Record<string, unknown>)
        .success
    ).toBe(false);
  });

  it('AlertListQueryDto defaults page/limit', () => {
    const r = AlertListQueryDto.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.page).toBe(1);
      expect(r.data.limit).toBe(20);
    }
  });
});
