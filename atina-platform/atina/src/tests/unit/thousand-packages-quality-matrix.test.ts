/**
 * Shardable quality matrix for all ~1000 industry packages.
 * Env: SHARD_INDEX=0..N-1  SHARD_COUNT=N (default 1 / 1 = full run)
 * Writes: docs/evidence/_tmp-thousand-shard-{i}.json
 */
jest.mock('../../integrations', () => ({
  getAiClient: () => ({ isConfigured: () => false }),
}));

jest.mock('../../modules/autonomy-loop/service/autonomy-orchestrator.service', () => ({
  AutonomyOrchestratorService: class AutonomyOrchestratorServiceStub {},
}));

import fs from 'fs';
import path from 'path';
import { listFullPackageCatalog, getDeliverable } from '../../modules/billing/lib/deliverable-catalog';
import { resolveDeliverableFulfillmentHandler } from '../../modules/billing/lib/deliverable-handlers/registry';
import { getAcceptanceContract } from '../../modules/billing/lib/deliverable-acceptance-contract';
import { getPackageDeliverySpec } from '../../modules/billing/lib/package-delivery-spec';
import {
  assessDocumentQuality,
  DOC_SUBSTANCE_THRESHOLDS,
  documentSubstancePasses,
} from '../../modules/billing/lib/deliverable-handlers/artifact-helpers';
import {
  MIN_PROBLEMS_COVERED,
  MAX_PROBLEMS_COVERED,
} from '../../modules/billing/lib/package-industry-problems';
import { resolveBaseDeliverableId } from '../../modules/billing/lib/industry-package-id';
import { buildOrderIdentity, docBodyBlob } from '../../modules/billing/lib/order-identity';
import { DeliverableDocumentGeneratorService } from '../../modules/billing/service/deliverable-document-generator.service';
import {
  DeliverableContentGeneratorService,
  assessGeneratedSiteQuality,
} from '../../modules/billing/service/deliverable-content-generator.service';

const SHARD_INDEX = Math.max(0, Number(process.env.SHARD_INDEX ?? '0') || 0);
const SHARD_COUNT = Math.max(1, Number(process.env.SHARD_COUNT ?? '1') || 1);
const OUT_DIR = path.resolve(__dirname, '../../../../../docs/evidence');

type Row = {
  id: string;
  baseId: string;
  industry: string;
  status: 'PASS' | 'FAIL';
  chars: number;
  problems: number;
  failures: string[];
};

describe(`thousand packages quality matrix shard ${SHARD_INDEX}/${SHARD_COUNT}`, () => {
  const docs = new DeliverableDocumentGeneratorService();
  const sites = new DeliverableContentGeneratorService();

  async function generateForBase(
    baseId: string,
    client: string,
    industry: string,
    order = buildOrderIdentity(`pay-${industry}-${baseId}`.slice(0, 36), `job-${SHARD_INDEX}`),
  ) {
    const hints = { orderIdentity: order };
    switch (baseId) {
      case 'audit':
        return { kind: 'doc' as const, doc: await docs.generateAuditReport({ clientName: client, industryCategory: industry, generationHints: hints }), order };
      case 'workflow-design':
        return { kind: 'doc' as const, doc: await docs.generateWorkflowDesign({ clientName: client, industryCategory: industry, generationHints: hints }), order };
      case 'integration':
        return { kind: 'doc' as const, doc: await docs.generateIntegrationGuide({ clientName: client, industryCategory: industry, generationHints: hints }), order };
      case 'setup-quick':
        return { kind: 'doc' as const, doc: await docs.generateSetupPack({ tier: 'quick', clientName: client, industryCategory: industry, generationHints: hints }), order };
      case 'setup-full':
        return { kind: 'doc' as const, doc: await docs.generateSetupPack({ tier: 'full', clientName: client, industryCategory: industry, generationHints: hints }), order };
      case 'setup-custom':
        return { kind: 'doc' as const, doc: await docs.generateSetupPack({ tier: 'custom', clientName: client, industryCategory: industry, generationHints: hints }), order };
      case 'sales-enablement':
        return { kind: 'doc' as const, doc: await docs.generateSalesEnablement({ clientName: client, industryCategory: industry, generationHints: hints }), order };
      case 'white-label-setup':
        return { kind: 'doc' as const, doc: await docs.generateWhiteLabelPack({ clientName: client, industryCategory: industry, generationHints: hints }), order };
      case 'custom-software':
        return {
          kind: 'doc' as const,
          doc: await docs.generateSoftwareHandoff({
            clientName: client,
            projectName: `${client} App`,
            description: `Scoped starter for ${industry}`,
            outputDir: '/tmp/scaffold',
            industryCategory: industry,
            generationHints: hints,
          }),
          order,
        };
      case 'vertical-package':
        return { kind: 'doc' as const, doc: await docs.generateVerticalPackBrief({ clientName: client, industryCategory: industry, generationHints: hints }), order };
      case 'support-priority':
      case 'support-dedicated':
      case 'lead-gen-retainer':
      case 'ai-support-retainer':
        return {
          kind: 'doc' as const,
          doc: await docs.generateRetainerWelcome({
            deliverableId: baseId,
            clientName: client,
            industryCategory: industry,
            generationHints: hints,
          }),
          order,
        };
      case 'landing':
      case 'website-business':
      case 'website-ecommerce':
      case 'bundle-portal-presence':
      case 'bundle-sales-launch': {
        const siteId =
          baseId === 'website-business' || baseId === 'website-ecommerce' ? baseId : 'landing';
        const pages = await sites.generateWebsitePages({
          deliverableId: siteId,
          title: client,
          clientName: client,
          industryCategory: industry,
          generationHints: hints,
        });
        const doc = await docs.generateSiteDeliveryPack({
          deliverableId: siteId,
          clientName: client,
          industryCategory: industry,
          publicUrl: `/sites/${industry}-${order.shortRef.toLowerCase()}`,
          absoluteUrl: `https://example.test/sites/${industry}-${order.shortRef.toLowerCase()}`,
          pageCount: pages.length,
          catalogCount: siteId === 'website-ecommerce' ? 8 : null,
          generationHints: hints,
        });
        return { kind: 'site' as const, doc, pages, siteId, order };
      }
      case 'bundle-ops-clarity':
        return {
          kind: 'doc' as const,
          doc: await docs.generateAuditReport({
            clientName: client,
            industryCategory: industry,
            generationHints: hints,
          }),
          order,
        };
      default:
        throw new Error(`unhandled base ${baseId}`);
    }
  }

  it(`evaluates shard ${SHARD_INDEX}`, async () => {
    const catalog = listFullPackageCatalog();
    expect(catalog.length).toBe(1000);

    const slice = catalog.filter((_, i) => i % SHARD_COUNT === SHARD_INDEX);
    const rows: Row[] = [];

    for (const pkg of slice) {
      const failures: string[] = [];
      const baseId = pkg.baseDeliverableId ?? resolveBaseDeliverableId(pkg.id);
      const industry = pkg.industrySlug ?? 'professional';
      const client = `${pkg.name.split('—')[0]?.trim() || industry} Co`;

      if (!getDeliverable(pkg.id)) failures.push('catalog_missing');
      if (!resolveDeliverableFulfillmentHandler(pkg.id)) failures.push('no_handler');
      if (!getAcceptanceContract(baseId)) failures.push('no_acceptance_contract');
      if (!getPackageDeliverySpec(baseId)) failures.push('no_delivery_spec');
      if (!(pkg.anchorEur > 0)) failures.push('bad_price');

      const problems = pkg.problemsSolved?.length ?? 0;
      if (problems < MIN_PROBLEMS_COVERED || problems > MAX_PROBLEMS_COVERED) {
        failures.push(`problems_${problems}`);
      }

      let chars = 0;
      try {
        const built = await generateForBase(baseId, client, industry);
        const q = assessDocumentQuality(built.doc, {
          clientName: client,
          industryCategory: industry,
        });
        chars = q.totalBodyChars;
        const blob = docBodyBlob(built.doc);
        if (!blob.toLowerCase().includes(client.toLowerCase().slice(0, 8))) {
          // industry label brands can be long — require order + some client token
          if (!blob.includes(client.split(' ')[0] ?? client)) failures.push('client_missing');
        }
        if (!blob.includes(built.order.shortRef)) failures.push('order_unbound');

        const thrKey =
          baseId === 'bundle-ops-clarity'
            ? 'audit'
            : baseId === 'bundle-portal-presence' || baseId === 'bundle-sales-launch'
              ? 'landing'
              : baseId;
        const thr = DOC_SUBSTANCE_THRESHOLDS[thrKey];
        if (thr) {
          if (!documentSubstancePasses(q, thr)) failures.push('substance_fail');
        } else if (q.totalBodyChars < 900 || q.sectionCount < 4) {
          failures.push('thin_retainer');
        }

        if (built.kind === 'site') {
          const aq = assessGeneratedSiteQuality({
            pages: built.pages,
            brandName: client,
            deliverableId: built.siteId,
          });
          if (!aq.ok) failures.push(`site_quality:${aq.thinPages.join(',') || 'gate'}`);
        }

        // Promise check: catalog problems must be embeddable claim (≥5 named)
        if ((pkg.problemsSolved ?? []).some((p) => p.trim().length < 8)) {
          failures.push('weak_problem_text');
        }
      } catch (err) {
        failures.push(`gen:${err instanceof Error ? err.message : String(err)}`);
      }

      rows.push({
        id: pkg.id,
        baseId,
        industry,
        status: failures.length ? 'FAIL' : 'PASS',
        chars,
        problems,
        failures,
      });
    }

    const passed = rows.filter((r) => r.status === 'PASS').length;
    const failed = rows.filter((r) => r.status === 'FAIL').length;
    const payload = {
      shardIndex: SHARD_INDEX,
      shardCount: SHARD_COUNT,
      generatedAt: new Date().toISOString(),
      totalInShard: rows.length,
      passed,
      failed,
      rows,
      fails: rows.filter((r) => r.status === 'FAIL'),
    };

    fs.mkdirSync(OUT_DIR, { recursive: true });
    const outPath = path.join(OUT_DIR, `_tmp-thousand-shard-${SHARD_INDEX}.json`);
    fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf8');

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        shard: SHARD_INDEX,
        totalInShard: rows.length,
        passed,
        failed,
        outPath,
      }),
    );

    expect(failed).toBe(0);
    expect(passed).toBe(rows.length);
  }, 900000);
});
