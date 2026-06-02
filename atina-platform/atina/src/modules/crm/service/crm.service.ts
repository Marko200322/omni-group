import { NotFoundError } from '../../../utils/errors';
import type {
  BulkImportContactsDtoType,
  ContactQueryDtoType,
  CreateContactDtoType,
  UpdateContactDtoType,
} from '../dto/crm.dto';
import { CrmRepository } from '../repository/crm.repository';

export class CrmService {
  private readonly repo = new CrmRepository();

  async listContacts(userId: string, query: ContactQueryDtoType) {
    const limit = query.limit;
    const offset = (query.page - 1) * limit;
    const [countResult, listResult] = await this.repo.listContacts(userId, {
      search: query.search,
      status: query.status,
      limit,
      offset,
    });
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);
    return { rows: listResult.rows, total, page: query.page, limit };
  }

  async getContact(id: string, userId: string) {
    const { rows } = await this.repo.getContact(id, userId);
    if (!rows[0]) throw new NotFoundError('Contact');
    return rows[0];
  }

  async createContact(userId: string, dto: CreateContactDtoType) {
    const { rows } = await this.repo.createContact(userId, dto);
    return rows[0];
  }

  async updateContact(id: string, userId: string, dto: UpdateContactDtoType) {
    const { rows } = await this.repo.updateContact(id, userId, dto);
    if (!rows[0]) throw new NotFoundError('Contact');
    return rows[0];
  }

  async deleteContact(id: string, userId: string) {
    const { rowCount } = await this.repo.deleteContact(id, userId);
    if (rowCount === 0) throw new NotFoundError('Contact');
  }

  async bulkImport(userId: string, dto: BulkImportContactsDtoType) {
    if (!dto.contacts.length) return { imported: 0 };
    let imported = 0;
    for (const c of dto.contacts) {
      try {
        await this.repo.bulkInsertContact(userId, c);
        imported++;
      } catch {
        /* skip bad records */
      }
    }
    return { imported };
  }

  async stats(userId: string) {
    const [total, byStatus, recentActivity] = await this.repo.stats(userId);
    return {
      total: parseInt(total.rows[0]?.count ?? '0', 10),
      byStatus: Object.fromEntries(
        byStatus.rows.map((r) => [r.status, parseInt(r.count, 10)])
      ),
      recentActivity: recentActivity.rows,
    };
  }
}
