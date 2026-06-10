import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { config } from '../../../config';
import type { PlatformEvolutionTaskType } from './platform-evolution.service';

const ALLOWED_PREFIXES = [
  'apps/omnigroup-web/src/',
  'atina-platform/atina/scripts/',
  'atina-platform/atina/docs/operations/',
];

export type CodeEditResult = {
  applied: boolean;
  filesTouched: string[];
  notes: string[];
};

function repoRoot(): string {
  if (config.autonomy.gitRepoPath?.trim()) {
    return path.resolve(config.autonomy.gitRepoPath);
  }
  return path.resolve(process.cwd(), '..', '..');
}

function isAllowed(relativePath: string): boolean {
  const norm = relativePath.replace(/\\/g, '/');
  return ALLOWED_PREFIXES.some((p) => norm.startsWith(p));
}

/** Bezbedne, idempotentne izmene u monorepo-u (E3 evolution agent). */
export class PlatformEvolutionCodeService {
  isEnabled(): boolean {
    return config.autonomy.evolutionCodeEditEnabled;
  }

  apply(taskType: PlatformEvolutionTaskType, targetPaths: string[]): CodeEditResult {
    if (!this.isEnabled()) {
      return { applied: false, filesTouched: [], notes: ['AUTONOMY_EVOLUTION_CODE_EDIT=false'] };
    }

    switch (taskType) {
      case 'ui_improvement':
        return this.ensureFreelanceKpiInAutonomyPanel(targetPaths);
      case 'research_gap':
        return this.appendEvolutionLog(taskType, targetPaths);
      case 'test_fix':
        return this.runUnitTests();
      default:
        return { applied: false, filesTouched: [], notes: [`No code handler for ${taskType}`] };
    }
  }

  private ensureFreelanceKpiInAutonomyPanel(targetPaths: string[]): CodeEditResult {
    const root = repoRoot();
    const rel = 'apps/omnigroup-web/src/components/platform/AutonomyLoopPanel.tsx';
    const file = path.join(root, rel);
    if (!isAllowed(rel) || !fs.existsSync(file)) {
      return { applied: false, filesTouched: [], notes: ['AutonomyLoopPanel not found'] };
    }
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('freelanceReadyCount')) {
      return { applied: false, filesTouched: [], notes: ['Freelance KPI already present'] };
    }
    const needle = '{rollout?.completedCategories ?? 0}/{rollout?.totalCategories ?? 50} spremno';
    if (!content.includes(needle)) {
      return { applied: false, filesTouched: [], notes: ['Rollout KPI anchor not found', ...targetPaths] };
    }
    const insert = `{rollout?.completedCategories ?? 0}/{rollout?.totalCategories ?? 50} spremno
            {typeof rollout?.freelanceReadyCount === 'number' ? (
              <span className="ml-2 text-violet-300/90">
                · online {rollout.freelanceReadyCount}/{rollout.freelanceCategories ?? 25}
              </span>
            ) : null}`;
    const next = content.replace(needle, insert);
    fs.writeFileSync(file, next, 'utf8');
    return { applied: true, filesTouched: [file], notes: ['Added freelanceReadyCount KPI to AutonomyLoopPanel'] };
  }

  private appendEvolutionLog(taskType: string, targetPaths: string[]): CodeEditResult {
    const root = repoRoot();
    const rel = 'atina-platform/atina/docs/operations/EVOLUTION-AGENT-LOG.md';
    const file = path.join(root, ...rel.split('/'));
    if (!isAllowed(rel)) {
      return { applied: false, filesTouched: [], notes: ['Log path not allowed'] };
    }
    const line = `- ${new Date().toISOString()} \`${taskType}\` targets: ${targetPaths.join(', ') || 'none'}\n`;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, '# Evolution agent log\n\n', 'utf8');
    }
    fs.appendFileSync(file, line, 'utf8');
    return { applied: true, filesTouched: [file], notes: ['Appended evolution log entry'] };
  }

  private runUnitTests(): CodeEditResult {
    const atinaRoot = path.join(repoRoot(), 'atina-platform', 'atina');
    if (!fs.existsSync(path.join(atinaRoot, 'package.json'))) {
      return { applied: false, filesTouched: [], notes: ['atina package.json missing'] };
    }
    execSync('npm run test:unit -- --testPathPatterns=platform-evolution', {
      cwd: atinaRoot,
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 180_000,
    });
    return { applied: true, filesTouched: [], notes: ['platform-evolution unit tests passed'] };
  }
}
