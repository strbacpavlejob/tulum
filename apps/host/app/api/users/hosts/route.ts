import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase-client";

const HOSTS_TABLE = "hosts";

// GET /api/users/hosts - Get host by user_id
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
      .from(HOSTS_TABLE)
      .select("*")
      .eq("user_id", userIdParam)
      .single();

    if (error) {
      console.error("Error getting host:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/users/hosts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/users/hosts - Create a new host
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const host = await request.json();

 

    const { data, error } = await supabase
      .from(HOSTS_TABLE)
      .insert(host)
      .select()
      .single();

    if (error) {
      console.error("Error creating host:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/users/hosts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/hosts - Delete a host
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
      .from(HOSTS_TABLE)
      .delete()
      .eq("user_id", userIdParam);

    if (error) {
      console.error("Error deleting host:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/users/hosts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
