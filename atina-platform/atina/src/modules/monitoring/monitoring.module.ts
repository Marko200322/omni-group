import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { MonitoringController } from './controller/monitoring.controller';
import {
  EngineRunBodyDto,
  MonitoringIdParamsDto,
  MonitoringListQueryDto,
  PatchIncidentBodyDto,
} from './dto/monitoring.dto';
import { MONITORING_ENGINE_VERSION } from './lib/constants';

export class MonitoringModule implements IModule {
  name = 'Omni Monitoring & Intelligence Engine';
  slug = 'monitoring';
  version = MONITORING_ENGINE_VERSION;
  isCore = true;
  router: Router;
  private readonly controller = new MonitoringController();

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    const auth = [authenticate, requireAdmin];

    this.router.get(
      '/overview',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getOverview
    );

    this.router.get(
      '/health',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getHealth
    );

    this.router.get(
      '/services',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getServices
    );

    this.router.get(
      '/alerts',
      ...auth,
      validateQuery(MonitoringListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getAlerts
    );

    this.router.get(
      '/incidents',
      ...auth,
      validateQuery(MonitoringListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getIncidents
    );

    this.router.get(
      '/attention',
      ...auth,
      validateQuery(MonitoringListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getAttention
    );

    this.router.get(
      '/anomalies',
      ...auth,
      validateQuery(MonitoringListQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getAnomalies
    );

    this.router.get(
      '/costs',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getCosts
    );

    this.router.get(
      '/reinvestment-signals',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      this.controller.getReinvestmentSignals
    );

    this.router.post(
      '/engine/run',
      ...auth,
      validateQuery(StrictEmptyQueryDto),
      validateBody(EngineRunBodyDto),
      this.controller.runEngine
    );

    this.router.patch(
      '/incidents/:id',
      ...auth,
      validateParams(MonitoringIdParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(PatchIncidentBodyDto),
      this.controller.patchIncident
    );
  }
}
