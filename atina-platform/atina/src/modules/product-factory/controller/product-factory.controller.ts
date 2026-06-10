import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import type { CreateProductFactoryProjectDtoType } from '../dto/product-factory.dto';
import { ProductFactoryService } from '../service/product-factory.service';

export class ProductFactoryController {
  private readonly service = new ProductFactoryService();

  stats = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.stats(req.user!.userId));
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.list(req.user!.userId, req.query as never);
    sendSuccess(res, data);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getById(req.user!.userId, req.params.id));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.create(req.user!.userId, req.body as CreateProductFactoryProjectDtoType);
    sendCreated(res, data, 'Product factory project created');
  };

  build = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.build(req.user!.userId, req.params.id), 'Greenfield scaffold built');
  };

  test = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.test(req.user!.userId, req.params.id), 'Product factory tests completed');
  };

  deployPrep = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.deployPrep(req.user!.userId, req.params.id), 'Deploy prep recorded');
  };

  internalTick = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.internalTick(req.user!.userId), 'Internal SaaS lane tick completed');
  };
}
