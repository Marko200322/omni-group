/** Total pages for offset pagination (ceil(total / limit), limit floored to at least 1). */
export function totalPagesFromCount(total: number, limit: number): number {
  const pages = Math.ceil(total / Math.max(1, limit));
  return total < 0 ? 0 : pages;
}
