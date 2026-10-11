import { runOmnitrixAudit } from '../../modules/billing/lib/omnitrix-spec';
import {
  runUltimatrixGate,
  parseM6AnchorsFromSource,
  SUPPORT_SOLVER_TASK_TYPES,
} from '../../modules/billing/lib/ultimatrix-gate';
import { PACKAGE_DELIVERY_SPECS } from '../../modules/billing/lib/package-delivery-spec';

describe('Ultimatrix — full-repo commercial readiness', () => {
  it('passes the Ultimatrix gate at M6 (0 failures)', () => {
    const report = runUltimatrixGate('M6');
    if (!report.ok) {
      // eslint-disable-next-line no-console
      console.error(
        'Ultimatrix failures:\n' + report.failures.map((f) => `- ${f.code}: ${f.detail}`).join('\n'),
      );
    }
    expect(report.failures).toEqual([]);
    expect(report.ok).toBe(true);
    expect(report.packageCount).toBeGreaterThanOrEqual(20);
    expect(report.omnitrixWeak).toBe(0);
    expect(report.commercialContractsOk).toBe(true);
    expect(report.supportSolverWired).toBe(true);
    expect(report.introPromoOk).toBe(true);
  });

  it('OmniTrix audit has no WEAK and full checklist coverage at M6', () => {
    const audit = runOmnitrixAudit('M6');
    expect(audit.weak).toBe(0);
    const missing = audit.rows.filter((r) => !r.contractCoverageOk);
    expect(missing).toEqual([]);
  });

  it('every delivery SKU has a positive M6 list price', () => {
    for (const spec of PACKAGE_DELIVERY_SPECS) {
      expect(spec.anchorByPhase.M6).toBeGreaterThan(0);
    }
  });

  it('support solver task types are the three ticket/ops channels', () => {
    expect([...SUPPORT_SOLVER_TASK_TYPES].sort()).toEqual(
      ['ai_support_ops', 'support_automation', 'support_ticket'].sort(),
    );
  });

  it('parses M6 anchors from package-delivery-spec source shape', () => {
    const sample = `
export const PACKAGE_DELIVERY_SPECS = [
  { deliverableId: 'setup-quick', anchorByPhase: { M0: 349, M6: 549 } },
  { deliverableId: 'audit', anchorByPhase: { M6: 790 } },
];
`;
    const map = parseM6AnchorsFromSource(sample);
    expect(map.get('setup-quick')).toBe(549);
    expect(map.get('audit')).toBe(790);
  });
});
