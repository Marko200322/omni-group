import { Request, Response } from 'express';
import { paginate, sendSuccess } from '../../../utils/response';
import { NotificationsService } from '../service/notifications.service';

export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as never;
    const { rows, total, page, limit } = await this.service.list(req.user!.userId, q);
    paginate(res, rows, total, page, limit);
  };

  markRead = async (req: Request, res: Response): Promise<void> => {
    await this.service.markRead(req.params.id, req.user!.userId);
    sendSuccess(res, null, 'Notification marked as read');
  };

  markAllRead = async (req: Request, res: Response): Promise<void> => {
    await this.service.markAllRead(req.user!.userId);
    sendSuccess(res, null, 'All notifications marked as read');
  };

  deleteNotification = async (req: Request, res: Response): Promise<void> => {
    await this.service.delete(req.params.id, req.user!.userId);
    sendSuccess(res, null, 'Notification deleted');
  };

  unreadCount = async (req: Request, res: Response): Promise<void> => {
    const count = await this.service.unreadCount(req.user!.userId);
    sendSuccess(res, { count });
  };
}
