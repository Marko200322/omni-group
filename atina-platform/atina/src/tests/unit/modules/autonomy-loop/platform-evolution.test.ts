import fs from 'fs';
import os from 'os';
import path from 'path';
import { syncGeneratedVerticalsIndexFromDb } from '../../../../modules/autonomy-loop/service/platform-evolution-catalog-sync.service';
import { PlatformEvolutionCodeService } from '../../../../modules/autonomy-loop/service/platform-evolution-code.service';

jest.mock('../../../../config', () => ({
  config: {
    autonomy: {
      evolutionCodeEditEnabled: true,
      gitRepoPath: '',
      webGeneratedIndexPath: '',
    },
  },
}));

jest.mock('../../../../database/connection', () => ({
  query: jest.fn().mockResolvedValue({
    rows: [
      {
        slug: 'dev-it-react',
        has_page: true,
        has_outreach: true,
        updated_at: new Date('2026-06-01T12:00:00Z'),
      },
    ],
  }),
}));

describe('platform-evolution-code.service', () => {
  it('appends evolution log for research_gap', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'evo-'));
    const rel = 'atina-platform/atina/docs/operations/EVOLUTION-AGENT-LOG.md';
    const file = path.join(root, ...rel.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });

    jest.resetModules();
    jest.doMock('../../../../config', () => ({
      config: {
        autonomy: {
          evolutionCodeEditEnabled: true,
          gitRepoPath: root,
          webGeneratedIndexPath: '',
        },
      },
    }));

    const { PlatformEvolutionCodeService: Svc } = require('../../../../modules/autonomy-loop/service/platform-evolution-code.service');
    const svc = new Svc() as PlatformEvolutionCodeService;
    const result = svc.apply('research_gap', ['ui/kpi']);

    expect(result.applied).toBe(true);
    expect(fs.readFileSync(file, 'utf8')).toContain('research_gap');
  });

  it('skips ui_improvement when freelance KPI already present', () => {
    const svc = new PlatformEvolutionCodeService();
    const result = svc.apply('ui_improvement', ['AutonomyLoopPanel']);
    expect(result.applied).toBe(false);
    expect(result.notes.some((n) => n.includes('Freelance KPI') || n.includes('not found'))).toBe(true);
  });
});

describe('platform-evolution-catalog-sync.service', () => {
  it('exports index payload from postgres', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'evo-index-'));
    const out = path.join(tmp, 'generated-verticals-index.json');

    jest.resetModules();
    jest.doMock('../../../../config', () => ({
      config: {
        autonomy: {
          gitRepoPath: '',
          webGeneratedIndexPath: out,
        },
      },
    }));

    const { syncGeneratedVerticalsIndexFromDb: sync } = require('../../../../modules/autonomy-loop/service/platform-evolution-catalog-sync.service');
    const result = await sync();

    expect(result.count).toBe(1);
    expect(result.written).toBe(true);
    const payload = JSON.parse(fs.readFileSync(out, 'utf8')) as { count: number; verticals: unknown[] };
    expect(payload.count).toBe(1);
    expect(payload.verticals).toHaveLength(1);
  });
});
