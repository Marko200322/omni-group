import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { PublicSiteService } from '../service/public-site.service';

export class PublicSiteController {
  constructor(private readonly service = new PublicSiteService()) {}

  listSolutions = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.listSolutions(req.query as never), 'Public solutions');
  };

  getSolution = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getSolution(req.params.slug), 'Solution landing');
  };

  getClientSite = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, await this.service.getClientSite(req.params.slug), 'Client public site');
  };

  createClientSite = async (req: Request, res: Response): Promise<void> => {
    sendCreated(res, await this.service.createClientSite(req.user!.userId, req.body), 'Client site created');
  };

  publishClientSite = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(
      res,
      await this.service.publishClientSite(req.user!.userId, req.params.slug, req.body.publish),
      'Client site updated',
    );
  };
}
