import { Request, Response } from 'express';
import { z } from 'zod';
import { UsersService } from '../service/users.service';
import { sendSuccess, sendCreated, paginate } from '../../../utils/response';
import { UserQueryDto } from '../dto/users.dto';

export class UsersController {
  private service: UsersService;

  constructor() {
    this.service = new UsersService();
  }

  getProfile = async (req: Request, res: Response): Promise<void> => {
    const user = await this.service.getProfile(req.user!.userId);
    sendSuccess(res, user);
  };

  updateProfile = async (req: Request, res: Response): Promise<void> => {
    const user = await this.service.updateProfile(req.user!.userId, req.body);
    sendSuccess(res, user, 'Profile updated');
  };

  getStats = async (req: Request, res: Response): Promise<void> => {
    const stats = await this.service.getUserStats(req.user!.userId);
    sendSuccess(res, stats);
  };

  // Admin endpoints
  listUsers = async (req: Request, res: Response): Promise<void> => {
    const { page, limit, search, role, isActive } = req.query as unknown as z.infer<typeof UserQueryDto>;
    const { users, total } = await this.service.listUsers({ page, limit, search, role, isActive });
    paginate(res, users, total, page, limit);
  };

  getUserById = async (req: Request, res: Response): Promise<void> => {
    const user = await this.service.getUserById(req.user!.userId, req.user!.role, req.params.id);
    sendSuccess(res, user);
  };

  adminUpdateUser = async (req: Request, res: Response): Promise<void> => {
    const user = await this.service.adminUpdateUser(req.params.id, req.body);
    sendSuccess(res, user, 'User updated');
  };

  deactivateUser = async (req: Request, res: Response): Promise<void> => {
    await this.service.deactivateUser(req.params.id);
    sendSuccess(res, null, 'User deactivated');
  };

  // API Keys
  createApiKey = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.createApiKey(req.user!.userId, req.body);
    sendCreated(res, result, 'API key created — save the key, it will not be shown again');
  };

  listApiKeys = async (req: Request, res: Response): Promise<void> => {
    const keys = await this.service.listApiKeys(req.user!.userId);
    sendSuccess(res, keys);
  };

  revokeApiKey = async (req: Request, res: Response): Promise<void> => {
    await this.service.revokeApiKey(req.user!.userId, req.params.id);
    sendSuccess(res, null, 'API key revoked');
  };
}
