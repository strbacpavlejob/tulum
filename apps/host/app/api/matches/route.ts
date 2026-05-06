import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase-client";

const MATCHES_TABLE = "matches";

// GET /api/matches - Get matches by guest_id or event_id
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const guestId = searchParams.get("guest_id");
    const eventId = searchParams.get("event_id");
    const matchId = searchParams.get("id");

 

    if (matchId) {
      // Get specific match
      const { data, error } = await supabase
        .from(MATCHES_TABLE)
        .select("*")
        .eq("id", parseInt(matchId, 10))
        .single();

      if (error) {
        console.error("Error getting match:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    }

    let query = supabase.from(MATCHES_TABLE).select("*");

    if (guestId) {
      query = query.or(`guest1_id.eq.${guestId},guest2_id.eq.${guestId}`);
    }

    if (eventId) {
      query = query.eq("event_id", parseInt(eventId, 10));
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error getting matches:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error in GET /api/matches:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/matches - Create a new match
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const match = await request.json();

 

    const { data, error } = await supabase
      .from(MATCHES_TABLE)
      .insert(match)
      .select()
      .single();

    if (error) {
      console.error("Error creating match:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/matches:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/matches - Delete a match
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const matchId = searchParams.get("id");

    if (!matchId) {
      return NextResponse.json(
        { error: "Missing required parameter: id" },
        { status: 400 }
      );
    }

 

    const { error } = await supabase
      .from(MATCHES_TABLE)
      .delete()
      .eq("id", parseInt(matchId, 10));

    if (error) {
      console.error("Error deleting match:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/matches:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
