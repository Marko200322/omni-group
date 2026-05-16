/** Stable fragment for URL hash / in-page links (ASCII slug from section title). */
export function sectionHeadingId(title: string): string {
  const dediacritics = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return (
    'sec-' +
    dediacritics
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  );
}
