import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import 'express-async-errors';

import { moduleRegistry } from './ModuleRegistry';
import { testConnection } from '../database/connection';
import { config } from '../config';
import logger from '../utils/logger';
import { firstCommaSegment, headerFirst } from '../utils/http-headers';
import { AppError } from '../utils/errors';
import { sendError } from '../utils/response';
import { validateBody, validateQuery } from '../api/middleware/validate.middleware';
import { StrictEmptyQueryDto } from '../api/dto/strict-empty-query.dto';
import { StrictEmptyBodyDto } from '../api/dto/strict-empty-body.dto';

// Import all modules
import { AuthModule } from '../modules/auth/auth.module';
import { UsersModule } from '../modules/users/users.module';
import { BillingModule } from '../modules/billing/billing.module';
import { SubscriptionsModule } from '../modules/subscriptions/subscriptions.module';
import { PaymentsModule } from '../modules/payments/payments.module';
import { VideoMeetingsModule } from '../modules/video-meetings/video-meetings.module';
import { TasksModule } from '../modules/tasks/tasks.module';
import { AutomationModule } from '../modules/automation/automation.module';
import { CrmModule } from '../modules/crm/crm.module';
import { TemplateEngineModule } from '../modules/template-engine/template-engine.module';
import { TitanScoreModule } from '../modules/titan-score/titan-score.module';
import { ValidatorModule } from '../modules/validator/validator.module';
import { ClientHunterModule } from '../modules/client-hunter/client-hunter.module';
import { LeadScoringModule } from '../modules/lead-scoring/lead-scoring.module';
import { ProxyRotationModule } from '../modules/proxy-rotation/proxy-rotation.module';
import { OutreachModule } from '../modules/outreach/outreach.module';
import { MarketingGrowthModule } from '../modules/marketing-growth/marketing-growth.module';
import { ContractsModule } from '../modules/contracts/contracts.module';
import { AnalyticsModule } from '../modules/analytics/analytics.module';
import { ScraperModule } from '../modules/scraper/scraper.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { AdminModule } from '../modules/admin/admin.module';
import { ResourceProcurementModule } from '../modules/resource-procurement/resource-procurement.module';
import { TitanMasterModule } from '../modules/titan-master/titan-master.module';
import { Dominus360Module } from '../modules/dominus360/dominus360.module';
import { CraftorModule } from '../modules/craftor/craftor.module';
import { DigitalSignatureModule } from '../modules/digital-signature/digital-signature.module';
import { PackagePricingModule } from '../modules/package-pricing/package-pricing.module';
import { OmniTubeModule } from '../modules/omnitube/omnitube.module';
import { OmniGameModule } from '../modules/omnigame/omnigame.module';
import { ApexPredatorModule } from '../modules/apex-predator/apex-predator.module';
import { TitanisModule } from '../modules/titanis/titanis.module';
import { TitanixModule } from '../modules/titanix/titanix.module';
import { AtinaSystemModule } from '../modules/atina-system/atina-system.module';
import { SistemNaplateModule } from '../modules/sistem-naplate/sistem-naplate.module';
import { TitanMonitorModule } from '../modules/titan-monitor/titan-monitor.module';
import { PhaseLaunchModule } from '../modules/phase-launch/phase-launch.module';
import { ResourceManagementModule } from '../modules/resource-management/resource-management.module';
import { KpiModule } from '../modules/kpi/kpi.module';
import { AiMemoryModule } from '../modules/ai-memory/ai-memory.module';
import { RecommendationModule } from '../modules/recommendation/recommendation.module';
import { BackupRecoveryModule } from '../modules/backup-recovery/backup-recovery.module';
import { IntegrationHubModule } from '../modules/integration-hub/integration-hub.module';
import { LoadBalancerModule } from '../modules/load-balancer/load-balancer.module';
import { ComplianceModule } from '../modules/compliance/compliance.module';
import { GdprModule } from '../modules/gdpr/gdpr.module';
import { SystemUpdaterModule } from '../modules/system-updater/system-updater.module';
import { ApiGatewayModule } from '../modules/api-gateway/api-gateway.module';
import { AuditLogModule } from '../modules/audit-log/audit-log.module';
import { SelfHealingModule } from '../modules/self-healing/self-healing.module';
import { WorkflowChainModule } from '../modules/workflow-chain/workflow-chain.module';
import { ForgeModule } from '../modules/forge/forge.module';
import { AlertSystemModule } from '../modules/alert-system/alert-system.module';
import { ScalingModule } from '../modules/scaling/scaling.module';
import { AiRagModule } from '../modules/ai-rag/ai-rag.module';
import { AutonomyLoopModule } from '../modules/autonomy-loop/autonomy-loop.module';
import { PublicSiteModule } from '../modules/public-site/public-site.module';
import { ProductFactoryModule } from '../modules/product-factory/product-factory.module';
import { DealOfferModule } from '../modules/deal-offer/deal-offer.module';
import { FollowUpModule } from '../modules/follow-up/follow-up.module';
import { FollowUpAutomationModule } from '../modules/follow-up-automation/follow-up-automation.module';
import { CursorAgentModule } from '../modules/cursor-agent/cursor-agent.module';
import { createPhaseActivationGuard } from '../modules/phase-launch/middleware/phase-activation.middleware';

export class CoreEngine {
  private app: Application;
  private server: ReturnType<Application['listen']> | null = null;

  constructor() {
    this.app = express();
  }

  async initialize(): Promise<void> {
    logger.info('🚀 Starting ATINA Core Engine...');

    // Test DB connection
    const dbOk = await testConnection();
    if (!dbOk) {
      throw new Error('Database connection failed. Cannot start server.');
    }

    // Register all modules
    this.registerModules();

    // Setup Express middleware
    this.setupMiddleware();

    // Initialize all modules (their services, workers, etc.)
    await moduleRegistry.initializeAll();

    // Mount module routes
    this.mountRoutes();

    // Setup error handling (must be last)
    this.setupErrorHandler();

    logger.info('✅ ATINA Core Engine initialized');
  }

  private registerModules(): void {
    logger.info('Registering modules...');

    moduleRegistry.register(new AuthModule());
    moduleRegistry.register(new UsersModule());
    moduleRegistry.register(new BillingModule());
    moduleRegistry.register(new SubscriptionsModule());
    moduleRegistry.register(new PaymentsModule());
    moduleRegistry.register(new VideoMeetingsModule());
    moduleRegistry.register(new TasksModule());
    if (config.features.crm) moduleRegistry.register(new CrmModule());
    moduleRegistry.register(new TemplateEngineModule());
    moduleRegistry.register(new TitanScoreModule());
    moduleRegistry.register(new ValidatorModule());
    moduleRegistry.register(new DealOfferModule());
    moduleRegistry.register(new FollowUpModule());
    moduleRegistry.register(new FollowUpAutomationModule());
    moduleRegistry.register(new ClientHunterModule());
    moduleRegistry.register(new LeadScoringModule());
    moduleRegistry.register(new ProxyRotationModule());
    moduleRegistry.register(new OutreachModule());
    moduleRegistry.register(new MarketingGrowthModule());
    moduleRegistry.register(new ContractsModule());
    if (config.features.analytics) moduleRegistry.register(new AnalyticsModule());
    moduleRegistry.register(new NotificationsModule());
    moduleRegistry.register(new AdminModule());
    moduleRegistry.register(new CursorAgentModule());
    moduleRegistry.register(new ResourceProcurementModule());
    moduleRegistry.register(new TitanMasterModule());
    moduleRegistry.register(new Dominus360Module());
    moduleRegistry.register(new CraftorModule());
    moduleRegistry.register(new PackagePricingModule());
    moduleRegistry.register(new DigitalSignatureModule());
    moduleRegistry.register(new OmniTubeModule());
    moduleRegistry.register(new OmniGameModule());
    moduleRegistry.register(new ApexPredatorModule());
    moduleRegistry.register(new TitanisModule());
    moduleRegistry.register(new TitanixModule());
    moduleRegistry.register(new AtinaSystemModule());
    moduleRegistry.register(new SistemNaplateModule());
    moduleRegistry.register(new TitanMonitorModule());
    moduleRegistry.register(new PhaseLaunchModule());
    moduleRegistry.register(new ResourceManagementModule());
    moduleRegistry.register(new KpiModule());
    moduleRegistry.register(new AiMemoryModule());
    moduleRegistry.register(new RecommendationModule());
    moduleRegistry.register(new BackupRecoveryModule());
    moduleRegistry.register(new IntegrationHubModule());
    moduleRegistry.register(new LoadBalancerModule());
    moduleRegistry.register(new ComplianceModule());
    moduleRegistry.register(new GdprModule());
    moduleRegistry.register(new SystemUpdaterModule());
    moduleRegistry.register(new ApiGatewayModule());
    moduleRegistry.register(new AuditLogModule());
    moduleRegistry.register(new SelfHealingModule());
    moduleRegistry.register(new WorkflowChainModule());
    moduleRegistry.register(new ForgeModule());
    moduleRegistry.register(new AlertSystemModule());
    moduleRegistry.register(new ScalingModule());
    moduleRegistry.register(new AiRagModule());
    moduleRegistry.register(new AutonomyLoopModule());
    moduleRegistry.register(new PublicSiteModule());
    if (config.productFactory.enabled) moduleRegistry.register(new ProductFactoryModule());

    if (config.features.automation) moduleRegistry.register(new AutomationModule());
    if (config.features.scraper) moduleRegistry.register(new ScraperModule());
  }

  private setupMiddleware(): void {
    // Security
    this.app.use(helmet({
      contentSecurityPolicy: config.app.isProd,
      crossOriginEmbedderPolicy: false,
    }));

    // CORS
    this.app.use(cors({
      origin: config.app.isDev ? '*' : config.app.url,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
      credentials: true,
    }));

    // Compression
    this.app.use(compression());

    // Body parsing — stripe webhooks need raw body
    this.app.use('/api/v1/payments/stripe/webhook', express.raw({ type: 'application/json' }));
    this.app.use('/api/v1/payments/kriptoman/webhook', express.raw({ type: 'application/json' }));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request ID (duplicate header lines may arrive as `string[]` or a single comma-joined string)
    this.app.use((req: Request, _res: Response, next: NextFunction) => {
      const normalized = firstCommaSegment(headerFirst(req.headers['x-request-id']));
      req.headers['x-request-id'] = normalized || `req_${Date.now()}`;
      next();
    });

    // HTTP logging
    this.app.use(morgan(config.app.isDev ? 'dev' : 'combined', {
      stream: { write: (msg: string) => logger.info(msg.trim()) },
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path === '/health',
      message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' } },
    });
    this.app.use(limiter);

    // Root — browsers hitting :3000 directly get pointers, not a 404.
    this.app.get(
      '/',
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      (_req: Request, res: Response) => {
        res.json({
          success: true,
          name: config.app.name,
          message: 'ATINA API backend. Open the web app in your browser or call API routes below.',
          links: {
            health: '/health',
            api: '/api/v1',
            web: process.env.WEB_APP_URL ?? 'http://localhost:3010',
          },
        });
      },
    );

    // Health check
    this.app.get(
      '/health',
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (_req: Request, res: Response) => {
      let forge = {
        vaultPath: null as string | null,
        vaultSignal: 'unavailable' as 'available' | 'unavailable',
        lastForgeEventAgeMs: null as number | null,
        lastForgeEventFresh: null as boolean | null,
      };
      try {
        const probed = await moduleRegistry.runHealthProbe('forge');
        if (probed) {
          forge = {
            vaultPath: (probed.vaultPath as string | null) ?? null,
            vaultSignal: (probed.vaultSignal as 'available' | 'unavailable') ?? 'unavailable',
            lastForgeEventAgeMs: (probed.lastForgeEventAgeMs as number | null) ?? null,
            lastForgeEventFresh: (probed.lastForgeEventFresh as boolean | null) ?? null,
          };
        }
      } catch {
        // Keep /health resilient even if forge diagnostics fail unexpectedly.
      }

      res.json({
        status: 'ok',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        environment: config.app.env,
        forge,
      });
    }
    );

    // API info
    this.app.get(
      '/api/v1',
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      (_req: Request, res: Response) => {
      res.json({
        name: config.app.name,
        version: '1.0.0',
        modules: moduleRegistry.getAll().map(m => ({ name: m.name, slug: m.slug })),
      });
    }
    );
  }

  private mountRoutes(): void {
    const modules = moduleRegistry.getAll();
    for (const module of modules) {
      const path = `/api/v1/${module.slug}`;
      const guard = createPhaseActivationGuard(module.slug);
      const router = module.router;
      this.app.use(path, guard, router);
      logger.debug(`Mounted route: ${path}`);
    }
  }

  private setupErrorHandler(): void {
    // 404 handler
    this.app.use((_req: Request, res: Response) => {
      sendError(res, 'Route not found', 404, 'NOT_FOUND');
    });

    // Global error handler
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    this.app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
      const requestId = firstCommaSegment(headerFirst(req.headers['x-request-id']));

      if (err instanceof AppError) {
        const message = !config.app.isDev && err.statusCode >= 500
          ? 'Internal server error'
          : err.message;
        logger.warn('Application error', {
          code: err.code,
          message: err.message,
          statusCode: err.statusCode,
          requestId,
        });
        return sendError(res, message, err.statusCode, err.code, err.details);
      }

      logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        requestId,
      });

      return sendError(
        res,
        config.app.isDev ? err.message : 'Internal server error',
        500,
        'INTERNAL_ERROR'
      );
    });
  }

  async start(): Promise<void> {
    const port = config.app.port;

    this.server = this.app.listen(port, () => {
      logger.info(`🌐 ATINA server running on port ${port} [${config.app.env}]`);
      logger.info(`📖 Health check: http://localhost:${port}/health`);
      logger.info(`📡 API root: http://localhost:${port}/api/v1`);
    });

    try {
      const { factoryPhaseAutoService } = await import(
        '../modules/billing/service/factory-phase-auto.service'
      );
      factoryPhaseAutoService.startPeriodicEvaluation();
    } catch (error) {
      logger.warn('Factory phase AUTO evaluator not started', { error });
    }

    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
  }

  private async shutdown(signal: string): Promise<void> {
    logger.info(`Received ${signal}. Graceful shutdown...`);

    if (this.server) {
      const forceExit = setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);

      this.server.close(async () => {
        clearTimeout(forceExit);
        await moduleRegistry.shutdownAll();
        logger.info('Server shut down cleanly');
        process.exit(0);
      });
    }
  }

  getApp(): Application {
    return this.app;
  }
}
