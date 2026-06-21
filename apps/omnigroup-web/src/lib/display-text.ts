/** UI display helpers — English is the default locale for global market. */

export function deliverableLabel(d: { name: string }): string {
  return d.name;
}

export function categoryLabel(c: { name: string }): string {
  return c.name;
}

export function tierLabel(t: { label: string }): string {
  return t.label;
}

const SR_VALUE_PROP =
  /^Kompletna isporuka za (.+): CRM, automatizacije, lead gen i AI podrška — bez prodaje platforme, samo gotov output\.?$/;

/** Converts legacy Serbian vertical value props to English for global marketing. */
export function formatVerticalValueProp(
  valueProp: string | null | undefined,
  nicheLabel?: string,
): string {
  const fallback = nicheLabel?.trim();
  if (!valueProp) {
    return fallback
      ? `End-to-end delivery for ${fallback}: CRM, automations, lead gen, and AI support — no platform resale, only finished output.`
      : 'End-to-end delivery: CRM, automations, lead gen, and AI support — no platform resale, only finished output.';
  }
  const match = valueProp.match(SR_VALUE_PROP);
  if (match) {
    return `End-to-end delivery for ${match[1]}: CRM, automations, lead gen, and AI support — no platform resale, only finished output.`;
  }
  if (/[čćžšđČĆŽŠĐ]|automatizac|isporuka|podršk|bez prodaje/i.test(valueProp)) {
    const label =
      fallback ?? valueProp.split(':')[0]?.replace(/^Kompletna isporuka za\s*/i, '') ?? 'your niche';
    return `End-to-end delivery for ${label}: CRM, automations, lead gen, and AI support — no platform resale, only finished output.`;
  }
  return valueProp;
}
