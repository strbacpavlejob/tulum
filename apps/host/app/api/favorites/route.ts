import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase-client";

const FAVORITES_TABLE = "favorites";

// GET /api/favorites - Get user favorites
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userIdParam = searchParams.get("user_id");
    const eventIdParam = searchParams.get("event_id");

    if (!userIdParam) {
      return NextResponse.json(
        { error: "Missing required parameter: user_id" },
        { status: 400 }
      );
    }

 

    let query = supabase.from(FAVORITES_TABLE).select("*").eq("user_id", userIdParam);

    if (eventIdParam) {
      // Check if specific event is favorited
      query = query.eq("event_id", parseInt(eventIdParam, 10));
      const { data, error } = await query.single();

      if (error) {
        // Not found means not favorited
        return NextResponse.json({ isFavorite: false });
      }

      return NextResponse.json({ isFavorite: !!data });
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error getting favorites:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error in GET /api/favorites:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/favorites - Add a favorite
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user_id, event_id } = await request.json();

    if (!user_id || !event_id) {
      return NextResponse.json(
        { error: "Missing required fields: user_id and event_id" },
        { status: 400 }
      );
    }

 

    const { data, error } = await supabase
      .from(FAVORITES_TABLE)
      .insert({ user_id, event_id })
      .select()
      .single();

    if (error) {
      console.error("Error adding favorite:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/favorites:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/favorites - Remove a favorite
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const favoriteId = searchParams.get("id");

    if (!favoriteId) {
      return NextResponse.json(
        { error: "Missing required parameter: id" },
        { status: 400 }
      );
    }

 

    const { error } = await supabase
      .from(FAVORITES_TABLE)
      .delete()
      .eq("id", parseInt(favoriteId, 10));

    if (error) {
      console.error("Error removing favorite:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/favorites:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
