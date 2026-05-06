import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase-client";

const TICKETS_TABLE = "tickets";

// GET /api/tickets - Get tickets by guest_id or event_id
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const guestId = searchParams.get("guest_id");
    const eventId = searchParams.get("event_id");
    const ticketId = searchParams.get("id");

 

    if (ticketId) {
      // Get specific ticket
      const { data, error } = await supabase
        .from(TICKETS_TABLE)
        .select("*")
        .eq("id", parseInt(ticketId, 10))
        .single();

      if (error) {
        console.error("Error getting ticket:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    }

    let query = supabase.from(TICKETS_TABLE).select("*");

    if (guestId) {
      query = query.eq("guest_id", guestId);
    }

    if (eventId) {
      query = query.eq("event_id", parseInt(eventId, 10));
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error getting tickets:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error in GET /api/tickets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/tickets - Create a new ticket
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ticket = await request.json();

 

    const { data, error } = await supabase
      .from(TICKETS_TABLE)
      .insert(ticket)
      .select()
      .single();

    if (error) {
      console.error("Error creating ticket:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/tickets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/tickets - Delete a ticket
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const ticketId = searchParams.get("id");

    if (!ticketId) {
      return NextResponse.json(
        { error: "Missing required parameter: id" },
        { status: 400 }
      );
    }

 

    const { error } = await supabase
      .from(TICKETS_TABLE)
      .delete()
      .eq("id", parseInt(ticketId, 10));

    if (error) {
      console.error("Error deleting ticket:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/tickets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
