import { Request, Response } from 'express';
import { AuthService } from '../service/auth.service';
import { createWorkflowChainAuthBootstrapAdapter } from '../service/workflow-chain-auth-bootstrap.adapter';
import { sendSuccess, sendCreated } from '../../../utils/response';
import { config } from '../../../config';
import { clientIpFromForwardedFor, headerFirst } from '../../../utils/http-headers';

export class AuthController {
  private service: AuthService;

  constructor(service?: AuthService) {
    this.service =
      service ??
      new AuthService({ postLoginBootstrap: createWorkflowChainAuthBootstrapAdapter() });
  }

  register = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.register(req.body);
    sendCreated(res, result, 'Registration successful');
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const { email, password, rememberMe } = req.body;
    const ip = clientIpFromForwardedFor(req.headers, req.socket.remoteAddress);
    const userAgent = headerFirst(req.headers['user-agent']) || '';
    const result = await this.service.login(email, password, ip, userAgent, rememberMe ?? false);
    sendSuccess(res, result, 'Login successful');
  };

  refreshToken = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;
    const tokens = await this.service.refreshTokens(refreshToken);
    sendSuccess(res, tokens, 'Tokens refreshed');
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;
    if (refreshToken) await this.service.logout(refreshToken);
    sendSuccess(res, null, 'Logged out successfully');
  };

  getMe = async (req: Request, res: Response): Promise<void> => {
    const user = await this.service.getMe(req.user!.userId);
    sendSuccess(res, user);
  };

  forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    const token = await this.service.forgotPassword(email);
    sendSuccess(
      res,
      config.app.isDev
        ? { message: 'If this email exists, a reset link was sent', _devToken: token }
        : { message: 'If this email exists, a reset link was sent' }
    );
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    const { token, password } = req.body;
    await this.service.resetPassword(token, password);
    sendSuccess(res, null, 'Password reset successful');
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    const { currentPassword, newPassword } = req.body;
    await this.service.changePassword(req.user!.userId, currentPassword, newPassword);
    sendSuccess(res, null, 'Password changed successfully');
  };

  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;
    await this.service.verifyEmail(token);
    sendSuccess(res, null, 'Email verified successfully');
  };
}
