import {
  getOmiUsageConfig,
  spendableBudgetUsd,
} from './omi-usage-config';
import {
  counterKey,
  getOmiUsageStore,
  getSpendUsd,
  utcStamp,
  type OmiUsageDashboard,
  type OmiUsageStore,
} from './omi-usage-store';

export async function getOmiUsageDashboard(
  store: OmiUsageStore = getOmiUsageStore(),
): Promise<OmiUsageDashboard> {
  const cfg = getOmiUsageConfig();
  const dailyCap = spendableBudgetUsd(cfg.dailyBudgetUsd, cfg.budgetReservePercent);
  const monthlyCap = spendableBudgetUsd(cfg.monthlyBudgetUsd, cfg.budgetReservePercent);
  const ready = await store.ensureReady();

  if (!ready) {
    return {
      storeReady: false,
      failClosed: true,
      budget: {
        dailyBudgetUsd: cfg.dailyBudgetUsd,
        monthlyBudgetUsd: cfg.monthlyBudgetUsd,
        reservePercent: cfg.budgetReservePercent,
        dailySpendableUsd: dailyCap,
        monthlySpendableUsd: monthlyCap,
        dailySpentUsd: 0,
        monthlySpentUsd: 0,
        dailyPct: 0,
        monthlyPct: 0,
        aiAllowed: false,
      },
      requests: { today: 0, month: 0, blockedToday: 0, blockedMonth: 0 },
      costByModel: [],
      topSessions: [],
      recentBlocked: [],
      recentEvents: [],
    };
  }

  try {
    const day = utcStamp('day');
    const month = utcStamp('month');
    const [spend, todayReq, monthReq, blockedToday, blockedMonth, costMap, costReqMap, topReq, topCost, events] =
      await Promise.all([
        getSpendUsd(store),
        store.get(counterKey(['req', 'day', day])),
        store.get(counterKey(['req', 'month', month])),
        store.get(counterKey(['blocked', 'day', day])),
        store.get(counterKey(['blocked', 'month', month])),
        store.hgetall(counterKey(['cost_model', 'day', day])),
        store.hgetall(counterKey(['cost_model_req', 'day', day])),
        store.ztop(counterKey(['sessions', 'day', day]), 10),
        store.ztop(counterKey(['session_cost', 'day', day]), 10),
        store.listEvents(40),
      ]);

    const costByModel = Object.keys(costMap)
      .map((model) => ({
        model,
        costUsd: (Number(costMap[model]) || 0) / 1_000_000,
        requests: Number(costReqMap[model]) || 0,
      }))
      .sort((a, b) => b.costUsd - a.costUsd);

    const costBySession = new Map(topCost.map((r) => [r.member, r.score / 1_000_000]));
    const topSessions = topReq.map((r) => ({
      sessionId: r.member,
      requests: r.score,
      costUsd: costBySession.get(r.member) ?? 0,
    }));

    const dailyPct = dailyCap > 0 ? Math.min(100, (spend.daily / dailyCap) * 100) : 100;
    const monthlyPct = monthlyCap > 0 ? Math.min(100, (spend.monthly / monthlyCap) * 100) : 100;
    const aiAllowed = spend.daily < dailyCap && spend.monthly < monthlyCap;

    return {
      storeReady: true,
      failClosed: false,
      budget: {
        dailyBudgetUsd: cfg.dailyBudgetUsd,
        monthlyBudgetUsd: cfg.monthlyBudgetUsd,
        reservePercent: cfg.budgetReservePercent,
        dailySpendableUsd: dailyCap,
        monthlySpendableUsd: monthlyCap,
        dailySpentUsd: spend.daily,
        monthlySpentUsd: spend.monthly,
        dailyPct: Math.round(dailyPct * 10) / 10,
        monthlyPct: Math.round(monthlyPct * 10) / 10,
        aiAllowed,
      },
      requests: {
        today: todayReq,
        month: monthReq,
        blockedToday,
        blockedMonth,
      },
      costByModel,
      topSessions,
      recentBlocked: events.filter((e) => e.kind === 'blocked').slice(0, 15),
      recentEvents: events.slice(0, 25),
    };
  } catch {
    return {
      storeReady: false,
      failClosed: true,
      budget: {
        dailyBudgetUsd: cfg.dailyBudgetUsd,
        monthlyBudgetUsd: cfg.monthlyBudgetUsd,
        reservePercent: cfg.budgetReservePercent,
        dailySpendableUsd: dailyCap,
        monthlySpendableUsd: monthlyCap,
        dailySpentUsd: 0,
        monthlySpentUsd: 0,
        dailyPct: 0,
        monthlyPct: 0,
        aiAllowed: false,
      },
      requests: { today: 0, month: 0, blockedToday: 0, blockedMonth: 0 },
      costByModel: [],
      topSessions: [],
      recentBlocked: [],
      recentEvents: [],
    };
  }
}
