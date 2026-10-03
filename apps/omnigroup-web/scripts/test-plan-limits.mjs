/**
 * Documents what plan-limit enforcement actually exists.
 * Marketing SaaS plan limits must match DB seed keys (tasks_per_month / team_members / storage_gb).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(root, '../..');

function readRepo(rel) {
  return readFileSync(join(repo, rel), 'utf8');
}

const billing = readRepo('atina-platform/atina/src/modules/billing/service/billing.service.ts');
const tasks = readRepo('atina-platform/atina/src/modules/tasks/service/tasks.service.ts');
const seed = readRepo('atina-platform/atina/src/database/seeds/001_seed_data.ts');
const saasPlans = readFileSync(join(root, 'src/lib/saas-plans.ts'), 'utf8');

assert(billing.includes("if (limitKey === 'tasks_per_month')"), 'checkPlanLimit must count tasks');
assert(
  tasks.includes('PlanLimitError') || tasks.includes('checkPlanLimit') || tasks.includes('tasks_per_month'),
  'Task create must consult plan limits',
);
assert(seed.includes('tasks_per_month'), 'seed must define tasks_per_month');
assert(seed.includes('team_members'), 'seed must define team_members');
assert(saasPlans.includes('tasksPerMonth'), 'public saas-plans must expose tasksPerMonth (seed-aligned)');
assert(saasPlans.includes('teamMembers'), 'public saas-plans must expose teamMembers (seed-aligned)');
assert(saasPlans.includes('storageGb'), 'public saas-plans must expose storageGb (seed-aligned)');
assert(!saasPlans.includes('workspaces:'), 'public saas-plans must not claim workspaces limits (not enforced)');
assert(!saasPlans.includes('contacts:'), 'public saas-plans must not claim contacts limits (not enforced)');

console.log(
  'test-plan-limits: ok — marketing limits aligned to seed keys (tasks/team/storage); tasks_per_month enforced in billing/tasks',
);
