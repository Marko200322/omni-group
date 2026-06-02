import { Request, Response } from 'express';
import { paginate, sendCreated, sendSuccess } from '../../../utils/response';
import type {
  BulkImportContactsDtoType,
  CreateContactDtoType,
  UpdateContactDtoType,
} from '../dto/crm.dto';
import { CrmService } from '../service/crm.service';

export class CrmController {
  private readonly service = new CrmService();

  listContacts = async (req: Request, res: Response): Promise<void> => {
    const q = req.query as never;
    const { rows, total, page, limit } = await this.service.listContacts(req.user!.userId, q);
    paginate(res, rows, total, page, limit);
  };

  getContact = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.getContact(req.params.id, req.user!.userId);
    sendSuccess(res, data);
  };

  createContact = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.createContact(req.user!.userId, req.body as CreateContactDtoType);
    sendCreated(res, data, 'Contact created');
  };

  updateContact = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.updateContact(
      req.params.id,
      req.user!.userId,
      req.body as UpdateContactDtoType
    );
    sendSuccess(res, data, 'Contact updated');
  };

  deleteContact = async (req: Request, res: Response): Promise<void> => {
    await this.service.deleteContact(req.params.id, req.user!.userId);
    sendSuccess(res, null, 'Contact deleted');
  };

  bulkImport = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.bulkImport(req.user!.userId, req.body as BulkImportContactsDtoType);
    if (data.imported === 0) {
      sendSuccess(res, data);
      return;
    }
    sendCreated(res, data, `${data.imported} contacts imported`);
  };

  stats = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.stats(req.user!.userId);
    sendSuccess(res, data);
  };
}
