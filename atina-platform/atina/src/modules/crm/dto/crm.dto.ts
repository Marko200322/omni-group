import { z } from 'zod';

export const CreateContactDto = z
  .object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(50).optional(),
    company: z.string().max(255).optional(),
    position: z.string().max(100).optional(),
    status: z.enum(['lead', 'prospect', 'customer', 'churned', 'partner']).default('lead'),
    source: z.string().max(50).optional(),
    tags: z.array(z.string()).default([]),
    notes: z.string().optional(),
    customFields: z.record(z.unknown()).default({}),
  })
  .strict();

export const UpdateContactDto = CreateContactDto.partial().strict();

export const ContactQueryDto = z
  .object({
    page: z.coerce.number().int().min(1).catch(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    status: z.enum(['lead', 'prospect', 'customer', 'churned', 'partner']).optional(),
  })
  .strict();

export const ContactIdParamsDto = z.object({ id: z.string().uuid() }).strict();

const BulkContactRowDto = z
  .object({
    firstName: z.string().max(100).optional(),
    first_name: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    last_name: z.string().max(100).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(50).optional(),
    company: z.string().max(255).optional(),
    status: z.enum(['lead', 'prospect', 'customer', 'churned', 'partner']).optional(),
  })
  .passthrough();

export const BulkImportContactsDto = z
  .object({
    contacts: z.array(BulkContactRowDto).max(1000).default([]),
  })
  .strict();

export type CreateContactDtoType = z.infer<typeof CreateContactDto>;
export type UpdateContactDtoType = z.infer<typeof UpdateContactDto>;
export type ContactQueryDtoType = z.infer<typeof ContactQueryDto>;
export type BulkImportContactsDtoType = z.infer<typeof BulkImportContactsDto>;
