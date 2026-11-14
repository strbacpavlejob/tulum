/**
 * PostgREST's and Postgres's answers for a table or column that doesn't
 * exist yet: the migration that adds it isn't applied. PGRST204 and PGRST205
 * are a column or table missing from PostgREST's schema cache; 42703 and
 * 42P01 come from Postgres itself.
 */
export function isMissingTableOrColumn(
  error: { code?: string } | null | undefined,
): boolean {
  return ['PGRST204', 'PGRST205', '42703', '42P01'].includes(error?.code ?? '');
}
