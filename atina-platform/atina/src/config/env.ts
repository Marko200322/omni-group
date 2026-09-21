/** Read typed values from process.env with defaults (no dotenv side effects). */
export function optional(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

/** Non-numeric strings yield fallback. Supports decimal env values (e.g. fee rates 0.029). */
export function optionalNumber(key: string, fallback: number): number {
  const val = process.env[key];
  if (!val) return fallback;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : fallback;
}

export function optionalBool(key: string, fallback: boolean): boolean {
  const val = process.env[key];
  if (!val) return fallback;
  return val.toLowerCase() === 'true';
}
