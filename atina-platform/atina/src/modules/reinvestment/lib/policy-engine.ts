import { ACCOUNT_CODES, POLICY_VERSION, type AutonomyLevel } from './constants';
import { assertCents } from './money';

export type PolicyDecision = 'APPROVED' | 'REQUIRES_APPROVAL' | 'BLOCKED';

export type TransferPolicyLimits = {
  maxTransferCents: number;
  maxDailyCents?: number;
  /** Minimum autonomy level to auto-approve without human review. Default 3. */
  autoApproveMinAutonomy?: AutonomyLevel;
};

export type TransferPolicyInput = {
  amountCents: number;
  sourceAccount: string;
  destAccount: string;
  purpose: string;
  autonomyLevel: AutonomyLevel | number;
  dryRun: boolean;
  killSwitch: boolean;
  limits: TransferPolicyLimits;
  allowMarketingReallocation: boolean;
  /** Minimum profit_reserve balance that must remain after the transfer. */
  reserveFloorCents: number;
  /**
   * Projected profit_reserve (or source) balance after applying this transfer.
   * Used for reserve-floor checks when draining profit_reserve.
   */
  availableAfterCents: number;
};

export type TransferPolicyResult = {
  decision: PolicyDecision;
  reasons: string[];
  policyVersion: string;
  dryRun: boolean;
};

function isAutonomyLevel(n: number): n is AutonomyLevel {
  return Number.isInteger(n) && n >= 0 && n <= 5;
}

/**
 * Fail-closed transfer policy.
 * Kill-switch always blocks. Marketing→system diversion requires explicit allow.
 * Profit-reserve drains below floor are blocked.
 */
export function evaluateTransferPolicy(input: TransferPolicyInput): TransferPolicyResult {
  const reasons: string[] = [];
  const dryRun = Boolean(input.dryRun);

  if (input.killSwitch) {
    return {
      decision: 'BLOCKED',
      reasons: ['kill_switch_active'],
      policyVersion: POLICY_VERSION,
      dryRun,
    };
  }

  assertCents(input.amountCents, 'amountCents');
  assertCents(input.reserveFloorCents, 'reserveFloorCents');
  assertCents(input.availableAfterCents, 'availableAfterCents');
  assertCents(input.limits.maxTransferCents, 'maxTransferCents');

  if (input.amountCents <= 0) {
    reasons.push('amount_must_be_positive');
  }

  if (!isAutonomyLevel(Number(input.autonomyLevel))) {
    reasons.push('invalid_autonomy_level');
  }

  const source = String(input.sourceAccount).trim().toLowerCase();
  const dest = String(input.destAccount).trim().toLowerCase();

  if (source === dest) {
    reasons.push('source_equals_dest');
  }

  if (
    source === ACCOUNT_CODES.MARKETING &&
    dest === ACCOUNT_CODES.SYSTEM &&
    !input.allowMarketingReallocation
  ) {
    reasons.push('marketing_to_system_reallocation_blocked');
  }

  if (source === ACCOUNT_CODES.PROFIT_RESERVE) {
    if (input.availableAfterCents < input.reserveFloorCents) {
      reasons.push('profit_reserve_below_floor');
    }
  }

  if (input.amountCents > input.limits.maxTransferCents) {
    reasons.push('exceeds_max_transfer_limit');
  }

  if (
    input.limits.maxDailyCents != null &&
    input.amountCents > assertCents(input.limits.maxDailyCents, 'maxDailyCents')
  ) {
    reasons.push('exceeds_max_daily_limit');
  }

  const hardBlocks = new Set([
    'amount_must_be_positive',
    'invalid_autonomy_level',
    'source_equals_dest',
    'marketing_to_system_reallocation_blocked',
    'profit_reserve_below_floor',
    'exceeds_max_transfer_limit',
    'exceeds_max_daily_limit',
  ]);

  const blocked = reasons.some((r) => hardBlocks.has(r));
  if (blocked) {
    return {
      decision: 'BLOCKED',
      reasons,
      policyVersion: POLICY_VERSION,
      dryRun,
    };
  }

  const autoMin = input.limits.autoApproveMinAutonomy ?? 3;
  const autonomy = Number(input.autonomyLevel) as AutonomyLevel;

  if (autonomy < autoMin) {
    reasons.push(`autonomy_level_${autonomy}_requires_approval`);
    return {
      decision: 'REQUIRES_APPROVAL',
      reasons,
      policyVersion: POLICY_VERSION,
      dryRun,
    };
  }

  if (dryRun) {
    reasons.push('dry_run_approved_no_side_effects');
  } else {
    reasons.push('within_limits_and_autonomy');
  }

  return {
    decision: 'APPROVED',
    reasons,
    policyVersion: POLICY_VERSION,
    dryRun,
  };
}
