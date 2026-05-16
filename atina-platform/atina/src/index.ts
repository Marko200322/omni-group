import { CoreEngine } from './core/CoreEngine';
import logger from './utils/logger';

export async function main(): Promise<void> {
  const engine = new CoreEngine();

  try {
    await engine.initialize();
    await engine.start();
  } catch (error) {
    logger.error('Failed to start ATINA', { error });
    process.exit(1);
  }
}

/** When `entry` is the same module as `self`, schedule `main()` (used for CLI entry vs test imports). */
export function maybeStartProcess(entry: NodeModule, self: NodeModule): void {
  if (entry === self) {
    void main();
  }
}

maybeStartProcess(require.main as NodeModule, module);
