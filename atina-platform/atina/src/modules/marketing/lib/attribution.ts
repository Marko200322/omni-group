/**
 * Multi-touch attribution — never invent. Empty → ATTRIBUTION_UNCERTAIN.
 */
import type { AttributionModel } from './constants';

export type Touchpoint = {
  id?: string;
  channelCode?: string | null;
  campaignId?: string | null;
  occurredAt: string | Date;
  weightHint?: number;
};

export type AttributionShare = {
  channelCode: string | null;
  campaignId: string | null;
  weight: number;
};

export type AttributionResult = {
  model: AttributionModel;
  confidence: 'high' | 'medium' | 'low' | 'uncertain';
  labeledUncertain: boolean;
  label: 'OK' | 'ATTRIBUTION_UNCERTAIN';
  shares: AttributionShare[];
};

function sorted(touchpoints: Touchpoint[]): Touchpoint[] {
  return [...touchpoints].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
  );
}

function shareOf(tp: Touchpoint, weight: number): AttributionShare {
  return {
    channelCode: tp.channelCode ?? null,
    campaignId: tp.campaignId ?? null,
    weight,
  };
}

function uncertain(model: AttributionModel): AttributionResult {
  return {
    model,
    confidence: 'uncertain',
    labeledUncertain: true,
    label: 'ATTRIBUTION_UNCERTAIN',
    shares: [],
  };
}

export function attributeTouchpoints(
  touchpoints: Touchpoint[],
  model: AttributionModel = 'last_touch'
): AttributionResult {
  const tps = sorted(touchpoints);
  if (tps.length === 0) return uncertain(model);

  let shares: AttributionShare[] = [];
  switch (model) {
    case 'first_touch':
      shares = [shareOf(tps[0], 1)];
      break;
    case 'last_touch':
      shares = [shareOf(tps[tps.length - 1], 1)];
      break;
    case 'linear': {
      const w = 1 / tps.length;
      shares = tps.map((tp) => shareOf(tp, w));
      break;
    }
    case 'position': {
      if (tps.length === 1) {
        shares = [shareOf(tps[0], 1)];
      } else if (tps.length === 2) {
        shares = [shareOf(tps[0], 0.5), shareOf(tps[1], 0.5)];
      } else {
        const mid = 0.2 / (tps.length - 2);
        shares = tps.map((tp, i) => {
          if (i === 0 || i === tps.length - 1) return shareOf(tp, 0.4);
          return shareOf(tp, mid);
        });
      }
      break;
    }
    case 'time_decay': {
      const halfLifeMs = 7 * 24 * 3600 * 1000;
      const last = new Date(tps[tps.length - 1].occurredAt).getTime();
      const raw = tps.map((tp) => {
        const age = Math.max(0, last - new Date(tp.occurredAt).getTime());
        return Math.pow(0.5, age / halfLifeMs);
      });
      const sum = raw.reduce((a, b) => a + b, 0) || 1;
      shares = tps.map((tp, i) => shareOf(tp, raw[i] / sum));
      break;
    }
    case 'weighted': {
      const raw = tps.map((tp) => (Number.isFinite(tp.weightHint) && (tp.weightHint ?? 0) > 0 ? (tp.weightHint as number) : 1));
      const sum = raw.reduce((a, b) => a + b, 0) || 1;
      shares = tps.map((tp, i) => shareOf(tp, raw[i] / sum));
      break;
    }
    default:
      return uncertain(model);
  }

  const confidence =
    tps.length >= 3 ? 'high' : tps.length === 2 ? 'medium' : tps.length === 1 ? 'low' : 'uncertain';

  return {
    model,
    confidence,
    labeledUncertain: false,
    label: 'OK',
    shares,
  };
}
