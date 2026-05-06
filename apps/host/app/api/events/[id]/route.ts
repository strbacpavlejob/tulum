import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-client";
import { uploadToR2, deleteFromR2, extractR2Key } from "@/lib/r2-client";

const EVENTS_TABLE = "events";

// GET /api/events/[id] - Get a specific event
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const eventId = parseInt(id, 10);

    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

 

    const { data, error } = await supabase
      .from(EVENTS_TABLE)
      .select("*")
      .eq("id", eventId)
      .single();

    if (error) {
      console.error("Error getting event:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/events/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/events/[id] - Update an event
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const eventId = parseInt(id, 10);

    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
    }

    const contentType = request.headers.get("content-type") || "";
    let updates: any;
    let imageFile: File | null = null;

    // Handle both JSON and FormData
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      
      // Extract update data
      updates = {};
      for (const [key, value] of formData.entries()) {
        if (key !== "picture") {
          // Parse JSON fields if needed
          if (key === "tags") {
            updates[key] = JSON.parse(value as string);
          } else {
            updates[key] = value;
          }
        }
      }
      
      // Extract image file if present
      imageFile = formData.get("picture") as File | null;
    } else {
      updates = await request.json();
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

    // Get event and verify user owns the venue
    const { data: event } = await supabaseAdmin
      .from(EVENTS_TABLE)
      .select("venue_id, picture_url")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const { data: venue } = await supabaseAdmin
      .from("venues")
      .select("host_id")
      .eq("id", event.venue_id)
      .single();

    if (!venue || venue.host_id !== userId) {
      return NextResponse.json(
        { error: "Event not found or unauthorized" },
        { status: 403 }
      );
    }

    // Upload new image if provided
    if (imageFile && imageFile.size > 0) {
      console.log("[EVENT UPDATE] Processing new image upload for event:", eventId);
      
      // Delete old image if exists
      if (event.picture_url) {
        console.log("[EVENT UPDATE] Old image URL:", event.picture_url);
        const oldKey = extractR2Key(event.picture_url);
        console.log("[EVENT UPDATE] Extracted old R2 key:", oldKey);
        
        if (oldKey) {
          try {
            console.log("[EVENT UPDATE] Deleting old image from R2:", oldKey);
            await deleteFromR2(oldKey);
            console.log("[EVENT UPDATE] Successfully deleted old image");
          } catch (error) {
            console.error("[EVENT UPDATE] Failed to delete old image:", error);
            // Don't fail the update if deletion fails - image might already be gone
          }
        } else {
          console.warn("[EVENT UPDATE] Could not extract R2 key from URL, skipping deletion");
        }
      } else {
        console.log("[EVENT UPDATE] No existing image to delete");
      }

      // Upload new image
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const key = `event-images/${userId}/${event.venue_id}/${timestamp}-${randomStr}.webp`;

      console.log("[EVENT UPDATE] Uploading new image with key:", key);
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const pictureUrl = await uploadToR2(key, buffer, "image/webp");
      console.log("[EVENT UPDATE] New image uploaded successfully:", pictureUrl);
      updates.picture_url = pictureUrl;
    }

    const { data, error } = await supabaseAdmin
      .from(EVENTS_TABLE)
      .update(updates)
      .eq("id", eventId)
      .select()
      .single();

    if (error) {
      console.error("Error updating event:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PATCH /api/events/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/events/[id] - Delete an event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const eventId = parseInt(id, 10);

    if (isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
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

    // Get event and verify user owns the venue
    const { data: event } = await supabaseAdmin
      .from(EVENTS_TABLE)
      .select("venue_id")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const { data: venue } = await supabaseAdmin
      .from("venues")
      .select("host_id")
      .eq("id", event.venue_id)
      .single();

    if (!venue || venue.host_id !== userId) {
      return NextResponse.json(
        { error: "Event not found or unauthorized" },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from(EVENTS_TABLE)
      .delete()
      .eq("id", eventId);

    if (error) {
      console.error("Error deleting event:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/events/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
