/**
 * Ultimatrix — full-repo commercial readiness gate (OmniTrix + commercial + support AI + intro).
 * Fail-closed: packages must ship product/service + invoice, not PDF theater.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  allDeliverableIdsInContract,
  listAcceptanceContracts,
} from './deliverable-acceptance-contract';
import { SERVICE_COMPANION_IDS } from './deliverable-handlers/commercial-companion';
import { PACKAGE_DELIVERY_SPECS } from './package-delivery-spec';
import { KNOWN_CHECKLIST_IDS, runOmnitrixAudit } from './omnitrix-spec';
import { getFactoryPhase, type FactoryPhase } from './factory-phase';
import {
  applyDeliverableIntroPrice,
  readDeliverableIntroPromoSettings,
} from '../../payments/lib/deliverable-intro-promo';

export const SUPPORT_SOLVER_TASK_TYPES = [
  'support_ticket',
  'support_automation',
  'ai_support_ops',
] as const;

export type UltimatrixFailure = {
  code: string;
  detail: string;
};

export type UltimatrixReport = {
  phase: string;
  ok: boolean;
  packageCount: number;
  omnitrixReady: number;
  omnitrixPartial: number;
  omnitrixWeak: number;
  commercialContractsOk: boolean;
  supportSolverWired: boolean;
  introPromoOk: boolean;
  failures: UltimatrixFailure[];
};

function repoRootFromAtina(): string {
  // .../atina-platform/atina/src/modules/billing/lib → repo root is 6 levels up
  return join(__dirname, '..', '..', '..', '..', '..', '..');
}

/** Parse M6 anchors from a package-delivery-spec.ts source file. */
export function parseM6AnchorsFromSource(src: string): Map<string, number> {
  const out = new Map<string, number>();
  const blocks = src.split(/deliverableId:\s*'/);
  for (let i = 1; i < blocks.length; i++) {
    const id = blocks[i]!.match(/^([^']+)'/)?.[1];
    if (!id) continue;
    const m6 = blocks[i]!.match(/M6:\s*(\d+)/);
    if (m6) out.set(id, Number(m6[1]));
  }
  return out;
}

export function assertAtinaWebM6PriceSync(rootDir?: string): UltimatrixFailure[] {
  const root = rootDir ?? repoRootFromAtina();
  const atinaPath = join(root, 'atina-platform', 'atina', 'src', 'modules', 'billing', 'lib', 'package-delivery-spec.ts');
  const webPath = join(root, 'apps', 'omnigroup-web', 'src', 'lib', 'package-delivery-spec.ts');
  let atinaSrc: string;
  let webSrc: string;
  try {
    atinaSrc = readFileSync(atinaPath, 'utf8');
    webSrc = readFileSync(webPath, 'utf8');
  } catch (err) {
    return [
      {
        code: 'price_sync_io',
        detail: err instanceof Error ? err.message : String(err),
      },
    ];
  }
  const atina = parseM6AnchorsFromSource(atinaSrc);
  const web = parseM6AnchorsFromSource(webSrc);
  const failures: UltimatrixFailure[] = [];
  for (const [id, price] of atina) {
    if (!web.has(id)) {
      failures.push({ code: 'price_sync_missing_web', detail: `${id} missing on web` });
      continue;
    }
    if (web.get(id) !== price) {
      failures.push({
        code: 'price_sync_mismatch',
        detail: `${id}: atina M6=${price} web M6=${web.get(id)}`,
      });
    }
  }
  for (const id of web.keys()) {
    if (!atina.has(id)) {
      failures.push({ code: 'price_sync_missing_atina', detail: `${id} missing on atina` });
    }
  }
  return failures;
}

export function assertSupportSolverWired(rootDir?: string): UltimatrixFailure[] {
  const root = rootDir ?? repoRootFromAtina();
  const execPath = join(
    root,
    'atina-platform',
    'atina',
    'src',
    'modules',
    'tasks',
    'execute-task-by-type.ts',
  );
  const agentPath = join(
    root,
    'atina-platform',
    'atina',
    'src',
    'modules',
    'support',
    'service',
    'support-ticket-agent.service.ts',
  );
  const failures: UltimatrixFailure[] = [];
  let execSrc: string;
  let agentSrc: string;
  try {
    execSrc = readFileSync(execPath, 'utf8');
    agentSrc = readFileSync(agentPath, 'utf8');
  } catch (err) {
    return [{ code: 'support_wire_io', detail: err instanceof Error ? err.message : String(err) }];
  }
  if (!agentSrc.includes('SOLVE the client problem')) {
    failures.push({
      code: 'support_agent_solve_prompt',
      detail: 'SupportTicketAgent must instruct AI to SOLVE, not only summarize',
    });
  }
  if (!agentSrc.includes('persistResolution') && !agentSrc.includes('patchTaskPayload')) {
    failures.push({
      code: 'support_agent_persist',
      detail: 'SupportTicketAgent must persist resolution on the ticket',
    });
  }
  for (const t of SUPPORT_SOLVER_TASK_TYPES) {
    if (!execSrc.includes(`'${t}'`) && !execSrc.includes(`"${t}"`)) {
      failures.push({
        code: 'support_task_type_unwired',
        detail: `${t} not routed in execute-task-by-type`,
      });
    }
  }
  if (!execSrc.includes('SupportTicketAgentService')) {
    failures.push({
      code: 'support_agent_import',
      detail: 'execute-task-by-type must use SupportTicketAgentService',
    });
  }
  return failures;
}

export function runUltimatrixGate(phase: FactoryPhase = getFactoryPhase()): UltimatrixReport {
  const failures: UltimatrixFailure[] = [];
  const omni = runOmnitrixAudit(phase);

  if (omni.weak > 0) {
    for (const row of omni.rows.filter((r) => r.status === 'WEAK')) {
      failures.push({
        code: 'omnitrix_weak',
        detail: `${row.deliverableId}: ${row.notes.join('; ') || 'WEAK'}`,
      });
    }
  }

  for (const row of omni.rows) {
    if (!row.contractCoverageOk) {
      failures.push({
        code: 'checklist_coverage',
        detail: `${row.deliverableId} missing evaluators: ${row.missingContractCriteria.join(', ')}`,
      });
    }
  }

  const contracts = listAcceptanceContracts();
  const catalogIds = allDeliverableIdsInContract();
  for (const id of catalogIds) {
    const c = contracts.find((x) => x.deliverableId === id);
    if (!c) {
      failures.push({ code: 'contract_missing', detail: id });
      continue;
    }
    const critIds = new Set(c.criteria.map((x) => x.id));
    if (!critIds.has('commercial_invoice_linked')) {
      failures.push({
        code: 'commercial_invoice_required',
        detail: `${id} contract missing commercial_invoice_linked`,
      });
    }
    if (!critIds.has('product_or_service_present')) {
      failures.push({
        code: 'product_or_service_required',
        detail: `${id} contract missing product_or_service_present`,
      });
    }
    for (const crit of c.criteria.filter((x) => x.required)) {
      if (!KNOWN_CHECKLIST_IDS.has(crit.id)) {
        failures.push({
          code: 'unknown_checklist_id',
          detail: `${id} criterion ${crit.id} has no checklist evaluator`,
        });
      }
    }
  }

  for (const id of SERVICE_COMPANION_IDS) {
    const c = contracts.find((x) => x.deliverableId === id);
    if (!c?.criteria.some((x) => x.id === 'service_companion')) {
      failures.push({
        code: 'service_companion_contract',
        detail: `${id} must require service_companion in acceptance contract`,
      });
    }
  }

  for (const id of ['support-priority', 'support-dedicated', 'ai-support-retainer']) {
    const c = contracts.find((x) => x.deliverableId === id);
    if (!c?.criteria.some((x) => x.id === 'kickoff_ticket')) {
      failures.push({
        code: 'support_kickoff_required',
        detail: `${id} must require kickoff_ticket`,
      });
    }
  }

  for (const spec of PACKAGE_DELIVERY_SPECS) {
    const m6 = spec.anchorByPhase?.M6;
    if (typeof m6 !== 'number' || m6 <= 0) {
      failures.push({
        code: 'm6_anchor_missing',
        detail: `${spec.deliverableId} missing positive M6 anchor`,
      });
    }
  }

  const introSettings = readDeliverableIntroPromoSettings({});
  if (!introSettings.enabled || introSettings.discountPct !== 18 || introSettings.maxSlots !== 50) {
    failures.push({
      code: 'intro_promo_defaults',
      detail: `expected enabled 18%/50 slots, got enabled=${introSettings.enabled} pct=${introSettings.discountPct} slots=${introSettings.maxSlots}`,
    });
  }
  const introOpen = applyDeliverableIntroPrice(1000, introSettings, 0);
  const introClosed = applyDeliverableIntroPrice(1000, introSettings, 50);
  if (!introOpen.introApplied || introOpen.chargeEur !== 820) {
    failures.push({
      code: 'intro_promo_open',
      detail: `intro open expected charge 820, got ${introOpen.chargeEur} applied=${introOpen.introApplied}`,
    });
  }
  if (introClosed.introApplied || introClosed.chargeEur !== 1000) {
    failures.push({
      code: 'intro_promo_closed',
      detail: `intro closed expected full 1000, got ${introClosed.chargeEur} applied=${introClosed.introApplied}`,
    });
  }

  const supportFails = assertSupportSolverWired();
  failures.push(...supportFails);

  const priceFails = assertAtinaWebM6PriceSync();
  failures.push(...priceFails);

  const commercialContractsOk = !failures.some((f) =>
    [
      'commercial_invoice_required',
      'product_or_service_required',
      'service_companion_contract',
      'checklist_coverage',
      'unknown_checklist_id',
      'contract_missing',
    ].includes(f.code),
  );

  return {
    phase,
    ok: failures.length === 0,
    packageCount: omni.packageCount,
    omnitrixReady: omni.ready,
    omnitrixPartial: omni.partial,
    omnitrixWeak: omni.weak,
    commercialContractsOk,
    supportSolverWired: supportFails.length === 0,
    introPromoOk: !failures.some((f) => f.code.startsWith('intro_promo')),
    failures,
  };
}
