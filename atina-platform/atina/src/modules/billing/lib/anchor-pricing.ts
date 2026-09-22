/** Global launch discount on phase anchors — keep in sync with apps/omnigroup-web/src/lib/anchor-pricing.ts */
export function getGlobalAnchorMultiplier(): number {
  const raw =
    process.env.ANCHOR_MULTIPLIER?.trim() ??
    process.env.NEXT_PUBLIC_ANCHOR_MULTIPLIER?.trim() ??
    '1';
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 1.25) return 1;
  return n;
}

export function applyAnchorDiscount(anchorEur: number): number {
  if (anchorEur <= 0) return 0;
  return Math.max(1, Math.round(anchorEur * getGlobalAnchorMultiplier()));
}
