import { DeliverableContentGeneratorService } from '../modules/billing/service/deliverable-content-generator.service';
import { resolveVerticalDeliveryPack } from '../modules/autonomy-loop/lib/vertical-delivery-resolver';
import { resolveVerticalSlug } from '../shared/industry/industry-catalog';
import { PublicSiteRepository } from '../modules/public-site/repository/public-site.repository';
import { query } from '../database/connection';
import logger from '../utils/logger';

type ProjectRow = {
  id: string;
  deliverable_id: string | null;
  client_name: string | null;
  metadata: Record<string, unknown> | null;
};

function verticalPackFromIndustry(industryCategory?: string | null) {
  const slug =
    industryCategory?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-') ?? 'general-business';
  const resolved = resolveVerticalSlug(slug);
  return resolveVerticalDeliveryPack({
    slug,
    category: resolved?.category ?? 'general_business',
    subtype: resolved?.subtype ?? null,
    name: resolved?.name ?? slug,
  });
}

function deliverableFromSiteType(siteType: string): string {
  if (siteType === 'ecommerce') return 'website-ecommerce';
  if (siteType === 'landing') return 'landing';
  return 'website-business';
}

/**
 * Rebuild published client site copy/catalog with the premium fallback generator
 * so live demos stop looking like thin templates.
 *
 * Usage (inside atina container after build):
 *   node dist/jobs/refresh-published-client-sites.js
 */
async function main() {
  const repo = new PublicSiteRepository();
  const content = new DeliverableContentGeneratorService();
  const sites = await repo.listPublishedClientSites(500);
  let updated = 0;
  let skipped = 0;

  for (const site of sites) {
    let deliverableId = deliverableFromSiteType(site.site_type);
    let industry: string | null =
      typeof site.branding?.verticalSlug === 'string'
        ? site.branding.verticalSlug
        : typeof site.branding?.niche === 'string'
          ? site.branding.niche
          : null;
    let clientName =
      typeof site.branding?.clientName === 'string' && site.branding.clientName.trim()
        ? site.branding.clientName.trim()
        : site.title;

    if (site.project_id) {
      const { rows } = await query<ProjectRow>(
        `SELECT id, deliverable_id, client_name, metadata FROM product_factory_projects WHERE id = $1 LIMIT 1`,
        [site.project_id],
      );
      const project = rows[0];
      if (project?.deliverable_id) deliverableId = project.deliverable_id;
      if (project?.client_name?.trim()) clientName = project.client_name.trim();
      const metaIndustry = project?.metadata?.industryCategory;
      if (typeof metaIndustry === 'string' && metaIndustry.trim()) industry = metaIndustry.trim();
    }

    if (!['landing', 'website-business', 'website-ecommerce'].includes(deliverableId)) {
      skipped += 1;
      continue;
    }

    const pack = verticalPackFromIndustry(industry);
    const brandTitle = clientName;
    const pages = await content.generateWebsitePages({
      deliverableId,
      title: brandTitle,
      clientName,
      industryCategory: industry,
      verticalPack: pack,
    });
    const catalog =
      deliverableId === 'website-ecommerce'
        ? content.generateEcommerceCatalog({
            clientName,
            industryCategory: industry,
            verticalPack: pack,
          })
        : [];

    const tagline =
      pack.valueProp?.trim().slice(0, 180) ||
      `${brandTitle} — ${pack.displayName} with clear scope and measurable outcomes.`;

    const branding = {
      ...(site.branding ?? {}),
      clientName,
      verticalSlug: pack.verticalSlug,
      niche: pack.displayName,
      catalog,
      checkout: { currency: 'EUR', provider: 'manual_bank_transfer' },
      seo: {
        title: brandTitle,
        description: pack.valueProp ?? tagline,
        keywords: pack.keywords ?? [],
      },
      theme: {
        primary: '#0f766e',
        accent: '#0ea5e9',
        background: '#0b1220',
      },
    };

    await repo.updateClientSiteContent(site.slug, site.owner_user_id, {
      title: brandTitle,
      tagline,
      branding,
      pages,
    });
    updated += 1;
    logger.info('Refreshed client site content', { slug: site.slug, pages: pages.length, catalog: catalog.length });
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ok: true, total: sites.length, updated, skipped }));
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
