import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// GET /api/events/active - Get all active events with their venue data (public, no auth required)
export async function GET() {
  try {
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

    const now = new Date().toISOString();
    const tenDaysFromNow = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

    const { data: events, error: eventsError } = await supabaseAdmin
      .from("events")
      .select("id, title, description, picture_url, venue_id, status, start_date_time, end_date_time, tags")
      .eq("status", "active")
      .lte("start_date_time", tenDaysFromNow)
      .gte("end_date_time", now)
      .order("start_date_time", { ascending: true });

    if (eventsError) {
      console.error("Error fetching active events:", eventsError);
      return NextResponse.json(
        { error: eventsError.message },
        { status: 500 }
      );
    }

    if (!events || events.length === 0) {
      return NextResponse.json([]);
    }

    // Keep only the earliest event per venue
    const seenVenues = new Set<number>();
    const uniqueEvents = events.filter((event) => {
      if (seenVenues.has(event.venue_id)) return false;
      seenVenues.add(event.venue_id);
      return true;
    });

    const venueIds = [...new Set(uniqueEvents.map((e) => e.venue_id))];

    const { data: venues, error: venuesError } = await supabaseAdmin
      .from("venues")
      .select("id, name, latitude, longitude, address, capacity, venue_type, picture_url")
      .in("id", venueIds);

    if (venuesError) {
      console.error("Error fetching venues:", venuesError);
      return NextResponse.json(
        { error: venuesError.message },
        { status: 500 }
      );
    }

    const venueMap = new Map(venues?.map((v) => [v.id, v]) ?? []);

    const locations = uniqueEvents
      .map((event) => {
        const venue = venueMap.get(event.venue_id);
        if (!venue) return null;

        return {
          id: event.id,
          name: event.title,
          longitude: venue.longitude,
          latitude: venue.latitude,
          type: venue.venue_type,
          capacity: venue.capacity,
          address: venue.address,
          description: event.description,
          picture: event.picture_url,
          picture_urls: venue.picture_url ? [venue.picture_url] : [],
        };
      })
      .filter(Boolean);

    return NextResponse.json(locations);
  } catch (error) {
    console.error("Error in GET /api/events/active:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
