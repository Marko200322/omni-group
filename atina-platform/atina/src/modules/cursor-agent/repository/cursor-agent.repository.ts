import { query } from '../../../database/connection';

export type CursorRunRow = {
  id: string;
  user_id: string | null;
  source: string;
  prompt: string;
  status: string;
  agent_id: string | null;
  run_id: string | null;
  result_summary: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

export class CursorAgentRepository {
  async insert(input: {
    userId: string | null;
    source: string;
    prompt: string;
  }): Promise<CursorRunRow> {
    const { rows } = await query<CursorRunRow>(
      `INSERT INTO cursor_agent_runs (user_id, source, prompt, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [input.userId, input.source, input.prompt],
    );
    return rows[0];
  }

  async markRunning(id: string, agentId?: string, runId?: string): Promise<void> {
    await query(
      `UPDATE cursor_agent_runs
       SET status = 'running', agent_id = COALESCE($2, agent_id), run_id = COALESCE($3, run_id)
       WHERE id = $1`,
      [id, agentId ?? null, runId ?? null],
    );
  }

  async markFinished(id: string, summary: string, agentId?: string, runId?: string): Promise<void> {
    await query(
      `UPDATE cursor_agent_runs
       SET status = 'finished', result_summary = $2, completed_at = NOW(),
           agent_id = COALESCE($3, agent_id), run_id = COALESCE($4, run_id)
       WHERE id = $1`,
      [id, summary.slice(0, 8000), agentId ?? null, runId ?? null],
    );
  }

  async markError(id: string, message: string, agentId?: string, runId?: string): Promise<void> {
    await query(
      `UPDATE cursor_agent_runs
       SET status = 'error', error_message = $2, completed_at = NOW(),
           agent_id = COALESCE($3, agent_id), run_id = COALESCE($4, run_id)
       WHERE id = $1`,
      [id, message.slice(0, 4000), agentId ?? null, runId ?? null],
    );
  }

  async listRecent(limit = 20): Promise<CursorRunRow[]> {
    const { rows } = await query<CursorRunRow>(
      `SELECT * FROM cursor_agent_runs ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    return rows;
  }

  async getById(id: string): Promise<CursorRunRow | null> {
    const { rows } = await query<CursorRunRow>(`SELECT * FROM cursor_agent_runs WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }
}
