/**
 * Documents what plan-limit enforcement actually exists.
 * Does not invent workspaces/users/contacts enforcement.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

function readRepo(rel) {
  return readFileSync(join(repo, rel), 'utf8');
}
function assert(cond, message) {
  if (!cond) throw new Error(message);
}

const billing = readRepo('atina-platform/atina/src/modules/billing/service/billing.service.ts');
const tasks = readRepo('atina-platform/atina/src/modules/tasks/service/tasks.service.ts');
const aiMemory = readRepo('atina-platform/atina/src/modules/ai-memory/service/ai-memory.service.ts');
const webPlans = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'src/lib/saas-plans.ts'),
  'utf8',
);

assert(billing.includes("if (limitKey === 'tasks_per_month')"), 'checkPlanLimit must count tasks');
assert(tasks.includes('PlanLimitError') || tasks.includes('checkPlanLimit') || tasks.includes('tasks_per_month'), 'Task create must consult plan limits');
assert(aiMemory.includes('assertPlanIncludesModule'), 'AI memory must be module-gated');
assert(webPlans.includes("monthly: { EUR: 79, USD: 89 }"), 'Do not change Launch list prices');

if (!billing.includes('workspaces') && !billing.includes('team_members')) {
  console.log(
    'test-plan-limits: PARTIAL — tasks_per_month + AI memory gated; workspaces/users/contacts/API/RBAC/white-label not enforced in checkPlanLimit (NEEDS_IMPLEMENTATION / NEEDS_HUMAN_DECISION to align marketing limits with DB seed).',
  );
}

console.log('test-plan-limits: ok (documented partial enforcement)');
