import { Request, Response } from 'express';
import { paginate, sendCreated, sendSuccess } from '../../../utils/response';
import type {
  CreateContractDtoType,
  UpdateContractDtoType,
} from '../dto/contracts.dto';
import { ContractsService } from '../service/contracts.service';

export class ContractsController {
  private readonly service = new ContractsService();

  statsOverview = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.statsOverview(req.user!.userId);
    sendSuccess(res, data);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as never;
    const { rows, total, page, limit } = await this.service.list(req.user!.userId, q);
    paginate(res, rows, total, page, limit);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.getById(req.params.id, req.user!.userId);
    sendSuccess(res, data);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.create(req.user!.userId, req.body as CreateContractDtoType);
    sendCreated(res, data, 'Contract created');
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.update(
      req.params.id,
      req.user!.userId,
      req.body as UpdateContractDtoType
    );
    if (typeof data === 'object' && data !== null && 'message' in data) {
      sendSuccess(res, data);
      return;
    }
    sendSuccess(res, data, 'Contract updated');
  };

  sign = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.sign(req.params.id, req.user!.userId, req.body.signedBy);
    sendSuccess(res, data, 'Contract signed');
  };

  send = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.send(req.params.id, req.user!.userId);
    sendSuccess(res, data, 'Contract sent');
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.cancel(req.params.id, req.user!.userId);
    sendSuccess(res, data, 'Contract canceled');
  };

  deleteDraft = async (req: Request, res: Response): Promise<void> => {
    await this.service.deleteDraft(req.params.id, req.user!.userId);
    sendSuccess(res, null, 'Contract deleted');
  };
}
