import { getAiClient } from '../../../integrations';
import { resolveHuntLocale } from '../data/hunt-locales';

export const EXAMPLE_GERMAN_JOB_POSTING = `Stellenanzeige: Mitarbeiter/in Datenerfassung (m/w/d)
Firma: Müller Logistik GmbH
Standort: Frankfurt am Main
Gehalt: 3.200 € brutto/Monat

Wir suchen ab sofort eine/n zuverlässige/n Mitarbeiter/in für die manuelle Erfassung von Lieferscheinen und Rechnungen in unser SAP-System.
Ihre Aufgaben: Eingangsrechnungen prüfen, Daten in SAP übertragen, Lieferanten per E-Mail kontaktieren, Fehler in Belegen korrigieren, monatliche Reports erstellen.
Voraussetzungen: Sorgfalt, MS Office, erste SAP-Erfahrung von Vorteil. Vollzeit, unbefristet.
Bewerbungen an: bewerbung@mueller-logistik.de`;

export type JobPostingContext = {
  jobPostingText: string;
  locale?: string;
  companyName?: string;
  city?: string;
  roleTitle?: string;
  platformSlug?: string;
  jobUrl?: string;
  salaryGrossMonthlyEur?: number;
  atinaPriceRatio?: number;
  senderName?: string;
};

export type JobHuntEconomics = {
  salaryGrossMonthlyEur: number;
  atinaMonthlyEur: number;
  monthlySavingsEur: number;
  savingsPercent: number;
  annualSavingsEur: number;
};

export type JobHuntEmail = {
  subject: string;
  icebreaker: string;
  offerAndMath: string;
  cta: string;
  body: string;
  locale: string;
  economics: JobHuntEconomics;
  rawModelOutput?: string;
};

const SALARY_PATTERNS: RegExp[] = [
  /(\d{1,2}[.,]\d{3})\s*€?\s*brutto/i,
  /Gehalt:\s*(\d{1,2}[.,]?\d{0,3})\s*€/i,
  /(\d{1,2}[.,]\d{3})\s*€\s*brutto/i,
  /(\d{3,5})\s*€\s*\/\s*Monat/i,
  /€\s*(\d{1,2}[.,]?\d{2,3})\s*(?:per month|\/mo|monthly|mes|mois)/i,
  /(\d{1,2}[.,]?\d{2,3})\s*(?:EUR|€)\s*(?:gross|brutto|monthly)/i,
  /salary[:\s]+€?\s*(\d{1,2}[.,]?\d{2,3})/i,
];

export function parseSalaryFromJobPosting(text: string): number | null {
  for (const re of SALARY_PATTERNS) {
    const m = text.match(re);
    if (!m?.[1]) continue;
    const normalized = m[1].replace(/\./g, '').replace(',', '.');
    const n = Number.parseFloat(normalized);
    if (Number.isFinite(n) && n >= 800 && n <= 25000) return Math.round(n);
  }
  return null;
}

export function computeJobHuntEconomics(salaryGrossMonthlyEur: number, atinaPriceRatio = 0.25): JobHuntEconomics {
  const ratio = Math.min(0.35, Math.max(0.12, atinaPriceRatio));
  const rawAtina = Math.round(salaryGrossMonthlyEur * ratio);
  const atinaMonthlyEur = Math.min(1200, Math.max(499, rawAtina));
  const monthlySavingsEur = Math.max(0, salaryGrossMonthlyEur - atinaMonthlyEur);
  const savingsPercent = salaryGrossMonthlyEur
    ? Math.round((monthlySavingsEur / salaryGrossMonthlyEur) * 100)
    : 0;
  return {
    salaryGrossMonthlyEur,
    atinaMonthlyEur,
    monthlySavingsEur,
    savingsPercent,
    annualSavingsEur: monthlySavingsEur * 12,
  };
}

export function buildJobHuntSystemPrompt(localeCode: string): string {
  const locale = resolveHuntLocale(localeCode);
  return `You are an elite B2B acquirer targeting companies that publicly posted a job ad. Write ONE cold email in ${locale.language}.

PSYCHOLOGY (strict):
- The company posted a job → burning problem, budget approved, hiring is slow and expensive.
- We are NOT devs selling scripts. We are the IMMEDIATE alternative: automated "Atina" bot doing the same work 24/7 without errors.
- Tone: ${locale.formality}. No startup slang. No meeting pressure.

STRUCTURE (JSON only, no markdown fences):
{
  "subject": "subject line referencing the job + city + automation",
  "icebreaker": "first sentence: specific pain from the ad (manual data entry, SAP, backlog, etc.)",
  "offer_and_math": "offer + clear math: salary vs Atina monthly price vs savings",
  "cta": "low-friction: offer 90-second demo video link — no forced meeting"
}

RULES:
- Subject pattern hint: ${locale.subjectPattern}
- Mention "Atina" as the automated system.
- Use exact numbers provided (salary, Atina price, savings).
- Max 180 words total body.
- Write entirely in ${locale.language}.`;
}

export function buildJobHuntUserPrompt(ctx: JobPostingContext, economics: JobHuntEconomics): string {
  return JSON.stringify(
    {
      job_posting: ctx.jobPostingText.slice(0, 4000),
      company: ctx.companyName ?? null,
      city: ctx.city ?? null,
      role: ctx.roleTitle ?? null,
      platform: ctx.platformSlug ?? null,
      job_url: ctx.jobUrl ?? null,
      locale: ctx.locale ?? 'en',
      salary_gross_monthly_eur: economics.salaryGrossMonthlyEur,
      atina_monthly_eur: economics.atinaMonthlyEur,
      monthly_savings_eur: economics.monthlySavingsEur,
      savings_percent: economics.savingsPercent,
      annual_savings_eur: economics.annualSavingsEur,
      sender: ctx.senderName ?? 'Omni Group — Atina',
    },
    null,
    2,
  );
}

export function parseJobHuntModelJson(content: string): Omit<JobHuntEmail, 'body' | 'economics' | 'locale' | 'rawModelOutput'> | null {
  const jsonMatch = content.trim().match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const subject = String(parsed.subject ?? parsed.betreff ?? '').trim();
    const icebreaker = String(parsed.icebreaker ?? '').trim();
    const offerAndMath = String(parsed.offer_and_math ?? parsed.offer ?? '').trim();
    const cta = String(parsed.cta ?? '').trim();
    if (!subject || !icebreaker) return null;
    return { subject, icebreaker, offerAndMath, cta };
  } catch {
    return null;
  }
}

export function assembleJobHuntBody(parts: {
  icebreaker: string;
  offerAndMath: string;
  cta: string;
  locale: string;
  senderName?: string;
}): string {
  const meta = resolveHuntLocale(parts.locale);
  const signOff = parts.senderName ?? `Omni Group — Atina`;
  return [parts.icebreaker, parts.offerAndMath, parts.cta, '', meta.signOff, signOff].join('\n\n');
}

export function jobHuntToOutboundMarkdown(email: JobHuntEmail): string {
  return `# Outreach — job intercept (${email.locale})

**Subject A:** ${email.subject}

---

${email.body}

---
hunt_mode: job_intercept
locale: ${email.locale}
salary_eur: ${email.economics.salaryGrossMonthlyEur}
atina_eur: ${email.economics.atinaMonthlyEur}
savings_eur: ${email.economics.monthlySavingsEur}
`;
}

export function buildFallbackJobHuntEmail(ctx: JobPostingContext, economics: JobHuntEconomics): JobHuntEmail {
  const locale = resolveHuntLocale(ctx.locale);
  const city = ctx.city ?? 'your region';
  const role = ctx.roleTitle ?? 'data entry';
  const company = ctx.companyName ?? 'your company';
  const subject = locale.subjectPattern
    .replace('{role}', role)
    .replace('{city}', city);
  const sym = locale.currencySymbol;

  const icebreaker =
    locale.code === 'de'
      ? `Ich habe gesehen, dass ${company} aktuell eine Stelle für ${role} ausschreibt — insbesondere manuelle Datenerfassung, während der Rückstau wächst.`
      : `I noticed ${company} is hiring for ${role} in ${city} — especially manual repetitive work while the backlog grows.`;

  const offerAndMath =
    locale.code === 'de'
      ? `Während das Einstellungsverfahren oft Monate dauert, kann „Atina“ dieselben Prozesse übernehmen: 24/7, fehlerfrei — für nur ${sym}${economics.atinaMonthlyEur}/Monat statt ${sym}${economics.salaryGrossMonthlyEur} Brutto (Ersparnis ca. ${sym}${economics.monthlySavingsEur}/Monat, ${economics.savingsPercent}%).`
      : `While hiring takes months, our automated system Atina can handle the same workload 24/7 without errors — for only ${sym}${economics.atinaMonthlyEur}/month instead of ${sym}${economics.salaryGrossMonthlyEur} gross salary (saving ~${sym}${economics.monthlySavingsEur}/month, ${economics.savingsPercent}%).`;

  const cta =
    locale.code === 'de'
      ? 'Wir haben ein 90-Sekunden-Video, das zeigt, wie der Bot Ihr Problem automatisch löst. Darf ich Ihnen den Link senden?'
      : 'We recorded a 90-second screen demo showing how Atina automates this exact workflow. May I send you the link?';

  const body = assembleJobHuntBody({
    icebreaker,
    offerAndMath,
    cta,
    locale: locale.code,
    senderName: ctx.senderName,
  });

  return {
    subject,
    icebreaker,
    offerAndMath,
    cta,
    body,
    locale: locale.code,
    economics,
  };
}

export function isJobPostingContext(ctx: Record<string, unknown> | null | undefined): boolean {
  if (!ctx) return false;
  if (ctx.hunt_mode === 'job_intercept' || ctx.hunt_mode === 'german_job_intercept') return true;
  if (typeof ctx.job_posting_text === 'string' && ctx.job_posting_text.length > 40) return true;
  if (typeof ctx.jobPostingText === 'string' && ctx.jobPostingText.length > 40) return true;
  return false;
}

export function normalizeJobPostingContext(scrapeContext: Record<string, unknown>): JobPostingContext {
  const text = String(scrapeContext.job_posting_text ?? scrapeContext.jobPostingText ?? '');
  const locale = String(
    scrapeContext.locale ?? scrapeContext.language ?? (scrapeContext.hunt_mode === 'german_job_intercept' ? 'de' : 'en'),
  )
    .toLowerCase()
    .split('-')[0];
  const salary =
    typeof scrapeContext.salary_gross_monthly_eur === 'number'
      ? scrapeContext.salary_gross_monthly_eur
      : typeof scrapeContext.salaryGrossMonthlyEur === 'number'
        ? scrapeContext.salaryGrossMonthlyEur
        : parseSalaryFromJobPosting(text) ?? 3200;
  return {
    jobPostingText: text,
    locale,
    companyName: scrapeContext.company_name
      ? String(scrapeContext.company_name)
      : scrapeContext.companyName
        ? String(scrapeContext.companyName)
        : undefined,
    city: scrapeContext.city ? String(scrapeContext.city) : undefined,
    roleTitle: scrapeContext.role_title
      ? String(scrapeContext.role_title)
      : scrapeContext.roleTitle
        ? String(scrapeContext.roleTitle)
        : undefined,
    platformSlug: scrapeContext.platform_slug
      ? String(scrapeContext.platform_slug)
      : scrapeContext.platformSlug
        ? String(scrapeContext.platformSlug)
        : undefined,
    jobUrl: scrapeContext.job_url ? String(scrapeContext.job_url) : scrapeContext.jobUrl ? String(scrapeContext.jobUrl) : undefined,
    salaryGrossMonthlyEur: salary,
    atinaPriceRatio:
      typeof scrapeContext.atina_price_ratio === 'number' ? scrapeContext.atina_price_ratio : undefined,
    senderName: scrapeContext.sender_name ? String(scrapeContext.sender_name) : 'Omni Group — Atina',
  };
}

export async function generateJobHuntEmail(
  ctx: JobPostingContext,
  opts?: { model?: string },
): Promise<JobHuntEmail> {
  const locale = resolveHuntLocale(ctx.locale).code;
  const salary = ctx.salaryGrossMonthlyEur ?? parseSalaryFromJobPosting(ctx.jobPostingText) ?? 3200;
  const economics = computeJobHuntEconomics(salary, ctx.atinaPriceRatio ?? 0.25);
  const fullCtx = { ...ctx, locale, salaryGrossMonthlyEur: salary };
  const ai = getAiClient();

  if (!ai.isConfigured()) {
    return buildFallbackJobHuntEmail(fullCtx, economics);
  }

  const model = opts?.model ?? (process.env.HUNT_GEMINI_MODEL?.trim() || 'google/gemini-2.5-flash');

  try {
    const chat = await ai.chatCompletions({
      model,
      maxTokens: 900,
      temperature: 0.45,
      messages: [
        { role: 'system', content: buildJobHuntSystemPrompt(locale) },
        { role: 'user', content: buildJobHuntUserPrompt(fullCtx, economics) },
      ],
    });
    const raw = chat?.content?.trim() ?? '';
    const parsed = parseJobHuntModelJson(raw);
    if (!parsed) return buildFallbackJobHuntEmail(fullCtx, economics);

    const body = assembleJobHuntBody({
      icebreaker: parsed.icebreaker,
      offerAndMath: parsed.offerAndMath,
      cta: parsed.cta,
      locale,
      senderName: ctx.senderName,
    });

    return { ...parsed, body, locale, economics, rawModelOutput: raw };
  } catch {
    return buildFallbackJobHuntEmail(fullCtx, economics);
  }
}

// Backward-compatible aliases (German module)
export type GermanJobPostingContext = JobPostingContext;
export type GermanJobHuntEconomics = JobHuntEconomics;
export type GermanJobHuntEmail = JobHuntEmail & { betreff: string; bodyDe: string };

export const parseSalaryFromGermanPosting = parseSalaryFromJobPosting;
export const computeGermanJobHuntEconomics = computeJobHuntEconomics;
export const isGermanJobPostingContext = isJobPostingContext;
export const normalizeGermanJobPostingContext = normalizeJobPostingContext;
export const generateGermanJobHuntEmail = async (
  ctx: JobPostingContext,
  opts?: { model?: string },
): Promise<GermanJobHuntEmail> => {
  const email = await generateJobHuntEmail({ ...ctx, locale: ctx.locale ?? 'de' }, opts);
  return {
    ...email,
    betreff: email.subject,
    bodyDe: email.body,
  };
};
export const germanJobHuntToOutboundMarkdown = jobHuntToOutboundMarkdown;
export const assembleGermanJobHuntBody = (parts: {
  icebreaker: string;
  offerAndMath: string;
  cta: string;
  senderName?: string;
}) => assembleJobHuntBody({ ...parts, locale: 'de' });
export const buildFallbackGermanJobHuntEmail = (ctx: JobPostingContext, economics: JobHuntEconomics) => {
  const email = buildFallbackJobHuntEmail({ ...ctx, locale: 'de' }, economics);
  return { ...email, betreff: email.subject, bodyDe: email.body };
};
export const parseGermanJobHuntModelJson = parseJobHuntModelJson;
export const buildGermanJobHuntSystemPrompt = () => buildJobHuntSystemPrompt('de');
export const buildGermanJobHuntUserPrompt = buildJobHuntUserPrompt;
