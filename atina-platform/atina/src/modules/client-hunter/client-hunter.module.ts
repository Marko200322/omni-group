import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { ClientHunterController } from './controller/client-hunter.controller';
import { ClientHunterRunParamsDto, ClientHunterCatalogQueryDto, CreateClientHunterDto, GermanJobPostingPreviewDto, HotClientsListQueryDto, RunClientHunterDto, RunHuntingPipelineDto } from './dto/client-hunter.dto';

export class ClientHunterModule implements IModule {
  name = 'Client Hunter';
  slug = 'client-hunter';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private readonly controller = new ClientHunterController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get('/readiness', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.readiness);
    this.router.post('/bootstrap', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.bootstrap);
    this.router.post('/pipeline/run', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(RunHuntingPipelineDto), this.controller.runPipeline);
    this.router.post(
      '/preview/german-job-email',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(GermanJobPostingPreviewDto),
      this.controller.previewGermanJobEmail,
    );
    this.router.get('/job-boards', authenticate, validateQuery(ClientHunterCatalogQueryDto), validateBody(StrictEmptyBodyDto), this.controller.jobBoards);
    this.router.get('/hot-clients', authenticate, validateQuery(HotClientsListQueryDto), validateBody(StrictEmptyBodyDto), this.controller.hotClients);
    this.router.get('/status', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.status);
    this.router.get('/lead-databases/status', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.leadDatabaseStatus);
    this.router.get('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), this.controller.list);
    this.router.post('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreateClientHunterDto), this.controller.create);
    this.router.post(
      '/:id/run',
      authenticate,
      validateParams(ClientHunterRunParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(RunClientHunterDto),
      this.controller.run
    );
  }
}
