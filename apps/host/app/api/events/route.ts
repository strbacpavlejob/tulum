import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { uploadToR2 } from "@/lib/r2-client";

const EVENTS_TABLE = "events";

interface EventCreateData {
  venue_id: number;
  title: string;
  description: string;
  start_date_time: string;
  end_date_time: string;
  tags: string[];
  status: string;
}

// GET /api/events - Get all events or events by venue_id/status
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const venueId = searchParams.get("venue_id");
    const status = searchParams.get("status");

    // Create service role client to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // First, get all venue IDs owned by this user
    const { data: venues, error: venuesError } = await supabaseAdmin
      .from("venues")
      .select("id")
      .eq("host_id", userId);

    if (venuesError) {
      console.error("Error getting venues:", venuesError);
      return NextResponse.json({ error: venuesError.message }, { status: 500 });
    }

    // If user has no venues, return empty array
    if (!venues || venues.length === 0) {
      return NextResponse.json([]);
    }

    // Extract venue IDs
    const venueIds = venues.map((v) => v.id);

    // Query events that belong to user's venues
    let query = supabaseAdmin.from(EVENTS_TABLE).select("*").in("venue_id", venueIds);

    if (venueId) {
      query = query.eq("venue_id", parseInt(venueId, 10));
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error getting events:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error in GET /api/events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/events - Create a new event
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";
    let event: EventCreateData;
    let imageFile: File | null = null;

    // Handle both JSON and FormData
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      
      // Extract event data
      event = {
        venue_id: parseInt(formData.get("venue_id") as string, 10),
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        start_date_time: formData.get("start_date_time") as string,
        end_date_time: formData.get("end_date_time") as string,
        tags: JSON.parse(formData.get("tags") as string || "[]"),
        status: formData.get("status") as string,
      };
      
      // Extract image file if present
      imageFile = formData.get("picture") as File | null;
    } else {
      event = await request.json() as EventCreateData;
    }

    // Create service role client to bypass RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the user owns the venue for this event
    const { data: venue } = await supabaseAdmin
      .from("venues")
      .select("host_id")
      .eq("id", event.venue_id)
      .single();


    if (!venue || venue.host_id !== userId) {
      return NextResponse.json(
        { error: "Venue not found or unauthorized" },
        { status: 403 }
      );
    }

    // Upload image to storage if provided
    let pictureUrl: string | null = null;
    if (imageFile && imageFile.size > 0) {
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const key = `event-images/${userId}/${event.venue_id}/${timestamp}-${randomStr}.webp`;

      // Convert file to buffer
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to Cloudflare R2
      pictureUrl = await uploadToR2(key, buffer, "image/webp");
    }

    // Add picture_url to event data
    const eventData = {
      ...event,
      picture_url: pictureUrl,
    };

    const { data, error } = await supabaseAdmin
      .from(EVENTS_TABLE)
      .insert(eventData)
      .select()
      .single();

    if (error) {
      console.error("Error creating event:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
