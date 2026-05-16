import { ComplianceRepository } from '../repository/compliance.repository';

export class ComplianceService {
  private readonly repo = new ComplianceRepository();

  async record(
    userId: string | null,
    framework: string,
    controlKey: string,
    status: string,
    notes: string,
    evidence: Record<string, unknown>
  ) {
    const { rows } = await this.repo.insert(userId, framework, controlKey, status, notes, evidence);
    return rows[0];
  }

  async list(framework?: string) {
    const { rows } = await this.repo.list(framework);
    return rows;
  }
}
