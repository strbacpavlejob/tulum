import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase-client";

const CHAT_MESSAGES_TABLE = "chat_messages";

// GET /api/chats/messages - Get messages for a chat
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const chatId = searchParams.get("chat_id");

    if (!chatId) {
      return NextResponse.json(
        { error: "Missing required parameter: chat_id" },
        { status: 400 }
      );
    }

 

    const { data, error } = await supabase
      .from(CHAT_MESSAGES_TABLE)
      .select("*")
      .eq("chat_id", parseInt(chatId, 10))
      .order("sent_at", { ascending: true });

    if (error) {
      console.error("Error getting chat messages:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error in GET /api/chats/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/chats/messages - Send a new message
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const message = await request.json();

 

    const { data, error } = await supabase
      .from(CHAT_MESSAGES_TABLE)
      .insert(message)
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/chats/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/chats/messages - Mark a message as read
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message_id } = await request.json();

    if (!message_id) {
      return NextResponse.json(
        { error: "Missing required field: message_id" },
        { status: 400 }
      );
    }

 

    const { data, error } = await supabase
      .from(CHAT_MESSAGES_TABLE)
      .update({ read: true })
      .eq("id", message_id)
      .select()
      .single();

    if (error) {
      console.error("Error marking message as read:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PATCH /api/chats/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/chats/messages - Delete a message
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const messageId = searchParams.get("id");

    if (!messageId) {
      return NextResponse.json(
        { error: "Missing required parameter: id" },
        { status: 400 }
      );
    }

 

    const { error } = await supabase
      .from(CHAT_MESSAGES_TABLE)
      .delete()
      .eq("id", parseInt(messageId, 10));

    if (error) {
      console.error("Error deleting message:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/chats/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
