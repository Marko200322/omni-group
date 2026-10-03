import { AppError, NotFoundError, ValidationError } from '../../../utils/errors';
import { config } from '../../../config';
import {
  ENGINE_VERSION,
  POLICY_VERSION,
  SCORING_VERSION,
  MODEL_VERSION,
  type AutonomyLevel,
  type OperatingMode,
} from '../lib/constants';
import { evaluateTransferPolicy } from '../lib/policy-engine';
import { assessRisk } from '../lib/risk-engine';
import { computeRoiScenarios } from '../lib/roi';
import { computeRunwayMonths } from '../lib/runway';
import { scoreOpportunity } from '../lib/scoring';
import { simulateBusinessMonths } from '../lib/simulation';
import { getBankProvider, type MockBankAccountProvider } from '../lib/bank-provider';
import { observeRevenueAllocations } from '../lib/observe';
import { eurToCents } from '../lib/money';
import { deriveOperatingMode } from '../lib/modes';
import { getDemandIntelligence } from '../lib/demand-intelligence';
import {
  ReinvestmentRepository,
  type ReinvestmentPolicyRow,
} from '../repository/reinvestment.repository';
import type {
  DecideApprovalBody,
  EngineDryRunYearBody,
  EngineRunBody,
  PatchActivePolicyBody,
  ProposeTransactionBody,
  ScenarioBody,
} from '../dto/reinvestment.dto';

function cents(v: string | number | null | undefined): number {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.trunc(v) : 0;
  const n = parseInt(String(v ?? '0'), 10);
  return Number.isFinite(n) ? n : 0;
}

function mapPolicy(row: ReinvestmentPolicyRow) {
  return {
    id: row.id,
    version: row.version,
    dryRun: row.dry_run,
    killSwitch: row.kill_switch,
    autonomyLevel: row.autonomy_level as AutonomyLevel,
    operatingMode: row.operating_mode as OperatingMode,
    minReserveCents: cents(row.min_reserve_cents),
    targetReserveCents: cents(row.target_reserve_cents),
    maxSingleTxCents: cents(row.max_single_tx_cents),
    maxDailySpendCents: cents(row.max_daily_spend_cents),
    maxWeeklySpendCents: cents(row.max_weekly_spend_cents),
    maxMonthlySpendCents: cents(row.max_monthly_spend_cents),
    approvalThresholdCents: cents(row.approval_threshold_cents),
    mandatoryApprovalCents: cents(row.mandatory_approval_cents),
    minRunwayMonths: parseFloat(row.min_runway_months) || 3,
    allowMarketingReallocation: row.allow_marketing_reallocation,
    policyVersion: row.policy_version || POLICY_VERSION,
    scoringVersion: row.scoring_version || SCORING_VERSION,
    engineVersion: row.engine_version || ENGINE_VERSION,
  };
}

export class ReinvestmentService {
  private readonly repo = new ReinvestmentRepository();

  private async requireActivePolicy() {
    const { rows } = await this.repo.getActivePolicy();
    const row = rows[0];
    if (!row) {
      throw new AppError(
        'No active reinvestment policy — fail closed',
        503,
        'REINVESTMENT_POLICY_MISSING'
      );
    }
    return { row, policy: mapPolicy(row) };
  }

  private async appendAudit(input: Parameters<ReinvestmentRepository['appendAudit']>[0]) {
    try {
      await this.repo.appendAudit({
        ...input,
        engineVersion: input.engineVersion ?? ENGINE_VERSION,
        policyVersion: input.policyVersion ?? POLICY_VERSION,
        scoringVersion: input.scoringVersion ?? SCORING_VERSION,
        modelVersion: input.modelVersion ?? MODEL_VERSION,
      });
    } catch {
      // Audit REVOKE UPDATE/DELETE may leave INSERT working; never block on audit failure logging.
    }
  }

  /**
   * Derive account balances from revenue_allocations aggregates — never invent money.
   */
  private async syncDerivedBalances() {
    const observation = await observeRevenueAllocations();
    const { rows: accounts } = await this.repo.listAccounts();
    const byCode = new Map(accounts.map((a) => [a.code, a]));

    const derived: Record<string, number> = {
      revenue: observation.grossCents,
      system: observation.systemReinvestCents,
      marketing: observation.resourceReserveCents,
      profit_reserve: observation.ownerNetCents + observation.taxReserveCents,
    };

    const synced: Array<{ code: string; availableCents: number; source: 'derived' }> = [];
    for (const [code, availableCents] of Object.entries(derived)) {
      const account = byCode.get(code);
      if (!account) continue;
      await this.repo.upsertDerivedBalance(account.id, availableCents, observation.currency);
      synced.push({ code, availableCents, source: 'derived' });
    }

    return { observation, synced, certainty: observation.paymentCount >= 0 };
  }

  async getStatus(actor?: { userId: string; role: string }) {
    const { policy } = await this.requireActivePolicy();
    const { observation, synced } = await this.syncDerivedBalances();
    const { rows: balances } = await this.repo.listBalances();

    let runwayMonths: number | null = null;
    let runwayNote: string | null = null;
    try {
      const { rows: monthly } = await this.repo.getRecentMonthlyAllocationTotals(3);
      if (monthly.length >= 1) {
        const avgGross =
          monthly.reduce((s, m) => s + eurToCents(parseFloat(m.gross)), 0) / monthly.length;
        const cashCents = observation.systemReinvestCents + observation.ownerNetCents;
        // Approximate monthly net as avg system reinvest portion — conservative.
        const avgSystem =
          monthly.reduce((s, m) => s + eurToCents(parseFloat(m.system_reinvest)), 0) /
          monthly.length;
        const monthlyNet = avgSystem - Math.max(0, Math.round(avgGross * 0.05));
        const rw = computeRunwayMonths(cashCents, monthlyNet >= 0 ? 0 : monthlyNet);
        runwayMonths = rw.infinite ? null : rw.runwayMonths;
        runwayNote = rw.infinite
          ? 'Non-negative estimated monthly net — runway treated as unbounded (null)'
          : 'Estimated from recent revenue_allocations monthly aggregates';
      } else {
        runwayNote = 'Insufficient revenue_allocations history for runway estimate';
      }
    } catch {
      runwayNote = 'Runway estimate unavailable (query failed)';
    }

    const derivedMode = deriveOperatingMode({
      cashCents: observation.systemReinvestCents + observation.ownerNetCents,
      monthlyNetCents: 0,
      revenueTrend: 'flat',
      minRunwayMonths: policy.minRunwayMonths,
    });

    await this.appendAudit({
      action: 'status.view',
      actorUserId: actor?.userId,
      actorRole: actor?.role,
      decision: 'ok',
      reason: 'admin_status',
      inputRefs: { paymentCount: observation.paymentCount },
    });

    let monitoringSignals: unknown = null;
    try {
      const { fetchMonitoringSignalsForReinvestment } = await import(
        '../../monitoring/lib/reinvestment-bridge'
      );
      monitoringSignals = await fetchMonitoringSignalsForReinvestment();
    } catch {
      monitoringSignals = {
        kind: 'UNAVAILABLE',
        monitoringOverallState: 'MONITORING_DEGRADED',
        notes: ['bridge_import_failed'],
      };
    }

    let marketingSignals: unknown = null;
    try {
      const { fetchMarketingSignalsForReinvestment } = await import(
        '../../marketing/lib/reinvestment-bridge'
      );
      marketingSignals = await fetchMarketingSignalsForReinvestment();
    } catch {
      marketingSignals = {
        kind: 'UNAVAILABLE',
        notes: ['marketing_bridge_import_failed'],
      };
    }

    return {
      engineVersion: ENGINE_VERSION,
      bankProvider: config.reinvestment.bankProvider,
      mode: policy.operatingMode,
      derivedModeHint: derivedMode,
      autonomyLevel: policy.autonomyLevel,
      dryRun: policy.dryRun,
      killSwitch: policy.killSwitch,
      policy,
      balances: balances.map((b) => ({
        accountCode: b.account_code,
        availableCents: cents(b.available_cents),
        pendingCents: cents(b.pending_cents),
        committedCents: cents(b.committed_cents),
        restrictedCents: cents(b.restricted_cents),
        reserveCents: cents(b.reserve_cents),
        currency: b.currency,
        asOf: b.as_of,
        source: b.source,
      })),
      derivedSync: synced,
      observation: {
        kind: observation.kind,
        currency: observation.currency,
        paymentCount: observation.paymentCount,
        grossCents: observation.grossCents,
        systemReinvestCents: observation.systemReinvestCents,
        ownerNetCents: observation.ownerNetCents,
        taxReserveCents: observation.taxReserveCents,
        resourceReserveCents: observation.resourceReserveCents,
        asOf: observation.asOf,
      },
      runwayMonths,
      runwayNote,
      /** Observational only — never used to authorize transfers. */
      monitoringSignals,
      /** Marketing opportunities only — never authorizes spend. */
      marketingSignals,
    };
  }

  async listOpportunities(limit = 50, status?: string) {
    const { rows } = await this.repo.listOpportunities(limit, status);
    return rows;
  }

  async getOpportunity(id: string) {
    const { rows } = await this.repo.getOpportunityById(id);
    if (!rows[0]) throw new NotFoundError('Opportunity');
    return rows[0];
  }

  async createOpportunitiesFromDemandSignals(actor?: { userId: string; role: string }) {
    const di = getDemandIntelligence();
    const [taxonomy, burden, snapshot] = await Promise.all([
      di.getTaxonomy(),
      di.getCatalogBurden(),
      di.getDemandSnapshot(),
    ]);

    const { rows: signals } = await this.repo.listDemandSignals(50);
    const created = [];
    for (const signal of signals) {
      const count30 = Number((signal as { count_30d?: number }).count_30d ?? 0);
      const scored = scoreOpportunity({
        factors: {
          demand: Math.min(100, count30 * 5),
          revenuePotential: 40,
          margin: 50,
          devCost: 40,
          deliveryCost: 30,
          payback: 40,
          strategic: 50,
          customerImpact: 50,
          automation: 40,
          complexity: 40,
          operationalRisk: 30,
          securityRisk: 20,
          complianceRisk: 20,
          confidence: 55,
          urgency: Math.min(100, count30 * 3),
          capacity: 50,
        },
      });
      const slug = `demand-${String((signal as { normalized_code?: string }).normalized_code ?? (signal as { signal_key?: string }).signal_key)}`
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .slice(0, 120);
      const { rows } = await this.repo.upsertOpportunityFromSignal({
        slug,
        title: String((signal as { label?: string }).label ?? slug),
        kind: 'other',
        demandScore: Math.min(100, count30 * 5),
        priorityScore: scored.priorityScore,
        explanation: scored.why,
        sourceRefs: [{ type: 'demand_signal', id: (signal as { id?: string }).id }],
      });
      if (rows[0]) created.push(rows[0]);
    }

    // Catalog burden opportunities (ACTUAL list prices + support profile — not invented demand).
    for (const row of burden.filter((b) => b.supportHours >= 6 || b.deployComplexity >= 4).slice(0, 12)) {
      const deliveryBurden = Math.min(100, row.supportHours * 8 + row.deployComplexity * 10);
      const scored = scoreOpportunity({
        factors: {
          demand: 35,
          revenuePotential: Math.min(100, row.anchorEur / 50),
          margin: Math.max(10, 80 - deliveryBurden / 2),
          devCost: Math.min(100, deliveryBurden),
          deliveryCost: deliveryBurden,
          payback: 45,
          strategic: 55,
          customerImpact: 50,
          automation: Math.min(100, row.deployComplexity * 15),
          complexity: Math.min(100, row.deployComplexity * 18),
          operationalRisk: Math.min(100, row.supportHours * 6),
          securityRisk: 25,
          complianceRisk: 20,
          confidence: 70,
          urgency: Math.min(100, row.supportHours * 5),
          capacity: 50,
        },
      });
      const slug = `pkg-opt-${row.skuId}`.slice(0, 120);
      const { rows } = await this.repo.upsertOpportunityFromSignal({
        slug,
        title: `Optimize package ${row.skuId}`,
        kind: 'package_improvement',
        demandScore: 35,
        priorityScore: scored.priorityScore,
        explanation: `${scored.why} Catalog ACTUAL anchor €${row.anchorEur}; supportHours=${row.supportHours}; deployComplexity=${row.deployComplexity}. Commerce ACTUAL payments=${snapshot.commerce.confirmedPaymentCount}.`,
        sourceRefs: [
          { type: 'catalog_burden', skuId: row.skuId },
          { type: 'commerce_actual', ...snapshot.commerce },
        ],
        estimatedDevCostCents: Math.round(row.anchorEur * 40),
        estimatedMonthlyRevenueCents: Math.round(row.anchorEur * 100),
      });
      if (rows[0]) created.push(rows[0]);
    }

    await this.appendAudit({
      action: 'opportunities.from_demand',
      actorUserId: actor?.userId,
      actorRole: actor?.role,
      decision: 'ok',
      reason: `created_or_updated=${created.length};taxonomy=${taxonomy.engineVersion}`,
      inputRefs: {
        conceptCount: taxonomy.concepts.length,
        burdenRows: burden.length,
        commerce: snapshot.commerce,
      },
    });

    return created;
  }

  async listInvestments(limit = 50) {
    const { rows } = await this.repo.listInvestments(limit);
    return rows;
  }

  async listBudgets(limit = 50) {
    const { rows } = await this.repo.listBudgets(limit);
    return rows;
  }

  async listForecasts(limit = 50) {
    const { rows } = await this.repo.listForecasts(limit);
    return rows;
  }

  async runScenario(body: ScenarioBody, actor?: { userId: string; role: string }) {
    const { policy } = await this.requireActivePolicy();
    const observation = await observeRevenueAllocations();
    const result = simulateBusinessMonths({
      startingCashCents: body.startingCashCents ?? observation.systemReinvestCents,
      startingReserveCents: body.startingReserveCents ?? observation.ownerNetCents,
      reserveFloorCents: body.reserveFloorCents ?? policy.minReserveCents,
      baseMonthlyRevenueCents:
        body.baseMonthlyRevenueCents ?? Math.max(0, Math.round(observation.grossCents / 12)),
      baseMonthlyExpenseCents: body.baseMonthlyExpenseCents ?? 0,
      shockMonth: body.shockMonth,
      unexpectedCostCents: body.unexpectedCostCents,
      revenueDropMonth: body.revenueDropMonth,
      revenueDropBps: body.revenueDropBps,
    });

    const { rows } = await this.repo.insertForecast({
      subjectType: 'scenario',
      kind: 'scenario',
      scenario: 'base',
      horizonMonths: 12,
      metrics: {
        label: body.label ?? 'admin_scenario',
        ...result,
        roi: computeRoiScenarios({
          initialCostCents: body.unexpectedCostCents ?? 0,
          monthlyCostCents: body.baseMonthlyExpenseCents ?? 0,
          monthlyRevenueCents:
            body.baseMonthlyRevenueCents ?? Math.max(0, Math.round(observation.grossCents / 12)),
          monthlyVariableCents: 0,
        }),
      },
      confidence: 40,
      engineVersion: ENGINE_VERSION,
    });

    await this.appendAudit({
      action: 'scenario.run',
      actorUserId: actor?.userId,
      actorRole: actor?.role,
      decision: 'simulated',
      reason: body.label ?? 'scenario',
      inputRefs: { forecastId: rows[0] ? (rows[0] as { id: string }).id : null },
    });

    return { forecast: rows[0], simulation: result };
  }

  async listApprovals(limit = 50, status?: string) {
    const { rows } = await this.repo.listApprovals(limit, status);
    return rows;
  }

  async decideApproval(
    approvalId: string,
    body: DecideApprovalBody,
    actor: { userId: string; role: string }
  ) {
    const { rows: existing } = await this.repo.getApprovalById(approvalId);
    const approval = existing[0] as
      | {
          id: string;
          status: string;
          subject_type: string;
          subject_id: string;
          requested_amount_cents: string | null;
        }
      | undefined;
    if (!approval) throw new NotFoundError('Approval');
    if (approval.status !== 'pending') {
      throw new ValidationError('Approval is not pending');
    }

    const { policy } = await this.requireActivePolicy();
    if (policy.killSwitch && body.decision === 'approved') {
      await this.appendAudit({
        action: 'approval.decide',
        actorUserId: actor.userId,
        actorRole: actor.role,
        subjectType: 'approval',
        subjectId: approvalId,
        decision: 'blocked',
        reason: 'kill_switch_active',
      });
      throw new AppError(
        'Kill switch active — approvals cannot be approved',
        403,
        'REINVESTMENT_KILL_SWITCH'
      );
    }

    const { rows } = await this.repo.decideApproval(
      approvalId,
      body.decision,
      actor.userId,
      body.note
    );
    const decided = rows[0];
    if (!decided) throw new AppError('Failed to decide approval', 500);

    if (approval.subject_type === 'transaction') {
      const txStatus =
        body.decision === 'approved'
          ? policy.dryRun
            ? 'simulated'
            : 'approved'
          : body.decision === 'rejected'
            ? 'cancelled'
            : 'pending_approval';
      await this.repo.updateTransactionStatus(approval.subject_id, txStatus, {
        approvedBy: body.decision === 'approved' ? actor.userId : null,
        executedAt: txStatus === 'simulated',
      });
    }

    await this.appendAudit({
      action: 'approval.decide',
      actorUserId: actor.userId,
      actorRole: actor.role,
      subjectType: 'approval',
      subjectId: approvalId,
      amountCents: body.modifiedAmountCents ?? cents(approval.requested_amount_cents),
      decision: body.decision,
      reason: body.note ?? null,
      policyVersion: policy.policyVersion,
    });

    return decided;
  }

  async listTransactions(limit = 50, status?: string) {
    const { rows } = await this.repo.listTransactions(limit, status);
    return rows;
  }

  async proposeTransaction(
    body: ProposeTransactionBody,
    actor: { userId: string; role: string }
  ) {
    const { policy } = await this.requireActivePolicy();

    // Fail closed on kill switch
    if (policy.killSwitch) {
      await this.appendAudit({
        action: 'transaction.propose',
        actorUserId: actor.userId,
        actorRole: actor.role,
        amountCents: body.amountCents,
        currency: body.currency,
        accountCode: body.sourceAccountCode,
        decision: 'blocked',
        reason: 'kill_switch_active',
      });
      throw new AppError(
        'Kill switch active — reinvestment transfers blocked',
        403,
        'REINVESTMENT_KILL_SWITCH'
      );
    }

    // Idempotent short-circuit
    const existing = await this.repo.getTransactionByIdempotencyKey(body.idempotencyKey);
    if (existing.rows[0]) {
      return { transaction: existing.rows[0], duplicate: true };
    }

    const { observation, synced } = await this.syncDerivedBalances();
    if (observation.paymentCount < 0) {
      throw new AppError(
        'Balance certainty missing — fail closed',
        503,
        'REINVESTMENT_BALANCE_UNCERTAIN'
      );
    }

    const source = (await this.repo.getAccountByCode(body.sourceAccountCode)).rows[0];
    const dest = (await this.repo.getAccountByCode(body.destinationAccountCode)).rows[0];
    if (!source || !dest) {
      throw new ValidationError('Unknown source or destination account code');
    }

    const sourceBal = synced.find((s) => s.code === body.sourceAccountCode);
    const available = sourceBal?.availableCents ?? 0;
    const availableAfter = available - body.amountCents;

    // Missing balance certainty for source → fail closed
    if (sourceBal == null) {
      await this.appendAudit({
        action: 'transaction.propose',
        actorUserId: actor.userId,
        actorRole: actor.role,
        amountCents: body.amountCents,
        decision: 'blocked',
        reason: 'missing_balance_certainty',
      });
      throw new AppError(
        'Missing derived balance certainty for source account',
        503,
        'REINVESTMENT_BALANCE_UNCERTAIN'
      );
    }

    const dryRun =
      policy.dryRun ||
      body.dryRun === true ||
      config.reinvestment.bankProvider === 'mock' ||
      !config.reinvestment.bankProvider;

    const policyResult = evaluateTransferPolicy({
      amountCents: body.amountCents,
      sourceAccount: body.sourceAccountCode,
      destAccount: body.destinationAccountCode,
      purpose: body.purpose,
      autonomyLevel: policy.autonomyLevel,
      dryRun,
      killSwitch: policy.killSwitch,
      limits: {
        maxTransferCents: policy.maxSingleTxCents,
        maxDailyCents: policy.maxDailySpendCents,
        autoApproveMinAutonomy: 3,
      },
      allowMarketingReallocation: policy.allowMarketingReallocation,
      reserveFloorCents: policy.minReserveCents,
      availableAfterCents: Math.max(0, availableAfter),
    });

    const risk = assessRisk({
      amountCents: body.amountCents,
      maxTransferCents: policy.maxSingleTxCents,
      runwayMonths: 6,
      reserveBreachRisk: availableAfter < policy.minReserveCents,
      operatingMode: policy.operatingMode,
    });

    let status: string;
    if (policyResult.decision === 'BLOCKED' || risk.level === 'critical') {
      status = 'blocked';
    } else if (policyResult.decision === 'REQUIRES_APPROVAL') {
      status = 'pending_approval';
    } else if (dryRun) {
      status = 'simulated';
    } else {
      // No real bank provider — still settle as simulation
      status = 'simulated';
    }

    const providerName = config.reinvestment.bankProvider || 'mock';
    let providerRef: string | null = null;

    if (status === 'simulated') {
      try {
        const provider = getBankProvider(providerName);
        if ('seedAccount' in provider && typeof (provider as MockBankAccountProvider).seedAccount === 'function') {
          const mock = provider as MockBankAccountProvider;
          mock.seedAccount(source.id, { availableCents: available });
          mock.seedAccount(dest.id, { availableCents: 0 });
        }
        const transfer = await provider.createTransfer({
          sourceAccountId: source.id,
          destAccountId: dest.id,
          amountCents: body.amountCents,
          currency: body.currency,
          idempotencyKey: body.idempotencyKey,
          reference: body.purpose,
        });
        providerRef = transfer.transferId;
      } catch {
        // Mock transfer failure does not invent money; keep simulated with no ref.
        providerRef = null;
      }
    }

    const { rows } = await this.repo.insertTransactionIdempotent({
      idempotencyKey: body.idempotencyKey,
      sourceAccountId: source.id,
      destinationAccountId: dest.id,
      amountCents: body.amountCents,
      currency: body.currency,
      purpose: body.purpose,
      status,
      dryRun,
      policyDecision: policyResult.decision,
      riskLevel: risk.level,
      investmentId: body.investmentId,
      opportunityId: body.opportunityId,
      provider: providerName,
      providerRef,
      explanation: body.explanation ?? policyResult.reasons.join('; '),
      metadata: {
        ...(body.metadata ?? {}),
        policyReasons: policyResult.reasons,
        riskReasons: risk.reasons,
        riskScore: risk.score,
      },
      createdBy: actor.userId,
    });

    const tx = rows[0];
    if (!tx) {
      throw new AppError('Failed to record transaction', 500);
    }
    const duplicate = tx.inserted === false;

    if (!duplicate && status === 'pending_approval') {
      await this.repo.insertApproval({
        subjectType: 'transaction',
        subjectId: tx.id,
        requestedAmountCents: body.amountCents,
        currency: body.currency,
        recommendation: policyResult.decision,
        reason: policyResult.reasons.join('; '),
        payload: { risk },
      });
    }

    await this.appendAudit({
      action: 'transaction.propose',
      actorUserId: actor.userId,
      actorRole: actor.role,
      subjectType: 'transaction',
      subjectId: tx.id,
      amountCents: body.amountCents,
      currency: body.currency,
      accountCode: body.sourceAccountCode,
      decision: status,
      reason: policyResult.reasons.join('; '),
      policyVersion: policyResult.policyVersion,
      inputRefs: { duplicate, dryRun, riskLevel: risk.level },
      providerResponse: providerRef ? { providerRef } : null,
    });

    if (status === 'blocked') {
      throw new AppError(
        `Transfer blocked: ${policyResult.reasons.join(', ') || risk.level}`,
        403,
        'REINVESTMENT_POLICY_BLOCKED',
        { policy: policyResult, risk, transaction: tx }
      );
    }

    return { transaction: tx, duplicate, policy: policyResult, risk, dryRun };
  }

  async listAudit(limit = 100) {
    const { rows } = await this.repo.listAuditLogs(limit);
    return rows;
  }

  async listAlerts(limit = 50) {
    const { rows } = await this.repo.listAlerts(limit);
    return rows;
  }

  async listPolicies(limit = 20) {
    const { rows } = await this.repo.listPolicies(limit);
    return rows.map(mapPolicy);
  }

  async patchActivePolicy(body: PatchActivePolicyBody, actor: { userId: string; role: string }) {
    const { row, policy } = await this.requireActivePolicy();
    const { rows } = await this.repo.updateActivePolicy(row.id, body);
    const updated = rows[0];
    if (!updated) throw new AppError('Failed to update policy', 500);

    await this.appendAudit({
      action: 'policy.patch_active',
      actorUserId: actor.userId,
      actorRole: actor.role,
      subjectType: 'policy',
      subjectId: row.id,
      decision: 'ok',
      reason: JSON.stringify(body),
      policyVersion: policy.policyVersion,
    });

    return mapPolicy(updated);
  }

  async runEngine(body: EngineRunBody, actor?: { userId: string; role: string }) {
    const dryRun = body.dryRun !== false;
    const { policy } = await this.requireActivePolicy();

    if (policy.killSwitch) {
      const { rows } = await this.repo.insertEngineRun({
        phase: 'observe',
        status: 'blocked',
        dryRun,
        engineVersion: ENGINE_VERSION,
        policyVersion: policy.policyVersion,
        error: 'kill_switch_active',
      });
      throw new AppError('Kill switch active — engine blocked', 403, 'REINVESTMENT_KILL_SWITCH', {
        run: rows[0],
      });
    }

    const observation = await observeRevenueAllocations();
    await this.syncDerivedBalances();

    const demand = getDemandIntelligence();
    const snapshot = await demand.getDemandSnapshot();

    let opportunities: unknown[] = [];
    // Default: seed catalog/demand opportunities on every engine run (dry-run safe).
    if (body.createOpportunities !== false) {
      opportunities = await this.createOpportunitiesFromDemandSignals(actor);
    }

    const { rows } = await this.repo.insertEngineRun({
      phase: 'analyze',
      status: 'completed',
      dryRun,
      engineVersion: ENGINE_VERSION,
      policyVersion: policy.policyVersion,
      scoringVersion: SCORING_VERSION,
      inputRefs: {
        paymentCount: observation.paymentCount,
        commerceActual: snapshot.commerce,
      },
      outputSummary: {
        opportunitiesTouched: opportunities.length,
        grossCents: observation.grossCents,
        systemReinvestCents: observation.systemReinvestCents,
        note: dryRun ? 'observe→analyze dry-run (default)' : 'observe→analyze',
      },
    });

    await this.appendAudit({
      action: 'engine.run',
      actorUserId: actor?.userId,
      actorRole: actor?.role,
      decision: 'completed',
      reason: dryRun ? 'dry_run' : 'live_analyze_only',
      inputRefs: { runId: rows[0] ? (rows[0] as { id: string }).id : null },
    });

    return {
      run: rows[0],
      observation,
      opportunities,
      dryRun,
    };
  }

  async dryRunYear(body: EngineDryRunYearBody, actor?: { userId: string; role: string }) {
    const { policy } = await this.requireActivePolicy();
    const observation = await observeRevenueAllocations();
    const simulation = simulateBusinessMonths({
      startingCashCents: body.startingCashCents ?? observation.systemReinvestCents,
      startingReserveCents: body.startingReserveCents ?? observation.ownerNetCents,
      reserveFloorCents: body.reserveFloorCents ?? policy.minReserveCents,
      baseMonthlyRevenueCents:
        body.baseMonthlyRevenueCents ?? Math.max(0, Math.round(observation.grossCents / 12)),
      baseMonthlyExpenseCents: body.baseMonthlyExpenseCents ?? 0,
    });

    const { rows } = await this.repo.insertEngineRun({
      phase: 'dry_run_year',
      status: 'completed',
      dryRun: true,
      engineVersion: ENGINE_VERSION,
      policyVersion: policy.policyVersion,
      outputSummary: {
        endingCashCents: simulation.endingCashCents,
        endingReserveCents: simulation.endingReserveCents,
        reserveBreaches: simulation.reserveBreaches,
      },
    });

    await this.repo.insertForecast({
      subjectType: 'engine',
      subjectId: rows[0] ? (rows[0] as { id: string }).id : null,
      kind: 'scenario',
      scenario: 'base',
      horizonMonths: 12,
      metrics: simulation as unknown as Record<string, unknown>,
      confidence: 35,
      engineVersion: ENGINE_VERSION,
    });

    await this.appendAudit({
      action: 'engine.dry_run_year',
      actorUserId: actor?.userId,
      actorRole: actor?.role,
      decision: 'simulated',
      reason: '12_month_simulation',
    });

    return { run: rows[0], simulation, dryRun: true };
  }
}
