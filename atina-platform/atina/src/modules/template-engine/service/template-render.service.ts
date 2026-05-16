/**
 * Literal `{{identifier}}` substitution only — no expression evaluation.
 * Values must be strings; missing keys leave placeholders unchanged.
 */
const PLACEHOLDER = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

export function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(PLACEHOLDER, (full, key: string) => {
    if (!Object.prototype.hasOwnProperty.call(variables, key)) {
      return full;
    }
    return variables[key];
  });
}
