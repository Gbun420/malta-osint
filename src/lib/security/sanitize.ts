const TAG_REGEX = /<[^>]*>/g;
const MAX_INPUT_LENGTH = 10000;

export function sanitizeHtml(input: string): string {
  return input
    .replace(TAG_REGEX, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
}

export function truncateInput(input: string, maxLength: number = MAX_INPUT_LENGTH): string {
  if (input.length <= maxLength) return input;
  return input.slice(0, maxLength) + '...';
}

export function sanitizeAndTruncate(input: string, maxLength: number = MAX_INPUT_LENGTH): string {
  return truncateInput(sanitizeHtml(input), maxLength);
}

export function validatePagination(
  limit: number | undefined,
  offset: number | undefined,
  maxLimit: number = 100,
): { limit: number; offset: number } {
  const validLimit = Math.min(Math.max(1, limit ?? 50), maxLimit);
  const validOffset = Math.max(0, offset ?? 0);
  return { limit: validLimit, offset: validOffset };
}
