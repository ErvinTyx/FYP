/**
 * RFQ validation helpers: project details (50 char for name/notes/set, 70 words for location),
 * project name must contain words, rental duration 1–12 months. Used by API and RFQ form.
 */

const MAX_WORDS = 50;
/** Project location has a higher word limit. */
const MAX_PROJECT_LOCATION_WORDS = 70;
/** Max words for notes fields (e.g. Condition Report General Notes, Repair Slip Repair Notes). */
export const MAX_NOTES_WORDS = 70;
/** Max characters for notes (~70 words). Same as RFQ approach: hard limit so user cannot type/paste more. */
export const MAX_NOTES_CHARS = 500;
/** Max words for Content Management: title 50, body 100. */
export const MAX_CONTENT_TITLE_WORDS = 50;
export const MAX_CONTENT_BODY_WORDS = 100;
/** Max characters for Content Management: title 50, content 300. */
export const MAX_CONTENT_TITLE_CHARS = 50;
export const MAX_CONTENT_BODY_CHARS = 300;
/** Max characters for project name, notes, and set name (input is hard-limited to this). */
const MAX_CHARS = 50;
const RENTAL_MONTHS_MIN = 1;
const RENTAL_MONTHS_MAX = 12;

export function countWords(text: string | null | undefined): number {
  if (text == null || typeof text !== 'string') return 0;
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Truncate text to at most maxWords (by word count). */
export function truncateToWords(text: string | null | undefined, maxWords: number): string {
  if (text == null || typeof text !== 'string') return '';
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(' ');
}

export function isWithinWordLimit(text: string | null | undefined, maxWords: number = MAX_WORDS): boolean {
  return countWords(text) <= maxWords;
}

/** Project name must contain at least one letter (cannot be only integers or special characters). */
export function projectNameContainsWord(projectName: string | null | undefined): boolean {
  if (projectName == null || typeof projectName !== 'string') return false;
  const trimmed = projectName.trim();
  if (trimmed.length === 0) return false;
  return /[a-zA-Z]/.test(trimmed);
}

export function validateRentalMonths(months: number | null | undefined): boolean {
  if (months == null || typeof months !== 'number') return false;
  return Number.isInteger(months) && months >= RENTAL_MONTHS_MIN && months <= RENTAL_MONTHS_MAX;
}

/** Check string length is within character limit (for project name, location, notes, set name). */
export function isWithinCharLimit(text: string | null | undefined, maxChars: number = MAX_CHARS): boolean {
  if (text == null || typeof text !== 'string') return true;
  return text.length <= maxChars;
}

export const RFQ_VALIDATION = {
  MAX_WORDS,
  MAX_PROJECT_LOCATION_WORDS,
  MAX_NOTES_WORDS,
  MAX_NOTES_CHARS,
  MAX_CONTENT_TITLE_WORDS,
  MAX_CONTENT_BODY_WORDS,
  MAX_CONTENT_TITLE_CHARS,
  MAX_CONTENT_BODY_CHARS,
  MAX_CHARS,
  RENTAL_MONTHS_MIN,
  RENTAL_MONTHS_MAX,
} as const;
