import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-client";
import { uploadToR2, deleteFromR2, extractR2Key } from "@/lib/r2-client";

const VENUES_TABLE = "venues";

// GET /api/venues/[id] - Get a specific venue
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
    const venueId = parseInt(id, 10);

    if (isNaN(venueId)) {
      return NextResponse.json({ error: "Invalid venue ID" }, { status: 400 });
    }

 

    const { data, error } = await supabase
      .from(VENUES_TABLE)
      .select("*")
      .eq("id", venueId)
      .single();

    if (error) {
      console.error("Error getting venue:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/venues/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/venues/[id] - Update a venue
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
    const venueId = parseInt(id, 10);

    if (isNaN(venueId)) {
      return NextResponse.json({ error: "Invalid venue ID" }, { status: 400 });
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
          updates[key] = value;
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

    // Verify user owns this venue
    const { data: venue } = await supabaseAdmin
      .from(VENUES_TABLE)
      .select("host_id, picture_url")
      .eq("id", venueId)
      .single();

    if (!venue || venue.host_id !== userId) {
      return NextResponse.json({ error: "Venue not found or unauthorized" }, { status: 404 });
    }

    // Upload new image if provided
    if (imageFile && imageFile.size > 0) {
      console.log("[VENUE UPDATE] Processing new image upload for venue:", venueId);
      
      // Delete old image if exists
      if (venue.picture_url) {
        console.log("[VENUE UPDATE] Old image URL:", venue.picture_url);
        const oldKey = extractR2Key(venue.picture_url);
        console.log("[VENUE UPDATE] Extracted old R2 key:", oldKey);
        
        if (oldKey) {
          try {
            console.log("[VENUE UPDATE] Deleting old image from R2:", oldKey);
            await deleteFromR2(oldKey);
            console.log("[VENUE UPDATE] Successfully deleted old image");
          } catch (error) {
            console.error("[VENUE UPDATE] Failed to delete old image:", error);
            // Don't fail the update if deletion fails - image might already be gone
          }
        } else {
          console.warn("[VENUE UPDATE] Could not extract R2 key from URL, skipping deletion");
        }
      } else {
        console.log("[VENUE UPDATE] No existing image to delete");
      }

      // Upload new image
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const key = `venue-images/${userId}/${venueId}/${timestamp}-${randomStr}.webp`;

      console.log("[VENUE UPDATE] Uploading new image with key:", key);
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const pictureUrl = await uploadToR2(key, buffer, "image/webp");
      console.log("[VENUE UPDATE] New image uploaded successfully:", pictureUrl);
      updates.picture_url = pictureUrl;
    }

    const { data, error } = await supabaseAdmin
      .from(VENUES_TABLE)
      .update(updates)
      .eq("id", venueId)
      .select()
      .single();

    if (error) {
      console.error("Error updating venue:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PATCH /api/venues/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/venues/[id] - Delete a venue
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
    const venueId = parseInt(id, 10);

    if (isNaN(venueId)) {
      return NextResponse.json({ error: "Invalid venue ID" }, { status: 400 });
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

    // Verify user owns this venue
    const { data: venue } = await supabaseAdmin
      .from(VENUES_TABLE)
      .select("host_id")
      .eq("id", venueId)
      .single();

    if (!venue || venue.host_id !== userId) {
      return NextResponse.json({ error: "Venue not found or unauthorized" }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from(VENUES_TABLE)
      .delete()
      .eq("id", venueId);

    if (error) {
      console.error("Error deleting venue:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/venues/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
