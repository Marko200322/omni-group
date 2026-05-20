import bcrypt from 'bcryptjs';
import { query, closePool, testConnection } from '../connection';
import logger from '../../utils/logger';
import { config } from '../../config';

async function seedPlans(): Promise<void> {
  logger.info('Seeding plans...');

  const plans = [
    {
      name: 'Starter',
      slug: 'starter',
      description: 'Perfect for individuals and small projects',
      price_monthly: 9.99,
      price_yearly: 99.00,
      is_popular: false,
      sort_order: 1,
      features: {
        api_access: true,
        email_support: true,
        basic_analytics: true,
        crm: false,
        automation: false,
        scraper: false,
        white_label: false,
        custom_integrations: false,
      },
      limits: {
        requests_per_month: 1000,
        tasks_per_month: 50,
        team_members: 1,
        storage_gb: 1,
        modules: ['auth', 'users', 'notifications'],
      },
    },
    {
      name: 'Pro',
      slug: 'pro',
      description: 'For growing teams and businesses',
      price_monthly: 49.99,
      price_yearly: 499.00,
      is_popular: true,
      sort_order: 2,
      features: {
        api_access: true,
        email_support: true,
        priority_support: true,
        advanced_analytics: true,
        crm: true,
        automation: true,
        scraper: true,
        white_label: false,
        custom_integrations: false,
        contracts: true,
      },
      limits: {
        requests_per_month: 25000,
        tasks_per_month: 500,
        team_members: 10,
        storage_gb: 25,
        modules: ['auth', 'users', 'notifications', 'crm', 'contracts', 'analytics', 'tasks', 'automation', 'scraper', 'craftor', 'omnitube', 'titanis', 'recommendation', 'package-pricing', 'digital-signature'],
      },
    },
    {
      name: 'Enterprise',
      slug: 'enterprise',
      description: 'Full power for large organizations',
      price_monthly: 199.99,
      price_yearly: 1999.00,
      is_popular: false,
      sort_order: 3,
      features: {
        api_access: true,
        email_support: true,
        priority_support: true,
        dedicated_support: true,
        advanced_analytics: true,
        crm: true,
        automation: true,
        scraper: true,
        white_label: true,
        custom_integrations: true,
        contracts: true,
        admin_dashboard: true,
        sso: true,
      },
      limits: {
        requests_per_month: -1, // unlimited
        tasks_per_month: -1,
        team_members: -1,
        storage_gb: 500,
        modules: 'all',
      },
    },
  ];

  for (const plan of plans) {
    await query(
      `INSERT INTO plans (name, slug, description, price_monthly, price_yearly, is_popular, sort_order, features, limits)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (slug) DO UPDATE SET
         price_monthly = EXCLUDED.price_monthly,
         price_yearly = EXCLUDED.price_yearly,
         features = EXCLUDED.features,
         limits = EXCLUDED.limits,
         updated_at = NOW()`,
      [
        plan.name, plan.slug, plan.description,
        plan.price_monthly, plan.price_yearly,
        plan.is_popular, plan.sort_order,
        JSON.stringify(plan.features),
        JSON.stringify(plan.limits),
      ]
    );
  }

  logger.info('Plans seeded');
}

async function seedModules(): Promise<void> {
  logger.info('Seeding modules...');

  const modules = [
    { name: 'Authentication', slug: 'auth', description: 'User authentication and authorization', is_core: true, required_plan: null },
    { name: 'User Management', slug: 'users', description: 'User profile and settings management', is_core: true, required_plan: null },
    { name: 'Notifications', slug: 'notifications', description: 'In-app and email notifications', is_core: true, required_plan: null },
    { name: 'Billing', slug: 'billing', description: 'Subscription and payment management', is_core: true, required_plan: null },
    { name: 'CRM', slug: 'crm', description: 'Contact and customer relationship management', is_core: false, required_plan: 'pro' },
    { name: 'Contracts', slug: 'contracts', description: 'Contract creation and management', is_core: false, required_plan: 'pro' },
    { name: 'Analytics', slug: 'analytics', description: 'Business intelligence and analytics', is_core: false, required_plan: 'pro' },
    { name: 'Tasks', slug: 'tasks', description: 'Task and job management system', is_core: false, required_plan: 'pro' },
    { name: 'Automation', slug: 'automation', description: 'Workflow and process automation', is_core: false, required_plan: 'pro' },
    { name: 'Web Scraper', slug: 'scraper', description: 'Web scraping and data extraction', is_core: false, required_plan: 'pro' },
    { name: 'Titan Master', slug: 'titan-master', description: 'Core orchestration and strategic decision engine', is_core: false, required_plan: 'enterprise' },
    { name: 'Titanis Sales Engine', slug: 'titanis', description: 'Lead generation, follow-up and close engine', is_core: false, required_plan: 'pro' },
    { name: 'Titanix Execution Engine', slug: 'titanix', description: 'Execution pipelines and job orchestration engine', is_core: false, required_plan: 'enterprise' },
    { name: 'Titan Monitor', slug: 'titan-monitor', description: 'Operational monitoring and system diagnostics', is_core: true, required_plan: null },
    { name: 'Phase Launch', slug: 'phase-launch', description: 'Centralized v1-v6 phase activation control', is_core: true, required_plan: null },
    { name: 'Resource Management', slug: 'resource-management', description: 'Budget, allocation and utilization control', is_core: true, required_plan: null },
    { name: 'KPI Module', slug: 'kpi', description: 'Executive KPI dashboard and business health metrics', is_core: true, required_plan: null },
    { name: 'AI Learning & Memory', slug: 'ai-memory', description: 'Long-term memory context and AI signal storage', is_core: false, required_plan: 'enterprise' },
    { name: 'Recommendation Module', slug: 'recommendation', description: 'Action recommendations and optimization guidance', is_core: false, required_plan: 'pro' },
    { name: 'Backup & Recovery', slug: 'backup-recovery', description: 'Disaster recovery snapshots and restore orchestration', is_core: true, required_plan: null },
    { name: 'Integration Hub', slug: 'integration-hub', description: 'External platform connectors and synchronization', is_core: true, required_plan: null },
    { name: 'Load Balancer', slug: 'load-balancer', description: 'Node routing and workload balancing control', is_core: true, required_plan: null },
    { name: 'Compliance', slug: 'compliance', description: 'Compliance controls, audit evidence, and status records', is_core: true, required_plan: null },
    { name: 'GDPR', slug: 'gdpr', description: 'Data subject requests for export/delete/rectify', is_core: true, required_plan: null },
    { name: 'System Updater', slug: 'system-updater', description: 'Version rollout queue and update tracking', is_core: true, required_plan: null },
    { name: 'API Gateway', slug: 'api-gateway', description: 'Central routing and proxy layer for module APIs', is_core: true, required_plan: null },
    { name: 'Audit Log', slug: 'audit-log', description: 'Immutable audit trail for critical actions and entities', is_core: true, required_plan: null },
    { name: 'Self-Healing Supervisor', slug: 'self-healing', description: 'Automated issue detection and remediation tracking', is_core: true, required_plan: null },
    { name: 'Workflow Chain', slug: 'workflow-chain', description: 'Cross-module orchestration and chained execution layer', is_core: true, required_plan: null },
    { name: 'Dominus360', slug: 'dominus360', description: 'Risk prediction and resource intelligence workspace', is_core: false, required_plan: 'enterprise' },
    { name: 'Craftor', slug: 'craftor', description: 'V7 universal AI OS for freelance platforms (hunting, proposals, anti-detection)', is_core: false, required_plan: 'pro' },
    { name: 'Package Pricing', slug: 'package-pricing', description: 'Tier listing, price adjustments, and bundle modeling for offers', is_core: false, required_plan: 'pro' },
    { name: 'Digital Signature', slug: 'digital-signature', description: 'E-signature request, reminder, and verification flows', is_core: false, required_plan: 'pro' },
    { name: 'OmniTube', slug: 'omnitube', description: 'Content pipeline for automated video channels', is_core: false, required_plan: 'pro' },
    { name: 'OmniGame', slug: 'omnigame', description: 'AI-assisted game project pipeline and validation', is_core: false, required_plan: 'enterprise' },
    { name: 'Apex Predator', slug: 'apex-predator', description: 'High-intensity monetization and retention engine', is_core: false, required_plan: 'enterprise' },
    { name: 'Admin Panel', slug: 'admin', description: 'Platform administration tools', is_core: true, required_plan: null },
    { name: 'Subscriptions', slug: 'subscriptions', description: 'Subscription lifecycle management', is_core: true, required_plan: null },
    { name: 'Payments', slug: 'payments', description: 'Multi-provider payment processing', is_core: true, required_plan: null },
  ];

  for (const mod of modules) {
    await query(
      `INSERT INTO modules (name, slug, description, is_core, required_plan)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         updated_at = NOW()`,
      [mod.name, mod.slug, mod.description, mod.is_core, mod.required_plan]
    );
  }

  logger.info('Modules seeded');
}

async function seedAdmin(): Promise<void> {
  logger.info('Seeding admin user...');

  const { rows: starterPlan } = await query<{ id: string }>(
    'SELECT id FROM plans WHERE slug = $1', ['starter']
  );

  const passwordHash = await bcrypt.hash(config.admin.password, 12);

  await query(
    `INSERT INTO users (email, password_hash, name, role, is_email_verified, plan_id)
     VALUES ($1, $2, $3, 'admin', true, $4)
     ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name,
       role = EXCLUDED.role,
       updated_at = NOW()`,
    [config.admin.email, passwordHash, config.admin.name, starterPlan[0]?.id || null]
  );

  logger.info(`Admin user seeded: ${config.admin.email}`);
}

async function runSeeds(): Promise<void> {
  const connected = await testConnection();
  if (!connected) {
    logger.error('Cannot connect to database. Aborting seeds.');
    process.exit(1);
  }

  try {
    await seedPlans();
    await seedModules();
    await seedAdmin();
    logger.info('All seeds completed successfully');
  } catch (error) {
    logger.error('Seed runner failed', { error });
    throw error;
  } finally {
    await closePool();
  }
}

runSeeds().catch((err) => {
  logger.error('Seed runner crashed', { error: err });
  process.exit(1);
});
