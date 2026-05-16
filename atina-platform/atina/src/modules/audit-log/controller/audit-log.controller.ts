import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { AuditLogService } from '../service/audit-log.service';

export class AuditLogController {
  private readonly service = new AuditLogService();

  record = async (req: Request, res: Response): Promise<void> => {
    const d = req.body;
    const row = await this.service.record(req.user?.userId ?? null, d.eventType, d.entityType, d.entityId, d.severity, d.payload);
    sendCreated(res, row, 'Audit event recorded');
  };

  list = async (_req: Request, res: Response): Promise<void> => {
    const rows = await this.service.list();
    sendSuccess(res, rows);
  };
}
