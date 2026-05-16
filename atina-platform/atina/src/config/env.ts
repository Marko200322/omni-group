/** Read typed values from process.env with defaults (no dotenv side effects). */
export function optional(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

/** Non-numeric strings yield `NaN` — validate in callers or use strict env parsing in production. */
export function optionalNumber(key: string, fallback: number): number {
  const val = process.env[key];
  return val ? parseInt(val, 10) : fallback;
}

export function optionalBool(key: string, fallback: boolean): boolean {
  const val = process.env[key];
  if (!val) return fallback;
  return val.toLowerCase() === 'true';
}
