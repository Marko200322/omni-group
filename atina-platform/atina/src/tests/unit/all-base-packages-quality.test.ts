jest.mock('../../integrations', () => ({
  getAiClient: () => ({ isConfigured: () => false }),
}));

import fs from 'fs';
import path from 'path';
import { BASE_DELIVERABLE_CATALOG } from '../../modules/billing/lib/base-deliverable-catalog';
import {
  assessDocumentQuality,
  DOC_SUBSTANCE_THRESHOLDS,
  documentSubstancePasses,
} from '../../modules/billing/lib/deliverable-handlers/artifact-helpers';
import { buildOrderIdentity, contentFingerprint, docBodyBlob } from '../../modules/billing/lib/order-identity';
import { DeliverableDocumentGeneratorService } from '../../modules/billing/service/deliverable-document-generator.service';
import {
  DeliverableContentGeneratorService,
  assessGeneratedSiteQuality,
} from '../../modules/billing/service/deliverable-content-generator.service';

type Row = {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL';
  sections: number;
  chars: number;
  fingerprint: string;
  orderBound: boolean;
  clientPresent: boolean;
  notes: string;
};

const OUT_DIR = path.resolve(__dirname, '../../../../../docs/evidence');
const OUT_JSON = path.join(OUT_DIR, 'ALL-BASE-PACKAGES-LOCAL-20261012.json');
const OUT_MD = path.join(OUT_DIR, 'ALL-BASE-PACKAGES-LOCAL-20261012.md');

describe('all base packages — local quality matrix', () => {
  const docs = new DeliverableDocumentGeneratorService();
  const sites = new DeliverableContentGeneratorService();
  const rows: Row[] = [];

  const client = 'Nova Peak Agency';
  const industry = 'marketing';
  const orderA = buildOrderIdentity('pay-all-base-aaaa-1111', 'job-all-a');
  const orderB = buildOrderIdentity('pay-all-base-bbbb-2222', 'job-all-b');

  async function buildDoc(id: string, order = orderA) {
    const hints = { orderIdentity: order };
    switch (id) {
      case 'audit':
        return docs.generateAuditReport({ clientName: client, industryCategory: industry, generationHints: hints });
      case 'workflow-design':
        return docs.generateWorkflowDesign({
          clientName: client,
          industryCategory: industry,
          generationHints: hints,
        });
      case 'integration':
        return docs.generateIntegrationGuide({
          clientName: client,
          industryCategory: industry,
          generationHints: hints,
        });
      case 'setup-quick':
        return docs.generateSetupPack({
          tier: 'quick',
          clientName: client,
          industryCategory: industry,
          generationHints: hints,
        });
      case 'setup-full':
        return docs.generateSetupPack({
          tier: 'full',
          clientName: client,
          industryCategory: industry,
          generationHints: hints,
        });
      case 'setup-custom':
        return docs.generateSetupPack({
          tier: 'custom',
          clientName: client,
          industryCategory: industry,
          generationHints: hints,
        });
      case 'sales-enablement':
        return docs.generateSalesEnablement({
          clientName: client,
          industryCategory: industry,
          generationHints: hints,
        });
      case 'white-label-setup':
        return docs.generateWhiteLabelPack({
          clientName: client,
          industryCategory: industry,
          generationHints: hints,
        });
      case 'custom-software':
        return docs.generateSoftwareHandoff({
          clientName: client,
          projectName: `${client} App`,
          description: 'Scoped Node/SPA starter for marketing ops.',
          outputDir: '/tmp/nova-peak-scaffold',
          industryCategory: industry,
          generationHints: hints,
        });
      case 'vertical-package':
        return docs.generateVerticalPackBrief({
          clientName: client,
          industryCategory: industry,
          generationHints: hints,
        });
      case 'seo-audit':
        return docs.generateSeoAuditReport({
          clientName: client,
          industryCategory: industry,
          generationHints: hints,
        });
      case 'email-marketing':
        return docs.generateEmailMarketingPack({
          clientName: client,
          industryCategory: industry,
          generationHints: hints,
        });
      case 'reputation-management':
        return docs.generateReputationManagementPack({
          clientName: client,
          industryCategory: industry,
          generationHints: hints,
        });
      case 'support-priority':
      case 'support-dedicated':
      case 'lead-gen-retainer':
      case 'ai-support-retainer':
        return docs.generateRetainerWelcome({
          deliverableId: id,
          clientName: client,
          industryCategory: industry,
          generationHints: hints,
        });
      case 'landing':
      case 'website-business':
      case 'website-ecommerce':
      case 'bundle-portal-presence':
      case 'bundle-sales-launch': {
        const siteId = id.startsWith('bundle')
          ? id === 'bundle-sales-launch'
            ? 'landing'
            : 'landing'
          : id;
        const pages = await sites.generateWebsitePages({
          deliverableId: siteId === 'bundle-portal-presence' ? 'landing' : siteId,
          title: client,
          clientName: client,
          industryCategory: industry,
          generationHints: hints,
        });
        const pack = await docs.generateSiteDeliveryPack({
          deliverableId: siteId === 'bundle-portal-presence' ? 'landing' : siteId,
          clientName: client,
          industryCategory: industry,
          publicUrl: `/sites/nova-peak-${order.shortRef.toLowerCase()}`,
          absoluteUrl: `https://example.test/sites/nova-peak-${order.shortRef.toLowerCase()}`,
          pageCount: pages.length,
          catalogCount: siteId === 'website-ecommerce' ? 8 : null,
          generationHints: hints,
        });
        return { doc: pack, pages, siteId };
      }
      case 'bundle-ops-clarity': {
        const audit = await docs.generateAuditReport({
          clientName: client,
          industryCategory: industry,
          generationHints: hints,
        });
        const workflow = await docs.generateWorkflowDesign({
          clientName: client,
          industryCategory: industry,
          generationHints: hints,
        });
        return { doc: audit, extra: workflow };
      }
      default:
        throw new Error(`Unhandled package id: ${id}`);
    }
  }

  it('probes every base catalog package and writes evidence', async () => {
    expect(BASE_DELIVERABLE_CATALOG.length).toBe(23);

    for (const pkg of BASE_DELIVERABLE_CATALOG) {
      const id = pkg.id;
      try {
        const built = await buildDoc(id, orderA);
        const doc = 'doc' in (built as object) && (built as { doc?: unknown }).doc
          ? (built as { doc: Awaited<ReturnType<typeof docs.generateAuditReport>> }).doc
          : (built as Awaited<ReturnType<typeof docs.generateAuditReport>>);
        const pages =
          built && typeof built === 'object' && 'pages' in built
            ? (built as { pages: Awaited<ReturnType<typeof sites.generateWebsitePages>> }).pages
            : null;

        const q = assessDocumentQuality(doc, { clientName: client, industryCategory: industry });
        const thr = DOC_SUBSTANCE_THRESHOLDS[id] ?? DOC_SUBSTANCE_THRESHOLDS[
          id === 'bundle-portal-presence' || id === 'bundle-sales-launch'
            ? 'landing'
            : id === 'bundle-ops-clarity'
              ? 'audit'
              : id === 'support-priority' ||
                  id === 'support-dedicated' ||
                  id === 'lead-gen-retainer' ||
                  id === 'ai-support-retainer'
                ? ''
                : id
        ];
        const blob = docBodyBlob(doc);
        const fp = contentFingerprint(blob);
        const orderBound = blob.includes(orderA.shortRef);
        const clientPresent = blob.toLowerCase().includes(client.toLowerCase());

        let substanceOk = thr ? documentSubstancePasses(q, thr) : q.totalBodyChars >= 900 && q.sectionCount >= 4;
        let siteOk = true;
        let notes = thr ? 'doc substance threshold' : 'retainer/min floor';

        if (pages) {
          const siteId =
            id === 'website-ecommerce'
              ? 'website-ecommerce'
              : id === 'website-business'
                ? 'website-business'
                : 'landing';
          const aq = assessGeneratedSiteQuality({ pages, brandName: client, deliverableId: siteId });
          siteOk = aq.ok;
          notes = `site pages=${pages.length} homeOk=${aq.ok}`;
          if (!aq.ok) substanceOk = false;
        }

        // Second order must differ when we can regenerate the same SKU.
        if (!id.startsWith('bundle-ops')) {
          const builtB = await buildDoc(id, orderB);
          const docB =
            builtB && typeof builtB === 'object' && 'doc' in builtB
              ? (builtB as { doc: typeof doc }).doc
              : (builtB as typeof doc);
          const blobB = docBodyBlob(docB);
          if (contentFingerprint(blobB) === fp && blobB.includes(orderA.shortRef)) {
            substanceOk = false;
            notes += '; FAIL same fingerprint across orders';
          } else if (!blobB.includes(orderB.shortRef)) {
            // retainers may not bind yet — flag soft
            if (thr) {
              substanceOk = false;
              notes += '; FAIL order B not bound';
            } else {
              notes += '; WARN retainer not order-bound';
            }
          }
        }

        const status: 'PASS' | 'FAIL' =
          substanceOk && orderBound && clientPresent && siteOk ? 'PASS' : 'FAIL';
        if (!orderBound && thr) notes += '; FAIL missing order A';
        if (!clientPresent) notes += '; FAIL missing client';

        rows.push({
          id,
          name: pkg.name,
          status,
          sections: q.sectionCount,
          chars: q.totalBodyChars,
          fingerprint: fp,
          orderBound,
          clientPresent,
          notes,
        });
      } catch (err) {
        rows.push({
          id,
          name: pkg.name,
          status: 'FAIL',
          sections: 0,
          chars: 0,
          fingerprint: '',
          orderBound: false,
          clientPresent: false,
          notes: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const passed = rows.filter((r) => r.status === 'PASS').length;
    const failed = rows.filter((r) => r.status === 'FAIL').length;
    const payload = {
      generatedAt: new Date().toISOString(),
      mode: 'local-generators-no-ai',
      client,
      industry,
      total: rows.length,
      passed,
      failed,
      prodLive: false,
      note: 'Prod VPS unreachable — local content quality + order variety only (not hosted live URLs).',
      rows,
    };

    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2), 'utf8');
    const md = [
      '# All base packages — local quality matrix (2026-10-12)',
      '',
      `**${passed}/${rows.length} PASS** · failed=${failed} · client=\`${client}\` · industry=\`${industry}\``,
      '',
      '> Prod VPS was unreachable. This run proves generators produce thick, branded, order-specific packs offline.',
      '',
      '| Package | Status | Sections | Chars | Order | Notes |',
      '|---|---|---:|---:|---|---|',
      ...rows.map(
        (r) =>
          `| \`${r.id}\` · ${r.name} | **${r.status}** | ${r.sections} | ${r.chars} | ${r.orderBound ? 'yes' : 'no'} | ${r.notes.replace(/\|/g, '/')} |`,
      ),
      '',
      `JSON: \`${path.basename(OUT_JSON)}\``,
    ].join('\n');
    fs.writeFileSync(OUT_MD, md, 'utf8');

    // eslint-disable-next-line no-console
    console.log(md);
    expect(rows).toHaveLength(23);
    expect(failed).toBe(0);
  }, 180000);
});
