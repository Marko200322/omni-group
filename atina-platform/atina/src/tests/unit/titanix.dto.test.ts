import { CreateTitanixWorkspaceDto, RunTitanixDto, TitanixRunParamsDto } from '../../modules/titanix/dto/titanix.dto';

describe('Titanix DTOs', () => {
  it('CreateTitanixWorkspaceDto applies defaults', () => {
    const r = CreateTitanixWorkspaceDto.safeParse({ name: 'abc' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.budgetAllocated).toBe(0);
      expect(r.data.executionProfile).toBe('balanced');
    }
  });

  it('RunTitanixDto applies defaults', () => {
    const r = RunTitanixDto.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.pipeline).toBe('ops');
      expect(r.data.jobs).toBe(10);
    }
  });

  it('rejects short workspace name', () => {
    expect(CreateTitanixWorkspaceDto.safeParse({ name: 'ab' }).success).toBe(false);
  });

  it('rejects unknown fields for strict schemas', () => {
    expect(CreateTitanixWorkspaceDto.safeParse({ name: 'valid', unexpected: true }).success).toBe(false);
    expect(RunTitanixDto.safeParse({ jobs: 5, extra: 1 }).success).toBe(false);
  });

  it('rejects non-integer jobs and invalid param id', () => {
    expect(RunTitanixDto.safeParse({ jobs: 1.2 }).success).toBe(false);
    expect(TitanixRunParamsDto.safeParse({ id: '$bad' }).success).toBe(false);
  });
});
