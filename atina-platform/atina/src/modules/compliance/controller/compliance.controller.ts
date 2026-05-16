import type { z } from 'zod';
import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { ComplianceListQueryDto } from '../dto/compliance.dto';
import { ComplianceService } from '../service/compliance.service';

type ComplianceListQuery = z.infer<typeof ComplianceListQueryDto>;

export class ComplianceController {
  private readonly service = new ComplianceService();

  record = async (req: Request, res: Response): Promise<void> => {
    const d = req.body;
    const row = await this.service.record(req.user?.userId ?? null, d.framework, d.controlKey, d.status, d.notes ?? '', d.evidence);
    sendCreated(res, row, 'Compliance record saved');
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const { framework } = req.query as ComplianceListQuery;
    const rows = await this.service.list(framework);
    sendSuccess(res, rows);
  };
}
