/** Production spend profile — derived from factory phase + NEXT_PUBLIC_PROD_MODE. */
import { getFactoryPhase } from './factory-phase';

export type ProdMode = 'lean' | 'full';

export function getProdMode(): ProdMode {
  const raw = process.env.NEXT_PUBLIC_PROD_MODE?.trim().toLowerCase();
  return raw === 'full' ? 'full' : 'lean';
}

/** True when factory is below M6 or web prod mode is lean. */
export function isLeanProdMode(): boolean {
  return getFactoryPhase() !== 'M6' || getProdMode() === 'lean';
}
