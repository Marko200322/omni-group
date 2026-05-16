import { z } from 'zod';
import { TEMPLATE_ENGINE_MAX_TEMPLATE_LENGTH } from '../template-engine.constants';

export const RenderTemplateDto = z
  .object({
    template: z
      .string()
      .max(TEMPLATE_ENGINE_MAX_TEMPLATE_LENGTH, 'Template exceeds maximum allowed length'),
    variables: z.record(z.string()).default({}),
  })
  .strict();

export type RenderTemplateDtoType = z.infer<typeof RenderTemplateDto>;
