import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { UsersController } from './controller/users.controller';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { z } from 'zod';
import { UpdateProfileDto, CreateApiKeyDto, UserQueryDto, UsersAdminPatchBodyDto } from './dto/users.dto';

const ApiKeyIdParamsDto = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

const UserIdParamsDto = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export class UsersModule implements IModule {
  name = 'User Management';
  slug = 'users';
  version = '1.0.0';
  isCore = true;
  router: Router;
  private controller: UsersController;

  constructor() {
    this.router = Router();
    this.controller = new UsersController();
  }

  async initialize(): Promise<void> {
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Current user
    this.router.get(
      '/profile',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getProfile
    );
    this.router.patch('/profile', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(UpdateProfileDto), this.controller.updateProfile);
    this.router.get(
      '/stats',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getStats
    );

    // API Keys
    this.router.get(
      '/api-keys',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listApiKeys
    );
    this.router.post('/api-keys', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreateApiKeyDto), this.controller.createApiKey);
    this.router.delete(
      '/api-keys/:id',
      authenticate,
      validateParams(ApiKeyIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.revokeApiKey
    );

    // Admin
    this.router.get(
      '/',
      authenticate,
      requireAdmin,
      validateQuery(UserQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listUsers
    );
    this.router.get(
      '/:id',
      authenticate,
      validateParams(UserIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getUserById
    );
    this.router.patch(
      '/:id',
      authenticate,
      requireAdmin,
      validateParams(UserIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(UsersAdminPatchBodyDto),
      this.controller.adminUpdateUser
    );
    this.router.delete(
      '/:id',
      authenticate,
      requireAdmin,
      validateParams(UserIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.deactivateUser
    );
  }
}
