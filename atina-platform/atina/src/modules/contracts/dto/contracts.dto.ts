import { z } from 'zod';

function refineContractDates(
  data: { startDate?: string; endDate?: string },
  ctx: z.RefinementCtx
): void {
  const parse = (raw: string | undefined, path: (string | number)[]): Date | undefined => {
    if (raw === undefined) return undefined;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid date', path });
      return undefined;
    }
    return d;
  };
  const start = parse(data.startDate, ['startDate']);
  const end = parse(data.endDate, ['endDate']);
  if (start !== undefined && end !== undefined && end < start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'endDate must be on or after startDate',
      path: ['endDate'],
    });
  }
}

const CreateContractShape = z
  .object({
    title: z.string().min(1).max(255),
    content: z.string().optional(),
    contactId: z.string().uuid().optional(),
    status: z.enum(['draft', 'sent', 'signed', 'expired', 'canceled']).default('draft'),
    value: z.number().finite().positive().optional(),
    currency: z.string().length(3).default('USD'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .strict();

export const CreateContractDto = CreateContractShape.superRefine(refineContractDates);

export const UpdateContractDto = CreateContractShape.partial()
  .strict()
  .superRefine((data, ctx) => {
    if (data.startDate !== undefined || data.endDate !== undefined) {
      refineContractDates({ startDate: data.startDate, endDate: data.endDate }, ctx);
    }
  });

export const SignContractDto = z.object({ signedBy: z.string().min(1) }).strict();

export const ContractIdParamsDto = z.object({ id: z.string().uuid() }).strict();

export const ContractsListQueryDto = z
  .object({
    page: z.coerce.number().int().min(1).catch(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(['draft', 'sent', 'signed', 'expired', 'canceled']).optional(),
  })
  .strict();

export type CreateContractDtoType = z.infer<typeof CreateContractDto>;
export type UpdateContractDtoType = z.infer<typeof UpdateContractDto>;
export type ContractsListQueryDtoType = z.infer<typeof ContractsListQueryDto>;
