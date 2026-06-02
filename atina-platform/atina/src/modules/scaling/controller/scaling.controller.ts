import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import type { ScalingEvaluateDtoType, ScalingRegisterNodeDtoType } from '../dto/scaling.dto';
import { ScalingService } from '../service/scaling.service';

export class ScalingController {
  private readonly service = new ScalingService();

  listNodes = async (_req: Request, res: Response): Promise<void> => {
    const data = await this.service.listNodes();
    sendSuccess(res, data);
  };

  registerNode = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as ScalingRegisterNodeDtoType;
    const data = await this.service.registerNode(
      body.nodeName,
      body.zone,
      body.capacityScore,
      body.metadata
    );
    sendCreated(res, data, 'Node registered');
  };

  evaluate = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.evaluate(req.body as ScalingEvaluateDtoType);
    sendSuccess(res, data);
  };
}
