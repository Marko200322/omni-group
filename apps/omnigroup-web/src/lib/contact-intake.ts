/** Shared website-contact intake — form and BFF must use the same enums. */

export const CONTACT_BUDGETS = [
  { id: 'under-1k', label: 'Under €1,000' },
  { id: '1k-5k', label: '€1,000–5,000' },
  { id: '5k-15k', label: '€5,000–15,000' },
  { id: '15k-plus', label: '€15,000+' },
  { id: 'not-sure', label: 'Not sure yet' },
] as const;

export const CONTACT_TIMELINES = [
  { id: 'asap', label: 'As soon as possible' },
  { id: 'this-month', label: 'This month' },
  { id: '1-3-months', label: '1–3 months' },
  { id: 'exploring', label: 'Just exploring' },
] as const;

export type ContactBudgetId = (typeof CONTACT_BUDGETS)[number]['id'];
export type ContactTimelineId = (typeof CONTACT_TIMELINES)[number]['id'];

const BUDGET_IDS = new Set<string>(CONTACT_BUDGETS.map((row) => row.id));
const TIMELINE_IDS = new Set<string>(CONTACT_TIMELINES.map((row) => row.id));

export function parseContactBudget(value: unknown): ContactBudgetId | undefined {
  return typeof value === 'string' && BUDGET_IDS.has(value) ? (value as ContactBudgetId) : undefined;
}

export function parseContactTimeline(value: unknown): ContactTimelineId | undefined {
  return typeof value === 'string' && TIMELINE_IDS.has(value) ? (value as ContactTimelineId) : undefined;
}

export const CONTACT_MESSAGE_MIN_LEN = 12;
export const CONTACT_MESSAGE_MAX_LEN = 5000;
export const CONTACT_NAME_MIN_LEN = 2;
export const CONTACT_NAME_MAX_LEN = 120;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function parseContactConsent(value: unknown): boolean {
  return value === true || value === 'true' || value === 'on' || value === '1';
}

export function isValidContactEmail(value: string): boolean {
  const email = value.trim();
  if (email.length < 6 || email.length > 254) return false;
  if (email.includes(' ') || email.includes('..')) return false;
  return EMAIL_RE.test(email);
}

export function parseContactName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const name = value.trim();
  if (name.length < CONTACT_NAME_MIN_LEN || name.length > CONTACT_NAME_MAX_LEN) return undefined;
  return name;
}

export function parseContactMessage(value: unknown):
  | { ok: true; message: string }
  | { ok: false; error: 'message_required' | 'message_invalid_type' | 'message_too_short' | 'message_too_long' } {
  if (value === undefined || value === null || value === '') {
    return { ok: false, error: 'message_required' };
  }
  if (typeof value !== 'string') {
    return { ok: false, error: 'message_invalid_type' };
  }
  const message = value.trim();
  if (message.length < CONTACT_MESSAGE_MIN_LEN) {
    return { ok: false, error: 'message_too_short' };
  }
  if (message.length > CONTACT_MESSAGE_MAX_LEN) {
    return { ok: false, error: 'message_too_long' };
  }
  return { ok: true, message };
}

export function contactBudgetLabel(id: string): string {
  return CONTACT_BUDGETS.find((row) => row.id === id)?.label ?? id;
}

export function contactTimelineLabel(id: string): string {
  return CONTACT_TIMELINES.find((row) => row.id === id)?.label ?? id;
}

export type ContactIntakeExtras = {
  budget?: ContactBudgetId;
  timeline?: ContactTimelineId;
};

export function contactIntakeLines(input: ContactIntakeExtras): string[] {
  const lines: string[] = [];
  if (input.budget) lines.push(`Budget: ${contactBudgetLabel(input.budget)}`);
  if (input.timeline) lines.push(`Timeline: ${contactTimelineLabel(input.timeline)}`);
  return lines;
}
