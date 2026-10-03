/**
 * Admin OMI answers for marketing metrics — queries real MarketingService only.
 * Labels ACTUAL / FORECAST / SCENARIO / UNAVAILABLE. Never invents numbers.
 */
export type MarketingOmiAnswer = {
  kind: 'ACTUAL' | 'FORECAST' | 'SCENARIO' | 'UNAVAILABLE' | 'RECOMMENDATION';
  question: string;
  answer: string;
  data?: Record<string, unknown>;
};

function match(q: string, ...parts: RegExp[]): boolean {
  return parts.every((p) => p.test(q));
}

export async function answerMarketingAdminQuestion(raw: string): Promise<MarketingOmiAnswer> {
  const q = (raw ?? '').trim();
  if (!q) {
    return { kind: 'UNAVAILABLE', question: q, answer: 'Empty question.' };
  }

  try {
    const { MarketingService } = await import('../service/marketing.service');
    const svc = new MarketingService();
    const overview = await svc.getOverview();
    const totals = overview.totals;

    if (match(q, /google/i, /košt|kost|cost|spend|potroš/i)) {
      const google = (overview.channels ?? []).find((c: { code: string }) => c.code === 'google_ads');
      const spend = google?.spendEur;
      if (spend === null || spend === undefined) {
        return {
          kind: 'UNAVAILABLE',
          question: q,
          answer: 'Google Ads spend: N/A — no ACTUAL spend entries for google_ads yet.',
        };
      }
      return {
        kind: 'ACTUAL',
        question: q,
        answer: `Google Ads ACTUAL spend so far: €${Number(spend).toFixed(2)} (from marketing_spend_entries).`,
        data: { channel: 'google_ads', spendEur: spend },
      };
    }

    if (match(q, /kanal|channel/i, /kupac|customer|klijent/i)) {
      const top = overview.topChannelCode;
      return {
        kind: overview.kind === 'ACTUAL' ? 'ACTUAL' : 'UNAVAILABLE',
        question: q,
        answer: top
          ? `Top spend channel (not necessarily best customers): ${top}. Customer counts by channel need attribution links — currently global customers=${totals.customers ?? 'N/A'}.`
          : 'No channel spend data yet. Customer attribution by channel: UNAVAILABLE.',
        data: { topChannelCode: top, customers: totals.customers },
      };
    }

    if (match(q, /cac|košta.*klijent|cost.*client|prosečn|prosjec/i)) {
      const cac = totals.cac;
      return {
        kind: cac === null || cac === undefined ? 'UNAVAILABLE' : 'ACTUAL',
        question: q,
        answer:
          cac === null || cac === undefined
            ? 'CAC: N/A — need ACTUAL marketing spend and collected customers (completed payments).'
            : `CAC (ACTUAL): €${Number(cac).toFixed(2)} = marketing spend / completed-payment customers.`,
        data: { cac, spendEur: totals.spendEur, customers: totals.customers },
      };
    }

    if (match(q, /linkedin/i, /paket|package|sku/i)) {
      return {
        kind: 'UNAVAILABLE',
        question: q,
        answer:
          'Package×LinkedIn conversion: UNAVAILABLE until campaigns carry package_sku and attributions link payments.',
      };
    }

    if (match(q, /zašto|zasto|why/i, /cac/i)) {
      return {
        kind: 'ACTUAL',
        question: q,
        answer:
          totals.cac == null
            ? 'Cannot explain CAC change — CAC itself is N/A (missing spend or customers).'
            : `Current CAC €${Number(totals.cac).toFixed(2)}. Rising CAC usually means spend up and/or customers down — check spend entries vs completed payments. This is OBSERVED aggregate, not a causal claim.`,
        data: { cac: totals.cac, spendEur: totals.spendEur, customers: totals.customers },
      };
    }

    if (match(q, /budžet|budget|€100|100 eur|google/i) && match(q, /poveć|povec|increase|what if|šta bi|sta bi/i)) {
      const scenario = await svc.runWhatIf({ spendMultiplier: 2 });
      return {
        kind: 'SCENARIO',
        question: q,
        answer: `FORECAST / SCENARIO only — not guaranteed. If spend ×2: Δspend €${scenario.deltas.spend.toFixed(2)}, Δcustomers ${scenario.deltas.customers.toFixed(2)}, Δcontribution €${scenario.deltas.contribution.toFixed(2)}.`,
        data: scenario as unknown as Record<string, unknown>,
      };
    }

    if (match(q, /testirati|test|experiment/i)) {
      const econ = await svc.getEconomics();
      const next = econ.nextEur100;
      const tip = next?.allocations?.find((a: { bucket: string }) => a.bucket === 'TEST');
      return {
        kind: 'RECOMMENDATION',
        question: q,
        answer: tip
          ? `Recommendation (not auto-spend): put ~€${tip.amountEur} in TEST on ${tip.channelCode}. ${tip.reason}`
          : 'No TEST allocation recommendation yet — ingest spend or wait for channel data.',
        data: next as unknown as Record<string, unknown>,
      };
    }

    return {
      kind: overview.kind === 'ACTUAL' ? 'ACTUAL' : 'UNAVAILABLE',
      question: q,
      answer: `Marketing snapshot (ACTUAL where available): spend €${totals.spendEur ?? 'N/A'}, leads ${totals.leads ?? 'N/A'}, customers ${totals.customers ?? 'N/A'}, CAC ${totals.cac ?? 'N/A'}. Ask about Google spend, CAC, channels, what-if budget, or what to test.`,
      data: { totals },
    };
  } catch (err) {
    return {
      kind: 'UNAVAILABLE',
      question: q,
      answer: `Marketing engine unavailable: ${err instanceof Error ? err.message.slice(0, 120) : 'error'}`,
    };
  }
}
