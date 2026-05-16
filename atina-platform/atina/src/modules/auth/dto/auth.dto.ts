import { z } from 'zod';

const bodyToObject = (v: unknown): unknown => (v === undefined || v === null ? {} : v);

/** Canonical form for lookups (matches DB / login). */
export const emailSchema = z.string().trim().toLowerCase().email();

export const RegisterDto = z
  .object({
    name: z.string().min(2).max(100),
    email: emailSchema,
    password: z.string().min(8).max(100).regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number'
    ),
    company: z.string().max(255).optional(),
    timezone: z.string().default('UTC'),
  })
  .strict();

export const LoginDto = z
  .object({
    email: emailSchema,
    password: z.string().min(1),
    rememberMe: z.boolean().default(false),
  })
  .strict();

export const RefreshTokenDto = z
  .object({
    refreshToken: z.string().min(1),
  })
  .strict();

export const ForgotPasswordDto = z
  .object({
    email: emailSchema,
  })
  .strict();

export const ResetPasswordDto = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  })
  .strict();

export const ChangePasswordDto = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  })
  .strict();

/** POST `/logout` — optional `refreshToken`; rejects unknown body keys. */
export const LogoutBodyDto = z.preprocess(
  bodyToObject,
  z
    .object({
      refreshToken: z.string().min(1).optional(),
    })
    .strict()
);

export type RegisterDtoType = z.infer<typeof RegisterDto>;
export type LoginDtoType = z.infer<typeof LoginDto>;
export type RefreshTokenDtoType = z.infer<typeof RefreshTokenDto>;
export type ForgotPasswordDtoType = z.infer<typeof ForgotPasswordDto>;
export type ResetPasswordDtoType = z.infer<typeof ResetPasswordDto>;
export type ChangePasswordDtoType = z.infer<typeof ChangePasswordDto>;
export type LogoutBodyDtoType = z.infer<typeof LogoutBodyDto>;
