import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { EventStatus } from "@/components/event-status-chip";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const venueId = searchParams.get("venue_id");
    const eventId = searchParams.get("event_id");

    // Create service role client to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // First, get all venue IDs owned by this user
    const { data: venues, error: venuesError } = await supabaseAdmin
      .from("venues")
      .select("id")
      .eq("host_id", userId);

    if (venuesError) {
      console.error("Error getting venues:", venuesError);
      return NextResponse.json(
        { error: venuesError.message },
        { status: 500 }
      );
    }

    if (!venues || venues.length === 0) {
      return NextResponse.json({
        seenCount: 0,
        savedCount: 0,
        ticketCount: 0,
        visitedCount: 0,
      });
    }

    const venueIds = venues.map((v) => v.id);

    // Filter by specific venue if provided
    const targetVenueIds = venueId
      ? [parseInt(venueId)]
      : venueIds;

    // Build base query for events owned by this user
    let eventsQuery = supabaseAdmin
      .from("events")
      .select("id")
      .in("venue_id", targetVenueIds);

    if (eventId) {
      eventsQuery = eventsQuery.eq("id", eventId);
    }

    const { data: events, error: eventsError } = await eventsQuery;

    if (eventsError) {
      console.error("Error getting events:", eventsError);
      return NextResponse.json(
        { error: eventsError.message },
        { status: 500 }
      );
    }

    const eventIds = events?.map((e) => e.id) || [];

    if (eventIds.length === 0) {
      return NextResponse.json({
        seenCount: 0,
        savedCount: 0,
        ticketCount: 0,
        visitedCount: 0,
      });
    }

    // Fetch statistics in parallel
    const [seenResult, savedResult, ticketResult, visitedResult] =
      await Promise.all([
        // Seen events statistics
        supabaseAdmin
          .from("event_engagements")
          .select("id", { count: "exact", head: true })
          .eq("engagement_type", "seen")
          .in("event_id", eventIds),

        // Saved events statistics
        supabaseAdmin
          .from("event_engagements")
          .select("id", { count: "exact", head: true })
          .eq("engagement_type", "saved")
          .in("event_id", eventIds),

        // Ticket statistics
        supabaseAdmin
          .from("tickets")
          .select("id", { count: "exact", head: true })
          .in("event_id", eventIds),

        // Visited events statistics (unique users who entered)
        supabaseAdmin
          .from("event_sessions")
          .select("user_id", { count: "exact", head: false })
          .in("event_id", eventIds)
          .not("entered_at", "is", null),
      ]);

    // Check for errors
    if (seenResult.error) {
      console.error("Error getting seen count:", seenResult.error);
      return NextResponse.json(
        { error: seenResult.error.message },
        { status: 500 }
      );
    }

    if (savedResult.error) {
      console.error("Error getting saved count:", savedResult.error);
      return NextResponse.json(
        { error: savedResult.error.message },
        { status: 500 }
      );
    }

    if (ticketResult.error) {
      console.error("Error getting ticket count:", ticketResult.error);
      return NextResponse.json(
        { error: ticketResult.error.message },
        { status: 500 }
      );
    }

    if (visitedResult.error) {
      console.error("Error getting visited count:", visitedResult.error);
      return NextResponse.json(
        { error: visitedResult.error.message },
        { status: 500 }
      );
    }

    // Count unique visitors
    const uniqueVisitors = new Set(
      visitedResult.data?.map((session) => session.user_id) || []
    );

    // Fetch chart data for engagement trends
    const { data: chartData, error: chartError } = await supabaseAdmin.rpc(
      "get_engagement_chart_data",
      {
        p_venue_ids: targetVenueIds,
        p_event_id: eventId ? parseInt(eventId) : null,
      }
    );

    // If RPC doesn't exist, fall back to manual chart data generation
    let engagementChartData = [];
    if (chartError) {
      console.log("Chart RPC not available, using manual generation");
      
      // Generate date series for last 90 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);
      
      const dateMap = new Map<string, { views: number; bookmarks: number; attended: number }>();
      
      // Initialize all dates with 0 values
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        dateMap.set(dateStr, { views: 0, bookmarks: 0, attended: 0 });
      }
      
      // Fetch views data
      const { data: viewsData } = await supabaseAdmin
        .from("event_engagements")
        .select("created_at, event_id")
        .eq("engagement_type", "seen")
        .in("event_id", eventIds)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());
      
      // Fetch bookmarks data
      const { data: bookmarksData } = await supabaseAdmin
        .from("event_engagements")
        .select("created_at, event_id")
        .eq("engagement_type", "saved")
        .in("event_id", eventIds)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());
      
      // Fetch attended data
      const { data: attendedData } = await supabaseAdmin
        .from("event_sessions")
        .select("entered_at, user_id, event_id")
        .not("entered_at", "is", null)
        .in("event_id", eventIds)
        .gte("entered_at", startDate.toISOString())
        .lte("entered_at", endDate.toISOString());
      
      // Aggregate views by date
      viewsData?.forEach((engagement) => {
        const dateStr = engagement.created_at.split('T')[0];
        const entry = dateMap.get(dateStr);
        if (entry) entry.views++;
      });
      
      // Aggregate bookmarks by date
      bookmarksData?.forEach((engagement) => {
        const dateStr = engagement.created_at.split('T')[0];
        const entry = dateMap.get(dateStr);
        if (entry) entry.bookmarks++;
      });
      
      // Aggregate attended by date (unique users per day)
      const attendedByDate = new Map<string, Set<string>>();
      attendedData?.forEach((session) => {
        const dateStr = session.entered_at!.split('T')[0];
        if (!attendedByDate.has(dateStr)) {
          attendedByDate.set(dateStr, new Set());
        }
        attendedByDate.get(dateStr)!.add(session.user_id);
      });
      
      attendedByDate.forEach((users, dateStr) => {
        const entry = dateMap.get(dateStr);
        if (entry) entry.attended = users.size;
      });
      
      // Convert to array format
      engagementChartData = Array.from(dateMap.entries())
        .map(([date, data]) => ({
          date,
          views: data.views,
          bookmarks: data.bookmarks,
          attended: data.attended,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } else {
      engagementChartData = chartData || [];
    }

    // Fetch detailed event statistics for the table
    // Using a raw SQL query to get aggregated data per event efficiently
    const { data: eventsTableData, error: eventsTableError } =
      await supabaseAdmin.rpc("get_events_statistics", {
        p_venue_ids: targetVenueIds,
        p_event_id: eventId ? parseInt(eventId) : null,
      });

    // If RPC doesn't exist, fall back to manual aggregation
    let eventsTable = [];
    if (eventsTableError) {
      console.log("RPC not available, using manual aggregation");

      // Fetch all necessary data for events table
      const eventsWithVenuesResult = await supabaseAdmin
        .from("events")
        .select("id, title, status, start_date_time, end_date_time, venue_id, venues(name)")
        .in("venue_id", targetVenueIds)
        .order("start_date_time", { ascending: false });

      if (eventsWithVenuesResult.error) {
        console.error(
          "Error getting events with venues:",
          eventsWithVenuesResult.error
        );
        return NextResponse.json(
          { error: eventsWithVenuesResult.error.message },
          { status: 500 }
        );
      }

      type EventWithVenue = {
        id: number;
        title: string;
        status: string;
        start_date_time: string;
        end_date_time: string;
        venue_id: number;
        venues: { name: string } | { name: string }[] | null;
      };

      // Helper function to determine display status
      const getDisplayStatus = (event: EventWithVenue): string => {
        const now = new Date();
        const startDate = new Date(event.start_date_time);
        const endDate = new Date(event.end_date_time);

        // If canceled, always show canceled
        if (event.status.toLowerCase() === "canceled") {
          return EventStatus.Canceled;
        }

        // If draft, show draft
        if (event.status.toLowerCase() === "draft") {
          return EventStatus.Draft;
        }

        // If active, check time window
        if (event.status.toLowerCase() === "active") {
          // Event is currently happening
          if (now >= startDate && now <= endDate) {
            return EventStatus.Live;
          }
          // Event has ended
          if (now > endDate) {
            return EventStatus.Completed;
          }
          // Event hasn't started yet
          return EventStatus.Active;
        }

        // Fallback to original status
        return event.status;
      };

      // Fetch engagements for all events
      const [seenEngagements, savedEngagements, ticketsData, sessionsData] =
        await Promise.all([
          supabaseAdmin
            .from("event_engagements")
            .select("event_id, id")
            .eq("engagement_type", "seen")
            .in(
              "event_id",
              eventsWithVenuesResult.data?.map((e) => e.id) || []
            ),

          supabaseAdmin
            .from("event_engagements")
            .select("event_id, id")
            .eq("engagement_type", "saved")
            .in(
              "event_id",
              eventsWithVenuesResult.data?.map((e) => e.id) || []
            ),

          supabaseAdmin
            .from("tickets")
            .select("event_id, id")
            .in(
              "event_id",
              eventsWithVenuesResult.data?.map((e) => e.id) || []
            ),

          supabaseAdmin
            .from("event_sessions")
            .select("event_id, user_id")
            .not("entered_at", "is", null)
            .in(
              "event_id",
              eventsWithVenuesResult.data?.map((e) => e.id) || []
            ),
        ]);

      // Group data by event_id
      const seenByEvent: Record<number, number> = {};
      const savedByEvent: Record<number, number> = {};
      const ticketsByEvent: Record<number, number> = {};
      const attendeesByEvent: Record<number, Set<string>> = {};

      seenEngagements.data?.forEach((engagement) => {
        seenByEvent[engagement.event_id] =
          (seenByEvent[engagement.event_id] || 0) + 1;
      });

      savedEngagements.data?.forEach((engagement) => {
        savedByEvent[engagement.event_id] =
          (savedByEvent[engagement.event_id] || 0) + 1;
      });

      ticketsData.data?.forEach((ticket) => {
        ticketsByEvent[ticket.event_id] =
          (ticketsByEvent[ticket.event_id] || 0) + 1;
      });

      sessionsData.data?.forEach((session) => {
        if (!attendeesByEvent[session.event_id]) {
          attendeesByEvent[session.event_id] = new Set();
        }
        attendeesByEvent[session.event_id].add(session.user_id);
      });

      // Build the events table
      eventsTable =
        eventsWithVenuesResult.data?.map((event: EventWithVenue) => {
          const views = seenByEvent[event.id] || 0;
          const bookmarks = savedByEvent[event.id] || 0;
          const tickets = ticketsByEvent[event.id] || 0;
          const attendees = attendeesByEvent[event.id]?.size || 0;
          const conversionRate =
            views > 0 ? ((tickets / views) * 100).toFixed(1) : "0.0";

          return {
            id: event.id,
            header: event.title,
            venue: Array.isArray(event.venues) 
              ? event.venues[0]?.name || "Unknown"
              : event.venues?.name || "Unknown",
            status: getDisplayStatus(event),
            views: views.toString(),
            bookmarks: bookmarks.toString(),
            tickets: attendees.toString(),
            conversionRate: `${conversionRate}%`,
          };
        }) || [];
    } else {
      eventsTable = eventsTableData || [];
    }

    return NextResponse.json({
      eventStatistics: {
        seenCount: seenResult.count || 0,
        savedCount: savedResult.count || 0,
        ticketCount: ticketResult.count || 0,
        visitedCount: uniqueVisitors.size,
      },
      eventsTable,
      chartData: engagementChartData,
    });
  } catch (error) {
    console.error("Error in GET /api/statistics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
