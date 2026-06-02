import { ConflictError, NotFoundError } from '../../../utils/errors';
import type {
  ContractsListQueryDtoType,
  CreateContractDtoType,
  UpdateContractDtoType,
} from '../dto/contracts.dto';
import { ContractsRepository } from '../repository/contracts.repository';

export class ContractsService {
  private readonly repo = new ContractsRepository();

  async statsOverview(userId: string) {
    const [byStatus, totalValue] = await this.repo.statsOverview(userId);
    return {
      byStatus: Object.fromEntries(byStatus.rows.map((r) => [r.status, parseInt(r.count, 10)])),
      totalSignedValue: parseFloat(String(totalValue.rows[0]?.total ?? 0)),
    };
  }

  async list(userId: string, query: ContractsListQueryDtoType) {
    const offset = (query.page - 1) * query.limit;
    const [countResult, listResult] = await this.repo.list(userId, {
      status: query.status,
      limit: query.limit,
      offset,
    });
    return {
      rows: listResult.rows,
      total: parseInt(countResult.rows[0]?.count ?? '0', 10),
      page: query.page,
      limit: query.limit,
    };
  }

  async getById(id: string, userId: string) {
    const { rows } = await this.repo.getById(id, userId);
    if (!rows[0]) throw new NotFoundError('Contract');
    return rows[0];
  }

  async create(userId: string, dto: CreateContractDtoType) {
    const { rows } = await this.repo.create(userId, dto);
    return rows[0];
  }

  async update(id: string, userId: string, dto: UpdateContractDtoType) {
    const result = await this.repo.update(id, userId, dto);
    if (result === null) return { message: 'No changes' as const };
    if (!result.rows[0]) throw new NotFoundError('Contract');
    return result.rows[0];
  }

  async sign(id: string, userId: string, signedBy: string) {
    const { rows } = await this.repo.sign(id, userId, signedBy);
    if (rows[0]) return rows[0];
    const existing = await this.repo.getStatus(id, userId);
    if (!existing.rows[0]) throw new NotFoundError('Contract');
    if (existing.rows[0].status === 'signed') {
      throw new ConflictError('Contract is already signed');
    }
    throw new ConflictError('Contract cannot be signed in its current status');
  }

  async send(id: string, userId: string) {
    const { rows } = await this.repo.send(id, userId);
    if (!rows[0]) throw new NotFoundError('Contract or contract is not in draft status');
    return rows[0];
  }

  async cancel(id: string, userId: string) {
    const { rows } = await this.repo.cancel(id, userId);
    if (!rows[0]) throw new NotFoundError('Contract or contract cannot be canceled from current status');
    return rows[0];
  }

  async deleteDraft(id: string, userId: string) {
    const { rowCount } = await this.repo.deleteDraft(id, userId);
    if (rowCount === 0) throw new NotFoundError('Contract or only draft contracts can be deleted');
  }
}
