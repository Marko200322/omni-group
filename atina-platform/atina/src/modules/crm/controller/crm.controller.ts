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
    const { rows, total, page, limit } = await this.service.listContacts(
      req.user!.userId,
      q,
      req.user!.organizationId,
    );
    paginate(res, rows, total, page, limit);
  };

  getContact = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.getContact(req.params.id, req.user!.userId, req.user!.organizationId);
    sendSuccess(res, data);
  };

  createContact = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.createContact(
      req.user!.userId,
      req.body as CreateContactDtoType,
      req.user!.organizationId,
    );
    sendCreated(res, data, 'Contact created');
  };

  updateContact = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.updateContact(
      req.params.id,
      req.user!.userId,
      req.body as UpdateContactDtoType,
      req.user!.organizationId,
    );
    sendSuccess(res, data, 'Contact updated');
  };

  deleteContact = async (req: Request, res: Response): Promise<void> => {
    await this.service.deleteContact(req.params.id, req.user!.userId, req.user!.organizationId);
    sendSuccess(res, null, 'Contact deleted');
  };

  bulkImport = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.bulkImport(
      req.user!.userId,
      req.body as BulkImportContactsDtoType,
      req.user!.organizationId,
    );
    if (data.imported === 0) {
      sendSuccess(res, data);
      return;
    }
    sendCreated(res, data, `${data.imported} contacts imported`);
  };

  stats = async (req: Request, res: Response): Promise<void> => {
    const data = await this.service.stats(req.user!.userId, req.user!.organizationId);
    sendSuccess(res, data);
  };
}
