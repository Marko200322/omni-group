import { query } from '../../../database/connection';

export class ComplianceRepository {
  insert(
    userId: string | null,
    framework: string,
    controlKey: string,
    status: string,
    notes: string,
    evidence: Record<string, unknown>
  ) {
    return query(
      `INSERT INTO compliance_records
       (user_id, framework, control_key, status, notes, evidence)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, framework, controlKey, status, notes || null, JSON.stringify(evidence)]
    );
  }

  list(framework?: string) {
    if (!framework) {
      return query(`SELECT * FROM compliance_records ORDER BY checked_at DESC LIMIT 200`);
    }
    return query(
      `SELECT * FROM compliance_records
       WHERE framework = $1
       ORDER BY checked_at DESC LIMIT 200`,
      [framework]
    );
  }
}
