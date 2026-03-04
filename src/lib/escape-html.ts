/**
 * HTML escape utility for safe interpolation into HTML strings.
 * Prevents XSS when rendering user-controlled data in document.write / innerHTML.
 */
export function escapeHtml(text: string | number | undefined | null): string {
  if (text == null) return '';
  const s = String(text);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
