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

  async listContacts(userId: string, query: ContactQueryDtoType, organizationId?: string) {
    const limit = query.limit;
    const offset = (query.page - 1) * limit;
    const [countResult, listResult] = await this.repo.listContacts(userId, {
      search: query.search,
      status: query.status,
      limit,
      offset,
    }, organizationId);
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);
    return { rows: listResult.rows, total, page: query.page, limit };
  }

  async getContact(id: string, userId: string, organizationId?: string) {
    const { rows } = await this.repo.getContact(id, userId, organizationId);
    if (!rows[0]) throw new NotFoundError('Contact');
    return rows[0];
  }

  async createContact(userId: string, dto: CreateContactDtoType, organizationId?: string) {
    const { rows } = await this.repo.createContact(userId, dto, organizationId);
    const contact = rows[0];
    // Fail-soft: Marketing observer must never break CRM create.
    try {
      const attr =
        dto.customFields && typeof dto.customFields === 'object'
          ? (dto.customFields as { attribution?: Record<string, string> }).attribution
          : undefined;
      const { recordLeadTouchpoint } = await import('../../marketing/lib/touchpoint-record');
      await recordLeadTouchpoint({
        contactId: typeof contact?.id === 'string' ? contact.id : null,
        attribution: attr,
        eventType: 'lead',
      });
    } catch {
      /* ignore */
    }
    return contact;
  }

  async updateContact(id: string, userId: string, dto: UpdateContactDtoType, organizationId?: string) {
    const { rows } = await this.repo.updateContact(id, userId, dto, organizationId);
    if (!rows[0]) throw new NotFoundError('Contact');
    return rows[0];
  }

  async deleteContact(id: string, userId: string, organizationId?: string) {
    const { rowCount } = await this.repo.deleteContact(id, userId, organizationId);
    if (rowCount === 0) throw new NotFoundError('Contact');
  }

  async bulkImport(userId: string, dto: BulkImportContactsDtoType, organizationId?: string) {
    if (!dto.contacts.length) return { imported: 0 };
    let imported = 0;
    for (const c of dto.contacts) {
      try {
        await this.repo.bulkInsertContact(userId, c, organizationId);
        imported++;
      } catch {
        /* skip bad records */
      }
    }
    return { imported };
  }

  async stats(userId: string, organizationId?: string) {
    const [total, byStatus, recentActivity] = await this.repo.stats(userId, organizationId);
    return {
      total: parseInt(total.rows[0]?.count ?? '0', 10),
      byStatus: Object.fromEntries(
        byStatus.rows.map((r) => [r.status, parseInt(r.count, 10)])
      ),
      recentActivity: recentActivity.rows,
    };
  }
}
