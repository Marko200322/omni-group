export function parseOnboardingDateRange(from: unknown, to: unknown): {
  fromIso: string | null;
  toIso: string | null;
  warnings: string[];
} {
  const warnings: string[] = [];
  const fromDate = typeof from === 'string' ? new Date(from) : null;
  const toDate = typeof to === 'string' ? new Date(to) : null;
  const fromIso =
    fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate.toISOString() : null;
  let toIso = toDate && !Number.isNaN(toDate.getTime()) ? toDate.toISOString() : null;
  if (typeof from === 'string' && from.trim() && !fromIso) {
    warnings.push('from is invalid datetime and was ignored.');
  }
  if (typeof to === 'string' && to.trim() && !toIso) {
    warnings.push('to is invalid datetime and was ignored.');
  }
  if (fromIso && toIso && new Date(fromIso).getTime() > new Date(toIso).getTime()) {
    warnings.push('from is later than to; to was ignored.');
    toIso = null;
  }
  return { fromIso, toIso, warnings };
}

export function parseCreatedAtSort(sort: unknown): {
  sql: 'ASC' | 'DESC';
  label: 'asc' | 'desc';
  warning?: string;
} {
  const s = String(sort ?? 'desc').toLowerCase().trim();
  if (s === 'asc' || s === 'ascending') {
    return { sql: 'ASC', label: 'asc' };
  }
  if (s === 'desc' || s === 'descending' || s === '') {
    return { sql: 'DESC', label: 'desc' };
  }
  return {
    sql: 'DESC',
    label: 'desc',
    warning: 'sort is invalid; using desc.',
  };
}
