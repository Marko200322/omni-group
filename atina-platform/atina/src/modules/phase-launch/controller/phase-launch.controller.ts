import { Request, Response } from 'express';
import { sendSuccess } from '../../../utils/response';
import { PhaseLaunchService } from '../service/phase-launch.service';
import { PhaseBootService } from '../service/phase-boot.service';

export class PhaseLaunchController {
  private readonly service = new PhaseLaunchService();
  private readonly boot = new PhaseBootService();

  get = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.getCurrentPhase();
    sendSuccess(res, data);
  };

  set = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.setCurrentPhaseWithAudit(req.user!.userId, req.body);
    sendSuccess(res, data, 'Phase updated');
  };

  bootStatus = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.boot.getBootState();
    sendSuccess(res, data);
  };

  pdfSignoff = async (req: Request, res: Response): Promise<void> => {
    const data = await this.boot.recordPdfLegalSignoff({
      actorUserId: req.user!.userId,
      trackerVersion: req.body.trackerVersion,
      notes: req.body.notes,
    });
    sendSuccess(res, data, 'PDF legal sign-off recorded');
  };

  getPdfSignoff = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.boot.getPdfLegalSignoff();
    sendSuccess(res, data);
  };
}
