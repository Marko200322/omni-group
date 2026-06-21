import { NotFoundError, ValidationError } from '../../../utils/errors';
import { WorkflowChainRepository } from '../repository/workflow-chain.repository';
import { WorkflowChainPersistence } from '../repository/workflow-chain.persistence';
import { SelfHealingService } from '../../self-healing/service/self-healing.service';
import { IntegrationHubService } from '../../integration-hub/service/integration-hub.service';
import { BackupRecoveryService } from '../../backup-recovery/service/backup-recovery.service';
import { SystemUpdaterService } from '../../system-updater/service/system-updater.service';
import { LoadBalancerService } from '../../load-balancer/service/load-balancer.service';
import { ComplianceService } from '../../compliance/service/compliance.service';
import { GdprService } from '../../gdpr/service/gdpr.service';
import { PhaseLaunchService } from '../../phase-launch/service/phase-launch.service';
import { TitanMonitorService } from '../../titan-monitor/service/titan-monitor.service';
import { ApiGatewayService } from '../../api-gateway/service/api-gateway.service';
import { assertValidQueueScrapeUrl } from '../../scraper/queue-scrape-url';
import { config } from '../../../config';
import { getEcosystemRunExecutor } from '../../shared/ecosystem-run.executor';
import { ensureEcosystemWorkspace, mergeWorkflowHuntingInput } from '../../shared/ecosystem-workspace.util';

export class WorkflowChainService {
  private readonly repo = new WorkflowChainRepository();
  private readonly db = new WorkflowChainPersistence();
  private readonly selfHealingService = new SelfHealingService();
  private readonly integrationHubService = new IntegrationHubService();
  private readonly backupRecoveryService = new BackupRecoveryService();
  private readonly systemUpdaterService = new SystemUpdaterService();
  private readonly loadBalancerService = new LoadBalancerService();
  private readonly complianceService = new ComplianceService();
  private readonly gdprService = new GdprService();
  private readonly phaseLaunchService = new PhaseLaunchService();
  private readonly titanMonitorService = new TitanMonitorService();
  private readonly apiGatewayService = new ApiGatewayService();
  private readonly supportedActions: Record<string, string[]> = {
    tasks: ['*'],
    titanix: ['*'],
    'titan-master': ['*'],
    dominus360: ['*'],
    craftor: ['*'],
    omnitube: ['*'],
    omnigame: ['*'],
    'apex-predator': ['*'],
    titanis: ['*'],
    'atina-system': ['*'],
    'sistem-naplate': ['*'],
    forge: ['*'],
    notifications: ['send'],
    'audit-log': ['*'],
    'self-healing': ['auto-scan', 'auto-heal', 'report', 'heal'],
    'integration-hub': ['create', 'sync', 'list'],
    'backup-recovery': ['snapshot', 'restore', 'list'],
    'system-updater': ['queue', 'finish', 'list'],
    'load-balancer': ['register', 'dispatch', 'list'],
    'resource-management': ['overview', 'allocate'],
    compliance: ['record', 'list'],
    gdpr: ['create', 'process', 'list'],
    'ai-memory': ['remember', 'recall'],
    recommendation: ['next-actions'],
    'phase-launch': ['get', 'set'],
    kpi: ['dashboard'],
    'titan-monitor': ['snapshot'],
    subscriptions: ['current'],
    payments: ['record-manual', 'history'],
    'api-gateway': ['register-route', 'proxy', 'list-routes'],
    crm: ['create-contact', 'stats'],
    contracts: ['create', 'send', 'sign', 'stats'],
    analytics: ['track', 'dashboard'],
    automation: ['create-workflow', 'run-workflow'],
    scraper: ['queue-scrape', 'jobs'],
    users: ['profile', 'stats'],
    admin: ['overview', 'health'],
    'client-hunter': ['*'],
    'lead-scoring': ['*'],
    'titan-score': ['*'],
    'proxy-rotation': ['*'],
    outreach: ['*'],
    'deal-offer': ['*'],
    'digital-signature': ['*'],
    'package-pricing': ['*'],
    'follow-up': ['*'],
    'follow-up-automation': ['*'],
    'template-engine': ['*'],
    validator: ['*'],
  };
  private readonly phaseOrder: Record<string, number> = {
    v1: 1,
    v2: 2,
    v3: 3,
    v4: 4,
    v5: 5,
    v6: 6,
  };
  private readonly moduleMinPhase: Record<string, string> = {
    'titan-master': 'v1',
    dominus360: 'v1',
    craftor: 'v1',
    omnitube: 'v2',
    omnigame: 'v2',
    'apex-predator': 'v3',
    titanis: 'v3',
    'atina-system': 'v3',
    'sistem-naplate': 'v3',
    forge: 'v3',
    'integration-hub': 'v3',
    'api-gateway': 'v4',
    'self-healing': 'v4',
    'backup-recovery': 'v4',
    'load-balancer': 'v5',
    'system-updater': 'v5',
    'ai-memory': 'v6',
    recommendation: 'v6',
    'client-hunter': 'v2',
    'lead-scoring': 'v2',
    'titan-score': 'v3',
    'proxy-rotation': 'v2',
    outreach: 'v2',
    'deal-offer': 'v2',
    'digital-signature': 'v2',
    'package-pricing': 'v2',
    'follow-up': 'v2',
    'follow-up-automation': 'v2',
    'template-engine': 'v2',
    validator: 'v2',
  };
  private readonly atinaWorkflowActions: Record<string, Set<string>> = {
    'atina-system': new Set([
      'insight-pass',
      'resilience-scan',
      'sync-prep',
      'demand-map',
      'compliance-scan',
      'growth-signal',
      'billing-prep',
      'continuity-check',
      'continuity-orchestration',
      'governance-baseline',
    ]),
    forge: new Set([
      'connectivity-sync',
      'resilience-trigger',
      'offer-acceleration',
      'policy-alignment',
      'ops-baseline',
      'activation-cycle',
      'billing-bridge',
      'payment-resilience',
      'continuity-sync',
      'governance-sync',
    ]),
    'sistem-naplate': new Set([
      'billing-cycle',
      'risk-balance',
      'settlement-cycle',
      'outage-balance',
      'payment-balance',
      'governance-reconcile',
    ]),
  };
  private readonly phaseNames = ['v1', 'v2', 'v3', 'v4', 'v5', 'v6'] as const;
  private readonly templates: Record<
    string,
    { name: string; description: string; minPhase: string; steps: Array<Record<string, unknown>> }
  > = this.normalizeTemplates({
    'titan-growth-loop': {
      name: 'Titan Growth Loop',
      description: 'Allocates budget, runs Titan modules, tracks KPI and analytics.',
      minPhase: 'v1',
      steps: [
        { step: 'Allocate Titan budget', moduleSlug: 'resource-management', action: 'allocate', config: { systemSlug: 'titan-master', amount: 200 } },
        { step: 'Run Titan Master', moduleSlug: 'titan-master', action: 'execute', config: { revenueEstimate: 120 } },
        { step: 'Run Dominus360', moduleSlug: 'dominus360', action: 'execute', config: { revenueEstimate: 80 } },
        { step: 'Collect KPI snapshot', moduleSlug: 'kpi', action: 'dashboard', config: {} },
        { step: 'Track workflow analytics', moduleSlug: 'analytics', action: 'track', config: { eventName: 'workflow_template_titan_growth_loop_completed' } },
      ],
    },
    'sales-pipeline-chain': {
      name: 'Sales Pipeline Chain',
      description: 'Creates lead/contact, drafts contract and logs payment record.',
      minPhase: 'v1',
      steps: [
        { step: 'Create CRM contact', moduleSlug: 'crm', action: 'create-contact', config: { firstName: 'Lead', source: 'workflow-template' } },
        { step: 'Create draft contract', moduleSlug: 'contracts', action: 'create', config: { title: 'Template Contract', status: 'draft' } },
        { step: 'Create payment record', moduleSlug: 'payments', action: 'record-manual', config: { amount: 99, currency: 'USD', status: 'completed' } },
        { step: 'Notify sales team', moduleSlug: 'notifications', action: 'send', config: {} },
      ],
    },
    'client-acquisition-pipeline': {
      name: 'Client Acquisition Pipeline',
      description: 'Client Hunter → Lead Scoring → CRM contact → analytics (PDF module alignment).',
      minPhase: 'v2',
      steps: [
        { step: 'Client Hunter hunt', moduleSlug: 'client-hunter', action: 'hunt', config: { revenueEstimate: 90 } },
        { step: 'Lead scoring pass', moduleSlug: 'lead-scoring', action: 'score', config: { revenueEstimate: 75 } },
        { step: 'Create CRM contact', moduleSlug: 'crm', action: 'create-contact', config: { firstName: 'Pipeline', source: 'client-acquisition-pipeline' } },
        { step: 'Track acquisition event', moduleSlug: 'analytics', action: 'track', config: { eventName: 'workflow_template_client_acquisition_pipeline_completed' } },
      ],
    },
    'resilience-recovery-loop': {
      name: 'Resilience Recovery Loop',
      description: 'Scans health, snapshots backup, and executes self-heal sequence.',
      minPhase: 'v4',
      steps: [
        { step: 'Admin health check', moduleSlug: 'admin', action: 'health', config: {} },
        { step: 'Self-healing auto scan', moduleSlug: 'self-healing', action: 'auto-scan', config: { includeTasks: true, includePayments: true } },
        { step: 'Create backup snapshot', moduleSlug: 'backup-recovery', action: 'snapshot', config: { snapshotType: 'resilience' } },
        { step: 'Attempt auto heal', moduleSlug: 'self-healing', action: 'auto-heal', config: { maxEvents: 30 } },
        { step: 'Write compliance evidence', moduleSlug: 'compliance', action: 'record', config: { framework: 'ISO27001', controlKey: 'A.12.1', status: 'pass' } },
      ],
    },
    'ecosystem-hunt-to-conversion': {
      name: 'Ecosystem Hunt To Conversion',
      description: 'Runs lead hunt -> sales close -> retention shield across Craftor, Titanis, and Apex Predator.',
      minPhase: 'v3',
      steps: [
        { step: 'Craftor hunting cycle', moduleSlug: 'craftor', action: 'hunting', config: { revenueEstimate: 80 } },
        { step: 'Titanis close cycle', moduleSlug: 'titanis', action: 'close', config: { revenueEstimate: 180 } },
        { step: 'Apex retention shield', moduleSlug: 'apex-predator', action: 'risk-shield', config: { revenueEstimate: 140 } },
        { step: 'Track ecosystem conversion event', moduleSlug: 'analytics', action: 'track', config: { eventName: 'workflow_template_ecosystem_hunt_to_conversion_completed' } },
      ],
    },
    'content-to-conversion-flywheel': {
      name: 'Content To Conversion Flywheel',
      description: 'Runs OmniTube content cycle, funnels demand into Craftor leads, then closes with Titanis.',
      minPhase: 'v3',
      steps: [
        { step: 'OmniTube publish cycle', moduleSlug: 'omnitube', action: 'publish', config: { revenueEstimate: 110 } },
        { step: 'Craftor outreach cycle', moduleSlug: 'craftor', action: 'outreach', config: { revenueEstimate: 90 } },
        { step: 'Titanis close cycle', moduleSlug: 'titanis', action: 'close', config: { revenueEstimate: 170 } },
        { step: 'Track flywheel event', moduleSlug: 'analytics', action: 'track', config: { eventName: 'workflow_template_content_to_conversion_flywheel_completed' } },
      ],
    },
    'risk-to-recovery-loop': {
      name: 'Risk To Recovery Loop',
      description: 'Runs Dominus risk scan, applies Apex shield, and records resilience actions.',
      minPhase: 'v3',
      steps: [
        { step: 'Dominus risk scan', moduleSlug: 'dominus360', action: 'risk-scan', config: { revenueEstimate: 70 } },
        { step: 'Apex risk shield', moduleSlug: 'apex-predator', action: 'risk-shield', config: { revenueEstimate: 130 } },
        { step: 'Compliance record', moduleSlug: 'compliance', action: 'record', config: { framework: 'ISO27001', controlKey: 'A.16.1', status: 'pass' } },
        { step: 'Track recovery event', moduleSlug: 'analytics', action: 'track', config: { eventName: 'workflow_template_risk_to_recovery_loop_completed' } },
      ],
    },
    'titan-score-deterministic-check': {
      name: 'Titan Score Deterministic Check',
      description: 'Runs Titan Score with intensity and mode, then records analytics.',
      minPhase: 'v3',
      steps: [
        {
          step: 'Titan Score pass',
          moduleSlug: 'titan-score',
          action: 'score',
          config: { revenueEstimate: 88, intensity: 55, mode: 'snapshot' },
        },
        {
          step: 'Track Titan Score event',
          moduleSlug: 'analytics',
          action: 'track',
          config: { eventName: 'workflow_template_titan_score_deterministic_check_completed' },
        },
      ],
    },
    'atina-billing-intelligence-loop': {
      name: 'Atina Billing Intelligence Loop',
      description: 'Runs Atina system analysis, executes Sistem Naplate billing cycle, and records outcomes.',
      minPhase: 'v3',
      steps: [
        { step: 'Atina system insight pass', moduleSlug: 'atina-system', action: 'insight-pass', config: { revenueEstimate: 120 } },
        { step: 'Sistem Naplate billing cycle', moduleSlug: 'sistem-naplate', action: 'billing-cycle', config: { revenueEstimate: 160 } },
        { step: 'Record payment artifact', moduleSlug: 'payments', action: 'record-manual', config: { amount: 149, currency: 'EUR', status: 'completed' } },
        { step: 'Track Atina billing intelligence event', moduleSlug: 'analytics', action: 'track', config: { eventName: 'workflow_template_atina_billing_intelligence_loop_completed' } },
      ],
    },
    'atina-resilience-escalation-loop': {
      name: 'Atina Resilience Escalation Loop',
      description: 'Combines Atina ecosystem execution with compliance and self-healing escalation.',
      minPhase: 'v4',
      steps: [
        { step: 'Atina system resilience scan', moduleSlug: 'atina-system', action: 'resilience-scan', config: { revenueEstimate: 95 } },
        { step: 'Sistem Naplate risk balancing', moduleSlug: 'sistem-naplate', action: 'risk-balance', config: { revenueEstimate: 140 } },
        { step: 'Create resilience snapshot', moduleSlug: 'backup-recovery', action: 'snapshot', config: { snapshotType: 'atina-resilience' } },
        { step: 'Run self-healing auto-heal', moduleSlug: 'self-healing', action: 'auto-heal', config: { maxEvents: 25 } },
        { step: 'Track Atina resilience event', moduleSlug: 'analytics', action: 'track', config: { eventName: 'workflow_template_atina_resilience_escalation_loop_completed' } },
      ],
    },
    'atina-forge-sync-loop': {
      name: 'Atina Forge Sync Loop',
      description: 'Runs Atina intelligence, executes Forge synchronization, and records billing telemetry.',
      minPhase: 'v3',
      steps: [
        { step: 'Atina system sync prep', moduleSlug: 'atina-system', action: 'sync-prep', config: { revenueEstimate: 110 } },
        { step: 'Forge connectivity sync', moduleSlug: 'forge', action: 'connectivity-sync', config: { revenueEstimate: 175 } },
        { step: 'Sistem Naplate reconciliation', moduleSlug: 'sistem-naplate', action: 'billing-cycle', config: { revenueEstimate: 150 } },
        { step: 'Track Atina Forge sync event', moduleSlug: 'analytics', action: 'track', config: { eventName: 'workflow_template_atina_forge_sync_loop_completed' } },
      ],
    },
    'atina-forge-resilience-bridge': {
      name: 'Atina Forge Resilience Bridge',
      description: 'Combines Forge execution with Atina resilience controls and compliance evidence.',
      minPhase: 'v4',
      steps: [
        { step: 'Forge resilience trigger', moduleSlug: 'forge', action: 'resilience-trigger', config: { revenueEstimate: 130 } },
        { step: 'Atina system resilience follow-up', moduleSlug: 'atina-system', action: 'resilience-scan', config: { revenueEstimate: 100 } },
        { step: 'Create Atina Forge backup snapshot', moduleSlug: 'backup-recovery', action: 'snapshot', config: { snapshotType: 'atina-forge-bridge' } },
        { step: 'Write Atina Forge compliance evidence', moduleSlug: 'compliance', action: 'record', config: { framework: 'ISO27001', controlKey: 'A.17.1', status: 'pass' } },
        { step: 'Track Atina Forge resilience event', moduleSlug: 'analytics', action: 'track', config: { eventName: 'workflow_template_atina_forge_resilience_bridge_completed' } },
      ],
    },
    'atina-forge-revenue-acceleration-loop': {
      name: 'Atina Forge Revenue Acceleration Loop',
      description: 'Combines Atina demand signals with Forge execution and payment capture.',
      minPhase: 'v3',
      steps: [
        { step: 'Atina system demand mapping', moduleSlug: 'atina-system', action: 'demand-map', config: { revenueEstimate: 120 } },
        { step: 'Forge offer acceleration', moduleSlug: 'forge', action: 'offer-acceleration', config: { revenueEstimate: 185 } },
        { step: 'Sistem Naplate settlement cycle', moduleSlug: 'sistem-naplate', action: 'billing-cycle', config: { revenueEstimate: 165 } },
        { step: 'Track Atina Forge revenue acceleration event', moduleSlug: 'analytics', action: 'track', config: { eventName: 'workflow_template_atina_forge_revenue_acceleration_loop_completed' } },
      ],
    },
    'atina-forge-compliance-pulse': {
      name: 'Atina Forge Compliance Pulse',
      description: 'Runs Atina and Forge compliance pulse with evidence capture and analytics.',
      minPhase: 'v4',
      steps: [
        { step: 'Atina system compliance scan', moduleSlug: 'atina-system', action: 'compliance-scan', config: { revenueEstimate: 95 } },
        { step: 'Forge policy alignment', moduleSlug: 'forge', action: 'policy-alignment', config: { revenueEstimate: 105 } },
        { step: 'Write Atina Forge compliance evidence', moduleSlug: 'compliance', action: 'record', config: { framework: 'ISO27001', controlKey: 'A.18.1', status: 'pass' } },
        { step: 'Track Atina Forge compliance pulse event', moduleSlug: 'analytics', action: 'track', config: { eventName: 'workflow_template_atina_forge_compliance_pulse_completed' } },
      ],
    },
    'atina-forge-api-orchestration-loop': {
      name: 'Atina Forge API Orchestration Loop',
      description: 'Registers and validates Atina+Forge API routing with telemetry.',
      minPhase: 'v4',
      steps: [
        { step: 'Register Atina Forge route', moduleSlug: 'api-gateway', action: 'register-route', config: { routeKey: 'atina-forge-route', upstreamSlug: 'forge', pathTemplate: '/atina/forge/sync', method: 'POST', rateLimitPerMinute: 300 } },
        { step: 'Proxy Atina Forge payload', moduleSlug: 'api-gateway', action: 'proxy', config: { routeKey: 'atina-forge-route', payload: { source: 'workflow-template' } } },
        { step: 'Track Atina Forge API orchestration event', moduleSlug: 'analytics', action: 'track', config: { eventName: 'workflow_template_atina_forge_api_orchestration_loop_completed' } },
      ],
    },
    'atina-forge-ops-resilience-loop': {
      name: 'Atina Forge Ops Resilience Loop',
      description: 'Creates an Atina+Forge operational shield with backup and self-healing.',
      minPhase: 'v4',
      steps: [
        { step: 'Forge ops baseline', moduleSlug: 'forge', action: 'ops-baseline', config: { revenueEstimate: 90 } },
        { step: 'Atina system resilience signal', moduleSlug: 'atina-system', action: 'resilience-scan', config: { revenueEstimate: 100 } },
        { step: 'Create Atina Forge ops snapshot', moduleSlug: 'backup-recovery', action: 'snapshot', config: { snapshotType: 'atina-forge-ops' } },
        { step: 'Run Atina Forge auto heal', moduleSlug: 'self-healing', action: 'auto-heal', config: { maxEvents: 15 } },
        { step: 'Track Atina Forge ops resilience event', moduleSlug: 'analytics', action: 'track', config: { eventName: 'workflow_template_atina_forge_ops_resilience_loop_completed' } },
      ],
    },
    'atina-forge-growth-flywheel': {
      name: 'Atina Forge Growth Flywheel',
      description: 'Builds a growth flywheel from Atina signals through Forge activation to CRM capture.',
      minPhase: 'v3',
      steps: [
        { step: 'Atina system growth signal', moduleSlug: 'atina-system', action: 'growth-signal', config: { revenueEstimate: 110 } },
        { step: 'Forge activation cycle', moduleSlug: 'forge', action: 'activation-cycle', config: { revenueEstimate: 170 } },
        { step: 'Create growth CRM contact', moduleSlug: 'crm', action: 'create-contact', config: { firstName: 'Atina Forge Lead', source: 'atina-forge-growth-flywheel' } },
        { step: 'Track Atina Forge growth flywheel event', moduleSlug: 'analytics', action: 'track', config: { eventName: 'workflow_template_atina_forge_growth_flywheel_completed' } },
      ],
    },
    'atina-forge-billing-compliance-loop': {
      name: 'Atina Forge Billing Compliance Loop',
      description: 'Synchronizes Atina and Forge billing operations and records compliance outcomes.',
      minPhase: 'v4',
      steps: [
        { step: 'Atina system billing prep', moduleSlug: 'atina-system', action: 'billing-prep', config: { revenueEstimate: 120 } },
        { step: 'Forge billing bridge sync', moduleSlug: 'forge', action: 'billing-bridge', config: { revenueEstimate: 165 } },
        { step: 'Sistem Naplate settlement cycle', moduleSlug: 'sistem-naplate', action: 'settlement-cycle', config: { revenueEstimate: 150 } },
        { step: 'Record billing compliance evidence', moduleSlug: 'compliance', action: 'record', config: { framework: 'ISO27001', controlKey: 'A.12.4', status: 'pass' } },
        { step: 'Track Atina Forge billing compliance event', moduleSlug: 'analytics', action: 'track', config: { eventName: 'workflow_template_atina_forge_billing_compliance_loop_completed' } },
      ],
    },
    'atina-backup-compliance-recovery-cycle': {
      name: 'Atina Backup Compliance Recovery Cycle',
      description: 'Runs Atina and Sistem Naplate continuity checks with backup snapshots and compliance recording.',
      minPhase: 'v4',
      steps: [
        { step: 'Atina continuity check', moduleSlug: 'atina-system', action: 'continuity-check', config: { revenueEstimate: 90 } },
        { step: 'Sistem Naplate outage balancing', moduleSlug: 'sistem-naplate', action: 'outage-balance', config: { revenueEstimate: 130 } },
        { step: 'Create continuity backup snapshot', moduleSlug: 'backup-recovery', action: 'snapshot', config: { snapshotType: 'atina-continuity' } },
        { step: 'Record continuity compliance evidence', moduleSlug: 'compliance', action: 'record', config: { framework: 'ISO27001', controlKey: 'A.17.2', status: 'pass' } },
        { step: 'Track Atina continuity recovery event', moduleSlug: 'analytics', action: 'track', config: { eventName: 'workflow_template_atina_backup_compliance_recovery_cycle_completed' } },
      ],
    },
    'forge-payment-resilience-lattice': {
      name: 'Forge Payment Resilience Lattice',
      description: 'Combines Forge execution with payment resilience safeguards, backup controls, and compliance logs.',
      minPhase: 'v4',
      steps: [
        { step: 'Forge payment resilience trigger', moduleSlug: 'forge', action: 'payment-resilience', config: { revenueEstimate: 155 } },
        { step: 'Sistem Naplate payment balancing', moduleSlug: 'sistem-naplate', action: 'payment-balance', config: { revenueEstimate: 145 } },
        { step: 'Create payment resilience snapshot', moduleSlug: 'backup-recovery', action: 'snapshot', config: { snapshotType: 'forge-payment-resilience' } },
        { step: 'Write payment resilience compliance record', moduleSlug: 'compliance', action: 'record', config: { framework: 'ISO27001', controlKey: 'A.12.3', status: 'pass' } },
        { step: 'Track Forge payment resilience event', moduleSlug: 'analytics', action: 'track', config: { eventName: 'workflow_template_forge_payment_resilience_lattice_completed' } },
      ],
    },
    'atina-forge-continuity-loop': {
      name: 'Atina Forge Continuity Loop',
      description: 'Links Atina and Forge continuity execution with backup recovery and compliance tracking.',
      minPhase: 'v4',
      steps: [
        { step: 'Atina continuity orchestration', moduleSlug: 'atina-system', action: 'continuity-orchestration', config: { revenueEstimate: 105 } },
        { step: 'Forge continuity sync', moduleSlug: 'forge', action: 'continuity-sync', config: { revenueEstimate: 160 } },
        { step: 'Create Atina Forge continuity snapshot', moduleSlug: 'backup-recovery', action: 'snapshot', config: { snapshotType: 'atina-forge-continuity' } },
        { step: 'Record Atina Forge continuity compliance', moduleSlug: 'compliance', action: 'record', config: { framework: 'ISO27001', controlKey: 'A.17.1', status: 'pass' } },
        { step: 'Track Atina Forge continuity event', moduleSlug: 'analytics', action: 'track', config: { eventName: 'workflow_template_atina_forge_continuity_loop_completed' } },
      ],
    },
    'atina-unified-governance-loop': {
      name: 'Atina Unified Governance Loop',
      description: 'Unifies Atina, Forge, and Sistem Naplate governance with compliance and backup-recovery controls.',
      minPhase: 'v4',
      steps: [
        { step: 'Atina governance baseline', moduleSlug: 'atina-system', action: 'governance-baseline', config: { revenueEstimate: 95 } },
        { step: 'Forge governance sync', moduleSlug: 'forge', action: 'governance-sync', config: { revenueEstimate: 150 } },
        { step: 'Sistem Naplate governance reconciliation', moduleSlug: 'sistem-naplate', action: 'governance-reconcile', config: { revenueEstimate: 140 } },
        { step: 'Write unified governance evidence', moduleSlug: 'compliance', action: 'record', config: { framework: 'ISO27001', controlKey: 'A.5.1', status: 'pass' } },
        { step: 'Create unified governance backup snapshot', moduleSlug: 'backup-recovery', action: 'snapshot', config: { snapshotType: 'atina-unified-governance' } },
        { step: 'Track Atina unified governance event', moduleSlug: 'analytics', action: 'track', config: { eventName: 'workflow_template_atina_unified_governance_loop_completed' } },
      ],
    },
    'lead-proxy-acquisition-pipeline': {
      name: 'Lead Proxy Acquisition Pipeline',
      description: 'Proxy rotation → Client Hunter → Lead Scoring → CRM contact → analytics (delivery stack only).',
      minPhase: 'v2',
      steps: [
        { step: 'Proxy rotation warm-up', moduleSlug: 'proxy-rotation', action: 'rotate', config: { revenueEstimate: 55 } },
        { step: 'Client Hunter hunt', moduleSlug: 'client-hunter', action: 'hunt', config: { revenueEstimate: 88 } },
        { step: 'Lead scoring pass', moduleSlug: 'lead-scoring', action: 'score', config: { revenueEstimate: 72 } },
        { step: 'Create CRM contact', moduleSlug: 'crm', action: 'create-contact', config: { firstName: 'Proxy Lead', source: 'lead-proxy-acquisition-pipeline' } },
        { step: 'Track proxy acquisition event', moduleSlug: 'analytics', action: 'track', config: { eventName: 'workflow_template_lead_proxy_acquisition_pipeline_completed' } },
      ],
    },
    'atina-forge-crm-handoff': {
      name: 'Atina Forge CRM Handoff',
      description: 'Atina demand signal → Forge acceleration → CRM capture → analytics.',
      minPhase: 'v3',
      steps: [
        { step: 'Atina system demand mapping', moduleSlug: 'atina-system', action: 'demand-map', config: { revenueEstimate: 118 } },
        { step: 'Forge offer acceleration', moduleSlug: 'forge', action: 'offer-acceleration', config: { revenueEstimate: 182 } },
        { step: 'Create CRM contact from Forge', moduleSlug: 'crm', action: 'create-contact', config: { firstName: 'Forge Handoff', source: 'atina-forge-crm-handoff' } },
        { step: 'Track Atina Forge CRM handoff event', moduleSlug: 'analytics', action: 'track', config: { eventName: 'workflow_template_atina_forge_crm_handoff_completed' } },
      ],
    },
    'nurture-loop': {
      name: 'Nurture Loop',
      description: 'Hunts and scores leads, runs outreach, captures CRM, then records analytics.',
      minPhase: 'v2',
      steps: [
        { step: 'Client Hunter hunt', moduleSlug: 'client-hunter', action: 'hunt', config: { revenueEstimate: 86 } },
        { step: 'Lead scoring pass', moduleSlug: 'lead-scoring', action: 'score', config: { revenueEstimate: 79 } },
        { step: 'Outreach run', moduleSlug: 'outreach', action: 'run', config: { revenueEstimate: 73 } },
        { step: 'Create CRM contact', moduleSlug: 'crm', action: 'create-contact', config: { firstName: 'Nurture', source: 'nurture-loop' } },
        { step: 'Track nurture loop event', moduleSlug: 'analytics', action: 'track', config: { eventName: 'workflow_template_nurture_loop_completed' } },
      ],
    },
    'revenue-guard-loop': {
      name: 'Revenue Guard Loop',
      description: 'Snapshots subscription state, records payment evidence, and writes compliance plus analytics.',
      minPhase: 'v1',
      steps: [
        { step: 'Current subscription snapshot', moduleSlug: 'subscriptions', action: 'current', config: {} },
        { step: 'Record payment artifact', moduleSlug: 'payments', action: 'record-manual', config: { amount: 199, currency: 'USD', status: 'completed' } },
        { step: 'Compliance record', moduleSlug: 'compliance', action: 'record', config: { framework: 'ISO27001', controlKey: 'A.8.1', status: 'pass' } },
        { step: 'Track revenue guard event', moduleSlug: 'analytics', action: 'track', config: { eventName: 'workflow_template_revenue_guard_loop_completed' } },
      ],
    },
    'integration-resilience-loop': {
      name: 'Integration Resilience Loop',
      description: 'Provisions an integration, syncs it, takes a backup snapshot, and tracks telemetry.',
      minPhase: 'v4',
      steps: [
        { step: 'Create integration connection', moduleSlug: 'integration-hub', action: 'create', config: { providerSlug: 'crm-bridge', displayName: 'CRM Bridge' } },
        { step: 'Sync integration', moduleSlug: 'integration-hub', action: 'sync', config: {} },
        { step: 'Backup snapshot', moduleSlug: 'backup-recovery', action: 'snapshot', config: { snapshotType: 'integration-resilience' } },
        { step: 'Track integration resilience event', moduleSlug: 'analytics', action: 'track', config: { eventName: 'workflow_template_integration_resilience_loop_completed' } },
      ],
    },
  });

  private getTemplateCompletedEventName(templateKey: string): string {
    return `workflow_template_${templateKey.replace(/-/g, '_')}_completed`;
  }

  private deriveTemplateMinPhase(steps: Array<Record<string, unknown>>): string {
    let highest = 1;
    for (const step of steps) {
      const moduleSlug = String(step.moduleSlug ?? '');
      const requiredPhase = this.moduleMinPhase[moduleSlug];
      if (!requiredPhase) continue;
      const ordinal = this.phaseOrder[requiredPhase] ?? 1;
      if (ordinal > highest) highest = ordinal;
    }
    return this.phaseNames[Math.max(0, Math.min(highest - 1, this.phaseNames.length - 1))];
  }

  private normalizeTemplates(
    templates: Record<
      string,
      { name: string; description: string; minPhase: string; steps: Array<Record<string, unknown>> }
    >
  ): Record<string, { name: string; description: string; minPhase: string; steps: Array<Record<string, unknown>> }> {
    const usedEventNames = new Set<string>();
    const templateSignatures = new Set<string>();

    return Object.fromEntries(
      Object.entries(templates)
        .map(([templateKey, template]) => {
          const templateSignature = JSON.stringify({
            name: template.name,
            description: template.description,
            steps: template.steps.map((step) => ({
              step: step.step,
              moduleSlug: step.moduleSlug,
              action: step.action,
              config: step.config ?? {},
            })),
          });
          if (templateSignatures.has(templateSignature)) return null;
          templateSignatures.add(templateSignature);

        const normalizedSteps = template.steps.map((step) => {
          const moduleSlug = String(step.moduleSlug ?? '');
          const action = String(step.action ?? '');
          if (moduleSlug !== 'analytics' || action !== 'track') return step;

          const currentConfig =
            step.config && typeof step.config === 'object' ? ({ ...step.config } as Record<string, unknown>) : {};

          let eventName = this.getTemplateCompletedEventName(templateKey);
          if (usedEventNames.has(eventName)) {
            let suffix = 2;
            while (usedEventNames.has(`${eventName}_${suffix}`)) suffix += 1;
            eventName = `${eventName}_${suffix}`;
          }
          usedEventNames.add(eventName);

          currentConfig.eventName = eventName;
          return {
            ...step,
            config: currentConfig,
          };
        });

        const derivedMinPhase = this.deriveTemplateMinPhase(normalizedSteps);
        const normalizedMinPhase = derivedMinPhase;

        return [
          templateKey,
          {
            ...template,
            minPhase: normalizedMinPhase,
            steps: normalizedSteps,
          },
        ];
      })
      .filter((entry): entry is [string, { name: string; description: string; minPhase: string; steps: Array<Record<string, unknown>> }] => entry !== null)
    );
  }

  private hasPriorStep(
    steps: Array<Record<string, unknown>>,
    endExclusive: number,
    moduleSlug: string,
    action: string
  ): boolean {
    for (let i = 0; i < endExclusive; i += 1) {
      if (String(steps[i].moduleSlug ?? '') === moduleSlug && String(steps[i].action ?? '') === action) {
        return true;
      }
    }
    return false;
  }

  private resolveRetryAttempts(cfg: Record<string, unknown>): number {
    const raw =
      cfg.retryAttempts ??
      cfg.maxAttempts ??
      (typeof cfg.retry === 'number' ? cfg.retry : undefined) ??
      (cfg.retry === true ? 3 : 1);
    const parsed = Number(raw ?? 1);
    if (!Number.isFinite(parsed)) return 1;
    return Math.max(1, Math.min(5, Math.floor(parsed)));
  }

  private resolveRetryDelayMs(cfg: Record<string, unknown>): number {
    const parsed = Number(cfg.retryDelayMs ?? cfg.retryBackoffMs ?? 0);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(3000, Math.floor(parsed)));
  }

  private async sleep(ms: number): Promise<void> {
    if (ms <= 0) return;
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  private isPhaseAllowed(currentPhase: string, requiredPhase: string): boolean {
    const current = this.phaseOrder[currentPhase] ?? 1;
    const required = this.phaseOrder[requiredPhase] ?? 1;
    return current >= required;
  }

  /** Respects CoreEngine feature flags for gated modules (crm, analytics, scraper, automation). */
  private isModuleFeatureEnabled(moduleSlug: string): boolean {
    switch (moduleSlug) {
      case 'crm':
        return config.features.crm;
      case 'analytics':
        return config.features.analytics;
      case 'scraper':
        return config.features.scraper;
      case 'automation':
        return config.features.automation;
      default:
        return true;
    }
  }

  private validateScraperQueueScrapeConfig(
    moduleSlug: string,
    action: string,
    cfg: Record<string, unknown>,
    index: number,
    stepName: string,
    issues: Array<Record<string, unknown>>
  ): void {
    if (moduleSlug !== 'scraper' || action !== 'queue-scrape') return;
    try {
      assertValidQueueScrapeUrl(cfg.url);
    } catch (err) {
      const reason = err instanceof ValidationError ? err.message : 'Invalid scraper queue-scrape url';
      issues.push({ index, step: stepName, reason });
    }
  }

  private validateAtinaEcosystemStep(
    moduleSlug: string,
    action: string,
    cfg: Record<string, unknown>,
    index: number,
    stepName: string,
    issues: Array<Record<string, unknown>>,
    warnings: Array<Record<string, unknown>>
  ): void {
    if (moduleSlug !== 'atina-system' && moduleSlug !== 'forge' && moduleSlug !== 'sistem-naplate') {
      return;
    }

    const knownActions = this.atinaWorkflowActions[moduleSlug];
    if (knownActions && !knownActions.has(action)) {
      warnings.push({
        index,
        step: stepName,
        warning: `${moduleSlug}.${action} is not in the recommended action catalog; verify action spelling/intent`,
      });
    }

    const revenueEstimate = cfg.revenueEstimate;
    if (revenueEstimate === undefined) {
      warnings.push({
        index,
        step: stepName,
        warning: `${moduleSlug}.${action} is missing config.revenueEstimate; runtime will use default value 50`,
      });
      return;
    }

    if (typeof revenueEstimate !== 'number' || Number.isNaN(revenueEstimate) || revenueEstimate <= 0) {
      issues.push({
        index,
        step: stepName,
        reason: `${moduleSlug}.${action} requires config.revenueEstimate to be a positive number`,
      });
    }
  }

  async create(userId: string, name: string, steps: unknown[]) {
    const { rows } = await this.repo.create(userId, name, steps);
    return rows[0];
  }

  async list(userId: string) {
    const { rows } = await this.repo.list(userId);
    return rows;
  }

  listTemplates() {
    return Object.entries(this.templates).map(([key, value]) => ({
      key,
      name: value.name,
      description: value.description,
      minPhase: value.minPhase,
      totalSteps: value.steps.length,
      modules: Array.from(new Set(value.steps.map((s) => String(s.moduleSlug ?? '')))),
    }));
  }

  async previewTemplate(templateKey: string) {
    const tpl = this.templates[templateKey];
    if (!tpl) {
      throw new NotFoundError('Workflow template');
    }
    const steps = tpl.steps;
    const issues: Array<Record<string, unknown>> = [];
    const warnings: Array<Record<string, unknown>> = [];
    let currentPhase = 'v1';
    try {
      const { rows } = await this.db.execute<{ config: Record<string, unknown> }>(
        `SELECT config FROM modules WHERE slug = 'phase-launch-control' LIMIT 1`
      );
      if (rows[0]?.config?.current_phase) {
        currentPhase = String(rows[0].config.current_phase);
      }
    } catch {
      currentPhase = 'v1';
    }

    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i];
      const moduleSlug = String(step.moduleSlug ?? '');
      const action = String(step.action ?? '');
      const stepName = String(step.step ?? `${moduleSlug}:${action}`);
      const cfg = (step.config ?? {}) as Record<string, unknown>;
      const allowed = this.supportedActions[moduleSlug];

      if (!moduleSlug || !action) {
        issues.push({ index: i, step: stepName, reason: 'Missing moduleSlug or action' });
        continue;
      }
      if (!allowed) {
        issues.push({ index: i, step: stepName, reason: `Unsupported module '${moduleSlug}'` });
        continue;
      }
      if (!allowed.includes('*') && !allowed.includes(action)) {
        issues.push({ index: i, step: stepName, reason: `Unsupported action '${action}' for '${moduleSlug}'` });
      }
      if (!this.isModuleFeatureEnabled(moduleSlug)) {
        issues.push({
          index: i,
          step: stepName,
          reason: `Module '${moduleSlug}' is disabled by server configuration`,
        });
        continue;
      }
      const minPhase = this.moduleMinPhase[moduleSlug];
      if (minPhase && !this.isPhaseAllowed(currentPhase, minPhase)) {
        issues.push({
          index: i,
          step: stepName,
          reason: `Module '${moduleSlug}' requires at least phase '${minPhase}', current is '${currentPhase}'`,
        });
      }
      if (cfg.continueOnError === true) {
        warnings.push({ index: i, step: stepName, warning: 'continueOnError enabled' });
      }
      this.validateAtinaEcosystemStep(moduleSlug, action, cfg, i, stepName, issues, warnings);
      this.validateScraperQueueScrapeConfig(moduleSlug, action, cfg, i, stepName, issues);
    }

    return {
      key: templateKey,
      name: tpl.name,
      description: tpl.description,
      minPhase: tpl.minPhase,
      currentPhase,
      totalSteps: steps.length,
      valid: issues.length === 0,
      issues,
      warnings,
      steps,
    };
  }

  async createFromTemplate(userId: string, templateKey: string, name?: string) {
    const tpl = this.templates[templateKey];
    if (!tpl) {
      throw new NotFoundError('Workflow template');
    }
    const chainName = name ?? tpl.name;
    const { rows } = await this.repo.create(userId, chainName, tpl.steps);
    return {
      templateKey,
      workflow: rows[0],
    };
  }

  async createFromTemplateAndRun(
    userId: string,
    templateKey: string,
    name?: string,
    input: Record<string, unknown> = {},
    force = false
  ) {
    const created = (await this.createFromTemplate(userId, templateKey, name)) as {
      templateKey: string;
      workflow: Record<string, unknown>;
    };
    const workflowId = String(created.workflow.id ?? '');
    if (!workflowId) {
      throw new ValidationError('Template workflow creation failed: missing workflow id');
    }
    const execution = await this.run(userId, workflowId, input, force, templateKey);
    return {
      templateKey: created.templateKey,
      workflow: created.workflow,
      executionTaskId: String((execution as Record<string, unknown>).executionTaskId ?? ''),
      execution,
    };
  }

  async bootstrapTemplates(userId: string, overwrite = false, namePrefix?: string) {
    const existing = (await this.list(userId)) as Array<Record<string, unknown>>;
    const existingByName = new Map<string, Record<string, unknown>>();
    for (const row of existing) {
      existingByName.set(String(row.name ?? ''), row);
    }

    const created: Array<Record<string, unknown>> = [];
    const skipped: Array<Record<string, unknown>> = [];
    const updated: Array<Record<string, unknown>> = [];
    const blocked: Array<Record<string, unknown>> = [];
    const prefix = namePrefix ? `${namePrefix.trim()} ` : '';

    for (const [templateKey, tpl] of Object.entries(this.templates)) {
      const preview = await this.previewTemplate(templateKey);
      if (!preview.valid) {
        blocked.push({
          templateKey,
          workflowName: `${prefix}${tpl.name}`,
          reason: 'template preflight failed for current phase',
          issues: preview.issues,
        });
        continue;
      }

      const workflowName = `${prefix}${tpl.name}`;
      const found = existingByName.get(workflowName);
      if (found && !overwrite) {
        skipped.push({
          templateKey,
          workflowId: String(found.id ?? ''),
          workflowName,
          reason: 'already exists',
        });
        continue;
      }

      if (found && overwrite) {
        const updatedRow = await this.update(userId, String(found.id), {
          name: workflowName,
          steps: tpl.steps,
        });
        updated.push({
          templateKey,
          workflow: updatedRow,
        });
        continue;
      }

      const { rows } = await this.repo.create(userId, workflowName, tpl.steps);
      created.push({
        templateKey,
        workflow: rows[0],
      });
    }

    return {
      overwrite,
      namePrefix: namePrefix ?? null,
      totals: {
        templates: Object.keys(this.templates).length,
        created: created.length,
        updated: updated.length,
        skipped: skipped.length,
        blocked: blocked.length,
      },
      created,
      updated,
      skipped,
      blocked,
    };
  }

  async get(userId: string, workflowId: string) {
    const { rows } = await this.repo.get(userId, workflowId);
    if (!rows[0]) throw new NotFoundError('Workflow chain');
    return rows[0];
  }

  async update(userId: string, workflowId: string, patch: { name?: string; steps?: unknown[] }) {
    const { rows } = await this.repo.update(userId, workflowId, patch.name, patch.steps);
    if (!rows[0]) throw new NotFoundError('Workflow chain');
    return rows[0];
  }

  async clone(userId: string, workflowId: string, name?: string) {
    const existing = (await this.get(userId, workflowId)) as Record<string, unknown>;
    const chainDefinition = Array.isArray(existing.chain_definition) ? existing.chain_definition : [];
    const cloneName = name ?? `${String(existing.name ?? 'Workflow')} (copy)`;
    const { rows } = await this.repo.create(userId, cloneName, chainDefinition as unknown[]);
    return rows[0];
  }

  async delete(userId: string, workflowId: string) {
    const result = await this.repo.delete(userId, workflowId);
    if ((result.rowCount ?? 0) === 0) throw new NotFoundError('Workflow chain');
    return { deleted: true, workflowId };
  }

  async pause(userId: string, workflowId: string) {
    const { rows } = await this.repo.setStatus(userId, workflowId, 'paused');
    if (!rows[0]) throw new NotFoundError('Workflow chain');
    return rows[0];
  }

  async activate(userId: string, workflowId: string) {
    const { rows } = await this.repo.setStatus(userId, workflowId, 'active');
    if (!rows[0]) throw new NotFoundError('Workflow chain');
    return rows[0];
  }

  async listExecutions(userId: string, page: number, limit: number, workflowId?: string) {
    const offset = (page - 1) * limit;
    const [{ rows }, { rows: countRows }] = await Promise.all([
      this.repo.listExecutions(userId, limit, offset, workflowId),
      this.repo.countExecutions(userId, workflowId),
    ]);
    return {
      executions: rows,
      total: parseInt(countRows[0]?.count ?? '0', 10),
      page,
      limit,
    };
  }

  async getExecution(userId: string, executionTaskId: string) {
    const { rows } = await this.repo.getExecution(userId, executionTaskId);
    if (!rows[0]) throw new NotFoundError('Workflow execution');
    return rows[0];
  }

  async rerunExecution(userId: string, executionTaskId: string, inputOverride?: Record<string, unknown>) {
    const execution = (await this.getExecution(userId, executionTaskId)) as Record<string, unknown>;
    const payload = (execution.payload ?? {}) as Record<string, unknown>;
    const workflowId = String(payload.workflowId ?? '');
    const templateKey = typeof payload.templateKey === 'string' ? payload.templateKey : undefined;
    if (!workflowId) throw new NotFoundError('Workflow chain');
    const baseInput =
      inputOverride ??
      ((payload.input && typeof payload.input === 'object'
        ? (payload.input as Record<string, unknown>)
        : {}) as Record<string, unknown>);
    return this.run(userId, workflowId, baseInput, false, templateKey);
  }

  async executionStats(userId: string, workflowId?: string) {
    const { rows } = await this.repo.executionStats(userId, workflowId);
    const s = rows[0] ?? {
      total: '0',
      completed: '0',
      failed: '0',
      running: '0',
      avg_duration_ms: null,
    };
    const total = parseInt(s.total ?? '0', 10);
    const completed = parseInt(s.completed ?? '0', 10);
    const failed = parseInt(s.failed ?? '0', 10);
    const running = parseInt(s.running ?? '0', 10);
    const successRate = total > 0 ? Number(((completed / total) * 100).toFixed(2)) : 0;
    return {
      workflowId: workflowId ?? null,
      total,
      completed,
      failed,
      running,
      successRate,
      avgDurationMs: s.avg_duration_ms ? Number(parseFloat(s.avg_duration_ms).toFixed(2)) : null,
    };
  }

  async stepAnalytics(userId: string, days: number, workflowId?: string) {
    const { rows } = await this.repo.stepAnalytics(userId, days, workflowId);
    const byModule: Record<string, { total: number; ok: number; failed: number }> = {};
    const byAction = rows.map((r) => ({
      moduleSlug: r.module_slug,
      action: r.action,
      total: parseInt(r.total_count, 10),
      ok: parseInt(r.ok_count, 10),
      failed: parseInt(r.failed_count, 10),
      successRate:
        parseInt(r.total_count, 10) > 0
          ? Number(((parseInt(r.ok_count, 10) / parseInt(r.total_count, 10)) * 100).toFixed(2))
          : 0,
    }));

    for (const row of byAction) {
      if (!byModule[row.moduleSlug]) {
        byModule[row.moduleSlug] = { total: 0, ok: 0, failed: 0 };
      }
      byModule[row.moduleSlug].total += row.total;
      byModule[row.moduleSlug].ok += row.ok;
      byModule[row.moduleSlug].failed += row.failed;
    }

    return {
      workflowId: workflowId ?? null,
      days,
      byAction,
      byModule: Object.entries(byModule).map(([moduleSlug, v]) => ({
        moduleSlug,
        ...v,
        successRate: v.total > 0 ? Number(((v.ok / v.total) * 100).toFixed(2)) : 0,
      })),
    };
  }

  async validate(userId: string, workflowId: string) {
    const chain = (await this.get(userId, workflowId)) as Record<string, unknown>;
    const steps = Array.isArray(chain.chain_definition)
      ? (chain.chain_definition as Array<Record<string, unknown>>)
      : [];

    const issues: Array<Record<string, unknown>> = [];
    const warnings: Array<Record<string, unknown>> = [];
    let currentPhase = 'v1';
    try {
      const { rows } = await this.db.execute<{ config: Record<string, unknown> }>(
        `SELECT config FROM modules WHERE slug = 'phase-launch-control' LIMIT 1`
      );
      if (rows[0]?.config?.current_phase) {
        currentPhase = String(rows[0].config.current_phase);
      }
    } catch {
      currentPhase = 'v1';
    }

    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i];
      const moduleSlug = String(step.moduleSlug ?? '');
      const action = String(step.action ?? '');
      const stepName = String(step.step ?? `${moduleSlug}:${action}`);
      const cfg = (step.config ?? {}) as Record<string, unknown>;
      const allowed = this.supportedActions[moduleSlug];

      if (!moduleSlug || !action) {
        issues.push({ index: i, step: stepName, reason: 'Missing moduleSlug or action' });
        continue;
      }
      if (!allowed) {
        issues.push({ index: i, step: stepName, reason: `Unsupported module '${moduleSlug}'` });
        continue;
      }
      if (!allowed.includes('*') && !allowed.includes(action)) {
        issues.push({ index: i, step: stepName, reason: `Unsupported action '${action}' for '${moduleSlug}'` });
      }
      if (!this.isModuleFeatureEnabled(moduleSlug)) {
        issues.push({
          index: i,
          step: stepName,
          reason: `Module '${moduleSlug}' is disabled by server configuration`,
        });
        continue;
      }

      if (cfg.continueOnError === true) {
        warnings.push({ index: i, step: stepName, warning: 'continueOnError enabled' });
      }
      this.validateAtinaEcosystemStep(moduleSlug, action, cfg, i, stepName, issues, warnings);
      if (moduleSlug === 'payments' && action === 'record-manual' && Number(cfg.amount ?? 0) <= 0) {
        issues.push({ index: i, step: stepName, reason: 'payments.record-manual requires positive config.amount' });
      }
      this.validateScraperQueueScrapeConfig(moduleSlug, action, cfg, i, stepName, issues);
      if (moduleSlug === 'self-healing' && action === 'heal' && typeof cfg.eventId !== 'string') {
        issues.push({ index: i, step: stepName, reason: 'self-healing.heal requires config.eventId' });
      }
      const minPhase = this.moduleMinPhase[moduleSlug];
      if (minPhase && !this.isPhaseAllowed(currentPhase, minPhase)) {
        issues.push({
          index: i,
          step: stepName,
          reason: `Module '${moduleSlug}' requires at least phase '${minPhase}', current is '${currentPhase}'`,
        });
      }
      if (
        moduleSlug === 'integration-hub' &&
        action === 'sync' &&
        typeof cfg.integrationId !== 'string' &&
        !this.hasPriorStep(steps, i, 'integration-hub', 'create')
      ) {
        warnings.push({
          index: i,
          step: stepName,
          warning: 'integration-hub.sync has no integrationId and no prior integration-hub.create step',
        });
      }
      if (
        moduleSlug === 'backup-recovery' &&
        action === 'restore' &&
        typeof cfg.snapshotId !== 'string' &&
        !this.hasPriorStep(steps, i, 'backup-recovery', 'snapshot')
      ) {
        warnings.push({
          index: i,
          step: stepName,
          warning: 'backup-recovery.restore has no snapshotId and no prior backup-recovery.snapshot step',
        });
      }
      if (
        moduleSlug === 'system-updater' &&
        action === 'finish' &&
        typeof cfg.jobId !== 'string' &&
        !this.hasPriorStep(steps, i, 'system-updater', 'queue')
      ) {
        warnings.push({
          index: i,
          step: stepName,
          warning: 'system-updater.finish has no jobId and no prior system-updater.queue step',
        });
      }
      if (
        moduleSlug === 'gdpr' &&
        action === 'process' &&
        typeof cfg.requestId !== 'string' &&
        !this.hasPriorStep(steps, i, 'gdpr', 'create')
      ) {
        warnings.push({
          index: i,
          step: stepName,
          warning: 'gdpr.process has no requestId and no prior gdpr.create step',
        });
      }
      if (
        moduleSlug === 'contracts' &&
        (action === 'send' || action === 'sign') &&
        typeof cfg.contractId !== 'string' &&
        !this.hasPriorStep(steps, i, 'contracts', 'create')
      ) {
        warnings.push({
          index: i,
          step: stepName,
          warning: `contracts.${action} has no contractId and no prior contracts.create step`,
        });
      }
      if (
        moduleSlug === 'automation' &&
        action === 'run-workflow' &&
        typeof cfg.workflowId !== 'string' &&
        !this.hasPriorStep(steps, i, 'automation', 'create-workflow')
      ) {
        warnings.push({
          index: i,
          step: stepName,
          warning: 'automation.run-workflow has no workflowId and no prior automation.create-workflow step',
        });
      }
      if (moduleSlug === 'gdpr' && action === 'list' && cfg.scope === 'all') {
        warnings.push({
          index: i,
          step: stepName,
          warning: "gdpr.list with scope='all' can expose cross-user records; use only for privileged automation",
        });
      }
      if (moduleSlug === 'admin' && action === 'overview') {
        warnings.push({
          index: i,
          step: stepName,
          warning: 'admin.overview reads global system stats; verify this workflow is intended for admin operators',
        });
      }
      if (moduleSlug === 'api-gateway' && action === 'register-route' && Number(cfg.rateLimitPerMinute ?? 120) > 5000) {
        warnings.push({
          index: i,
          step: stepName,
          warning: 'api-gateway.register-route uses very high rateLimitPerMinute (>5000)',
        });
      }
    }

    return {
      workflowId,
      workflowName: String(chain.name ?? workflowId),
      status: String(chain.status ?? 'active'),
      currentPhase,
      totalSteps: steps.length,
      valid: issues.length === 0,
      issues,
      warnings,
    };
  }

  async run(userId: string, id: string, input: Record<string, unknown>, force = false, templateKey?: string) {
    const preflight = await this.validate(userId, id);
    const runTimestamp = new Date().toISOString();
    if (!preflight.valid && !force) {
      throw new ValidationError('Workflow chain preflight validation failed', {
        workflowId: id,
        issues: preflight.issues,
      });
    }
    if (force && !preflight.valid) {
      await this.db.execute(
        `INSERT INTO audit_events
         (actor_user_id, event_type, entity_type, entity_id, severity, payload)
         VALUES ($1, 'workflow_force_run', 'workflow_chain', $2, 'warning', $3)`,
        [
          userId,
          id,
          JSON.stringify({
            timestamp: runTimestamp,
            workflowId: id,
            reason: 'Forced run with invalid preflight',
            issues: preflight.issues,
          }),
        ]
      );
    }

    const { rows } = await this.repo.get(userId, id);
    if (!rows[0]) throw new NotFoundError('Workflow chain');
    const chain = rows[0] as Record<string, unknown>;
    if (String(chain.status ?? 'active') !== 'active') {
      throw new NotFoundError('Workflow chain is paused');
    }
    const steps = Array.isArray(chain.chain_definition)
      ? (chain.chain_definition as Array<Record<string, unknown>>)
      : [];
    const stepResults: Array<Record<string, unknown>> = [];
    const startedAt = new Date();
    const { rows: executionRows } = await this.db.execute<{ id: string }>(
      `INSERT INTO tasks (user_id, type, name, status, payload, started_at)
       VALUES ($1, 'workflow_chain_execution', $2, 'running', $3, NOW())
       RETURNING id`,
      [
        userId,
        `Workflow chain run: ${String(chain.name ?? id)}`,
        JSON.stringify({
          workflowId: id,
          workflowName: String(chain.name ?? id),
          templateKey: templateKey ?? null,
          id: null,
          template: {
            key: templateKey ?? null,
          },
          status: 'running',
          output: null,
          steps: [],
          input,
          totalSteps: steps.length,
          startedAt: startedAt.toISOString(),
        }),
      ]
    );
    const executionTaskId = executionRows[0].id;

    for (const step of steps) {
      const moduleSlug = String(step.moduleSlug ?? '');
      const action = String(step.action ?? 'noop');
      const stepName = String(step.step ?? `${moduleSlug}:${action}`);
      const cfg = mergeWorkflowHuntingInput((step.config ?? {}) as Record<string, unknown>, input);
      let status: 'ok' | 'failed' = 'ok';
      const retryAttempts = this.resolveRetryAttempts(cfg);
      const retryDelayMs = this.resolveRetryDelayMs(cfg);
      const retryErrors: string[] = [];
      let attempt = 0;

      let output: Record<string, unknown> = {};
      while (attempt < retryAttempts) {
        attempt += 1;
        status = 'ok';
        try {
        if (!this.isModuleFeatureEnabled(moduleSlug)) {
          output = { skipped: true, reason: `Module '${moduleSlug}' is disabled by server configuration` };
        } else if (moduleSlug === 'tasks' || moduleSlug === 'titanix') {
          const { rows: taskRows } = await this.db.execute<{ id: string }>(
            `INSERT INTO tasks (user_id, type, name, status, payload)
             VALUES ($1, $2, $3, 'queued', $4)
             RETURNING id`,
            [
              userId,
              moduleSlug === 'titanix' ? 'titanix_pipeline' : 'workflow_task',
              `WF:${stepName}`,
              JSON.stringify({ input, config: cfg, action, chainId: id }),
            ]
          );
          output = { taskId: taskRows[0].id, queued: true };
        } else if (
          moduleSlug === 'titan-master' ||
          moduleSlug === 'dominus360' ||
          moduleSlug === 'craftor' ||
          moduleSlug === 'omnitube' ||
          moduleSlug === 'omnigame' ||
          moduleSlug === 'apex-predator' ||
          moduleSlug === 'titanis' ||
          moduleSlug === 'atina-system' ||
          moduleSlug === 'sistem-naplate' ||
          moduleSlug === 'forge' ||
          moduleSlug === 'client-hunter' ||
          moduleSlug === 'lead-scoring' ||
          moduleSlug === 'titan-score' ||
          moduleSlug === 'proxy-rotation' ||
          moduleSlug === 'outreach' ||
          moduleSlug === 'follow-up' ||
          moduleSlug === 'follow-up-automation' ||
          moduleSlug === 'deal-offer' ||
          moduleSlug === 'digital-signature' ||
          moduleSlug === 'package-pricing' ||
          moduleSlug === 'template-engine' ||
          moduleSlug === 'validator'
        ) {
          const { rows: ecoRows } = await this.db.execute<{ id: string }>(
            `SELECT id FROM ecosystem_systems
             WHERE user_id = $1 AND system_slug = $2
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId, moduleSlug]
          );
          let ecosystemId = ecoRows[0]?.id;
          if (!ecosystemId) {
            ecosystemId = await ensureEcosystemWorkspace(userId, moduleSlug);
          }
          if (!ecosystemId) {
            output = { skipped: true, reason: `No ecosystem system found for ${moduleSlug}` };
          } else {
            const estRevenue = Number(cfg.revenueEstimate ?? 50);
            const executor = getEcosystemRunExecutor();
            if (executor.isRealExecutionEnabled() && executor.supports(moduleSlug)) {
              try {
                const real = await executor.execute({
                  userId,
                  moduleSlug,
                  systemId: ecosystemId,
                  action,
                  cfg: cfg as Record<string, unknown>,
                  chainId: id,
                });
                output = real;
              } catch (err) {
                output = {
                  executed: false,
                  delivery: 'real_failed',
                  error: err instanceof Error ? err.message : String(err),
                };
              }
            } else {
              await this.db.execute(
                `INSERT INTO ecosystem_runs
                 (ecosystem_system_id, run_type, status, input_payload, output_payload, started_at, finished_at)
                 VALUES ($1, $2, 'completed', $3, $4, NOW(), NOW())`,
                [
                  ecosystemId,
                  `${moduleSlug}_${action}`,
                  JSON.stringify({ fromChain: id, input, config: cfg }),
                  JSON.stringify({ executed: true, estimatedRevenue: estRevenue, simulated: true }),
                ]
              );
              await this.db.execute(
                `UPDATE ecosystem_systems
                 SET revenue_generated = revenue_generated + $2,
                     efficiency_score = LEAST(100, efficiency_score + 1.1),
                     last_run_at = NOW(),
                     updated_at = NOW()
                 WHERE id = $1`,
                [ecosystemId, estRevenue]
              );
              output = { ecosystemSystemId: ecosystemId, executed: true, estimatedRevenue: estRevenue, simulated: true };
            }
          }
        } else if (moduleSlug === 'notifications') {
          await this.db.execute(
            `INSERT INTO notifications (user_id, type, title, message, channel, metadata)
             VALUES ($1, 'workflow', $2, $3, 'in_app', $4)`,
            [
              userId,
              `Workflow step: ${stepName}`,
              `Action ${action} executed by workflow chain`,
              JSON.stringify({ chainId: id, step: stepName, config: cfg }),
            ]
          );
          output = { notified: true };
        } else if (moduleSlug === 'audit-log') {
          await this.db.execute(
            `INSERT INTO audit_events
             (actor_user_id, event_type, entity_type, entity_id, severity, payload)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              userId,
              String(cfg.eventType ?? 'workflow_custom_audit'),
              String(cfg.entityType ?? 'workflow_chain'),
              String(cfg.entityId ?? id),
              String(cfg.severity ?? 'info'),
              JSON.stringify({ chainId: id, step: stepName, input, config: cfg }),
            ]
          );
          output = { audited: true };
        } else if (moduleSlug === 'self-healing') {
          if (action === 'auto-scan') {
            output = await this.selfHealingService.autoScan(userId, {
              includeTasks: Boolean(cfg.includeTasks ?? true),
              includePayments: Boolean(cfg.includePayments ?? true),
              includeIntegrations: Boolean(cfg.includeIntegrations ?? true),
            });
          } else if (action === 'auto-heal') {
            output = await this.selfHealingService.autoHeal(userId, Number(cfg.maxEvents ?? 20));
          } else if (action === 'report') {
            output = (await this.selfHealingService.report(
              String(cfg.subsystem ?? 'workflow-chain'),
              String(cfg.issueKey ?? `workflow_issue:${id}:${stepName}`),
              {
                ...(cfg.details && typeof cfg.details === 'object' ? (cfg.details as Record<string, unknown>) : {}),
                source: 'workflow-chain',
                chainId: id,
                step: stepName,
              }
            )) as Record<string, unknown>;
          } else if (action === 'heal') {
            if (typeof cfg.eventId !== 'string') throw new Error('self-healing heal requires config.eventId');
            output = (await this.selfHealingService.heal(
              cfg.eventId,
              String(cfg.remediationAction ?? 'Workflow-triggered remediation'),
              userId
            )) as Record<string, unknown>;
          } else {
            output = { skipped: true, reason: `Unsupported self-healing action '${action}'` };
          }
        } else if (moduleSlug === 'integration-hub') {
          if (action === 'create') {
            output = (await this.integrationHubService.create(
              userId,
              String(cfg.providerSlug ?? 'generic'),
              String(cfg.displayName ?? `WF Integration ${stepName}`),
              (cfg.credentials ?? {}) as Record<string, unknown>,
              (cfg.integrationConfig ?? cfg.config ?? {}) as Record<string, unknown>
            )) as Record<string, unknown>;
          } else if (action === 'sync') {
            let integrationId = typeof cfg.integrationId === 'string' ? cfg.integrationId : null;
            if (!integrationId) {
              const latest = await this.db.execute<{ id: string }>(
                `SELECT id FROM integration_connections
                 WHERE user_id = $1
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [userId]
              );
              integrationId = latest.rows[0]?.id ?? null;
            }
            if (!integrationId) throw new Error('integration-hub sync requires integrationId or existing integration');
            output = (await this.integrationHubService.sync(userId, integrationId)) as Record<string, unknown>;
          } else if (action === 'list') {
            const list = await this.integrationHubService.list(userId);
            output = { count: list.length, items: list };
          } else {
            output = { skipped: true, reason: `Unsupported integration-hub action '${action}'` };
          }
        } else if (moduleSlug === 'backup-recovery') {
          if (action === 'snapshot') {
            output = (await this.backupRecoveryService.createBackup(
              userId,
              String(cfg.snapshotType ?? 'manual'),
              {
                source: 'workflow-chain',
                chainId: id,
                step: stepName,
                ...(cfg.metadata && typeof cfg.metadata === 'object' ? (cfg.metadata as Record<string, unknown>) : {}),
              }
            )) as Record<string, unknown>;
          } else if (action === 'restore') {
            let snapshotId = typeof cfg.snapshotId === 'string' ? cfg.snapshotId : null;
            if (!snapshotId) {
              const latest = await this.db.execute<{ id: string }>(
                `SELECT id FROM backup_snapshots
                 WHERE created_by = $1
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [userId]
              );
              snapshotId = latest.rows[0]?.id ?? null;
            }
            if (!snapshotId) throw new Error('backup-recovery restore requires snapshotId or existing snapshot');
            output = (await this.backupRecoveryService.restoreBackup(
              snapshotId,
              String(cfg.reason ?? 'Workflow restore request')
            )) as Record<string, unknown>;
          } else if (action === 'list') {
            const limit = Number(cfg.limit ?? 25);
            const items = await this.backupRecoveryService.listBackups(limit);
            output = { count: items.length, items };
          } else {
            output = { skipped: true, reason: `Unsupported backup-recovery action '${action}'` };
          }
        } else if (moduleSlug === 'system-updater') {
          if (action === 'queue') {
            output = (await this.systemUpdaterService.queue(
              userId,
              String(cfg.targetVersion ?? 'v-next'),
              String(cfg.notes ?? `Queued by workflow ${id}`)
            )) as Record<string, unknown>;
          } else if (action === 'finish') {
            let jobId = typeof cfg.jobId === 'string' ? cfg.jobId : null;
            if (!jobId) {
              const latest = await this.db.execute<{ id: string }>(
                `SELECT id FROM updater_jobs
                 WHERE requested_by = $1 AND status = 'queued'
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [userId]
              );
              jobId = latest.rows[0]?.id ?? null;
            }
            if (!jobId) throw new Error('system-updater finish requires jobId or existing queued job');
            output = (await this.systemUpdaterService.finish(
              jobId,
              String(cfg.status ?? 'success'),
              (cfg.result ?? { source: 'workflow-chain' }) as Record<string, unknown>
            )) as Record<string, unknown>;
          } else if (action === 'list') {
            const items = await this.systemUpdaterService.list();
            output = { count: items.length, items };
          } else {
            output = { skipped: true, reason: `Unsupported system-updater action '${action}'` };
          }
        } else if (moduleSlug === 'load-balancer') {
          if (action === 'register') {
            output = (await this.loadBalancerService.register(
              String(cfg.nodeName ?? `wf-node-${Date.now()}`),
              String(cfg.zone ?? 'wf-zone'),
              Number(cfg.capacityScore ?? 100),
              (cfg.metadata ?? {}) as Record<string, unknown>
            )) as Record<string, unknown>;
          } else if (action === 'dispatch') {
            let dispatchResult: Record<string, unknown>;
            try {
              dispatchResult = (await this.loadBalancerService.dispatch(String(cfg.workloadKey ?? `wf:${id}:${stepName}`))) as Record<string, unknown>;
            } catch (error) {
              const msg = error instanceof Error ? error.message : '';
              if (msg.includes('Active node')) {
                await this.loadBalancerService.register(`wf-auto-node-${Date.now()}`, 'wf-auto', 100, { source: 'workflow-chain' });
                dispatchResult = (await this.loadBalancerService.dispatch(String(cfg.workloadKey ?? `wf:${id}:${stepName}`))) as Record<string, unknown>;
              } else {
                throw error;
              }
            }
            output = dispatchResult;
          } else if (action === 'list') {
            const items = await this.loadBalancerService.list();
            output = { count: items.length, items };
          } else {
            output = { skipped: true, reason: `Unsupported load-balancer action '${action}'` };
          }
        } else if (moduleSlug === 'resource-management') {
          if (action === 'overview') {
            const [alloc, usage] = await Promise.all([
              this.db.execute<{ total: string }>('SELECT COALESCE(SUM(budget_allocated),0) AS total FROM ecosystem_systems'),
              this.db.execute<{ total: string }>("SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status = 'completed'"),
            ]);
            const budgetAllocated = parseFloat(alloc.rows[0].total);
            const realizedRevenue = parseFloat(usage.rows[0].total);
            output = {
              budgetAllocated,
              realizedRevenue,
              roi: budgetAllocated > 0 ? Number(((realizedRevenue / budgetAllocated) * 100).toFixed(2)) : 0,
            };
          } else if (action === 'allocate') {
            const systemSlug = String(cfg.systemSlug ?? 'titan-master');
            const amount = Number(cfg.amount ?? 100);
            const reason = String(cfg.reason ?? 'Workflow allocation');
            let { rows: updated } = await this.db.execute(
              `UPDATE ecosystem_systems
               SET budget_allocated = budget_allocated + $2,
                   updated_at = NOW()
               WHERE system_slug = $1
                 AND user_id = $3
               RETURNING id, system_slug, name, budget_allocated`,
              [systemSlug, amount, userId]
            );
            if (!updated[0]) {
              await this.db.execute(
                `INSERT INTO ecosystem_systems
                 (user_id, system_slug, name, status, stage, budget_allocated, config, metrics)
                 VALUES ($1, $2, $3, 'active', 'v1', 0, '{}', '{}')`,
                [userId, systemSlug, String(cfg.systemName ?? systemSlug)]
              );
              const retry = await this.db.execute(
                `UPDATE ecosystem_systems
                 SET budget_allocated = budget_allocated + $2,
                     updated_at = NOW()
                 WHERE system_slug = $1
                   AND user_id = $3
                 RETURNING id, system_slug, name, budget_allocated`,
                [systemSlug, amount, userId]
              );
              updated = retry.rows;
            }
            await this.db.execute(
              `INSERT INTO logs (user_id, level, category, action, message, context)
               VALUES ($1, 'info', 'resource', 'allocate_budget', $2, $3)`,
              [userId, `Allocated ${amount} to ${systemSlug}`, JSON.stringify({ reason, chainId: id, step: stepName })]
            );
            output = { allocations: updated, updatedCount: updated.length };
          } else {
            output = { skipped: true, reason: `Unsupported resource-management action '${action}'` };
          }
        } else if (moduleSlug === 'compliance') {
          if (action === 'record') {
            output = (await this.complianceService.record(
              userId,
              String(cfg.framework ?? 'ISO27001'),
              String(cfg.controlKey ?? 'A.12.1'),
              String(cfg.status ?? 'pass'),
              String(cfg.notes ?? 'Workflow compliance record'),
              (cfg.evidence ?? { source: 'workflow-chain', chainId: id, step: stepName }) as Record<string, unknown>
            )) as Record<string, unknown>;
          } else if (action === 'list') {
            const items = await this.complianceService.list(
              typeof cfg.framework === 'string' ? cfg.framework : undefined
            );
            output = { count: items.length, items };
          } else {
            output = { skipped: true, reason: `Unsupported compliance action '${action}'` };
          }
        } else if (moduleSlug === 'gdpr') {
          if (action === 'create') {
            output = (await this.gdprService.create(
              userId,
              String(cfg.requestType ?? 'export'),
              (cfg.payload ?? { source: 'workflow-chain', chainId: id }) as Record<string, unknown>
            )) as Record<string, unknown>;
          } else if (action === 'process') {
            let requestId = typeof cfg.requestId === 'string' ? cfg.requestId : null;
            if (!requestId) {
              const latest = await this.db.execute<{ id: string }>(
                `SELECT id FROM gdpr_requests
                 WHERE user_id = $1 AND status = 'pending'
                 ORDER BY requested_at DESC
                 LIMIT 1`,
                [userId]
              );
              requestId = latest.rows[0]?.id ?? null;
            }
            if (!requestId) throw new Error('gdpr process requires requestId or existing pending request');
            output = (await this.gdprService.process(
              requestId,
              String(cfg.status ?? 'completed'),
              (cfg.response ?? { processedBy: 'workflow-chain' }) as Record<string, unknown>
            )) as Record<string, unknown>;
          } else if (action === 'list') {
            const items = cfg.scope === 'all' ? await this.gdprService.listAll() : await this.gdprService.listForUser(userId);
            output = { count: items.length, items };
          } else {
            output = { skipped: true, reason: `Unsupported gdpr action '${action}'` };
          }
        } else if (moduleSlug === 'ai-memory') {
          if (action === 'remember') {
            const namespace = String(cfg.namespace ?? 'global');
            const key = String(cfg.key ?? `wf:${id}:${stepName}`);
            const value = (cfg.value ?? input) as Record<string, unknown>;
            const { rows: created } = await this.db.execute(
              `INSERT INTO logs (user_id, level, category, action, message, context)
               VALUES ($1, 'info', 'ai-memory', 'remember', $2, $3)
               RETURNING id, created_at`,
              [userId, `memory:${namespace}:${key}`, JSON.stringify(value)]
            );
            output = { stored: true, record: created[0] };
          } else if (action === 'recall') {
            const namespace = String(cfg.namespace ?? 'global');
            const key = typeof cfg.key === 'string' ? cfg.key : '%';
            const { rows: items } = await this.db.execute(
              `SELECT id, action, context, created_at
               FROM logs
               WHERE user_id = $1
                 AND category = 'ai-memory'
                 AND action = 'remember'
                 AND message LIKE $2
               ORDER BY created_at DESC
               LIMIT 100`,
              [userId, `memory:${namespace}:${key}%`]
            );
            output = { count: items.length, items };
          } else {
            output = { skipped: true, reason: `Unsupported ai-memory action '${action}'` };
          }
        } else if (moduleSlug === 'recommendation') {
          const [subs, failedTasks, failedPayments] = await Promise.all([
            this.db.execute<{ count: string }>("SELECT COUNT(*) AS count FROM subscriptions WHERE user_id = $1 AND status = 'active'", [userId]),
            this.db.execute<{ count: string }>("SELECT COUNT(*) AS count FROM tasks WHERE user_id = $1 AND status IN ('failed','retrying')", [userId]),
            this.db.execute<{ count: string }>("SELECT COUNT(*) AS count FROM payments WHERE user_id = $1 AND status = 'failed'", [userId]),
          ]);
          const recommendations: string[] = [];
          if (parseInt(subs.rows[0].count, 10) === 0) recommendations.push('Activate a paid subscription to unlock full automation throughput.');
          if (parseInt(failedTasks.rows[0].count, 10) > 0) recommendations.push('Review failed tasks and retry critical pipelines.');
          if (parseInt(failedPayments.rows[0].count, 10) > 0) recommendations.push('Resolve failed payments to prevent module throttling.');
          if (!recommendations.length) recommendations.push('Scale by enabling additional ecosystem modules (Titanis, OmniTube, OmniGame).');
          output = { recommendations };
        } else if (moduleSlug === 'phase-launch') {
          if (action === 'get') {
            output = (await this.phaseLaunchService.getCurrentPhase()) as Record<string, unknown>;
          } else if (action === 'set') {
            output = (await this.phaseLaunchService.setCurrentPhase({
              phase: String(cfg.phase ?? 'v1') as 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6',
              notes: String(cfg.notes ?? `Updated by workflow ${id}`),
            })) as Record<string, unknown>;
          } else {
            output = { skipped: true, reason: `Unsupported phase-launch action '${action}'` };
          }
        } else if (moduleSlug === 'kpi') {
          const [users, subs, rev, tasks, eco] = await Promise.all([
            this.db.execute<{ c: string }>('SELECT COUNT(*) AS c FROM users WHERE is_active = true'),
            this.db.execute<{ c: string }>("SELECT COUNT(*) AS c FROM subscriptions WHERE status = 'active'"),
            this.db.execute<{ s: string }>("SELECT COALESCE(SUM(amount),0) AS s FROM payments WHERE status = 'completed'"),
            this.db.execute<{ c: string }>("SELECT COUNT(*) AS c FROM tasks WHERE status IN ('queued','running')"),
            this.db.execute<{ c: string }>("SELECT COUNT(*) AS c FROM ecosystem_systems WHERE status = 'active'"),
          ]);
          output = {
            activeUsers: parseInt(users.rows[0].c, 10),
            activeSubscriptions: parseInt(subs.rows[0].c, 10),
            totalRevenue: parseFloat(rev.rows[0].s),
            activeTasks: parseInt(tasks.rows[0].c, 10),
            activeEcosystemSystems: parseInt(eco.rows[0].c, 10),
          };
        } else if (moduleSlug === 'titan-monitor') {
          output = (await this.titanMonitorService.getSnapshot()) as Record<string, unknown>;
        } else if (moduleSlug === 'subscriptions') {
          const [current, usage] = await Promise.all([
            this.db.execute(
              `SELECT s.*, p.name AS plan_name, p.slug AS plan_slug
               FROM subscriptions s
               JOIN plans p ON s.plan_id = p.id
               WHERE s.user_id = $1 AND s.status IN ('active', 'trialing', 'past_due')
               ORDER BY s.created_at DESC
               LIMIT 1`,
              [userId]
            ),
            Promise.all([
              this.db.execute<{ count: string }>(
                `SELECT COUNT(*) FROM tasks
                 WHERE user_id = $1 AND created_at >= date_trunc('month', NOW())`,
                [userId]
              ),
              this.db.execute<{ count: string }>(
                `SELECT COUNT(*) FROM analytics_events
                 WHERE user_id = $1 AND created_at >= CURRENT_DATE`,
                [userId]
              ),
            ]),
          ]);
          output = {
            current: current.rows[0] ?? null,
            usage: {
              tasksThisMonth: parseInt(usage[0].rows[0].count, 10),
              requestsToday: parseInt(usage[1].rows[0].count, 10),
            },
          };
        } else if (moduleSlug === 'payments') {
          if (action === 'record-manual') {
            const amount = Number(cfg.amount ?? 0);
            if (amount <= 0) throw new Error('payments record-manual requires positive config.amount');
            const provider = String(cfg.provider ?? 'manual');
            const statusVal = String(cfg.status ?? 'completed');
            const { rows: inserted } = await this.db.execute(
              `INSERT INTO payments
                 (user_id, amount, currency, status, provider, description, metadata)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               RETURNING id, amount, currency, status, provider, created_at`,
              [
                userId,
                amount,
                String(cfg.currency ?? 'USD'),
                statusVal,
                provider,
                String(cfg.description ?? 'Workflow manual payment'),
                JSON.stringify((cfg.metadata ?? { source: 'workflow-chain', chainId: id }) as Record<string, unknown>),
              ]
            );
            output = inserted[0] as Record<string, unknown>;
          } else if (action === 'history') {
            const limit = Number(cfg.limit ?? 20);
            const page = Number(cfg.page ?? 1);
            const offset = (page - 1) * limit;
            const { rows: countRows } = await this.db.execute<{ count: string }>('SELECT COUNT(*) FROM payments WHERE user_id = $1', [userId]);
            const { rows: items } = await this.db.execute(
              `SELECT * FROM payments WHERE user_id = $1
               ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
              [userId, limit, offset]
            );
            output = { total: parseInt(countRows[0].count, 10), items };
          } else {
            output = { skipped: true, reason: `Unsupported payments action '${action}'` };
          }
        } else if (moduleSlug === 'api-gateway') {
          if (action === 'register-route') {
            output = (await this.apiGatewayService.register(
              String(cfg.routeKey ?? `wf-route-${Date.now()}`),
              String(cfg.upstreamSlug ?? 'workflow'),
              String(cfg.pathTemplate ?? '/workflow'),
              String(cfg.method ?? 'POST'),
              Number(cfg.rateLimitPerMinute ?? 120)
            )) as Record<string, unknown>;
          } else if (action === 'proxy') {
            output = (await this.apiGatewayService.proxy(
              String(cfg.routeKey ?? ''),
              (cfg.payload ?? input) as Record<string, unknown>
            )) as Record<string, unknown>;
          } else if (action === 'list-routes') {
            const routes = await this.apiGatewayService.list();
            output = { count: routes.length, routes };
          } else {
            output = { skipped: true, reason: `Unsupported api-gateway action '${action}'` };
          }
        } else if (moduleSlug === 'crm') {
          if (action === 'create-contact') {
            const { rows: created } = await this.db.execute(
              `INSERT INTO crm_contacts
                 (user_id, first_name, last_name, email, phone, company, position, status, source, tags, notes, custom_fields)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
               RETURNING *`,
              [
                userId,
                String(cfg.firstName ?? 'Workflow'),
                cfg.lastName ? String(cfg.lastName) : null,
                cfg.email ? String(cfg.email) : null,
                cfg.phone ? String(cfg.phone) : null,
                cfg.company ? String(cfg.company) : null,
                cfg.position ? String(cfg.position) : null,
                String(cfg.status ?? 'lead'),
                cfg.source ? String(cfg.source) : null,
                Array.isArray(cfg.tags) ? cfg.tags : [],
                cfg.notes ? String(cfg.notes) : null,
                JSON.stringify((cfg.customFields ?? {}) as Record<string, unknown>),
              ]
            );
            output = created[0] as Record<string, unknown>;
          } else if (action === 'stats') {
            const [total, byStatus] = await Promise.all([
              this.db.execute<{ count: string }>('SELECT COUNT(*) FROM crm_contacts WHERE user_id = $1', [userId]),
              this.db.execute<{ status: string; count: string }>(
                'SELECT status, COUNT(*) FROM crm_contacts WHERE user_id = $1 GROUP BY status',
                [userId]
              ),
            ]);
            output = {
              total: parseInt(total.rows[0].count, 10),
              byStatus: Object.fromEntries(byStatus.rows.map((r) => [r.status, parseInt(r.count, 10)])),
            };
          } else {
            output = { skipped: true, reason: `Unsupported crm action '${action}'` };
          }
        } else if (moduleSlug === 'contracts') {
          if (action === 'create') {
            const { rows: created } = await this.db.execute(
              `INSERT INTO contracts
                 (user_id, contact_id, title, content, status, value, currency, start_date, end_date, metadata)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
               RETURNING *`,
              [
                userId,
                cfg.contactId ? String(cfg.contactId) : null,
                String(cfg.title ?? `WF Contract ${Date.now()}`),
                cfg.content ? String(cfg.content) : null,
                String(cfg.status ?? 'draft'),
                cfg.value !== undefined ? Number(cfg.value) : null,
                String(cfg.currency ?? 'USD'),
                cfg.startDate ? new Date(String(cfg.startDate)) : null,
                cfg.endDate ? new Date(String(cfg.endDate)) : null,
                JSON.stringify((cfg.metadata ?? {}) as Record<string, unknown>),
              ]
            );
            output = created[0] as Record<string, unknown>;
          } else if (action === 'send') {
            const contractId = String(cfg.contractId ?? '');
            if (!contractId) throw new Error('contracts send requires config.contractId');
            const { rows: updated } = await this.db.execute(
              `UPDATE contracts SET status = 'sent', updated_at = NOW()
               WHERE id = $1 AND user_id = $2 AND status = 'draft'
               RETURNING *`,
              [contractId, userId]
            );
            if (!updated[0]) throw new Error('Contract not found or not in draft status');
            output = updated[0] as Record<string, unknown>;
          } else if (action === 'sign') {
            const contractId = String(cfg.contractId ?? '');
            if (!contractId) throw new Error('contracts sign requires config.contractId');
            const { rows: signed } = await this.db.execute(
              `UPDATE contracts
               SET status = 'signed', signed_at = NOW(), signed_by = $3, updated_at = NOW()
               WHERE id = $1 AND user_id = $2
               RETURNING *`,
              [contractId, userId, String(cfg.signedBy ?? 'workflow-bot')]
            );
            if (!signed[0]) throw new Error('Contract not found');
            output = signed[0] as Record<string, unknown>;
          } else if (action === 'stats') {
            const [byStatus, totalValue] = await Promise.all([
              this.db.execute<{ status: string; count: string }>(
                'SELECT status, COUNT(*) FROM contracts WHERE user_id = $1 GROUP BY status',
                [userId]
              ),
              this.db.execute<{ total: string }>(
                `SELECT COALESCE(SUM(value), 0) AS total FROM contracts
                 WHERE user_id = $1 AND status = 'signed'`,
                [userId]
              ),
            ]);
            output = {
              byStatus: Object.fromEntries(byStatus.rows.map((r) => [r.status, parseInt(r.count, 10)])),
              totalSignedValue: parseFloat(totalValue.rows[0].total),
            };
          } else {
            output = { skipped: true, reason: `Unsupported contracts action '${action}'` };
          }
        } else if (moduleSlug === 'analytics') {
          if (action === 'track') {
            await this.db.execute(
              `INSERT INTO analytics_events (user_id, event_name, properties, session_id, ip_address, user_agent)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                userId,
                String(cfg.eventName ?? 'workflow_event'),
                JSON.stringify((cfg.properties ?? { chainId: id, step: stepName }) as Record<string, unknown>),
                cfg.sessionId ? String(cfg.sessionId) : null,
                'workflow-chain',
                'workflow-chain',
              ]
            );
            output = { tracked: true };
          } else if (action === 'dashboard') {
            const days = Math.min(Number(cfg.rangeDays ?? 30), 365);
            const [taskStats, eventCounts, topEvents] = await Promise.all([
              this.db.execute<{ status: string; count: string }>(
                `SELECT status, COUNT(*) FROM tasks
                 WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
                 GROUP BY status`,
                [userId]
              ),
              this.db.execute<{ date: string; count: string }>(
                `SELECT DATE(created_at) AS date, COUNT(*) AS count
                 FROM analytics_events
                 WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
                 GROUP BY DATE(created_at)
                 ORDER BY date`,
                [userId]
              ),
              this.db.execute<{ event_name: string; count: string }>(
                `SELECT event_name, COUNT(*) FROM analytics_events
                 WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'
                 GROUP BY event_name ORDER BY count DESC LIMIT 10`,
                [userId]
              ),
            ]);
            output = {
              period: `${days} days`,
              tasks: { byStatus: Object.fromEntries(taskStats.rows.map((r) => [r.status, parseInt(r.count, 10)])) },
              events: {
                daily: eventCounts.rows.map((r) => ({ date: r.date, count: parseInt(r.count, 10) })),
                top: topEvents.rows.map((r) => ({ name: r.event_name, count: parseInt(r.count, 10) })),
              },
            };
          } else {
            output = { skipped: true, reason: `Unsupported analytics action '${action}'` };
          }
        } else if (moduleSlug === 'automation') {
          if (action === 'create-workflow') {
            const { rows: created } = await this.db.execute(
              `INSERT INTO tasks (user_id, type, name, description, status, payload)
               VALUES ($1, 'workflow_template', $2, $3, 'pending', $4)
               RETURNING *`,
              [
                userId,
                String(cfg.name ?? `WF Template ${Date.now()}`),
                cfg.description ? String(cfg.description) : null,
                JSON.stringify({
                  triggerType: String(cfg.triggerType ?? 'manual'),
                  triggerConfig: (cfg.triggerConfig ?? {}) as Record<string, unknown>,
                  steps: Array.isArray(cfg.steps) ? cfg.steps : [],
                  isActive: Boolean(cfg.isActive ?? true),
                }),
              ]
            );
            output = created[0] as Record<string, unknown>;
          } else if (action === 'run-workflow') {
            const templateId = String(cfg.workflowId ?? '');
            if (!templateId) throw new Error('automation run-workflow requires config.workflowId');
            const { rows: wfRows } = await this.db.execute(
              `SELECT id, name, payload FROM tasks
               WHERE id = $1 AND user_id = $2 AND type = 'workflow_template'`,
              [templateId, userId]
            );
            if (!wfRows[0]) throw new Error('Workflow template not found');
            const context = (cfg.context ?? input) as Record<string, unknown>;
            const { rows: exec } = await this.db.execute(
              `INSERT INTO tasks (user_id, type, name, status, payload, parent_task_id)
               VALUES ($1, 'workflow_execution', $2, 'completed', $3, $4)
               RETURNING id, status, created_at`,
              [
                userId,
                `Execution: ${String((wfRows[0] as Record<string, unknown>).name)}`,
                JSON.stringify({ workflowId: templateId, context, simulated: true }),
                templateId,
              ]
            );
            output = { execution: exec[0] };
          } else {
            output = { skipped: true, reason: `Unsupported automation action '${action}'` };
          }
        } else if (moduleSlug === 'scraper') {
          if (action === 'queue-scrape') {
            const url = assertValidQueueScrapeUrl(cfg.url);
            const { rows: created } = await this.db.execute(
              `INSERT INTO tasks (user_id, type, name, status, payload)
               VALUES ($1, 'scrape_url', $2, 'queued', $3)
               RETURNING id, status, created_at`,
              [userId, `Scrape: ${url}`, JSON.stringify({ url, selectors: cfg.selectors ?? {} })]
            );
            output = { job: created[0] };
          } else if (action === 'jobs') {
            const { rows: jobs } = await this.db.execute(
              `SELECT id, name, status, created_at, completed_at, (payload->>'url') AS url
               FROM tasks
               WHERE user_id = $1 AND type IN ('scrape_url', 'bulk_scrape')
               ORDER BY created_at DESC
               LIMIT $2`,
              [userId, Number(cfg.limit ?? 20)]
            );
            output = { count: jobs.length, jobs };
          } else {
            output = { skipped: true, reason: `Unsupported scraper action '${action}'` };
          }
        } else if (moduleSlug === 'users') {
          if (action === 'profile') {
            const { rows } = await this.db.execute(
              `SELECT id, email, name, role, is_active, is_email_verified, last_login_at, created_at
               FROM users WHERE id = $1`,
              [userId]
            );
            output = rows[0] as Record<string, unknown>;
          } else if (action === 'stats') {
            const [tasksCount, paymentsCount, apiKeysCount] = await Promise.all([
              this.db.execute<{ count: string }>('SELECT COUNT(*) AS count FROM tasks WHERE user_id = $1', [userId]),
              this.db.execute<{ count: string }>('SELECT COUNT(*) AS count FROM payments WHERE user_id = $1', [userId]),
              this.db.execute<{ count: string }>('SELECT COUNT(*) AS count FROM api_keys WHERE user_id = $1 AND is_active = true', [userId]),
            ]);
            output = {
              tasks: parseInt(tasksCount.rows[0].count, 10),
              payments: parseInt(paymentsCount.rows[0].count, 10),
              apiKeys: parseInt(apiKeysCount.rows[0].count, 10),
            };
          } else {
            output = { skipped: true, reason: `Unsupported users action '${action}'` };
          }
        } else if (moduleSlug === 'admin') {
          if (action === 'overview') {
            const [users, subscriptions, payments, tasks] = await Promise.all([
              this.db.execute<{ count: string; active: string }>(
                `SELECT COUNT(*) AS count, SUM(CASE WHEN is_active THEN 1 ELSE 0 END) AS active FROM users`
              ),
              this.db.execute<{ count: string; active: string }>(
                `SELECT COUNT(*) AS count, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active FROM subscriptions`
              ),
              this.db.execute<{ count: string; total_revenue: string }>(
                `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total_revenue
                 FROM payments WHERE status = 'completed'`
              ),
              this.db.execute<{ count: string; failed: string }>(
                `SELECT COUNT(*) AS count, SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed FROM tasks`
              ),
            ]);
            output = {
              users: { total: parseInt(users.rows[0].count, 10), active: parseInt(users.rows[0].active || '0', 10) },
              subscriptions: { total: parseInt(subscriptions.rows[0].count, 10), active: parseInt(subscriptions.rows[0].active || '0', 10) },
              payments: { total: parseInt(payments.rows[0].count, 10), totalRevenue: parseFloat(payments.rows[0].total_revenue) },
              tasks: { total: parseInt(tasks.rows[0].count, 10), failed: parseInt(tasks.rows[0].failed || '0', 10) },
            };
          } else if (action === 'health') {
            const dbStart = Date.now();
            let dbOk = false;
            try {
              await this.db.execute('SELECT 1');
              dbOk = true;
            } catch {
              dbOk = false;
            }
            output = {
              status: dbOk ? 'healthy' : 'degraded',
              database: { ok: dbOk, latencyMs: Date.now() - dbStart },
              uptime: process.uptime(),
              timestamp: new Date().toISOString(),
            };
          } else {
            output = { skipped: true, reason: `Unsupported admin action '${action}'` };
          }
        } else {
          output = { skipped: true, reason: `Unsupported moduleSlug '${moduleSlug}'` };
        }
          if (attempt > 1) {
            output = {
              ...output,
              retry: {
                attempts: attempt,
                retries: attempt - 1,
                errors: retryErrors,
              },
            };
          }
          break;
        } catch (error) {
          status = 'failed';
          const msg = error instanceof Error ? error.message : 'Unknown workflow error';
          retryErrors.push(msg);
          if (attempt < retryAttempts) {
            if (retryDelayMs > 0) {
              await this.sleep(retryDelayMs);
            }
            continue;
          }
          output = {
            error: msg,
            retry: {
              attempts: attempt,
              retries: Math.max(0, attempt - 1),
              errors: retryErrors,
            },
          };
        }
      }

      await this.db.execute(
        `INSERT INTO audit_events
         (actor_user_id, event_type, entity_type, entity_id, severity, payload)
         VALUES ($1, 'workflow_step_executed', 'workflow_chain', $2, $3, $4)`,
        [
          userId,
          id,
          status === 'ok' ? 'info' : 'error',
          JSON.stringify({
            timestamp: new Date().toISOString(),
            workflowId: id,
            step: stepName,
            moduleSlug,
            action,
            status,
            output,
          }),
        ]
      );
      stepResults.push({ step: stepName, moduleSlug, action, status, output });

      if (status === 'failed' && cfg.continueOnError !== true) {
        break;
      }
    }

    const finalStatus = stepResults.some((s) => s.status === 'failed') ? 'failed' : 'completed';
    const resultPayload = {
      workflowId: id,
      id: executionTaskId,
      executionTaskId,
      status: finalStatus,
      templateKey: templateKey ?? null,
      template: {
        key: templateKey ?? null,
      },
      executedSteps: stepResults.length,
      steps: stepResults,
      input,
      output: {
        status: finalStatus === 'completed' ? 'ok' : 'failed',
        processedAt: new Date().toISOString(),
        steps: stepResults,
      },
    };
    await this.db.execute(
      `UPDATE tasks
       SET status = $2,
           result = $3,
           payload = $4,
           completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [
        executionTaskId,
        finalStatus,
        JSON.stringify(resultPayload.output),
        JSON.stringify({
          workflowId: id,
          workflowName: String(chain.name ?? id),
          templateKey: templateKey ?? null,
          id: executionTaskId,
          template: {
            key: templateKey ?? null,
          },
          status: finalStatus,
          output: resultPayload.output,
          steps: stepResults,
          input,
          totalSteps: steps.length,
          startedAt: startedAt.toISOString(),
        }),
      ]
    );
    await this.repo.touchRun(id);
    return resultPayload;
  }
}
