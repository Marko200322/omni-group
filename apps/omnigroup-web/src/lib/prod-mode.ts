/** Production spend profile — from NEXT_PUBLIC_PROD_MODE (deploy.config prodMode). */
export type ProdMode = 'lean' | 'full';

export function getProdMode(): ProdMode {
  const raw = process.env.NEXT_PUBLIC_PROD_MODE?.trim().toLowerCase();
  return raw === 'full' ? 'full' : 'lean';
}

/** True only when web is explicitly in lean spend profile — not merely "below M6". */
export function isLeanProdMode(): boolean {
  return getProdMode() === 'lean';
}
