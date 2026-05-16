import {
  BootstrapWorkflowTemplatesDto,
  CloneWorkflowChainDto,
  CreateAndRunWorkflowFromTemplateDto,
  CreateWorkflowChainDto,
  CreateWorkflowFromTemplateDto,
  RerunWorkflowExecutionDto,
  RunWorkflowChainDto,
  UpdateWorkflowChainDto,
  WorkflowChainIdParamsDto,
  WorkflowExecutionQueryDto,
  WorkflowExecutionStatsQueryDto,
  WorkflowExecutionTaskIdParamsDto,
  WorkflowStepAnalyticsQueryDto,
  WorkflowTemplateKeyParamsDto,
} from '../../modules/workflow-chain/dto/workflow-chain.dto';

const validStep = {
  step: 's1',
  moduleSlug: 'mod',
  action: 'run',
  config: {},
};

describe('Workflow chain DTOs', () => {
  it('CreateWorkflowChainDto accepts minimal valid payload', () => {
    const r = CreateWorkflowChainDto.safeParse({
      name: 'abc',
      steps: [validStep],
    });
    expect(r.success).toBe(true);
  });

  it('CreateWorkflowChainDto rejects short name and empty steps', () => {
    expect(CreateWorkflowChainDto.safeParse({ name: 'ab', steps: [validStep] }).success).toBe(false);
    expect(CreateWorkflowChainDto.safeParse({ name: 'abc', steps: [] }).success).toBe(false);
  });

  it('CreateWorkflowChainDto rejects unknown top-level keys and unknown step keys', () => {
    expect(
      CreateWorkflowChainDto.safeParse({
        name: 'abc',
        steps: [validStep],
        extra: 1,
      } as Record<string, unknown>).success
    ).toBe(false);
    expect(
      CreateWorkflowChainDto.safeParse({
        name: 'abc',
        steps: [{ ...validStep, unknownKey: true }],
      } as Record<string, unknown>).success
    ).toBe(false);
  });

  it('CreateWorkflowChainDto rejects undefined body (required fields)', () => {
    expect(CreateWorkflowChainDto.safeParse(undefined).success).toBe(false);
  });

  it('UpdateWorkflowChainDto allows empty object and optional fields', () => {
    expect(UpdateWorkflowChainDto.safeParse({}).success).toBe(true);
    expect(UpdateWorkflowChainDto.safeParse(undefined).success).toBe(true);
    expect(UpdateWorkflowChainDto.safeParse({ name: 'new name' }).success).toBe(true);
    expect(UpdateWorkflowChainDto.safeParse({ steps: [validStep] }).success).toBe(true);
  });

  it('UpdateWorkflowChainDto rejects unknown keys', () => {
    expect(UpdateWorkflowChainDto.safeParse({ name: 'ok', foo: 1 } as Record<string, unknown>).success).toBe(false);
  });

  it('CloneWorkflowChainDto and template create DTOs accept optional name', () => {
    expect(CloneWorkflowChainDto.safeParse({}).success).toBe(true);
    expect(CloneWorkflowChainDto.safeParse(undefined).success).toBe(true);
    expect(CreateWorkflowFromTemplateDto.safeParse({ name: 'Named' }).success).toBe(true);
    expect(CloneWorkflowChainDto.safeParse({ name: 'ok', x: 1 } as Record<string, unknown>).success).toBe(false);
  });

  it('CreateAndRunWorkflowFromTemplateDto defaults input and force', () => {
    const r = CreateAndRunWorkflowFromTemplateDto.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.input).toEqual({});
      expect(r.data.force).toBe(false);
    }
    expect(CreateAndRunWorkflowFromTemplateDto.safeParse(undefined).success).toBe(true);
    expect(
      CreateAndRunWorkflowFromTemplateDto.safeParse({ input: {}, extra: 'n' } as Record<string, unknown>).success
    ).toBe(false);
  });

  it('BootstrapWorkflowTemplatesDto defaults overwrite to false', () => {
    const r = BootstrapWorkflowTemplatesDto.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.overwrite).toBe(false);
    expect(BootstrapWorkflowTemplatesDto.safeParse({ unknown: true } as Record<string, unknown>).success).toBe(false);
  });

  it('RunWorkflowChainDto defaults input and force', () => {
    const r = RunWorkflowChainDto.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.input).toEqual({});
      expect(r.data.force).toBe(false);
    }
    expect(RunWorkflowChainDto.safeParse(undefined).success).toBe(true);
    expect(RunWorkflowChainDto.safeParse({ force: false, bad: 1 } as Record<string, unknown>).success).toBe(false);
  });

  it('WorkflowExecutionQueryDto coerces page and limit with bounds', () => {
    const r = WorkflowExecutionQueryDto.safeParse({ page: '2', limit: '50' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.page).toBe(2);
      expect(r.data.limit).toBe(50);
    }
    expect(WorkflowExecutionQueryDto.safeParse({ limit: 101 }).success).toBe(false);
    expect(
      WorkflowExecutionQueryDto.safeParse({ page: 1, limit: 20, extra: 'x' } as Record<string, unknown>).success
    ).toBe(false);
  });

  it('RerunWorkflowExecutionDto allows undefined input', () => {
    expect(RerunWorkflowExecutionDto.safeParse({}).success).toBe(true);
  });

  it('UUID param DTOs reject invalid ids', () => {
    expect(WorkflowChainIdParamsDto.safeParse({ id: 'not-uuid' }).success).toBe(false);
    expect(WorkflowExecutionTaskIdParamsDto.safeParse({ executionTaskId: 'x' }).success).toBe(false);
    expect(
      WorkflowChainIdParamsDto.safeParse({ id: '550e8400-e29b-41d4-a716-446655440000' }).success
    ).toBe(true);
    expect(
      WorkflowChainIdParamsDto.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        extra: 'x',
      } as Record<string, unknown>).success
    ).toBe(false);
  });

  it('WorkflowTemplateKeyParamsDto enforces key format', () => {
    expect(WorkflowTemplateKeyParamsDto.safeParse({ templateKey: 'ok-1_key' }).success).toBe(true);
    expect(WorkflowTemplateKeyParamsDto.safeParse({ templateKey: 'bad key' }).success).toBe(false);
  });

  it('WorkflowExecutionStatsQueryDto and WorkflowStepAnalyticsQueryDto accept optional workflowId', () => {
    expect(WorkflowExecutionStatsQueryDto.safeParse({}).success).toBe(true);
    expect(
      WorkflowExecutionStatsQueryDto.safeParse({ foo: '1' } as Record<string, unknown>).success
    ).toBe(false);
    const days = WorkflowStepAnalyticsQueryDto.safeParse({ days: '7' });
    expect(days.success).toBe(true);
    if (days.success) expect(days.data.days).toBe(7);
    expect(WorkflowStepAnalyticsQueryDto.safeParse({ days: 400 }).success).toBe(false);
    expect(
      WorkflowStepAnalyticsQueryDto.safeParse({ days: 7, extra: 'y' } as Record<string, unknown>).success
    ).toBe(false);
  });
});
