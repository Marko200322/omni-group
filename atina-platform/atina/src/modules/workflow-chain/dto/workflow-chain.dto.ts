import { z } from 'zod';

/** Coerce missing JSON body to `{}` so optional-field DTOs match `validate.middleware` + clients with no body. */
const emptyBody = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

const ChainStepDto = z
  .object({
    step: z.string().min(2).max(80),
    moduleSlug: z.string().min(2).max(80),
    action: z.string().min(2).max(120),
    config: z.record(z.unknown()).default({}),
  })
  .strict();

const WorkflowChainIdParamDto = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

const WorkflowTemplateKeyParamDto = z
  .object({
    templateKey: z.string().trim().min(2).max(120).regex(/^[a-zA-Z0-9_-]+$/, 'Invalid template key format'),
  })
  .strict();

const WorkflowExecutionTaskIdParamDto = z
  .object({
    executionTaskId: z.string().uuid(),
  })
  .strict();

export const CreateWorkflowChainDto = z
  .object({
    name: z.string().min(3).max(150),
    steps: z.array(ChainStepDto).min(1),
  })
  .strict();

export const UpdateWorkflowChainDto = z.preprocess(
  emptyBody,
  z
    .object({
      name: z.string().min(3).max(150).optional(),
      steps: z.array(ChainStepDto).min(1).optional(),
    })
    .strict()
);

export const CloneWorkflowChainDto = z.preprocess(
  emptyBody,
  z
    .object({
      name: z.string().min(3).max(150).optional(),
    })
    .strict()
);

export const CreateWorkflowFromTemplateDto = z.preprocess(
  emptyBody,
  z
    .object({
      name: z.string().min(3).max(150).optional(),
    })
    .strict()
);

export const CreateAndRunWorkflowFromTemplateDto = z.preprocess(
  emptyBody,
  z
    .object({
      name: z.string().min(3).max(150).optional(),
      input: z.record(z.unknown()).default({}),
      force: z.boolean().optional().default(false),
    })
    .strict()
);

export const BootstrapWorkflowTemplatesDto = z.preprocess(
  emptyBody,
  z
    .object({
      overwrite: z.boolean().optional().default(false),
      namePrefix: z.string().min(1).max(60).optional(),
    })
    .strict()
);

export const RunWorkflowChainDto = z.preprocess(
  emptyBody,
  z
    .object({
      input: z.record(z.unknown()).default({}),
      force: z.boolean().optional().default(false),
    })
    .strict()
);

export const WorkflowExecutionQueryDto = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    workflowId: z.string().uuid().optional(),
  })
  .strict();

export const RerunWorkflowExecutionDto = z.preprocess(
  emptyBody,
  z
    .object({
      input: z.record(z.unknown()).optional(),
    })
    .strict()
);

export const WorkflowExecutionStatsQueryDto = z
  .object({
    workflowId: z.string().uuid().optional(),
  })
  .strict();

export const WorkflowStepAnalyticsQueryDto = z
  .object({
    workflowId: z.string().uuid().optional(),
    days: z.coerce.number().int().min(1).max(365).default(30),
  })
  .strict();

export const WorkflowChainIdParamsDto = WorkflowChainIdParamDto;
export const WorkflowTemplateKeyParamsDto = WorkflowTemplateKeyParamDto;
export const WorkflowExecutionTaskIdParamsDto = WorkflowExecutionTaskIdParamDto;
