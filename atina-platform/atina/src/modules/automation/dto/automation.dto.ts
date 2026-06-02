import { z } from 'zod';

export const WorkflowStepSchema = z
  .object({
    id: z.string(),
    type: z.enum(['send_email', 'wait', 'condition', 'http_request', 'create_task', 'notify']),
    config: z.record(z.unknown()),
    nextStepId: z.string().optional(),
    conditionTrue: z.string().optional(),
    conditionFalse: z.string().optional(),
  })
  .strict();

export type AutomationWorkflowStep = z.infer<typeof WorkflowStepSchema>;

export interface AutomationWorkflowPayload {
  steps?: AutomationWorkflowStep[];
  triggerType?: string;
  triggerConfig?: Record<string, unknown>;
  isActive?: boolean;
}

export const AutomationTaskUuidParamsDto = z.object({ id: z.string().uuid() }).strict();

export const CreateWorkflowDto = z
  .object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    triggerType: z.enum(['manual', 'schedule', 'webhook', 'event']),
    triggerConfig: z.record(z.unknown()).default({}),
    steps: z.array(WorkflowStepSchema).min(1),
    isActive: z.boolean().default(true),
  })
  .strict();

export const ExecuteWorkflowDto = z.preprocess(
  (v) => (v === undefined || v === null ? {} : v),
  z.object({ context: z.record(z.unknown()).optional() }).strict()
);

export type CreateWorkflowDtoType = z.infer<typeof CreateWorkflowDto>;
export type ExecuteWorkflowDtoType = z.infer<typeof ExecuteWorkflowDto>;
