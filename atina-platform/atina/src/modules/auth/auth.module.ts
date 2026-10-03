import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { AuthController } from './controller/auth.controller';
import { authenticate } from '../../api/middleware/auth.middleware';
import { registrationGate } from '../../api/middleware/registration-gate.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { z } from 'zod';
import { authLimiter, passwordResetLimiter, authSessionLimiter } from '../../api/middleware/rate-limit.middleware';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  LogoutBodyDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  TwoFactorLoginDto,
  TwoFactorConfirmDto,
  TwoFactorDisableDto,
} from './dto/auth.dto';

const VerifyEmailTokenParamsDto = z
  .object({
    token: z.string().min(1).max(4096),
  })
  .strict();

export class AuthModule implements IModule {
  name = 'Authentication';
  slug = 'auth';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private controller: AuthController;

  constructor() {
    this.router = Router();
    this.controller = new AuthController();
  }

  async initialize(): Promise<void> {
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Public routes
    this.router.post('/register', authLimiter, registrationGate, validateQuery(StrictEmptyQueryDto), validateBody(RegisterDto), this.controller.register);
    this.router.post('/login', authLimiter, validateQuery(StrictEmptyQueryDto), validateBody(LoginDto), this.controller.login);
    this.router.post('/login/2fa', authLimiter, validateQuery(StrictEmptyQueryDto), validateBody(TwoFactorLoginDto), this.controller.completeTwoFactorLogin);
    this.router.post('/refresh', authLimiter, validateQuery(StrictEmptyQueryDto), validateBody(RefreshTokenDto), this.controller.refreshToken);
    this.router.post('/logout', authSessionLimiter, validateQuery(StrictEmptyQueryDto), validateBody(LogoutBodyDto), this.controller.logout);
    this.router.post('/forgot-password', passwordResetLimiter, validateQuery(StrictEmptyQueryDto), validateBody(ForgotPasswordDto), this.controller.forgotPassword);
    this.router.post('/reset-password', passwordResetLimiter, validateQuery(StrictEmptyQueryDto), validateBody(ResetPasswordDto), this.controller.resetPassword);
    this.router.get(
      '/verify-email/:token',
      authLimiter,
      validateParams(VerifyEmailTokenParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.verifyEmail
    );

    // Protected routes
    this.router.get(
      '/me',
      authenticate,
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getMe
    );
    this.router.post('/change-password', authenticate, authSessionLimiter, validateQuery(StrictEmptyQueryDto), validateBody(ChangePasswordDto), this.controller.changePassword);
    this.router.get(
      '/2fa/status',
      authenticate,
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getTwoFactorStatus
    );
    this.router.post(
      '/2fa/setup',
      authenticate,
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.startTwoFactorSetup
    );
    this.router.post(
      '/2fa/confirm',
      authenticate,
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(TwoFactorConfirmDto),
      this.controller.confirmTwoFactorSetup
    );
    this.router.post(
      '/2fa/disable',
      authenticate,
      authSessionLimiter,
      validateQuery(StrictEmptyQueryDto),
      validateBody(TwoFactorDisableDto),
      this.controller.disableTwoFactor
    );
  }
}
