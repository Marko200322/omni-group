import { NotFoundError } from '../../../utils/errors';
import { query } from '../../../database/connection';
import { SelfHealingRepository } from '../repository/self-healing.repository';

const AUTO_HEAL_DEFAULT_CAP = 20;
const AUTO_HEAL_MAX_CAP = 100;

/** Coerces invalid caps (NaN, negative, non-finite) to API defaults; preserves explicit 0 (no-op). */
export function normalizeAutoHealMaxEvents(maxEvents: number): number {
  if (maxEvents === 0) return 0;
  if (Number.isNaN(maxEvents) || maxEvents === Number.NEGATIVE_INFINITY) return AUTO_HEAL_DEFAULT_CAP;
  if (maxEvents === Number.POSITIVE_INFINITY) return AUTO_HEAL_MAX_CAP;
  if (maxEvents < 0) return AUTO_HEAL_DEFAULT_CAP;
  const n = Math.floor(maxEvents);
  if (n < 1) return AUTO_HEAL_DEFAULT_CAP;
  return Math.min(AUTO_HEAL_MAX_CAP, n);
}

export class SelfHealingService {
  private readonly repo = new SelfHealingRepository();

  async report(subsystem: string, issueKey: string, details: Record<string, unknown>) {
    const { rows: existing } = await this.repo.findOpen(subsystem, issueKey);
    if (existing[0]) {
      return { id: existing[0].id, subsystem, issue_key: issueKey, status: 'detected', duplicate: true };
    }
    const { rows } = await this.repo.report(subsystem, issueKey, details);
    return rows[0];
  }

  async heal(id: string, remediationAction: string, actorUserId: string) {
    const { rows: found } = await this.repo.getById(id);
    if (!found[0]) throw new NotFoundError('Self-heal event');

    const issue = found[0];
    const details = (issue.details ?? {}) as Record<string, unknown>;
    const remediation: Record<string, unknown> = { mode: 'manual', action: remediationAction };

    if (issue.subsystem === 'tasks' && typeof details.taskId === 'string') {
      const { rows: retried } = await this.repo.retryTask(details.taskId);
      remediation.taskRetried = Boolean(retried[0]);
      remediation.taskId = details.taskId;
    }

    if (issue.subsystem === 'payments' && typeof details.paymentId === 'string') {
      const { rows: payment } = await this.repo.markPaymentRetrying(details.paymentId);
      remediation.paymentRetried = Boolean(payment[0]);
      remediation.paymentId = details.paymentId;
    }

    if (issue.subsystem === 'integration-hub' && typeof details.integrationId === 'string') {
      const { rows: integration } = await this.repo.reactivateIntegration(details.integrationId);
      remediation.integrationReactivated = Boolean(integration[0]);
      remediation.integrationId = details.integrationId;
    }

    const { rows } = await this.repo.markHealed(id, remediationAction, remediation);
    if (!rows[0]) throw new NotFoundError('Self-heal event');
    await query(
      `INSERT INTO audit_events
       (actor_user_id, event_type, entity_type, entity_id, severity, payload)
       VALUES ($1, 'self_healing_manual_heal', 'self_heal_events', $2, 'warning', $3)`,
      [actorUserId, id, JSON.stringify(remediation)]
    );
    return rows[0];
  }

  async list() {
    const { rows } = await this.repo.list();
    return rows;
  }

  async autoScan(userId: string, opts: { includeTasks: boolean; includePayments: boolean; includeIntegrations: boolean }) {
    const created: Array<Record<string, unknown>> = [];

    if (opts.includeTasks) {
      const { rows } = await this.repo.listFailedTasks(30);
      for (const row of rows) {
        const issueKey = `task_failed:${row.id}`;
        const reported = await this.report('tasks', issueKey, {
          taskId: row.id,
          type: row.type,
          status: row.status,
          payload: row.payload,
        });
        created.push(reported);
      }
    }

    if (opts.includePayments) {
      const { rows } = await this.repo.listFailedPayments(30);
      for (const row of rows) {
        const issueKey = `payment_failed:${row.id}`;
        const reported = await this.report('payments', issueKey, {
          paymentId: row.id,
          provider: row.provider,
          status: row.status,
          metadata: row.metadata,
        });
        created.push(reported);
      }
    }

    if (opts.includeIntegrations) {
      const { rows } = await this.repo.listDisconnectedIntegrations(30);
      for (const row of rows) {
        const issueKey = `integration_disconnected:${row.id}`;
        const reported = await this.report('integration-hub', issueKey, {
          integrationId: row.id,
          providerSlug: row.provider_slug,
          status: row.status,
        });
        created.push(reported);
      }
    }

    await query(
      `INSERT INTO audit_events
       (actor_user_id, event_type, entity_type, entity_id, severity, payload)
       VALUES ($1, 'self_healing_auto_scan', 'self_heal_events', 'bulk', 'warning', $2)`,
      [userId, JSON.stringify({ totalCreated: created.length, options: opts })]
    );

    return { totalCreated: created.length, events: created };
  }

  async autoHeal(userId: string, maxEvents: number) {
    const cap = normalizeAutoHealMaxEvents(maxEvents);
    const { rows } = await this.repo.list();
    const detected = rows.filter((row) => row.status === 'detected').slice(0, cap);
    const healed: Array<Record<string, unknown>> = [];

    for (const issue of detected) {
      const healedIssue = await this.heal(
        String((issue as Record<string, unknown>).id),
        'Auto-heal policy execution',
        userId
      );
      healed.push(healedIssue as Record<string, unknown>);
    }

    await query(
      `INSERT INTO audit_events
       (actor_user_id, event_type, entity_type, entity_id, severity, payload)
       VALUES ($1, 'self_healing_auto_heal', 'self_heal_events', 'bulk', 'warning', $2)`,
      [userId, JSON.stringify({ requested: maxEvents, cap, healed: healed.length })]
    );

    return { attempted: detected.length, healed: healed.length, events: healed };
  }
}
