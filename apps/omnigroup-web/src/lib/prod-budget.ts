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
  if (total <= 600) {
    const openRouter = Math.min(120, Math.floor(total * 0.22));
    const fixed = 20 + openRouter + 25 + 45 + 20; // Resend Pro + AI + Apify + Hunter + NeverBounce
    return [
      { label: 'Resend Pro (kontakt + marketing domen)', eur: 20 },
      { label: 'OpenRouter AI (isporuke + draftovi)', eur: openRouter },
      { label: 'Apify (dnevni hunt)', eur: 25 },
      { label: 'Hunter (Starter kad free nestane)', eur: 45 },
      { label: 'NeverBounce (kad outbound send ON)', eur: 20 },
      { label: 'Buffer / isporuke', eur: Math.max(0, total - fixed) },
    ];
  }
  return [{ label: 'Operational pool', eur: total }];
}
