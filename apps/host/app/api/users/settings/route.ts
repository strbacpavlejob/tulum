import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase-client";

const SETTINGS_TABLE = "settings";

// GET /api/users/settings - Get user settings
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
      .from(SETTINGS_TABLE)
      .select("*")
      .eq("user_id", userIdParam)
      .single();

    if (error) {
      console.error("Error getting settings:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/users/settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/users/settings - Update user settings
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user_id, settings } = await request.json();

    if (!user_id || !settings) {
      return NextResponse.json(
        { error: "Missing required fields: user_id and settings" },
        { status: 400 }
      );
    }

 

    const { data, error } = await supabase
      .from(SETTINGS_TABLE)
      .update(settings)
      .eq("user_id", user_id)
      .select()
      .single();

    if (error) {
      console.error("Error updating settings:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PATCH /api/users/settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
