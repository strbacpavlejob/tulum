import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase-client";

const CHATS_TABLE = "chats";

// GET /api/chats - Get chat by id or match_id
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const chatId = searchParams.get("id");
    const matchId = searchParams.get("match_id");

    if (!chatId && !matchId) {
      return NextResponse.json(
        { error: "Missing required parameter: id or match_id" },
        { status: 400 }
      );
    }

 

    let query = supabase.from(CHATS_TABLE).select("*");

    if (chatId) {
      query = query.eq("id", parseInt(chatId, 10));
    } else if (matchId) {
      query = query.eq("match_id", parseInt(matchId, 10));
    }

    const { data, error } = await query.single();

    if (error) {
      console.error("Error getting chat:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/chats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/chats - Create a new chat
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const chat = await request.json();

 

    const { data, error } = await supabase
      .from(CHATS_TABLE)
      .insert(chat)
      .select()
      .single();

    if (error) {
      console.error("Error creating chat:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/chats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/chats - Delete a chat
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const chatId = searchParams.get("id");

    if (!chatId) {
      return NextResponse.json(
        { error: "Missing required parameter: id" },
        { status: 400 }
      );
    }

 

    const { error } = await supabase
      .from(CHATS_TABLE)
      .delete()
      .eq("id", parseInt(chatId, 10));

    if (error) {
      console.error("Error deleting chat:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/chats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
