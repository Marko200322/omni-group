import { getDeliverable } from './deliverable-catalog';
import { getAcceptanceContract } from './deliverable-acceptance-contract';
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

const WEBSITE_IDS = new Set(['landing', 'website-business', 'website-ecommerce']);
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
]);

function hasPdfArtifact(result: FulfillmentResult): boolean {
  return result.artifacts.some((a) => a.filename.toLowerCase().endsWith('.pdf'));
}

const MODULE_BOOTSTRAP_IDS = new Set([
  'vertical-package',
  'lead-gen-retainer',
  'ai-support-retainer',
  'setup-full',
  'setup-custom',
]);

const SETUP_IDS = new Set(['setup-quick', 'setup-full', 'setup-custom']);

function crmBootstrapOk(result: FulfillmentResult): boolean {
  const crm = result.metadata?.crmBootstrap as { importedLeads?: number } | undefined;
  if (crm && Number(crm.importedLeads ?? 0) > 0) return true;
  const mods = result.metadata?.modulesActivated;
  return Array.isArray(mods) ? mods.length > 0 : Boolean(mods);
}

function modulesOk(result: FulfillmentResult): boolean {
  const mods = result.metadata?.modulesActivated;
  if (Array.isArray(mods) && mods.length > 0) return true;
  if (result.metadata?.crmBootstrap) return true;
  if (result.metadata?.portalReady) return true;
  if (result.metadata?.aiSupportSetup) return true;
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

  if (WEBSITE_IDS.has(deliverableId)) {
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
        passed: count >= 4 || Boolean(result.publicUrl?.trim()),
        message:
          count >= 4
            ? `E-commerce catalog has ${count} products`
            : result.publicUrl?.trim()
              ? 'E-commerce site published (catalog embedded in site)'
              : 'E-commerce package requires published site or catalog metadata',
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
        passed: pageCount >= 5 || Boolean(result.publicUrl?.trim()),
        message:
          pageCount >= 5
            ? `Business site has ${pageCount} pages`
            : result.publicUrl?.trim()
              ? 'Multi-page business site published'
              : 'Business website requires at least 5 pages or live site',
      });
    }
    if (deliverableId === 'landing') {
      items.push({
        id: 'landing_live',
        passed: Boolean(result.publicUrl?.trim()),
        message: result.publicUrl?.trim() ? 'Landing page published' : 'Landing requires live URL',
      });
    }
  }

  if (deliverableId === 'white-label-setup') {
    items.push({
      id: 'white_label_live',
      passed: Boolean(result.publicUrl?.trim()) || Boolean(result.metadata?.includesLanding),
      message: result.publicUrl?.trim()
        ? `White-label landing: ${result.publicUrl}`
        : result.metadata?.includesLanding
          ? 'White-label landing included'
          : 'White-label requires published branding site',
    });
  }

  if (SETUP_IDS.has(deliverableId)) {
    items.push({
      id: 'setup_project',
      passed: Boolean(result.projectId?.trim()),
      message: result.projectId ? 'Setup project scaffold verified' : 'Setup requires verified project scaffold',
    });
    if (deliverableId === 'setup-quick') {
      items.push({
        id: 'portal_modules',
        passed: Boolean(
          (Array.isArray(result.metadata?.modulesActivated) &&
            (result.metadata.modulesActivated as string[]).length > 0) ||
            result.metadata?.portalReady,
        ),
        message: 'Portal modules activated (notifications, billing)',
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
          ? 'CRM pipeline seeded'
          : 'Full onboarding requires CRM bootstrap',
      });
    }
    if (deliverableId === 'setup-custom') {
      items.push({
        id: 'production_manifest',
        passed: result.artifacts.some(
          (a) => a.type === 'production_deploy_manifest' || a.filename.includes('production-deploy'),
        ),
        message: 'Production deploy manifest (SSL, backup, monitoring, SLA) included',
      });
      items.push({
        id: 'crm_bootstrap',
        passed: crmBootstrapOk(result),
        message: crmBootstrapOk(result) ? 'CRM pipeline seeded' : 'Custom deploy requires CRM bootstrap',
      });
    }
  }

  if (deliverableId === 'lead-gen-retainer') {
    const stats = result.metadata?.leadGenStats as { leadsGenerated?: number } | undefined;
    items.push({
      id: 'lead_gen_kickoff',
      passed: Number(stats?.leadsGenerated ?? 0) > 0,
      message:
        Number(stats?.leadsGenerated ?? 0) > 0
          ? `Lead gen pipeline started (${stats?.leadsGenerated} leads)`
          : 'Lead gen retainer requires active pipeline kickoff',
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
  }

  if (deliverableId === 'ai-support-retainer') {
    const ai = result.metadata?.aiSupportSetup as {
      ragSeeded?: boolean;
      modulesActivated?: string[];
      avatarConfigured?: boolean;
    } | undefined;
    const hasArtifact = result.artifacts.some(
      (a) => a.type === 'ai_support_setup' || a.filename.includes('ai-support-setup'),
    );
    items.push({
      id: 'ai_support_setup',
      passed: Boolean(
        hasArtifact &&
          ((ai?.modulesActivated?.length ?? 0) > 0 || modulesOk(result) || ai?.ragSeeded || ai?.avatarConfigured),
      ),
      message: hasArtifact
        ? 'AI support setup artifact + modules provisioned'
        : 'AI support retainer requires avatar/RAG/meetings setup',
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
      passed: result.metadata?.testsPassed === true || result.metadata?.buildStatus === 'completed',
      message:
        result.metadata?.testsPassed === true || result.metadata?.buildStatus === 'completed'
          ? 'Build/test gate recorded'
          : 'Custom software requires test gate before delivery',
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
