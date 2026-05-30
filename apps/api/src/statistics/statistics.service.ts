import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

enum EventStatus {
  Active = 'active',
  Live = 'live',
  Completed = 'completed',
  Draft = 'draft',
  Canceled = 'canceled',
}

type EventWithVenue = {
  id: string;
  title: string;
  status: string;
  start_date_time: string;
  end_date_time: string;
  venue_id: string;
  venues: { name: string } | { name: string }[] | null;
};

@Injectable()
export class StatisticsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get db() {
    return this.supabaseService.getClient();
  }

  async getStatistics(userId: string, venueId?: string, eventId?: string) {
    // 1. Get venues owned by this user
    const { data: venues, error: venuesError } = await this.db
      .from('venues')
      .select('id')
      .eq('host_id', userId);

    if (venuesError) throw venuesError;
    if (!venues || venues.length === 0) {
      return this.emptyStats();
    }

    const venueIds = venues.map((v) => v.id as string);
    const targetVenueIds = venueId ? [venueId] : venueIds;

    // 2. Get event IDs
    let eventsQuery = this.db
      .from('events')
      .select('id')
      .in('venue_id', targetVenueIds);
    if (eventId) eventsQuery = eventsQuery.eq('id', eventId);

    const { data: events, error: eventsError } = await eventsQuery;
    if (eventsError) throw eventsError;

    const eventIds = events?.map((e) => e.id as string) ?? [];
    if (eventIds.length === 0) return this.emptyStats();

    // 3. Parallel stat counts
    const [seenResult, savedResult, ticketResult, visitedResult] =
      await Promise.all([
        this.db
          .from('event_engagements')
          .select('id', { count: 'exact', head: true })
          .eq('engagement_type', 'seen')
          .in('event_id', eventIds),
        this.db
          .from('event_engagements')
          .select('id', { count: 'exact', head: true })
          .eq('engagement_type', 'saved')
          .in('event_id', eventIds),
        this.db
          .from('tickets')
          .select('id', { count: 'exact', head: true })
          .in('event_id', eventIds),
        this.db
          .from('event_sessions')
          .select('user_id', { count: 'exact', head: false })
          .in('event_id', eventIds)
          .not('entered_at', 'is', null),
      ]);

    if (seenResult.error) throw seenResult.error;
    if (savedResult.error) throw savedResult.error;
    if (ticketResult.error) throw ticketResult.error;
    if (visitedResult.error) throw visitedResult.error;

    const uniqueVisitors = new Set(
      visitedResult.data?.map((s: { user_id: string }) => s.user_id) ?? [],
    );

    // 4. Chart data (try RPC first, fall back to manual 90-day aggregation)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rpcClient = this.db as any;
    const { data: chartData, error: chartError } = (await rpcClient.rpc(
      'get_engagement_chart_data',
      {
        p_venue_ids: targetVenueIds,
        p_event_id: eventId ?? null,
      },
    )) as { data: unknown[] | null; error: unknown | null };

    const engagementChartData = chartError
      ? await this.buildChartDataManually(eventIds)
      : (chartData ?? []);

    // 5. Events table (try RPC first, fall back to manual)
    const { data: eventsTableData, error: eventsTableError } =
      (await rpcClient.rpc('get_events_statistics', {
        p_venue_ids: targetVenueIds,
        p_event_id: eventId ?? null,
      })) as { data: unknown[] | null; error: unknown | null };

    const eventsTable = eventsTableError
      ? await this.buildEventsTableManually(targetVenueIds)
      : (eventsTableData ?? []);

    return {
      eventStatistics: {
        seenCount: seenResult.count ?? 0,
        savedCount: savedResult.count ?? 0,
        ticketCount: ticketResult.count ?? 0,
        visitedCount: uniqueVisitors.size,
      },
      eventsTable,
      chartData: engagementChartData,
    };
  }

  private emptyStats() {
    return {
      eventStatistics: {
        seenCount: 0,
        savedCount: 0,
        ticketCount: 0,
        visitedCount: 0,
      },
      eventsTable: [],
      chartData: [],
    };
  }

  private async buildChartDataManually(eventIds: string[]) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    const dateMap = new Map<
      string,
      { views: number; bookmarks: number; attended: number }
    >();
    for (
      const d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      dateMap.set(d.toISOString().split('T')[0], {
        views: 0,
        bookmarks: 0,
        attended: 0,
      });
    }

    const [viewsData, bookmarksData, attendedData] = await Promise.all([
      this.db
        .from('event_engagements')
        .select('created_at')
        .eq('engagement_type', 'seen')
        .in('event_id', eventIds)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      this.db
        .from('event_engagements')
        .select('created_at')
        .eq('engagement_type', 'saved')
        .in('event_id', eventIds)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      this.db
        .from('event_sessions')
        .select('entered_at, user_id')
        .not('entered_at', 'is', null)
        .in('event_id', eventIds)
        .gte('entered_at', startDate.toISOString())
        .lte('entered_at', endDate.toISOString()),
    ]);

    viewsData.data?.forEach((e: { created_at: string }) => {
      const key = e.created_at.split('T')[0];
      const entry = dateMap.get(key);
      if (entry) entry.views++;
    });

    bookmarksData.data?.forEach((e: { created_at: string }) => {
      const key = e.created_at.split('T')[0];
      const entry = dateMap.get(key);
      if (entry) entry.bookmarks++;
    });

    const attendedByDate = new Map<string, Set<string>>();
    attendedData.data?.forEach((s: { entered_at: string; user_id: string }) => {
      const key = s.entered_at.split('T')[0];
      if (!attendedByDate.has(key)) attendedByDate.set(key, new Set());
      attendedByDate.get(key)!.add(s.user_id);
    });
    attendedByDate.forEach((users, key) => {
      const entry = dateMap.get(key);
      if (entry) entry.attended = users.size;
    });

    return Array.from(dateMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async buildEventsTableManually(venueIds: string[]) {
    const { data: eventsWithVenues } = await this.db
      .from('events')
      .select(
        'id, title, status, start_date_time, end_date_time, venue_id, venues(name)',
      )
      .in('venue_id', venueIds)
      .order('start_date_time', { ascending: false });

    if (!eventsWithVenues || eventsWithVenues.length === 0) return [];

    const ids = eventsWithVenues.map((e) => (e as { id: string }).id);

    const [seenEng, savedEng, ticketsData, sessionsData] = await Promise.all([
      this.db
        .from('event_engagements')
        .select('event_id, id')
        .eq('engagement_type', 'seen')
        .in('event_id', ids),
      this.db
        .from('event_engagements')
        .select('event_id, id')
        .eq('engagement_type', 'saved')
        .in('event_id', ids),
      this.db.from('tickets').select('event_id, id').in('event_id', ids),
      this.db
        .from('event_sessions')
        .select('event_id, user_id')
        .not('entered_at', 'is', null)
        .in('event_id', ids),
    ]);

    const seenByEvent: Record<string, number> = {};
    const savedByEvent: Record<string, number> = {};
    const ticketsByEvent: Record<string, number> = {};
    const attendeesByEvent: Record<string, Set<string>> = {};

    seenEng.data?.forEach((e: { event_id: string }) => {
      seenByEvent[e.event_id] = (seenByEvent[e.event_id] ?? 0) + 1;
    });
    savedEng.data?.forEach((e: { event_id: string }) => {
      savedByEvent[e.event_id] = (savedByEvent[e.event_id] ?? 0) + 1;
    });
    ticketsData.data?.forEach((t: { event_id: string }) => {
      ticketsByEvent[t.event_id] = (ticketsByEvent[t.event_id] ?? 0) + 1;
    });
    sessionsData.data?.forEach((s: { event_id: string; user_id: string }) => {
      if (!attendeesByEvent[s.event_id])
        attendeesByEvent[s.event_id] = new Set();
      attendeesByEvent[s.event_id].add(s.user_id);
    });

    return eventsWithVenues.map((event) => {
      const e = event as unknown as EventWithVenue;
      const views = seenByEvent[e.id] ?? 0;
      const bookmarks = savedByEvent[e.id] ?? 0;
      const tickets = ticketsByEvent[e.id] ?? 0;
      const attendees = attendeesByEvent[e.id]?.size ?? 0;
      const conversionRate =
        views > 0 ? ((tickets / views) * 100).toFixed(1) : '0.0';
      const venueName = Array.isArray(e.venues)
        ? (e.venues[0]?.name ?? 'Unknown')
        : (e.venues?.name ?? 'Unknown');

      return {
        id: e.id,
        eventId: e.id,
        header: e.title,
        venue: venueName,
        status: this.getDisplayStatus(e),
        views: views.toString(),
        bookmarks: bookmarks.toString(),
        tickets: attendees.toString(),
        conversionRate: `${conversionRate}%`,
      };
    });
  }

  private getDisplayStatus(event: EventWithVenue): string {
    const now = new Date();
    const start = new Date(event.start_date_time);
    const end = new Date(event.end_date_time);

    if (event.status.toLowerCase() === 'canceled') return EventStatus.Canceled;
    if (event.status.toLowerCase() === 'draft') return EventStatus.Draft;
    if (event.status.toLowerCase() === 'active') {
      if (now >= start && now <= end) return EventStatus.Live;
      if (now > end) return EventStatus.Completed;
      return EventStatus.Active;
    }
    return event.status;
  }
}
