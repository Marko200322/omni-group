import { SetPhaseDto } from '../../modules/phase-launch/dto/phase-launch.dto';

describe('SetPhaseDto', () => {
  it('parses valid phase and optional notes', () => {
    expect(SetPhaseDto.parse({ phase: 'v2', notes: 'ok' })).toEqual({ phase: 'v2', notes: 'ok' });
  });

  it('rejects invalid phase enum', () => {
    expect(() => SetPhaseDto.parse({ phase: 'vx' })).toThrow();
  });

  it('rejects unknown keys (strict)', () => {
    expect(() => SetPhaseDto.parse({ phase: 'v1', extra: true } as Record<string, unknown>)).toThrow();
  });
});
