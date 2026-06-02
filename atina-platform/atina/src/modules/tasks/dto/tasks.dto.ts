import { z } from 'zod';

export const CreateTaskDto = z
  .object({
    type: z.string().min(1).max(50),
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    priority: z.number().min(1).max(10).default(5),
    payload: z.record(z.unknown()).default({}),
    scheduledAt: z.string().datetime().optional(),
    maxAttempts: z.number().min(1).max(10).default(3),
  })
  .strict();

export const TaskIdParamsDto = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export const TasksListQueryDto = z
  .object({
    page: z.coerce.number().int().min(1).catch(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.string().max(50).optional(),
    type: z.string().max(50).optional(),
  })
  .strict();

export type CreateTaskDtoType = z.infer<typeof CreateTaskDto>;
export type TasksListQueryType = z.infer<typeof TasksListQueryDto>;
