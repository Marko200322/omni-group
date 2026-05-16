import { config } from '../../config';
import { WorkflowChainService } from '../../modules/workflow-chain/service/workflow-chain.service';

jest.mock('../../database/connection', () => ({
  query: jest.fn().mockResolvedValue({ rows: [{ config: { current_phase: 'v6' } }] }),
}));

/** Steps that use `supportedActions` entries and `isModuleFeatureEnabled` in `WorkflowChainService.validate`. */
const GATED_MODULES = [
  { moduleSlug: 'crm', action: 'stats', step: 'crm-stats', flag: 'crm' },
  { moduleSlug: 'analytics', action: 'track', step: 'analytics-track', flag: 'analytics' },
  { moduleSlug: 'scraper', action: 'jobs', step: 'scraper-jobs', flag: 'scraper' },
  { moduleSlug: 'automation', action: 'run-workflow', step: 'automation-run', flag: 'automation' },
] as const;

describe('WorkflowChainService feature flags', () => {
  describe.each(GATED_MODULES)(
    'gated module $moduleSlug',
    ({ moduleSlug, action, step, flag }) => {
      let getSpy: jest.SpiedFunction<WorkflowChainService['get']>;

      beforeEach(() => {
        getSpy = jest.spyOn(WorkflowChainService.prototype, 'get').mockResolvedValue({
          name: 'flag-test',
          status: 'active',
          chain_definition: [{ moduleSlug, action, step }],
        } as never);
      });

      afterEach(() => {
        getSpy.mockRestore();
      });

      it(`validate reports ${moduleSlug} disabled when ${flag} flag is off`, async () => {
        const prev = config.features[flag];
        config.features[flag] = false;
        try {
          const svc = new WorkflowChainService();
          const result = await svc.validate('u1', 'wf-1');
          expect(result.valid).toBe(false);
          expect(
            result.issues.some((i) => String(i.reason).includes('disabled by server configuration'))
          ).toBe(true);
        } finally {
          config.features[flag] = prev;
        }
      });

      it(`validate has no feature-disable issue for ${moduleSlug} when ${flag} flag is on`, async () => {
        const prev = config.features[flag];
        config.features[flag] = true;
        try {
          const svc = new WorkflowChainService();
          const result = await svc.validate('u1', 'wf-1');
          expect(
            result.issues.filter((i) => String(i.reason).includes('disabled by server configuration'))
          ).toHaveLength(0);
        } finally {
          config.features[flag] = prev;
        }
      });
    }
  );
});
