import { ValidationError } from '../../../utils/errors';
import { getFactoryPhase } from './factory-phase';
import { isFactoryModuleEnabled, type FactoryModuleKey } from './factory-phase-runtime';

export function assertFactoryModule(module: FactoryModuleKey, detail?: string): void {
  const phase = getFactoryPhase();
  if (!isFactoryModuleEnabled(module, phase)) {
    throw new ValidationError(
      detail ??
        `Factory module "${module}" is not enabled at phase ${phase}. Bump FACTORY_PHASE and redeploy.`,
    );
  }
}

export function factoryModuleDisabledReason(module: FactoryModuleKey): string | null {
  if (isFactoryModuleEnabled(module)) return null;
  return `Disabled at factory phase ${getFactoryPhase()} (${module})`;
}
