import { z } from 'zod';

const bodyToObject = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

/** Query param boolean: `true`/`false`/`1`/`0` (case-insensitive); empty → absent. */
const optionalQueryBoolean = z.preprocess((val: unknown) => {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'yes') return true;
    if (s === 'false' || s === '0' || s === 'no') return false;
  }
  return val;
}, z.boolean().optional());

export const UpdateProfileDto = z.preprocess(
  bodyToObject,
  z
    .object({
      name: z.string().min(2).max(100).optional(),
      company: z.string().max(255).optional(),
      phone: z.string().max(50).optional(),
      timezone: z.string().max(100).optional(),
      language: z.string().max(10).optional(),
      avatarUrl: z.string().url().optional(),
    })
    .strict()
);

export const CreateApiKeyDto = z
  .object({
    name: z.string().min(1).max(100),
    permissions: z.array(z.enum(['read', 'write', 'admin'])).default(['read']),
    expiresAt: z.string().datetime().optional(),
  })
  .strict();

export const UserQueryDto = z
  .object({
    page: z.coerce.number().int().min(1).catch(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().optional(),
    role: z.enum(['admin', 'user', 'moderator']).optional(),
    isActive: optionalQueryBoolean,
  })
  .strict();

/** PATCH `/users/:id` (requireAdmin) — matches `UsersService.adminUpdateUser` */
export const UsersAdminPatchBodyDto = z.preprocess(
  bodyToObject,
  z
    .object({
      name: z.string().min(2).max(100).optional(),
      role: z.enum(['admin', 'user', 'moderator']).optional(),
      isActive: z.boolean().optional(),
      planId: z.union([z.string().uuid(), z.null()]).optional(),
    })
    .strict()
);

export type UpdateProfileDtoType = z.infer<typeof UpdateProfileDto>;
export type CreateApiKeyDtoType = z.infer<typeof CreateApiKeyDto>;
export type UserQueryDtoType = z.infer<typeof UserQueryDto>;
export type UsersAdminPatchBodyDtoType = z.infer<typeof UsersAdminPatchBodyDto>;
