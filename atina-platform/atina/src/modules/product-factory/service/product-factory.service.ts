import { randomBytes } from 'crypto';
import { NotFoundError, ValidationError } from '../../../utils/errors';
import type {
  CreateProductFactoryProjectDtoType,
  ProductFactoryListQueryDtoType,
} from '../dto/product-factory.dto';
import { ProductFactoryRepository } from '../repository/product-factory.repository';
import { GreenfieldBuilderService } from './greenfield-builder.service';
import { ProductFactoryTestService } from './product-factory-test.service';
import { config } from '../../../config';
import { ProductFactoryInternalService } from './product-factory-internal.service';
import { PublicSiteRepository } from '../../public-site/repository/public-site.repository';
import { PublicSiteService } from '../../public-site/service/public-site.service';

import { DeliverableContentGeneratorService, type GeneratedSitePage } from '../../billing/service/deliverable-content-generator.service';
import type { VerticalDeliveryPack } from '../../autonomy-loop/lib/vertical-delivery-resolver';
import type { FulfillmentGenerationHints } from '../../billing/lib/fulfillment-generation-hints';

const WEBSITE_DELIVERABLES = new Set(['landing', 'website-business', 'website-ecommerce']);

function normalizePageKind(kind: string): 'home' | 'about' | 'services' | 'pricing' | 'contact' | 'shop' | 'custom' {
  switch (kind) {
    case 'home':
    case 'about':
    case 'services':
    case 'pricing':
    case 'contact':
    case 'shop':
      return kind;
    default:
      return 'custom';
  }
}

function mapRow(row: NonNullable<Awaited<ReturnType<ProductFactoryRepository['getById']>>>) {
  return {
    id: row.id,
    lane: row.lane,
    slug: row.slug,
    name: row.name,
    description: row.description,
    clientName: row.client_name,
    clientEmail: row.client_email,
    deliverableId: row.deliverable_id,
    status: row.status,
    isolationKey: row.isolation_key,
    outputDir: row.output_dir,
    testStatus: row.test_status,
    deployStatus: row.deploy_status,
    metadata: row.metadata,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function makeIsolationKey(lane: 'client_order' | 'internal_saas'): string {
  const prefix = lane === 'client_order' ? 'co' : 'is';
  return `${prefix}-${randomBytes(8).toString('hex')}`;
}

export class ProductFactoryService {
  private readonly repo = new ProductFactoryRepository();
  private readonly builder = new GreenfieldBuilderService();
  private readonly tester = new ProductFactoryTestService();
  private readonly internal = new ProductFactoryInternalService();
  private readonly publicSites = new PublicSiteService();
  private readonly publicSiteRepo = new PublicSiteRepository();
  private readonly contentGenerator = new DeliverableContentGeneratorService();

  async create(userId: string, dto: CreateProductFactoryProjectDtoType) {
    const isolationKey = makeIsolationKey(dto.lane);
    const metadata: Record<string, unknown> = {};
    if (dto.lane === 'internal_saas' && dto.marketHypothesis) {
      metadata.marketHypothesis = dto.marketHypothesis;
    }

    const row = await this.repo.createProject({
      ownerUserId: userId,
      lane: dto.lane,
      slug: dto.slug,
      name: dto.name,
      description: dto.description ?? null,
      clientName: dto.clientName ?? null,
      clientEmail: dto.clientEmail ?? null,
      deliverableId: dto.deliverableId ?? null,
      isolationKey,
      metadata,
    });

    return mapRow(row);
  }

  async list(userId: string, q: ProductFactoryListQueryDtoType) {
    const { rows, total, page, limit } = await this.repo.listProjects(userId, q);
    return {
      projects: rows.map(mapRow),
      total,
      page,
      limit,
    };
  }

  async getById(userId: string, id: string) {
    const row = await this.repo.getById(id, userId);
    if (!row) throw new NotFoundError('Product factory project');
    return mapRow(row);
  }

  async stats(userId: string) {
    const rows = await this.repo.stats(userId);
    const byLane: Record<string, Record<string, number>> = {
      client_order: {},
      internal_saas: {},
    };
    for (const r of rows) {
      byLane[r.lane] = byLane[r.lane] ?? {};
      byLane[r.lane][r.status] = parseInt(r.count, 10);
    }
    return {
      byLane,
      isolationPolicy: 'one_output_dir_per_isolation_key',
      lanesIndependent: true,
    };
  }

  async build(userId: string, id: string) {
    const row = await this.repo.getById(id, userId);
    if (!row) throw new NotFoundError('Product factory project');

    await this.assertNoCrossLaneLeak(row);

    const runId = await this.repo.insertBuildRun(id, 'scaffold');
    try {
      await this.repo.updateProject(id, { status: 'building', last_error: null });
      const result = this.builder.build(row);
      const updated = await this.repo.updateProject(id, {
        status: 'built',
        output_dir: result.outputDir,
        deploy_status: 'pending',
      });
      await this.repo.completeBuildRun(runId, 'completed', result as unknown as Record<string, unknown>);
      const publicSite = await this.maybeScaffoldPublicSite(userId, row);
      return { project: mapRow(updated!), build: result, publicSite };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.repo.updateProject(id, { status: 'failed', last_error: message });
      await this.repo.completeBuildRun(runId, 'failed', null, message);
      throw err;
    }
  }

  async test(userId: string, id: string) {
    const row = await this.repo.getById(id, userId);
    if (!row) throw new NotFoundError('Product factory project');
    if (!row.output_dir) {
      throw new ValidationError('Project must be built before testing');
    }

    const runId = await this.repo.insertBuildRun(id, 'test');
    const test = this.tester.runTests(row);
    const updated = await this.repo.updateProject(id, {
      status: test.passed ? 'tested' : 'failed',
      test_status: test.passed ? 'passed' : 'failed',
      deploy_status: test.passed ? 'ready' : 'pending',
      last_error: test.error ?? null,
      metadata: { ...(row.metadata ?? {}), lastTest: test },
    });
    await this.repo.completeBuildRun(
      runId,
      test.passed ? 'completed' : 'failed',
      test as unknown as Record<string, unknown>,
      test.error ?? null
    );
    return { project: mapRow(updated!), test };
  }

  async deployPrep(userId: string, id: string) {
    const row = await this.repo.getById(id, userId);
    if (!row) throw new NotFoundError('Product factory project');
    if (row.test_status !== 'passed') {
      throw new ValidationError('Tests must pass before deploy prep');
    }

    const runId = await this.repo.insertBuildRun(id, 'deploy_prep');
    const deployMeta = {
      isolationKey: row.isolation_key,
      lane: row.lane,
      outputDir: row.output_dir,
      deployTarget: `${row.lane}/${row.isolation_key}`,
      independentFromOtherOrders: row.lane === 'client_order',
    };
    await this.repo.updateProject(id, {
      deploy_status: 'ready',
      metadata: { ...(row.metadata ?? {}), deployPrep: deployMeta },
    });
    await this.repo.completeBuildRun(runId, 'completed', deployMeta);
    return { project: mapRow((await this.repo.getById(id, userId))!), deployPrep: deployMeta };
  }

  async internalTick(userId: string) {
    return this.internal.tick(userId, config.productFactory.maxInternalPerTick);
  }

  /**
   * End-to-end automated client delivery (payment confirm → build → publish).
   */
  async runAutomatedClientOrder(input: {
    userId: string;
    paymentId: string;
    deliverableId: string;
    slug: string;
    name: string;
    description: string;
    clientName: string;
    clientEmail?: string | null;
    industryCategory?: string | null;
    publishSite?: boolean;
    skipWebsite?: boolean;
    enhancedGreenfield?: boolean;
    verticalPack?: VerticalDeliveryPack;
    ecommerceCatalog?: Array<{ id: string; name: string; description: string; priceEur: number; sku: string }>;
    generationHints?: FulfillmentGenerationHints;
  }): Promise<Record<string, unknown>> {
    const row = await this.repo.createProject({
      ownerUserId: input.userId,
      lane: 'client_order',
      slug: input.slug,
      name: input.name,
      description: input.description,
      clientName: input.clientName,
      clientEmail: input.clientEmail ?? null,
      deliverableId: input.deliverableId,
      isolationKey: makeIsolationKey('client_order'),
      metadata: {
        paymentId: input.paymentId,
        industryCategory: input.industryCategory ?? null,
        automated: true,
        enhancedGreenfield: input.enhancedGreenfield ?? false,
        verticalSlug: input.verticalPack?.verticalSlug ?? null,
      },
    });

    let publicUrl: string | undefined;
    let customPages: GeneratedSitePage[] | undefined;
    let outputDir: string | undefined;
    let ecommerceCatalog = input.ecommerceCatalog;

    const isWebsite =
      !input.skipWebsite && WEBSITE_DELIVERABLES.has(input.deliverableId);

    if (isWebsite) {
      customPages = await this.contentGenerator.generateWebsitePages({
        deliverableId: input.deliverableId,
        title: input.name,
        clientName: input.clientName,
        industryCategory: input.industryCategory,
        deliverableDescription: input.description,
        verticalPack: input.verticalPack,
        generationHints: input.generationHints,
      });
      if (input.deliverableId === 'website-ecommerce' && !ecommerceCatalog?.length) {
        ecommerceCatalog = this.contentGenerator.generateEcommerceCatalog({
          clientName: input.clientName,
          industryCategory: input.industryCategory,
          verticalPack: input.verticalPack,
        });
      }
    }

    const built = await this.build(input.userId, row.id);
    outputDir = built.build.outputDir;
    const tested = await this.test(input.userId, row.id);
    if (!tested.test.passed) {
      throw new ValidationError(`Automated tests failed: ${tested.test.error ?? 'unknown'}`);
    }
    await this.deployPrep(input.userId, row.id);

    if (isWebsite) {
      const site = await this.scaffoldPublicSiteForProject(input.userId, row, {
        pages: customPages,
        publish: input.publishSite ?? true,
        verticalPack: input.verticalPack,
        ecommerceCatalog,
      });
      publicUrl = site.publicUrl;
    }

    const finalRow = await this.repo.getById(row.id, input.userId);
    return {
      projectId: row.id,
      status: finalRow?.status ?? 'tested',
      publicUrl,
      outputDir,
      deliverableId: input.deliverableId,
      pageCount: customPages?.length ?? 0,
      ecommerceCatalog: ecommerceCatalog ?? null,
    };
  }

  private async scaffoldPublicSiteForProject(
    userId: string,
    row: NonNullable<Awaited<ReturnType<ProductFactoryRepository['getById']>>>,
    opts: {
      pages?: GeneratedSitePage[];
      publish?: boolean;
      verticalPack?: VerticalDeliveryPack;
      ecommerceCatalog?: Array<{ id: string; name: string; description: string; priceEur: number; sku: string }>;
    },
  ) {
    const deliverableId = row.deliverable_id?.trim();
    if (!deliverableId || !WEBSITE_DELIVERABLES.has(deliverableId)) {
      throw new ValidationError('Not a website deliverable');
    }
    const existing = await this.publicSiteRepo.getClientSiteByProject(row.id);
    if (existing) {
      if (opts.publish) {
        await this.publicSites.publishClientSite(userId, existing.slug, true);
      }
      return { slug: existing.slug, publicUrl: `/sites/${existing.slug}`, existing: true };
    }

    if (opts.pages?.length) {
      const siteType =
        deliverableId === 'website-ecommerce'
          ? 'ecommerce'
          : deliverableId === 'landing'
            ? 'landing'
            : 'business';
      const site = await this.publicSites.createClientSite(userId, {
        slug: row.slug,
        title: row.name,
        tagline: row.client_name ? `Digital presence — ${row.client_name}` : undefined,
        siteType: siteType as 'landing' | 'business' | 'ecommerce',
        projectId: row.id,
        branding: {
          clientName: row.client_name ?? null,
          verticalSlug: opts.verticalPack?.verticalSlug ?? null,
          catalog: opts.ecommerceCatalog ?? [],
          checkout: { currency: 'EUR', provider: 'manual_bank_transfer' },
          seo: {
            title: row.name,
            description: opts.verticalPack?.valueProp ?? row.description ?? row.name,
            keywords: opts.verticalPack?.keywords ?? [],
          },
          theme: {
            primary: '#8b5cf6',
            accent: '#22d3ee',
            background: '#0f172a',
          },
        },
        pages: opts.pages.map((p) => ({
          slug: p.slug,
          title: p.title,
          body: p.body,
          kind: normalizePageKind(p.kind),
        })),
        publish: opts.publish ?? false,
      });
      return { slug: site.slug, publicUrl: site.publicUrl, existing: false };
    }

    const site = await this.publicSites.scaffoldFromProject({
      userId,
      projectId: row.id,
      slug: row.slug,
      title: row.name,
      clientName: row.client_name,
      deliverableId,
      publish: opts.publish ?? false,
    });
    return { slug: site.slug, publicUrl: site.publicUrl, existing: false };
  }

  private async maybeScaffoldPublicSite(
    userId: string,
    row: NonNullable<Awaited<ReturnType<ProductFactoryRepository['getById']>>>,
  ) {
    if (row.metadata?.automated === true) return null;
    const deliverableId = row.deliverable_id?.trim();
    if (!deliverableId || !WEBSITE_DELIVERABLES.has(deliverableId)) return null;
    const existing = await this.publicSiteRepo.getClientSiteByProject(row.id);
    if (existing) {
      return { slug: existing.slug, publicUrl: `/sites/${existing.slug}`, existing: true };
    }
    const site = await this.publicSites.scaffoldFromProject({
      userId,
      projectId: row.id,
      slug: row.slug,
      title: row.name,
      clientName: row.client_name,
      deliverableId,
      publish: false,
    });
    return { slug: site.slug, publicUrl: site.publicUrl, existing: false };
  }

  private async assertNoCrossLaneLeak(
    row: NonNullable<Awaited<ReturnType<ProductFactoryRepository['getById']>>>
  ) {
    const { rows } = await this.repo.listProjects(row.owner_user_id, {
      page: 1,
      limit: 100,
      lane: row.lane === 'client_order' ? 'internal_saas' : 'client_order',
    });
    for (const other of rows) {
      this.builder.assertIsolated(row, other);
    }
  }
}
