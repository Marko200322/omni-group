import { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../../../utils/response';
import { ResourceProcurementService } from '../service/resource-procurement.service';

export class ResourceProcurementController {
  private readonly service = new ResourceProcurementService();

  catalog = async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, { items: this.service.catalog() });
  };

  settings = async (_req: Request, res: Response): Promise<void> => {
    const settings = await this.service.getSettings();
    const wallets = await this.service.walletStatus();
    sendSuccess(res, { settings, wallets });
  };

  setAutoProcurement = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.setAutoProcurement(req.body.enabled);
    sendSuccess(res, result, 'Auto-nabavka ažurirana');
  };

  listOrders = async (req: Request, res: Response): Promise<void> => {
    const orders = await this.service.listOrders(req.user!.userId);
    sendSuccess(res, { orders });
  };

  checkout = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.checkout(req.user!.userId, req.body.items);
    sendCreated(res, result, 'Narudžbina kreirana — pošalji uplatu sa referencom');
  };

  markPaid = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.markPaid(req.user!.userId, req.params.id);
    sendSuccess(res, result, 'Uplata označena — potvrdi kad stigne na račun');
  };

  confirmPaid = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.confirmPaid(req.user!.userId, req.params.id);
    sendSuccess(res, result, 'Uplata potvrđena — resursi aktivirani u wallet-ima');
  };

  runAutoCheck = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.runAutoProcurement(req.user!.userId);
    sendSuccess(res, result);
  };
}
