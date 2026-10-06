import { getDeliverable } from './deliverable-catalog';
import { getAcceptanceContract } from './deliverable-acceptance-contract';
import {
  documentSubstancePasses,
  pdfSubstancePasses,
  substanceThresholdFor,
  type DocumentQualityMetrics,
  type PdfQualityMetrics,
} from './deliverable-handlers/artifact-helpers';
import { expectedBundleStepIds } from './deliverable-handlers/bundle-steps';
import { isPlaceholderBrand } from '../service/deliverable-content-generator.service';
import type { FulfillmentResult } from './deliverable-handlers/types';

export type ChecklistItemResult = {
  id: string;
  passed: boolean;
  message: string;
};

export type FulfillmentChecklistResult = {
  passed: boolean;
  score: number;
  items: ChecklistItemResult[];
};

const WEBSITE_IDS = new Set([
  'landing',
  'website-business',
  'website-ecommerce',
  'bundle-portal-presence',
  'bundle-sales-launch',
]);

/** Packages that must ship a live URL (incl. white-label landing). */
const LIVE_URL_IDS = new Set([...WEBSITE_IDS, 'white-label-setup']);

const PDF_CATALOG_IDS = new Set([
  'audit',
  'workflow-design',
  'integration',
  'setup-quick',
  'setup-full',
  'setup-custom',
  'support-priority',
  'support-dedicated',
  'lead-gen-retainer',
  'ai-support-retainer',
  'vertical-package',
  'white-label-setup',
  'sales-enablement',
  'custom-software',
  'bundle-portal-presence',
  'bundle-sales-launch',
  'bundle-ops-clarity',
  'landing',
  'website-business',
  'website-ecommerce',
]);

/** Consulting / doc / site-handoff packs with minimum PDF+markdown body floors. */
const DOC_SUBSTANCE_IDS = new Set([
  'audit',
  'workflow-design',
  'integration',
  'setup-quick',
  'setup-full',
  'setup-custom',
  'sales-enablement',
  'custom-software',
  'bundle-ops-clarity',
  'white-label-setup',
  'vertical-package',
  'landing',
  'website-business',
  'website-ecommerce',
]);

const OMNI_CHROME_HTML_RE =
  /ask\s*omi|omni\s*group\s*tech|client\s*site|digital\s*presence\s*—|powered by omni/i;

function hasPdfArtifact(result: FulfillmentResult): boolean {
  return result.artifacts.some((a) => a.filename.toLowerCase().endsWith('.pdf'));
}

function hasMarkdownArtifact(result: FulfillmentResult): boolean {
  return result.artifacts.some((a) => a.filename.toLowerCase().endsWith('.md'));
}

const MODULE_BOOTSTRAP_IDS = new Set([
  'vertical-package',
  'lead-gen-retainer',
  'ai-support-retainer',
  'setup-full',
  'setup-custom',
]);

const SETUP_IDS = new Set(['setup-quick', 'setup-full', 'setup-custom', 'bundle-portal-presence']);

function crmBootstrapOk(result: FulfillmentResult): boolean {
  const crm = result.metadata?.crmBootstrap as {
    importedLeads?: number;
    labeledDemo?: boolean;
    sampleKind?: string;
  } | undefined;
  // Require real seeded leads — modulesActivated / portalReady alone must not pass.
  if (!crm || Number(crm.importedLeads ?? 0) <= 0) return false;
  if (crm.labeledDemo === false) return false;
  return true;
}

function modulesOk(result: FulfillmentResult): boolean {
  const automation = result.metadata?.automationHonesty as
    | { automationConnected?: boolean; status?: string }
    | undefined;
  if (automation?.automationConnected === true) return false;
  if (
    automation &&
    automation.status &&
    automation.status !== 'MODULE_ENABLED_NOT_CONNECTED'
  ) {
    return false;
  }
  const mods = result.metadata?.modulesActivated;
  if (Array.isArray(mods) && mods.length > 0) return true;
  // portalReady alone is insufficient (anti task-theater / flag-only completion).
  if (result.metadata?.portalReady === true && !(Array.isArray(mods) && mods.length > 0)) {
    return false;
  }
  if (result.metadata?.aiSupportSetup) return true;
  return false;
}

function portalEntitlementsOk(result: FulfillmentResult): boolean {
  const mods = Array.isArray(result.metadata?.modulesActivated)
    ? (result.metadata.modulesActivated as string[])
    : [];
  const entitlements = result.metadata?.portalEntitlements as
    | {
        entitlementSource?: string;
        userModulesGranted?: string[];
        billingAccess?: boolean;
        notificationSeeded?: boolean;
        portalReady?: boolean;
      }
    | undefined;
  const granted = entitlements?.userModulesGranted ?? [];
  const hasCore =
    (mods.includes('notifications') || granted.includes('notifications')) &&
    (mods.includes('billing') || granted.includes('billing'));
  if (!hasCore) return false;
  // portalReady flag alone is never enough.
  if (!entitlements) return false;
  return (
    entitlements.entitlementSource === 'user_modules+org' &&
    entitlements.billingAccess === true &&
    entitlements.notificationSeeded === true &&
    granted.includes('notifications') &&
    granted.includes('billing')
  );
}

function productionManifestOk(result: FulfillmentResult): boolean {
  const hasArtifact = result.artifacts.some(
    (a) => a.type === 'production_deploy_manifest' || a.filename.includes('production-deploy'),
  );
  if (!hasArtifact) return false;
  const honesty = result.metadata?.deployHonesty as
    | {
        sslProvisioned?: boolean;
        domainConfigured?: boolean;
        runbookExecutable?: boolean;
      }
    | undefined;
  const prep = result.metadata?.deployPrep as
    | { skipped?: boolean; sslProvisioned?: boolean; domainConfigured?: boolean }
    | undefined;
  // Fail if SSL/domain falsely claimed done (especially when deploy prep skipped).
  if (honesty?.sslProvisioned === true || honesty?.domainConfigured === true) return false;
  if (prep?.sslProvisioned === true || prep?.domainConfigured === true) return false;
  if (prep?.skipped === true) {
    // ssl/domain already proven not claimed true above
    return honesty?.runbookExecutable === true;
  }
  // Require honesty metadata so skipped-deploy theater cannot pass via artifact filename alone.
  return honesty?.runbookExecutable === true;
}

function docSubstanceOk(deliverableId: string, result: FulfillmentResult): boolean {
  const threshold = substanceThresholdFor(deliverableId);
  if (!threshold) return true;
  const quality = result.metadata?.documentQuality as DocumentQualityMetrics | undefined;
  // Require measurable metrics — a lone boolean flag is not enough (anti-stub).
  if (!quality) return false;
  if (!documentSubstancePasses(quality, threshold)) return false;
  // Thin downloadable PDFs must fail even when markdown body metrics look fine.
  if (threshold.minPdfBytes != null || threshold.minPdfPages != null) {
    const pdfBytes = Number(result.metadata?.pdfBytes ?? 0);
    const pdfPageCount = Number(result.metadata?.pdfPageCount ?? 0);
    const pdf: PdfQualityMetrics = { pdfBytes, pdfPageCount };
    if (!pdfSubstancePasses(pdf, threshold)) return false;
  }
  return true;
}

function liveProbeMeta(result: FulfillmentResult): {
  ok?: boolean;
  status?: number;
  bytes?: number;
  detectedTitle?: string;
  omniChrome?: boolean;
  snippet?: string;
} | undefined {
  return result.metadata?.liveProbe as
    | {
        ok?: boolean;
        status?: number;
        bytes?: number;
        detectedTitle?: string;
        omniChrome?: boolean;
        snippet?: string;
      }
    | undefined;
}

function omniChromeDetected(result: FulfillmentResult): boolean {
  const live = liveProbeMeta(result);
  if (live?.omniChrome === true) return true;
  if (live?.snippet && OMNI_CHROME_HTML_RE.test(live.snippet)) return true;

  const titles = [
    result.metadata?.siteTitle,
    result.metadata?.brandTitle,
    live?.detectedTitle,
  ]
    .map((t) => (typeof t === 'string' ? t.trim() : ''))
    .filter(Boolean);

  if (titles.some((t) => isPlaceholderBrand(t))) return true;

  const publicUrl = result.publicUrl?.toLowerCase() ?? '';
  if (/\/sites\/system-admin/.test(publicUrl)) return true;

  return false;
}

function ecommerceHonestyOk(result: FulfillmentResult): boolean {
  if (result.metadata?.claimsFullMerchantStore === true) return false;
  const scope = String(result.metadata?.ecommerceScope ?? '').toLowerCase();
  // Accept complete/storefront (preferred) and legacy hybrid/demo markers during transition.
  if (
    scope === 'complete' ||
    scope === 'storefront' ||
    scope === 'hybrid' ||
    scope === 'demo' ||
    scope === 'demo_catalog'
  ) {
    return true;
  }
  if (result.metadata?.ecommerceHonestyNote) return true;
  if (result.metadata?.ecommerceHonesty === true) return true;
  return false;
}

/** Deterministic package promise checks — aligned with deliverable-acceptance-contract. */
export function runFulfillmentQualityChecklist(
  deliverableId: string,
  result: FulfillmentResult,
): FulfillmentChecklistResult {
  const deliverable = getDeliverable(deliverableId);
  const contract = getAcceptanceContract(deliverableId);
  const items: ChecklistItemResult[] = [];

  items.push({
    id: 'status_completed',
    passed: result.status === 'completed',
    message:
      result.status === 'completed'
        ? 'Fulfillment status is completed'
        : `Expected completed status, got ${result.status}`,
  });

  if (LIVE_URL_IDS.has(deliverableId)) {
    items.push({
      id: 'public_url',
      passed: Boolean(result.publicUrl?.trim()),
      message: result.publicUrl?.trim()
        ? `Live site URL: ${result.publicUrl}`
        : 'Website deliverable requires a published public URL',
    });
    if (deliverableId === 'website-ecommerce') {
      const catalog = result.metadata?.ecommerceCatalog;
      const count = Array.isArray(catalog) ? catalog.length : 0;
      items.push({
        id: 'ecommerce_catalog',
        passed: count >= 4,
        message:
          count >= 4
            ? `E-commerce catalog has ${count} products`
            : 'E-commerce package requires catalog metadata with at least 4 products',
      });
      const hasShop =
        result.metadata?.hasShopPage === true ||
        (Array.isArray(result.metadata?.pageSlugs) &&
          (result.metadata.pageSlugs as string[]).some((s) => /shop/i.test(String(s))));
      items.push({
        id: 'ecommerce_shop_page',
        passed: Boolean(hasShop),
        message: hasShop
          ? 'Shop page present on storefront'
          : 'E-commerce package requires a visible shop page',
      });
      const catalogVisible =
        count >= 4 && result.metadata?.catalogVisible !== false && result.metadata?.catalogVisible !== 0;
      items.push({
        id: 'ecommerce_catalog_visible',
        passed: Boolean(catalogVisible),
        message: catalogVisible
          ? 'Catalog marked visible on storefront'
          : 'E-commerce catalog must be visible on the shop page',
      });
      const honesty = ecommerceHonestyOk(result);
      items.push({
        id: 'ecommerce_honesty',
        passed: honesty,
        message: honesty
          ? 'E-commerce honesty: complete storefront; Stripe Connect/LIVE = CONFIGURATION REQUIRED'
          : 'website-ecommerce must disclose Stripe Connect/LIVE as CONFIGURATION REQUIRED (not claim live Connect)',
      });
    }
    if (deliverableId === 'website-business') {
      items.push({
        id: 'business_site_project',
        passed: Boolean(result.projectId?.trim()),
        message: result.projectId
          ? 'Product factory project linked'
          : 'Business website requires a built project',
      });
      const pageCount = Number(result.metadata?.pageCount ?? 0);
      items.push({
        id: 'page_count',
        passed: pageCount >= 5,
        message:
          pageCount >= 5
            ? `Business site has ${pageCount} pages`
            : 'Business website requires at least 5 pages in metadata',
      });
    }
    if (deliverableId === 'landing') {
      items.push({
        id: 'landing_live',
        passed: Boolean(result.publicUrl?.trim()),
        message: result.publicUrl?.trim() ? 'Landing page published' : 'Landing requires live URL',
      });
    }

    const contentOk =
      result.metadata?.siteContentOk === true ||
      (result.metadata?.contentQuality as { ok?: boolean } | undefined)?.ok === true;
    // When contentQuality is present, require a pass; older fixtures without it still rely on live probe / chrome checks.
    if (result.metadata?.contentQuality != null || result.metadata?.siteContentOk != null) {
      items.push({
        id: 'site_content_quality',
        passed: Boolean(contentOk),
        message: contentOk
          ? 'Generated site pages meet brand/length/chrome quality gates'
          : 'Site content quality failed (thin pages, missing brand, or Omni chrome)',
      });
    }
  }

  if (LIVE_URL_IDS.has(deliverableId)) {
    const live = liveProbeMeta(result);
    const hasUrl = Boolean(result.publicUrl?.trim());
    items.push({
      id: 'live_http_probe',
      passed: hasUrl && Boolean(live?.ok),
      message: !hasUrl
        ? 'Live HTTP probe required — missing publicUrl'
        : live?.ok
          ? `Live HTTP probe ok (status=${live.status ?? 200}, bytes=${live.bytes ?? 0})`
          : 'Live HTTP probe required for published publicUrl (missing or failed)',
    });

    const chrome = hasUrl ? omniChromeDetected(result) : true;
    items.push({
      id: 'no_omni_chrome',
      passed: hasUrl && !chrome,
      message: !hasUrl
        ? 'Client brand check requires a published publicUrl'
        : chrome
          ? 'Site title/HTML looks like Omni chrome or System Admin — client brand required'
          : 'Client brand title — no Omni chrome / System Admin detected',
    });
  }

  if (deliverableId === 'white-label-setup') {
    const hasLive = Boolean(result.publicUrl?.trim());
    items.push({
      id: 'white_label_live',
      passed: hasLive,
      message: hasLive
        ? `White-label partner landing: ${result.publicUrl}`
        : 'White-label requires published partner landing (publicUrl) — brand PDF alone is insufficient',
    });
  }

  if (SETUP_IDS.has(deliverableId)) {
    items.push({
      id: 'setup_project',
      passed: Boolean(result.projectId?.trim()),
      message: result.projectId ? 'Setup project scaffold verified' : 'Setup requires verified project scaffold',
    });
    if (deliverableId === 'setup-quick' || deliverableId === 'bundle-portal-presence') {
      const ok = portalEntitlementsOk(result);
      const mods = Array.isArray(result.metadata?.modulesActivated)
        ? (result.metadata.modulesActivated as string[])
        : [];
      items.push({
        id: 'portal_modules',
        passed: ok,
        message: ok
          ? `Portal entitlements granted (user_modules+org): ${mods.join(', ') || 'notifications, billing'}`
          : 'Portal entitlements require user_modules (notifications+billing), billing access, and welcome notification — portalReady flag alone is insufficient',
      });
    }
    if (deliverableId === 'setup-full') {
      items.push({
        id: 'migration_template',
        passed: result.artifacts.some((a) => a.type === 'migration_template' || a.filename.includes('migration')),
        message: 'CRM migration template included',
      });
      items.push({
        id: 'training_outline',
        passed: result.artifacts.some((a) => a.type === 'training_outline' || a.filename.includes('training')),
        message: 'Training outline included',
      });
      items.push({
        id: 'crm_bootstrap',
        passed: crmBootstrapOk(result),
        message: crmBootstrapOk(result)
          ? 'CRM pipeline seeded with labeled demo/industry samples'
          : 'Full onboarding requires CRM bootstrap with imported demo/industry leads (not modules-only)',
      });
    }
    if (deliverableId === 'setup-custom') {
      const manifestOk = productionManifestOk(result);
      items.push({
        id: 'production_manifest',
        passed: manifestOk,
        message: manifestOk
          ? 'Production deploy runbook included with honest PENDING SSL/domain status'
          : 'Production deploy manifest must be an executable runbook — skipped deploy cannot claim SSL/domain done',
      });
      items.push({
        id: 'crm_bootstrap',
        passed: crmBootstrapOk(result),
        message: crmBootstrapOk(result)
          ? 'CRM pipeline seeded with labeled demo/industry samples'
          : 'Custom deploy requires CRM bootstrap with imported leads (not modules-only)',
      });
    }
  }

  if (deliverableId === 'lead-gen-retainer') {
    const stats = result.metadata?.leadGenStats as {
      leadsGenerated?: number;
      sampleLeadsSeeded?: number;
      workspaceId?: string;
      mode?: string;
      channelStatuses?: Array<{ channel: string; status: string }>;
    } | undefined;
    const hasReport = result.artifacts.some(
      (a) => a.type === 'lead_gen_report' || a.filename.includes('lead-gen-kickoff'),
    );
    const hasPipelineWorkspace = result.artifacts.some(
      (a) =>
        a.type === 'lead_gen_pipeline_workspace' ||
        a.filename.includes('lead-gen-pipeline-workspace'),
    );
    const modeOk =
      stats?.mode === 'kickoff_pack_only' ||
      stats?.mode === 'channels_ready' ||
      stats?.mode === 'live_harvest';
    const kickoffOk =
      hasReport &&
      hasPipelineWorkspace &&
      modeOk &&
      (Boolean(stats?.workspaceId) || Number(stats?.sampleLeadsSeeded ?? 0) > 0);
    items.push({
      id: 'lead_gen_kickoff',
      passed: kickoffOk,
      message: kickoffOk
        ? `Lead gen ops pack delivered (mode=${stats?.mode ?? 'unknown'}, live=${stats?.leadsGenerated ?? 0}, samples=${stats?.sampleLeadsSeeded ?? 0})`
        : 'Lead gen retainer requires pipeline workspace + kickoff report (honest mode) — not fake live harvest',
    });
    const channels = stats?.channelStatuses;
    const honestyOk =
      Array.isArray(channels) &&
      channels.length > 0 &&
      channels.every(
        (c) => c.status === 'CONNECTED' || c.status === 'NOT CONNECTED',
      );
    items.push({
      id: 'channel_status_honesty',
      passed: honestyOk,
      message: honestyOk
        ? `Channel statuses recorded: ${channels!.map((c) => `${c.channel}=${c.status}`).join(', ')}`
        : 'Lead gen must mark LinkedIn/Google Ads/etc CONNECTED or NOT CONNECTED',
    });

    // Anti-theater: simulated/invented harvest cannot PASS.
    // Only mode=live_harvest + CONNECTED enrichment may claim leadsGenerated > 0.
    const liveClaimed = Number(stats?.leadsGenerated ?? 0);
    const enrichmentConnected = Array.isArray(channels)
      ? channels.some(
          (c) =>
            (c.channel === 'linkedin' || c.channel === 'google_ads' || c.channel === 'apollo') &&
            c.status === 'CONNECTED',
        )
      : false;
    const harvestAllowed =
      stats?.mode === 'live_harvest' && enrichmentConnected && honestyOk;
    const simulatedHarvest = liveClaimed > 0 && !harvestAllowed;
    items.push({
      id: 'no_simulated_harvest',
      passed: !simulatedHarvest,
      message: simulatedHarvest
        ? `Rejected simulated harvest: leadsGenerated=${liveClaimed} without live_harvest + CONNECTED enrichment`
        : liveClaimed > 0
          ? `Live harvest recorded (${liveClaimed}) with CONNECTED enrichment channel`
          : 'No simulated harvest — live leads=0 until real adapter returns contacts',
    });
  }

  if (
    deliverableId === 'support-priority' ||
    deliverableId === 'support-dedicated' ||
    deliverableId === 'lead-gen-retainer' ||
    deliverableId === 'ai-support-retainer' ||
    deliverableId === 'vertical-package'
  ) {
    items.push({
      id: 'retainer_project',
      passed: Boolean(result.projectId?.trim()),
      message: result.projectId
        ? 'Retainer project scaffold in client workspace'
        : 'Retainer/support package requires a client-visible project',
    });
    const hasSla = result.artifacts.some(
      (a) =>
        a.type === 'sla_onboarding_pack' ||
        a.filename.includes('sla-onboarding') ||
        a.filename.includes('-sla-'),
    );
    items.push({
      id: 'sla_pack',
      passed: hasSla,
      message: hasSla
        ? 'SLA / onboarding pack artifact delivered'
        : 'Retainer requires downloadable SLA/onboarding pack',
    });
  }

  if (deliverableId === 'support-priority' || deliverableId === 'support-dedicated') {
    const support = result.metadata?.supportAutomation as
      | { slaHours?: number; modulesActivated?: string[] }
      | undefined;
    items.push({
      id: 'support_automation',
      passed: Boolean(support?.slaHours),
      message: support?.slaHours
        ? `Automated support active (SLA ${support.slaHours}h)`
        : 'Support retainer requires automated support queue',
    });
    const hasFaq = result.artifacts.some(
      (a) => a.type === 'support_faq_seed' || a.filename.includes('support-faq'),
    );
    items.push({
      id: 'support_faq',
      passed: hasFaq,
      message: hasFaq
        ? 'Support FAQ seed delivered'
        : 'Support retainer requires downloadable FAQ seed',
    });
  }

  if (deliverableId === 'ai-support-retainer') {
    const ai = result.metadata?.aiSupportSetup as {
      ragSeeded?: boolean;
      modulesActivated?: string[];
      avatarConfigured?: boolean;
      configurationRequired?: string[];
    } | undefined;
    const hasArtifact = result.artifacts.some(
      (a) => a.type === 'ai_support_setup' || a.filename.includes('ai-support-setup'),
    );
    const hasKb = result.artifacts.some(
      (a) =>
        a.type === 'ai_support_knowledge_base' ||
        a.filename.includes('ai-support-knowledge') ||
        a.type === 'support_faq_seed',
    );
    items.push({
      id: 'ai_support_setup',
      passed: Boolean(
        hasArtifact &&
          hasKb &&
          ((ai?.modulesActivated?.length ?? 0) > 0 || modulesOk(result) || ai?.ragSeeded),
      ),
      message: hasArtifact && hasKb
        ? `AI support ops pack (RAG/KB/FAQ) provisioned; avatarConfigured=${Boolean(ai?.avatarConfigured)}`
        : 'AI support retainer requires setup + knowledge base/FAQ (avatar keys optional)',
    });
    // Avatar missing keys must be honest — not a silent fail.
    const avatarHonest =
      ai?.avatarConfigured === true ||
      (Array.isArray(ai?.configurationRequired) && ai!.configurationRequired!.length > 0) ||
      ai?.avatarConfigured === false;
    items.push({
      id: 'ai_avatar_honesty',
      passed: Boolean(hasArtifact && avatarHonest),
      message:
        ai?.avatarConfigured === true
          ? 'Video avatar CONNECTED'
          : 'Avatar CONFIGURATION REQUIRED recorded honestly (ops pack still complete)',
    });
  }

  if (PDF_CATALOG_IDS.has(deliverableId)) {
    items.push({
      id: 'pdf_artifact',
      passed: hasPdfArtifact(result),
      message: hasPdfArtifact(result)
        ? 'At least one PDF artifact delivered'
        : 'Package requires a downloadable PDF deliverable',
    });
  }

  if (DOC_SUBSTANCE_IDS.has(deliverableId)) {
    const threshold = substanceThresholdFor(deliverableId);
    const substance = docSubstanceOk(deliverableId, result);
    const mdOk = hasMarkdownArtifact(result);
    const quality = result.metadata?.documentQuality as DocumentQualityMetrics | undefined;
    const chars = quality?.totalBodyChars ?? 0;
    const pdfBytes = Number(result.metadata?.pdfBytes ?? 0);
    const pdfPages = Number(result.metadata?.pdfPageCount ?? 0);
    const pdfFloor = threshold?.minPdfBytes;
    const pageFloor = threshold?.minPdfPages;
    items.push({
      id: 'doc_substance',
      passed: substance && mdOk,
      message:
        substance && mdOk
          ? `Document substance ok (${chars} body chars, PDF ${pdfBytes}B / ${pdfPages}p, markdown present)`
          : `Doc/PDF pack requires substantial body (min ${threshold?.minTotalChars ?? '?'} chars` +
            (pdfFloor != null ? `, PDF ≥${pdfFloor}B` : '') +
            (pageFloor != null ? `, ≥${pageFloor} pages` : '') +
            ') — stub rejected',
    });
  }

  const expectedBundleSteps = expectedBundleStepIds(deliverableId);
  if (expectedBundleSteps.length > 0) {
    const steps = result.metadata?.bundleSteps as
      | Array<{ deliverableId?: string; status?: string }>
      | undefined;
    const stepsOk =
      Array.isArray(steps) &&
      steps.length === expectedBundleSteps.length &&
      expectedBundleSteps.every(
        (id, i) => steps[i]?.deliverableId === id && steps[i]?.status === 'completed',
      );
    items.push({
      id: 'bundle_steps_complete',
      passed: stepsOk,
      message: stepsOk
        ? `All bundle steps completed: ${expectedBundleSteps.join(' + ')}`
        : `Bundle requires completed child steps [${expectedBundleSteps.join(', ')}] — got ${
            Array.isArray(steps)
              ? steps.map((s) => `${s.deliverableId}:${s.status}`).join(', ') || 'empty'
              : 'missing bundleSteps metadata'
          }`,
    });
  }

  if (deliverableId === 'bundle-ops-clarity') {
    const pdfs = result.artifacts.filter((a) => a.filename.toLowerCase().endsWith('.pdf'));
    const hasAudit = pdfs.some((a) => /audit/i.test(a.filename) || a.type.includes('audit'));
    const hasWorkflow = pdfs.some(
      (a) => /workflow|sop/i.test(a.filename) || a.type.includes('workflow'),
    );
    const dualOk = pdfs.length >= 2 && hasAudit && hasWorkflow;
    items.push({
      id: 'dual_pdf_artifacts',
      passed: dualOk,
      message: dualOk
        ? `Audit + workflow PDFs delivered (${pdfs.length} PDFs)`
        : 'Ops clarity bundle requires both technical-audit.pdf and workflow-sop-pack.pdf',
    });
  }

  if (deliverableId === 'custom-software') {
    items.push({
      id: 'software_project',
      passed: Boolean(result.projectId?.trim()),
      message: result.projectId
        ? 'Greenfield software project created'
        : 'Custom software requires a built project',
    });
    items.push({
      id: 'handoff_pdf',
      passed: hasPdfArtifact(result),
      message: hasPdfArtifact(result)
        ? 'Software handoff PDF included'
        : 'Custom software requires handoff PDF',
    });
    items.push({
      id: 'software_test_gate',
      passed: result.metadata?.testsPassed === true,
      message:
        result.metadata?.testsPassed === true
          ? 'Tests passed recorded'
          : 'Custom software requires testsPassed=true (buildStatus alone is insufficient)',
    });
  }

  if (deliverableId === 'integration') {
    items.push({
      id: 'integration_config',
      passed: result.artifacts.some((a) => a.type.includes('integration') || a.filename.includes('integration')),
      message: 'Integration package includes config artifact with webhooks',
    });
  }

  if (MODULE_BOOTSTRAP_IDS.has(deliverableId)) {
    items.push({
      id: 'modules_metadata',
      passed: modulesOk(result),
      message: modulesOk(result)
        ? 'Industry modules or CRM bootstrap recorded'
        : 'Package requires module activation or CRM bootstrap',
    });
    if (deliverableId === 'vertical-package' || deliverableId === 'lead-gen-retainer') {
      items.push({
        id: 'crm_bootstrap',
        passed: crmBootstrapOk(result),
        message: crmBootstrapOk(result) ? 'CRM pipeline seeded' : 'Vertical/lead-gen requires CRM bootstrap',
      });
    }
  }

  if (deliverable) {
    items.push({
      id: 'catalog_description',
      passed: Boolean(deliverable.description.trim()),
      message: `Catalog promise: ${deliverable.description.slice(0, 120)}…`,
    });
  }

  if (contract) {
    const requiredIds = new Set(contract.criteria.filter((c) => c.required).map((c) => c.id));
    for (const reqId of requiredIds) {
      if (!items.some((i) => i.id === reqId)) {
        items.push({
          id: reqId,
          passed: false,
          message: `Missing checklist evaluator for contract criterion: ${reqId}`,
        });
      }
    }
  }

  const passedCount = items.filter((i) => i.passed).length;
  const requiredFails = items.filter((i) => !i.passed && i.id !== 'catalog_description');
  const passed = requiredFails.length === 0;
  const score = items.length ? Math.round((passedCount / items.length) * 100) : 0;

  return { passed, score, items };
}

export function formatChecklistFailures(checklist: FulfillmentChecklistResult): string {
  return checklist.items
    .filter((i) => !i.passed && i.id !== 'catalog_description')
    .map((i) => `${i.id}: ${i.message}`)
    .join('\n');
}
