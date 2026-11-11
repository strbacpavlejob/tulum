/** The most rows one page may hold. The paging SQL functions cap it too. */
export const MAX_PAGE_SIZE = 50;

/**
 * The page size a request asked for, kept within 0..MAX_PAGE_SIZE; fallback
 * when it asked for none. A size of 0 asks for a list's numbers alone.
 */
export function pageSize(
  limit: number | null | undefined,
  fallback: number,
): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) return fallback;
  return Math.min(Math.max(Math.floor(limit), 0), MAX_PAGE_SIZE);
}

/** A page size from a query string, or null when it holds no number. */
export function parsePageLimit(limit?: string): number | null {
  const parsed = Number.parseInt(limit ?? '', 10);
  return Number.isFinite(parsed) ? parsed : null;
}
