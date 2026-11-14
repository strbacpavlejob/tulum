import type { SupabaseClient } from '@supabase/supabase-js';

const TICKETS_TABLE = 'tickets';
/** Rows asked for a page. Supabase's PostgREST returns at most 1,000. */
const PAGE_ROWS = 1000;
/** Up to this many events are counted one by one. */
const COUNT_EACH_UP_TO = 10;

/**
 * How many tickets (guests going) each event has. Reading every ticket row
 * in one request stopped at PostgREST's row cap (1,000 on Supabase), so a
 * big event, or a list whose events had more tickets between them, showed
 * too few.
 *
 * A few events, such as one guest's tickets, are each counted in the
 * database with a head-only count, which moves no rows. More events, such as
 * the feed, are read as ticket rows a page at a time until the exact total
 * is in: one request on most days.
 */
export async function countTicketsByEvent(
  db: SupabaseClient,
  eventIds: string[],
): Promise<Map<string, number>> {
  const ids = [...new Set(eventIds)];
  const counts = new Map<string, number>();
  if (ids.length === 0) return counts;

  if (ids.length <= COUNT_EACH_UP_TO) {
    await Promise.all(
      ids.map(async (id) => {
        const { count, error } = await db
          .from(TICKETS_TABLE)
          .select('id', { count: 'exact', head: true })
          .eq('event_id', id);
        if (error) throw error;
        counts.set(id, count ?? 0);
      }),
    );
    return counts;
  }

  let total = Infinity;
  let read = 0;
  while (read < total) {
    const { data, error, count } = await db
      .from(TICKETS_TABLE)
      .select('event_id', read === 0 ? { count: 'exact' } : undefined)
      .in('event_id', ids)
      .order('id')
      .range(read, read + PAGE_ROWS - 1);
    if (error) throw error;
    if (read === 0) total = count ?? 0;
    const rows = (data ?? []) as { event_id: string }[];
    // Tickets deleted while the pages are read can leave a page short.
    if (rows.length === 0) break;
    for (const row of rows) {
      counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1);
    }
    read += rows.length;
  }
  return counts;
}
