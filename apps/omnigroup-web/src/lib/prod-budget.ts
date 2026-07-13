/** Operational monthly budget (excludes VPS + domain). */

export function getMonthlyBudgetEur(): number {
  const raw = process.env.NEXT_PUBLIC_MONTHLY_BUDGET_EUR?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 200;
  if (!Number.isFinite(n) || n < 50) return 200;
  return n;
}

export function isBudgetLaunchMode(): boolean {
  return getMonthlyBudgetEur() <= 250;
}

/** Suggested allocation for owner planning (not enforced in code). */
export function getBudgetAllocationHint(): { label: string; eur: number }[] {
  const total = getMonthlyBudgetEur();
  if (total <= 200) {
    return [
      { label: 'OpenRouter AI (fulfillment + admin)', eur: 35 },
      { label: 'Resend / email', eur: 0 },
      { label: 'Fulfillment buffer (per client API)', eur: 50 },
      { label: 'Optional marketing (LinkedIn)', eur: 30 },
      { label: 'Reserve', eur: total - 115 },
    ];
  }
  return [{ label: 'Operational pool', eur: total }];
}
