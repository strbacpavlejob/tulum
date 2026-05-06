import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase-client";

const GUESTS_TABLE = "guests";

// GET /api/users/guests - Get guest by user_id
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userIdParam = searchParams.get("user_id");

    if (!userIdParam) {
      return NextResponse.json(
        { error: "Missing required parameter: user_id" },
        { status: 400 }
      );
    }

 

    const { data, error } = await supabase
      .from(GUESTS_TABLE)
      .select("*")
      .eq("user_id", userIdParam)
      .single();

    if (error) {
      console.error("Error getting guest:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/users/guests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/users/guests - Create a new guest
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guest = await request.json();

 

    const { data, error } = await supabase
      .from(GUESTS_TABLE)
      .insert(guest)
      .select()
      .single();

    if (error) {
      console.error("Error creating guest:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/users/guests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/users/guests - Update a guest
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user_id, updates } = await request.json();

    if (!user_id || !updates) {
      return NextResponse.json(
        { error: "Missing required fields: user_id and updates" },
        { status: 400 }
      );
    }

 

    const { data, error } = await supabase
      .from(GUESTS_TABLE)
      .update(updates)
      .eq("user_id", user_id)
      .select()
      .single();

    if (error) {
      console.error("Error updating guest:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PATCH /api/users/guests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/guests - Delete a guest
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userIdParam = searchParams.get("user_id");

    if (!userIdParam) {
      return NextResponse.json(
        { error: "Missing required parameter: user_id" },
        { status: 400 }
      );
    }

 

    const { error } = await supabase
      .from(GUESTS_TABLE)
      .delete()
      .eq("user_id", userIdParam);

    if (error) {
      console.error("Error deleting guest:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/users/guests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
