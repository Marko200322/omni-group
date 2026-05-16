import { WorkflowChainService } from '../../modules/workflow-chain/service/workflow-chain.service';

const phaseOrder: Record<string, number> = {
  v1: 1,
  v2: 2,
  v3: 3,
  v4: 4,
  v5: 5,
  v6: 6,
};

const moduleMinPhase: Record<string, string> = {
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

describe('WorkflowChain templates', () => {
  it('lists templates without duplicated keys or names', () => {
    const service = new WorkflowChainService();
    const templates = service.listTemplates();

    const keys = templates.map((tpl) => tpl.key);
    const names = templates.map((tpl) => tpl.name);

    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it('uses normalized analytics completion events without clashes', async () => {
    const service = new WorkflowChainService();
    const templates = service.listTemplates();
    const seenEventNames = new Set<string>();

    for (const template of templates) {
      const preview = await service.previewTemplate(template.key);
      const analyticsTrackSteps = preview.steps.filter(
        (step) => String(step.moduleSlug ?? '') === 'analytics' && String(step.action ?? '') === 'track'
      );

      for (let i = 0; i < analyticsTrackSteps.length; i += 1) {
        const eventName = String(
          ((analyticsTrackSteps[i].config as { eventName?: unknown } | undefined)?.eventName ?? '')
        );
        const expectedBase = `workflow_template_${template.key.replace(/-/g, '_')}_completed`;

        expect(eventName).toBeTruthy();
        expect(eventName === expectedBase || eventName.startsWith(`${expectedBase}_`)).toBe(true);
        expect(seenEventNames.has(eventName)).toBe(false);
        seenEventNames.add(eventName);
      }
    }
  });

  it('keeps minPhase aligned with module requirements for every template', async () => {
    const service = new WorkflowChainService();
    const templates = service.listTemplates();

    for (const template of templates) {
      const preview = await service.previewTemplate(template.key);
      let requiredOrdinal = 1;

      for (const step of preview.steps) {
        const moduleSlug = String(step.moduleSlug ?? '');
        const minPhase = moduleMinPhase[moduleSlug];
        if (!minPhase) continue;
        requiredOrdinal = Math.max(requiredOrdinal, phaseOrder[minPhase] ?? 1);
      }

      const expectedPhase = `v${requiredOrdinal}`;
      expect(template.minPhase).toBe(expectedPhase);
    }
  });
});

