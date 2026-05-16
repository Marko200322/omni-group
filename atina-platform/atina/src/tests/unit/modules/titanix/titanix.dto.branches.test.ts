import {
  CreateTitanixWorkspaceDto,
  RunTitanixDto,
  TitanixRunParamsDto,
} from '../../../../modules/titanix/dto/titanix.dto';

describe('Titanix DTO branches', () => {
  describe('CreateTitanixWorkspaceDto', () => {
    it('rejects name shorter than 3 characters', () => {
      expect(CreateTitanixWorkspaceDto.safeParse({ name: 'ab' }).success).toBe(false);
    });

    it('rejects invalid executionProfile', () => {
      expect(
        CreateTitanixWorkspaceDto.safeParse({ name: 'abc', executionProfile: 'turbo' }).success
      ).toBe(false);
    });

    it('rejects name over max length', () => {
      expect(CreateTitanixWorkspaceDto.safeParse({ name: 'y'.repeat(121) }).success).toBe(false);
    });

    it('rejects budget below zero or above max', () => {
      expect(CreateTitanixWorkspaceDto.safeParse({ name: 'abc', budgetAllocated: -1 }).success).toBe(false);
      expect(CreateTitanixWorkspaceDto.safeParse({ name: 'abc', budgetAllocated: 2e9 }).success).toBe(false);
    });

    it('rejects non-finite budgetAllocated', () => {
      expect(CreateTitanixWorkspaceDto.safeParse({ name: 'abc', budgetAllocated: Number.POSITIVE_INFINITY }).success).toBe(
        false
      );
    });

    it('accepts each executionProfile', () => {
      for (const executionProfile of ['balanced', 'aggressive', 'safe'] as const) {
        const r = CreateTitanixWorkspaceDto.safeParse({ name: 'abc', executionProfile });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.executionProfile).toBe(executionProfile);
      }
    });
  });

  describe('RunTitanixDto', () => {
    it('rejects invalid pipeline', () => {
      expect(RunTitanixDto.safeParse({ pipeline: 'etl' }).success).toBe(false);
    });

    it('rejects jobs below 1 and above 200', () => {
      expect(RunTitanixDto.safeParse({ jobs: 0 }).success).toBe(false);
      expect(RunTitanixDto.safeParse({ jobs: 201 }).success).toBe(false);
    });

    it('accepts jobs at boundaries', () => {
      expect(RunTitanixDto.safeParse({ jobs: 1 }).success).toBe(true);
      expect(RunTitanixDto.safeParse({ jobs: 200 }).success).toBe(true);
    });

    it('accepts each pipeline value', () => {
      for (const pipeline of ['content', 'campaign', 'ops'] as const) {
        const r = RunTitanixDto.safeParse({ pipeline, jobs: 1 });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.pipeline).toBe(pipeline);
      }
    });
  });

  describe('TitanixRunParamsDto', () => {
    it('accepts alphanumeric id with hyphen', () => {
      expect(TitanixRunParamsDto.safeParse({ id: 'ab-12' }).success).toBe(true);
    });

    it('rejects id over 64 chars', () => {
      expect(TitanixRunParamsDto.safeParse({ id: 'z'.repeat(65) }).success).toBe(false);
    });

    it('rejects id shorter than 2', () => {
      expect(TitanixRunParamsDto.safeParse({ id: 'q' }).success).toBe(false);
    });

    it('rejects id with characters outside allowed set', () => {
      expect(TitanixRunParamsDto.safeParse({ id: 'a@b' }).success).toBe(false);
      expect(TitanixRunParamsDto.safeParse({ id: 'a.b' }).success).toBe(false);
    });
  });
});
