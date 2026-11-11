/**
 * PostgREST's answer for a database function it doesn't know (PGRST202): the
 * migration that adds it isn't applied yet. Callers fall back to their older
 * queries on it. An error raised inside a function that exists has another
 * code, so a broken function still fails loudly instead of falling back.
 */
export function isMissingFunction(error: { code?: string }): boolean {
  return error.code === 'PGRST202';
}
