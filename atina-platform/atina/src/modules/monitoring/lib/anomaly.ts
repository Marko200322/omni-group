import type { AnomalyDetector } from './constants';

export type AnomalyResult = {
  isAnomaly: boolean;
  detector: AnomalyDetector;
  score: number;
  message: string;
};

export type ThresholdInput = {
  value: number;
  warnAbove?: number | null;
  criticalAbove?: number | null;
  warnBelow?: number | null;
  criticalBelow?: number | null;
  metricKey: string;
};

/**
 * Hard threshold detector against configured warn/critical bands.
 * No invented metrics — caller must supply an observed value + thresholds.
 */
export function thresholdDetect(input: ThresholdInput): AnomalyResult {
  const { value, metricKey } = input;
  const critAbove = input.criticalAbove;
  const warnAbove = input.warnAbove;
  const critBelow = input.criticalBelow;
  const warnBelow = input.warnBelow;

  if (critAbove != null && value >= critAbove) {
    return {
      isAnomaly: true,
      detector: 'threshold',
      score: Math.min(10, 5 + (value - critAbove) / Math.max(Math.abs(critAbove), 1)),
      message: `${metricKey} ${value} >= critical_above ${critAbove}`,
    };
  }
  if (critBelow != null && value <= critBelow) {
    return {
      isAnomaly: true,
      detector: 'threshold',
      score: Math.min(10, 5 + (critBelow - value) / Math.max(Math.abs(critBelow), 1)),
      message: `${metricKey} ${value} <= critical_below ${critBelow}`,
    };
  }
  if (warnAbove != null && value >= warnAbove) {
    return {
      isAnomaly: true,
      detector: 'threshold',
      score: Math.min(5, 2 + (value - warnAbove) / Math.max(Math.abs(warnAbove), 1)),
      message: `${metricKey} ${value} >= warn_above ${warnAbove}`,
    };
  }
  if (warnBelow != null && value <= warnBelow) {
    return {
      isAnomaly: true,
      detector: 'threshold',
      score: Math.min(5, 2 + (warnBelow - value) / Math.max(Math.abs(warnBelow), 1)),
      message: `${metricKey} ${value} <= warn_below ${warnBelow}`,
    };
  }

  return {
    isAnomaly: false,
    detector: 'threshold',
    score: 0,
    message: `${metricKey} within thresholds`,
  };
}

export type BaselineInput = {
  value: number;
  mean: number;
  stddev: number;
  metricKey: string;
  /** Absolute z-score above which we flag (default 3). */
  zThreshold?: number;
  sampleCount?: number;
};

/**
 * Z-score style baseline detector. Requires mean/stddev from real samples.
 * With insufficient variance or sample size, returns non-anomaly (no invention).
 */
export function baselineDetect(input: BaselineInput): AnomalyResult {
  const zThreshold = input.zThreshold ?? 3;
  const sampleCount = input.sampleCount ?? 0;

  if (sampleCount > 0 && sampleCount < 5) {
    return {
      isAnomaly: false,
      detector: 'baseline',
      score: 0,
      message: `${input.metricKey} insufficient_baseline_samples:${sampleCount}`,
    };
  }

  if (!Number.isFinite(input.stddev) || input.stddev <= 0) {
    return {
      isAnomaly: false,
      detector: 'baseline',
      score: 0,
      message: `${input.metricKey} baseline_stddev_unavailable`,
    };
  }

  const z = Math.abs((input.value - input.mean) / input.stddev);
  if (z >= zThreshold) {
    return {
      isAnomaly: true,
      detector: 'baseline',
      score: Math.min(10, z),
      message: `${input.metricKey} z=${z.toFixed(2)} >= ${zThreshold} (mean=${input.mean}, stddev=${input.stddev})`,
    };
  }

  return {
    isAnomaly: false,
    detector: 'baseline',
    score: z,
    message: `${input.metricKey} within baseline z=${z.toFixed(2)}`,
  };
}

export type TrendInput = {
  /** Chronological values (oldest → newest). Must be actual samples. */
  values: number[];
  metricKey: string;
  /** Minimum points required (default 4). */
  minPoints?: number;
  /** Relative change fraction over the window to flag (default 0.5 = 50%). */
  changeRatio?: number;
};

/**
 * Simple trend detector: compares first-half mean vs last-half mean.
 * Does not invent data — needs a real series.
 */
export function trendDetect(input: TrendInput): AnomalyResult {
  const minPoints = input.minPoints ?? 4;
  const changeRatio = input.changeRatio ?? 0.5;
  const values = input.values.filter((v) => Number.isFinite(v));

  if (values.length < minPoints) {
    return {
      isAnomaly: false,
      detector: 'trend',
      score: 0,
      message: `${input.metricKey} insufficient_trend_points:${values.length}`,
    };
  }

  const mid = Math.floor(values.length / 2);
  const first = values.slice(0, mid);
  const second = values.slice(mid);
  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const m1 = mean(first);
  const m2 = mean(second);
  const denom = Math.max(Math.abs(m1), 1e-9);
  const ratio = (m2 - m1) / denom;
  const absRatio = Math.abs(ratio);

  if (absRatio >= changeRatio) {
    return {
      isAnomaly: true,
      detector: 'trend',
      score: Math.min(10, absRatio * 5),
      message: `${input.metricKey} trend_change=${(ratio * 100).toFixed(1)}% (first=${m1.toFixed(4)}, last=${m2.toFixed(4)})`,
    };
  }

  return {
    isAnomaly: false,
    detector: 'trend',
    score: absRatio,
    message: `${input.metricKey} trend_stable change=${(ratio * 100).toFixed(1)}%`,
  };
}
