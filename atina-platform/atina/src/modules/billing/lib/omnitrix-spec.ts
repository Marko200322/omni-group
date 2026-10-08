/**
 * OmniTrix — client-facing claim → machine probe map.
 * UltrMatrix scores packages across delivery / design / reliability / honesty.
 *
 * Rules:
 * - Claims must come from package-delivery-spec includes (or honest conditional notes).
 * - Each package must expose 5–10 client problems it solves (see package-industry-problems).
 * - Do not invent LIVE ads/Stripe/custom-domain capabilities.
 */
import { getAcceptanceContract } from './deliverable-acceptance-contract';
import { DELIVERABLE_CATALOG } from './deliverable-catalog';
import { getPackageDeliverySpec, PACKAGE_DELIVERY_SPECS } from './package-delivery-spec';
import { PACKAGE_PROBLEM_SPECS } from './package-industry-problems';
import { getFactoryPhase, phaseGte, type FactoryPhase } from './factory-phase';

export type ClaimProbeKind =
  | 'pdf_artifact'
  | 'public_url'
  | 'page_count'
  | 'project_id'
  | 'modules'
  | 'crm_bootstrap'
  | 'ecommerce_catalog'
  | 'integration_config'
  | 'support_sla'
  | 'ai_support_setup'
  | 'software_test_gate'
  | 'metadata_flag'
  | 'conditional_human'
  | 'checklist_only';

export type OmnitrixClaim = {
  id: string;
  claim: string;
  /** Client problem this claim attacks (short). */
  solvesProblem: string;
  probe: ClaimProbeKind;
  /** If set, only active when factory phase >= this. */
  fromPhase?: FactoryPhase;
  /** Honest gate — not a hard fail when false; surfaces as CONDITIONAL. */
  conditionalNote?: string;
};

export type OmnitrixPackage = {
  deliverableId: string;
  name: string;
  problems: string[];
  claims: OmnitrixClaim[];
  excludes: string[];
};

export type OmnitrixAuditRow = {
  deliverableId: string;
  name: string;
  problemCount: number;
  claimCount: number;
  problemsOk: boolean;
  claimsOk: boolean;
  contractCoverageOk: boolean;
  missingContractCriteria: string[];
  conditionalClaims: number;
  status: 'READY' | 'PARTIAL' | 'WEAK';
  notes: string[];
};

export type UltrMatrixScores = {
  deliverableId: string;
  /** 0–100: problem count + claim/probe density */
  problemDepth: number;
  /** 0–100: acceptance contract criteria have checklist evaluators */
  contractCoverage: number;
  /** 0–100: excludes present + conditional claims labeled */
  honesty: number;
  /** 0–100: placeholder until live design probes run (sites only get baseline) */
  designReadiness: number;
  /** overall */
  readiness: number;
  status: 'READY' | 'PARTIAL' | 'WEAK';
};

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48);
}

function inferProbe(claim: string): { probe: ClaimProbeKind; conditionalNote?: string } {
  const c = claim.toLowerCase();
  if (c.includes('when') && (c.includes('live') || c.includes('configured') || c.includes('keys'))) {
    return { probe: 'conditional_human', conditionalNote: claim };
  }
  if (c.includes('human') || c.includes('retainer') || c.includes('response target')) {
    return { probe: 'support_sla' };
  }
  if (c.includes('pdf') || c.includes('markdown') || c.includes('report') || c.includes('checklist')) {
    return { probe: 'pdf_artifact' };
  }
  if (c.includes('live url') || c.includes('published') || c.includes('storefront') || c.includes('landing page')) {
    return { probe: 'public_url' };
  }
  if (c.includes('5+ pages') || c.includes('services, pricing, contact')) {
    return { probe: 'page_count' };
  }
  if (c.includes('4+') && (c.includes('product') || c.includes('catalog'))) {
    return { probe: 'ecommerce_catalog' };
  }
  if (c.includes('project') || c.includes('workspace') || c.includes('scaffold')) {
    return { probe: 'project_id' };
  }
  if (c.includes('crm') || c.includes('pipeline') || c.includes('leads')) {
    return { probe: 'crm_bootstrap' };
  }
  if (c.includes('module') || c.includes('notifications') || c.includes('billing') || c.includes('automation')) {
    return { probe: 'modules' };
  }
  if (c.includes('integration') || c.includes('webhook')) {
    return { probe: 'integration_config' };
  }
  if (c.includes('ai ') || c.includes('rag') || c.includes('avatar') || c.includes('knowledge')) {
    return { probe: 'ai_support_setup' };
  }
  if (c.includes('test') && (c.includes('gate') || c.includes('checklist') || c.includes('automated'))) {
    return { probe: 'software_test_gate' };
  }
  return { probe: 'checklist_only' };
}

function problemFromClaim(claim: string): string {
  const c = claim.toLowerCase();
  if (c.includes('pdf') || c.includes('guide') || c.includes('report')) return 'No clear written deliverable to hand the team';
  if (c.includes('portal') || c.includes('module') || c.includes('notifications')) return 'Ops tools scattered / no client portal';
  if (c.includes('crm') || c.includes('pipeline') || c.includes('lead')) return 'Pipeline empty or not in one CRM';
  if (c.includes('live') || c.includes('url') || c.includes('site') || c.includes('landing')) return 'Weak or missing online presence';
  if (c.includes('support') || c.includes('sla') || c.includes('ticket')) return 'Support responses slow or untracked';
  if (c.includes('workflow') || c.includes('sop') || c.includes('automation')) return 'Processes undocumented / not automated';
  if (c.includes('integration') || c.includes('webhook')) return 'Systems not connected';
  if (c.includes('ai ')) return 'No AI-assisted support layer';
  if (c.includes('test') || c.includes('scaffold') || c.includes('software')) return 'No software foundation to build on';
  if (c.includes('faq') || c.includes('script') || c.includes('sales')) return 'Sales/support scripts missing';
  return `Missing capability: ${claim.slice(0, 80)}`;
}

/** Build OmniTrix package view from delivery SSOT + problem specs. */
export function buildOmnitrixPackage(deliverableId: string, phase: FactoryPhase = getFactoryPhase()): OmnitrixPackage | null {
  const d = DELIVERABLE_CATALOG.find((x) => x.id === deliverableId);
  const spec = getPackageDeliverySpec(deliverableId);
  const problemsSpec = PACKAGE_PROBLEM_SPECS[deliverableId];
  if (!d || !spec || !problemsSpec) return null;

  const includes = [...spec.includes];
  for (const u of spec.phaseUnlocks ?? []) {
    if (phaseGte(phase, u.fromPhase)) includes.push(...u.includes);
  }

  const claims: OmnitrixClaim[] = includes.map((claim, i) => {
    const inferred = inferProbe(claim);
    return {
      id: `${deliverableId}_${slug(claim) || i}`,
      claim,
      solvesProblem: problemFromClaim(claim),
      probe: inferred.probe,
      conditionalNote: inferred.conditionalNote,
    };
  });

  const problems = [
    problemsSpec.primaryProblemTemplate.replace(/\{industry\}/gi, 'your industry'),
    ...problemsSpec.secondaryProblems,
  ];

  return {
    deliverableId,
    name: d.name,
    problems,
    claims,
    excludes: [...spec.excludes],
  };
}

export function listOmnitrixPackages(phase: FactoryPhase = getFactoryPhase()): OmnitrixPackage[] {
  return PACKAGE_DELIVERY_SPECS.map((s) => buildOmnitrixPackage(s.deliverableId, phase)).filter(
    (p): p is OmnitrixPackage => p != null,
  );
}

/** Checklist evaluator ids that currently exist in fulfillment-quality-checklist. */
const KNOWN_CHECKLIST_IDS = new Set([
  'status_completed',
  'public_url',
  'ecommerce_catalog',
  'ecommerce_shop_page',
  'ecommerce_catalog_visible',
  'ecommerce_honesty',
  'business_site_project',
  'page_count',
  'white_label_live',
  'pdf_artifact',
  'doc_substance',
  'setup_project',
  'portal_modules',
  'migration_template',
  'training_outline',
  'crm_bootstrap',
  'production_manifest',
  'integration_config',
  'support_automation',
  'retainer_project',
  'sla_pack',
  'channel_status_honesty',
  'no_simulated_harvest',
  'support_faq',
  'ai_avatar_honesty',
  'modules_metadata',
  'lead_gen_kickoff',
  'ai_support_setup',
  'software_project',
  'handoff_pdf',
  'software_test_gate',
  'catalog_description',
  'live_http_probe',
  'no_omni_chrome',
  'bundle_steps_complete',
  'dual_pdf_artifacts',
  'min_problems_covered',
]);

export function auditOmnitrixPackage(pkg: OmnitrixPackage): OmnitrixAuditRow {
  const notes: string[] = [];
  const problemCount = pkg.problems.length;
  const claimCount = pkg.claims.length;
  const problemsOk = problemCount >= 5 && problemCount <= 10;
  const claimsOk = claimCount >= 5;
  if (!problemsOk) notes.push(`problems=${problemCount} (need 5–10)`);
  if (!claimsOk) notes.push(`claims=${claimCount} (need ≥5 public includes at current phase)`);

  const contract = getAcceptanceContract(pkg.deliverableId);
  const missingContractCriteria: string[] = [];
  if (contract) {
    for (const c of contract.criteria.filter((x) => x.required)) {
      if (!KNOWN_CHECKLIST_IDS.has(c.id)) missingContractCriteria.push(c.id);
    }
  }
  const contractCoverageOk = missingContractCriteria.length === 0;
  if (!contractCoverageOk) notes.push(`missing checklist: ${missingContractCriteria.join(', ')}`);

  const conditionalClaims = pkg.claims.filter((c) => c.probe === 'conditional_human' || c.conditionalNote).length;
  if (pkg.excludes.length < 1) notes.push('no excludes — honesty weak');

  let status: OmnitrixAuditRow['status'] = 'READY';
  if (!problemsOk || !claimsOk || !contractCoverageOk) status = 'PARTIAL';
  if (problemCount < 5 || claimCount < 3) status = 'WEAK';

  return {
    deliverableId: pkg.deliverableId,
    name: pkg.name,
    problemCount,
    claimCount,
    problemsOk,
    claimsOk,
    contractCoverageOk,
    missingContractCriteria,
    conditionalClaims,
    status,
    notes,
  };
}

export function scoreUltrMatrix(pkg: OmnitrixPackage, audit: OmnitrixAuditRow): UltrMatrixScores {
  const problemDepth = Math.min(100, Math.round((Math.min(pkg.problems.length, 10) / 10) * 70 + (Math.min(pkg.claims.length, 8) / 8) * 30));
  const contractCoverage = audit.contractCoverageOk ? 100 : Math.max(0, 100 - audit.missingContractCriteria.length * 25);
  let honestyBase = pkg.excludes.length >= 2 ? 70 : pkg.excludes.length === 1 ? 50 : 20;
  honestyBase += audit.conditionalClaims > 0 ? 15 : 0;
  honestyBase += pkg.excludes.length >= 3 ? 15 : 0;
  // Ecommerce must disclose Stripe Connect/LIVE as CONFIGURATION REQUIRED — never undersell as HYBRID incomplete.
  if (pkg.deliverableId === 'website-ecommerce') {
    const excludesStripeConfig = pkg.excludes.some((e) =>
      /stripe/i.test(e) && /configuration required|connect|live/i.test(e),
    );
    const claimsCompleteStorefront = pkg.claims.some((c) =>
      /storefront|shop page|catalog products visible|handoff pdf|bank transfer|order path/i.test(c.claim),
    );
    const undersellsHybrid = pkg.claims.some((c) => /\bhybrid\b/i.test(c.claim));
    const overclaimsFullStore = pkg.claims.some((c) =>
      /full\s+merchant\s+stack|live\s+stripe\s+connect|real\s+inventory\s+sync/i.test(c.claim),
    );
    if (excludesStripeConfig && claimsCompleteStorefront && !undersellsHybrid && !overclaimsFullStore) {
      honestyBase += 10;
    } else {
      honestyBase = Math.max(0, honestyBase - 25);
    }
  }
  // Lead-gen must treat ads/Apollo as CONFIGURATION REQUIRED; never score simulated Titanis harvest as product.
  if (pkg.deliverableId === 'lead-gen-retainer') {
    const adsConfigRequired = pkg.excludes.some((e) =>
      /configuration required/i.test(e) && /ads|linkedin|google|apollo|api/i.test(e),
    );
    const rejectsSimulatedHarvest = pkg.excludes.some((e) =>
      /titanis|simulated harvest|invented/i.test(e),
    );
    const undersellsHybrid = pkg.claims.some((c) => /\bhybrid\b/i.test(c.claim));
    if (adsConfigRequired && rejectsSimulatedHarvest && !undersellsHybrid) honestyBase += 5;
    else if (!adsConfigRequired || !rejectsSimulatedHarvest) honestyBase = Math.max(0, honestyBase - 15);
  }
  const honesty = Math.min(100, honestyBase);
  const isSite = ['landing', 'website-business', 'website-ecommerce', 'white-label-setup', 'bundle-portal-presence', 'bundle-sales-launch'].includes(
    pkg.deliverableId,
  );
  const designReadiness = isSite ? 55 : 40; // baseline until live design probes enrich score
  const readiness = Math.round(problemDepth * 0.3 + contractCoverage * 0.3 + honesty * 0.25 + designReadiness * 0.15);
  const status: UltrMatrixScores['status'] =
    readiness >= 80 && audit.status === 'READY' ? 'READY' : readiness >= 55 ? 'PARTIAL' : 'WEAK';
  return {
    deliverableId: pkg.deliverableId,
    problemDepth,
    contractCoverage,
    honesty,
    designReadiness,
    readiness,
    status,
  };
}

export function runOmnitrixAudit(phase: FactoryPhase = getFactoryPhase()) {
  const packages = listOmnitrixPackages(phase);
  const rows = packages.map((p) => auditOmnitrixPackage(p));
  const ultra = packages.map((p, i) => scoreUltrMatrix(p, rows[i]!));
  return {
    phase,
    packageCount: packages.length,
    ready: rows.filter((r) => r.status === 'READY').length,
    partial: rows.filter((r) => r.status === 'PARTIAL').length,
    weak: rows.filter((r) => r.status === 'WEAK').length,
    rows,
    ultra,
  };
}
