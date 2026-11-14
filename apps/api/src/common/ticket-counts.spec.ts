/**
 * Guests going per event, counted without PostgREST's row cap stopping the
 * count (BUG-036 follow-up, 13 Nov 2026): at the Maskenbal one event has
 * thousands of tickets, and Supabase returns at most 1,000 rows a request.
 */
import { describe, expect, it } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import { countTicketsByEvent } from './ticket-counts';

type Row = { id: string; event_id: string };
type Request = { head: boolean; counted: boolean; rows: number };

// The tickets table behind a fake PostgREST that returns at most `cap` rows a
// request, as Supabase does with 1,000.
function fakeDb(tickets: Row[], cap = 1000, failWith?: { code: string }) {
  const requests: Request[] = [];
  const from = () => {
    const filters: ((row: Row) => boolean)[] = [];
    let head = false;
    let counted = false;
    let range: [number, number] | null = null;
    const query = {
      select: (
        _columns: string,
        options?: { count?: string; head?: boolean },
      ) => {
        head = options?.head === true;
        counted = options?.count === 'exact';
        return query;
      },
      eq: (column: keyof Row, value: string) => {
        filters.push((row) => row[column] === value);
        return query;
      },
      in: (column: keyof Row, values: string[]) => {
        filters.push((row) => values.includes(row[column]));
        return query;
      },
      order: () => query,
      range: (start: number, end: number) => {
        range = [start, end];
        return query;
      },
      then: (
        resolve: (value: unknown) => unknown,
        reject: (reason: unknown) => unknown,
      ) => {
        const matching = tickets
          .filter((row) => filters.every((f) => f(row)))
          .sort((a, b) => a.id.localeCompare(b.id));
        const [start, end] = range ?? [0, matching.length - 1];
        const page = head
          ? []
          : matching.slice(start, Math.min(end + 1, start + cap));
        requests.push({ head, counted, rows: page.length });
        return Promise.resolve(
          failWith
            ? { data: null, count: null, error: failWith }
            : {
                data: head ? null : page,
                count: counted ? matching.length : null,
                error: null,
              },
        ).then(resolve, reject);
      },
    };
    return query;
  };
  return { db: { from } as unknown as SupabaseClient, requests };
}

const ticketsFor = (eventId: string, n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `${eventId}-${String(i).padStart(5, '0')}`,
    event_id: eventId,
  }));

describe('countTicketsByEvent', () => {
  it('counts each of a few events in the database, moving no rows', async () => {
    const { db, requests } = fakeDb([
      ...ticketsFor('maskenbal', 5000),
      ...ticketsFor('akustik', 2),
    ]);

    const counts = await countTicketsByEvent(db, [
      'maskenbal',
      'akustik',
      'empty',
      'akustik',
    ]);

    expect(Object.fromEntries(counts)).toEqual({
      maskenbal: 5000,
      akustik: 2,
      empty: 0,
    });
    expect(requests).toHaveLength(3);
    expect(requests.every((r) => r.head && r.counted && r.rows === 0)).toBe(
      true,
    );
  });

  it('reads many events a page at a time until every ticket is counted', async () => {
    const events = Array.from({ length: 12 }, (_, i) => `event-${i}`);
    const { db, requests } = fakeDb([
      ...ticketsFor('event-0', 2300),
      ...events.slice(1).flatMap((id, i) => ticketsFor(id, i)),
    ]);

    const counts = await countTicketsByEvent(db, events);

    expect(counts.get('event-0')).toBe(2300);
    expect(counts.get('event-11')).toBe(10);
    expect([...counts.values()].reduce((a, b) => a + b, 0)).toBe(2355);
    expect(requests.map((r) => r.rows)).toEqual([1000, 1000, 355]);
    expect(requests.map((r) => r.counted)).toEqual([true, false, false]);
  });

  it('keeps reading when the server returns fewer rows than a page', async () => {
    const events = Array.from({ length: 11 }, (_, i) => `event-${i}`);
    const { db, requests } = fakeDb(ticketsFor('event-3', 1100), 400);

    const counts = await countTicketsByEvent(db, events);

    expect(counts.get('event-3')).toBe(1100);
    expect(requests.map((r) => r.rows)).toEqual([400, 400, 300]);
  });

  it('asks nothing for no events', async () => {
    const { db, requests } = fakeDb(ticketsFor('maskenbal', 3));

    expect((await countTicketsByEvent(db, [])).size).toBe(0);
    expect(requests).toHaveLength(0);
  });

  it('passes a database error on', async () => {
    const timeout = { code: '57014' };
    const few = fakeDb([], 1000, timeout);
    const many = fakeDb([], 1000, timeout);

    await expect(countTicketsByEvent(few.db, ['a'])).rejects.toBe(timeout);
    await expect(
      countTicketsByEvent(
        many.db,
        Array.from({ length: 11 }, (_, i) => `e${i}`),
      ),
    ).rejects.toBe(timeout);
  });
});
