/**
 * Supported outreach locales for job-posting intercept (hunt copy).
 */

export type HuntLocaleMeta = {
  code: string;
  language: string;
  /** Formal address hint for AI prompt */
  formality: string;
  signOff: string;
  subjectPattern: string;
  currencySymbol: string;
};

export const HUNT_LOCALES: HuntLocaleMeta[] = [
  { code: 'de', language: 'German', formality: 'Sie-Form', signOff: 'Mit freundlichen Grüßen', subjectPattern: 'Bezüglich Ihrer Stellenanzeige für {role} in {city} / Automatisierung', currencySymbol: '€' },
  { code: 'en', language: 'English', formality: 'professional direct', signOff: 'Best regards', subjectPattern: 'Re: your {role} opening in {city} — automation alternative', currencySymbol: '€' },
  { code: 'fr', language: 'French', formality: 'vous', signOff: 'Cordialement', subjectPattern: 'Concernant votre offre {role} à {city} / Automatisation', currencySymbol: '€' },
  { code: 'es', language: 'Spanish', formality: 'usted', signOff: 'Atentamente', subjectPattern: 'Sobre su vacante de {role} en {city} / Automatización', currencySymbol: '€' },
  { code: 'it', language: 'Italian', formality: 'Lei', signOff: 'Cordiali saluti', subjectPattern: 'Riguardo alla sua offerta per {role} a {city} / Automazione', currencySymbol: '€' },
  { code: 'nl', language: 'Dutch', formality: 'u', signOff: 'Met vriendelijke groet', subjectPattern: 'Betreft uw vacature {role} in {city} / Automatisering', currencySymbol: '€' },
  { code: 'pl', language: 'Polish', formality: 'Pan/Pani', signOff: 'Z poważaniem', subjectPattern: 'W sprawie ogłoszenia {role} w {city} / Automatyzacja', currencySymbol: '€' },
  { code: 'pt', language: 'Portuguese', formality: 'você formal', signOff: 'Atenciosamente', subjectPattern: 'Sobre a vaga de {role} em {city} / Automação', currencySymbol: '€' },
  { code: 'sv', language: 'Swedish', formality: 'ni', signOff: 'Med vänliga hälsningar', subjectPattern: 'Angående er tjänst som {role} i {city} / Automatisering', currencySymbol: '€' },
  { code: 'no', language: 'Norwegian', formality: 'De', signOff: 'Med vennlig hilsen', subjectPattern: 'Angående stillingen {role} i {city} / Automatisering', currencySymbol: '€' },
  { code: 'da', language: 'Danish', formality: 'De', signOff: 'Med venlig hilsen', subjectPattern: 'Vedrørende stillingen {role} i {city} / Automatisering', currencySymbol: '€' },
  { code: 'cs', language: 'Czech', formality: 'vykání', signOff: 'S pozdravem', subjectPattern: 'K vaší nabídce pozice {role} v {city} / Automatizace', currencySymbol: '€' },
  { code: 'sk', language: 'Slovak', formality: 'vykanie', signOff: 'S pozdravom', subjectPattern: 'K vašej ponuke {role} v {city} / Automatizácia', currencySymbol: '€' },
  { code: 'hu', language: 'Hungarian', formality: 'önözés', signOff: 'Üdvözlettel', subjectPattern: 'A(z) {role} álláshirdetésével kapcsolatban ({city}) / Automatizálás', currencySymbol: '€' },
  { code: 'ro', language: 'Romanian', formality: 'dumneavoastră', signOff: 'Cu stimă', subjectPattern: 'Privind anunțul pentru {role} în {city} / Automatizare', currencySymbol: '€' },
  { code: 'hr', language: 'Croatian', formality: 'Vi', signOff: 'S poštovanjem', subjectPattern: 'U vezi oglasa za {role} u {city} / Automatizacija', currencySymbol: '€' },
  { code: 'sr', language: 'Serbian', formality: 'Vi', signOff: 'S poštovanjem', subjectPattern: 'U vezi oglasa za {role} u {city} / Automatizacija', currencySymbol: '€' },
  { code: 'tr', language: 'Turkish', formality: 'siz', signOff: 'Saygılarımla', subjectPattern: '{city} {role} ilanı hakkında / Otomasyon', currencySymbol: '€' },
  { code: 'ar', language: 'Arabic', formality: 'formal MSA', signOff: 'مع التحية', subjectPattern: 'بخصوص وظيفة {role} في {city} / الأتمتة', currencySymbol: '€' },
  { code: 'ja', language: 'Japanese', formality: '敬語', signOff: '敬具', subjectPattern: '{city}の{role}募集について / 自動化のご提案', currencySymbol: '€' },
  { code: 'ko', language: 'Korean', formality: '존댓말', signOff: '감사합니다', subjectPattern: '{city} {role} 채용 공고 관련 / 자동화', currencySymbol: '€' },
  { code: 'zh', language: 'Chinese (Simplified)', formality: '您', signOff: '此致敬礼', subjectPattern: '关于{city}{role}职位 / 自动化方案', currencySymbol: '€' },
  { code: 'hi', language: 'Hindi', formality: 'आप', signOff: 'सादर', subjectPattern: '{city} में {role} भर्ती / स्वचालन', currencySymbol: '€' },
  { code: 'ru', language: 'Russian', formality: 'Вы', signOff: 'С уважением', subjectPattern: 'По поводу вакансии {role} в {city} / Автоматизация', currencySymbol: '€' },
  { code: 'uk', language: 'Ukrainian', formality: 'Ви', signOff: 'З повагою', subjectPattern: 'Щодо вакансії {role} у {city} / Автоматизація', currencySymbol: '€' },
];

export function resolveHuntLocale(code?: string | null): HuntLocaleMeta {
  const normalized = (code ?? 'en').toLowerCase().split('-')[0];
  return HUNT_LOCALES.find((l) => l.code === normalized) ?? HUNT_LOCALES.find((l) => l.code === 'en')!;
}

export function listHuntLocaleCodes(): string[] {
  return HUNT_LOCALES.map((l) => l.code);
}
