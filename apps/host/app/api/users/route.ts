import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase-client";

const USERS_TABLE = "users";

// GET /api/users - Get user by ID or search by email
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userIdParam = searchParams.get("id");
    const emailSearch = searchParams.get("email");

 

    if (userIdParam) {
      // Get specific user
      const { data, error } = await supabase
        .from(USERS_TABLE)
        .select("*")
        .eq("id", userIdParam)
        .single();

      if (error) {
        console.error("Error getting user:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data);
    } else if (emailSearch) {
      // Search users by email
      const { data, error } = await supabase
        .from(USERS_TABLE)
        .select("*")
        .ilike("email", `%${emailSearch}%`);

      if (error) {
        console.error("Error finding users:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data || []);
    }

    return NextResponse.json(
      { error: "Missing required parameter: id or email" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in GET /api/users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await request.json();

 

    const { data, error } = await supabase
      .from(USERS_TABLE)
      .insert(user)
      .select()
      .single();

    if (error) {
      console.error("Error creating user:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/users - Update a user
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, updates } = await request.json();

    if (!id || !updates) {
      return NextResponse.json(
        { error: "Missing required fields: id and updates" },
        { status: 400 }
      );
    }

 

    const { data, error } = await supabase
      .from(USERS_TABLE)
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating user:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PATCH /api/users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/users - Delete a user
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userIdParam = searchParams.get("id");

    if (!userIdParam) {
      return NextResponse.json(
        { error: "Missing required parameter: id" },
        { status: 400 }
      );
    }

 

    const { error } = await supabase
      .from(USERS_TABLE)
      .delete()
      .eq("id", userIdParam);

    if (error) {
      console.error("Error deleting user:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
