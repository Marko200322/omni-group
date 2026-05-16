import { CreateTitanisWorkspaceDto, RunTitanisDto, TitanisRunParamsDto } from '../../modules/titanis/dto/titanis.dto';

describe('Titanis DTOs', () => {
  it('CreateTitanisWorkspaceDto applies defaults', () => {
    const r = CreateTitanisWorkspaceDto.safeParse({ name: 'abc' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.outreachChannel).toBe('mixed');
      expect(r.data.budgetAllocated).toBe(0);
    }
  });

  it('RunTitanisDto applies defaults', () => {
    const r = RunTitanisDto.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.mode).toBe('lead-hunt');
      expect(r.data.targetCount).toBe(25);
    }
  });

  it('rejects short workspace name', () => {
    expect(CreateTitanisWorkspaceDto.safeParse({ name: 'ab' }).success).toBe(false);
  });

  it('rejects unknown fields for strict schemas', () => {
    expect(CreateTitanisWorkspaceDto.safeParse({ name: 'valid', unexpected: true }).success).toBe(false);
    expect(RunTitanisDto.safeParse({ targetCount: 5, extra: 1 }).success).toBe(false);
  });

  it('rejects non-integer targetCount and invalid param id', () => {
    expect(RunTitanisDto.safeParse({ targetCount: 2.5 }).success).toBe(false);
    expect(TitanisRunParamsDto.safeParse({ id: '!!!' }).success).toBe(false);
  });

  it('accepts targetCount boundaries and trims workspace name', () => {
    expect(RunTitanisDto.safeParse({ targetCount: 1 }).success).toBe(true);
    expect(RunTitanisDto.safeParse({ targetCount: 500 }).success).toBe(true);
    const trimmed = CreateTitanisWorkspaceDto.safeParse({ name: '  abc  ' });
    expect(trimmed.success).toBe(true);
    if (trimmed.success) expect(trimmed.data.name).toBe('abc');
  });

  it('rejects targetCount above max and empty param id after trim', () => {
    expect(RunTitanisDto.safeParse({ targetCount: 501 }).success).toBe(false);
    expect(TitanisRunParamsDto.safeParse({ id: '   ' }).success).toBe(false);
  });
});
