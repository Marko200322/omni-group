import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import {
  ClientSiteSlugParamDto,
  CreateClientSiteDto,
  ListSolutionsQueryDto,
  PublishClientSiteDto,
  ClientSiteShopOrderDto,
  VerticalSlugParamDto,
} from './dto/public-site.dto';
import { PublicSiteController } from './controller/public-site.controller';

/** Javni marketing sajtovi — autonomy vertikale + klijentski multi-tenant sajtovi. */
export class PublicSiteModule implements IModule {
  name = 'Public Site';
  slug = 'public-site';
  version = '1.0.0';
  isCore = false;
  router: Router;
  private readonly controller = new PublicSiteController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Javno — bez auth (marketing landings)
    this.router.get(
      '/solutions',
      validateQuery(ListSolutionsQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listSolutions,
    );
    this.router.get(
      '/solutions/:slug',
      validateParams(VerticalSlugParamDto),
      validateQuery(StrictEmptyBodyDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getSolution,
    );
    this.router.get(
      '/client-sites/mine',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.listMyClientSites,
    );
    this.router.get(
      '/client-sites/:slug',
      validateParams(ClientSiteSlugParamDto),
      validateQuery(StrictEmptyBodyDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getClientSite,
    );
    this.router.post(
      '/client-sites/:slug/orders',
      validateParams(ClientSiteSlugParamDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(ClientSiteShopOrderDto),
      this.controller.placeShopOrder,
    );

    // Autentifikovano — kreiranje klijentskog sajta
    this.router.post(
      '/client-sites',
      authenticate,
      validateQuery(StrictEmptyBodyDto),
      validateBody(CreateClientSiteDto),
      this.controller.createClientSite,
    );
    this.router.patch(
      '/client-sites/:slug/publish',
      authenticate,
      validateParams(ClientSiteSlugParamDto),
      validateQuery(StrictEmptyBodyDto),
      validateBody(PublishClientSiteDto),
      this.controller.publishClientSite,
    );
  }
}
