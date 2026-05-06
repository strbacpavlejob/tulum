import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { uploadToR2, deleteFromR2, extractR2Key } from "@/lib/r2-client";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const TARGET_WIDTH = 500;
const TARGET_HEIGHT = 375;

// POST /api/events/upload - Upload event image
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const venueId = formData.get("venue_id") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!venueId) {
      return NextResponse.json({ error: "venue_id is required" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 5MB limit" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Create service role client
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

    // Verify user owns the venue
    const { data: venue } = await supabaseAdmin
      .from("venues")
      .select("host_id")
      .eq("id", venueId)
      .single();

    if (!venue || venue.host_id !== userId) {
      return NextResponse.json(
        { error: "Venue not found or unauthorized" },
        { status: 403 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const key = `event-images/${userId}/${venueId}/${timestamp}-${randomStr}.webp`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Note: For production, you should resize and convert to WebP here
    // Currently uploading as-is. To add image processing:
    // 1. Install: npm install sharp
    // 2. Use sharp to resize to 500x375 and convert to WebP
    // 3. Upload the processed buffer

    // Example with sharp (commented out - install sharp first):
    /*
    const sharp = require('sharp');
    const processedBuffer = await sharp(buffer)
      .resize(TARGET_WIDTH, TARGET_HEIGHT, {
        fit: 'cover',
        position: 'center'
      })
      .webp({ quality: 80 })
      .toBuffer();
    */

    // Upload to Cloudflare R2
    const publicUrl = await uploadToR2(key, buffer, "image/webp");

    return NextResponse.json({
      url: publicUrl,
      fileName: key,
      size: file.size,
      targetDimensions: `${TARGET_WIDTH}x${TARGET_HEIGHT}`
    });

  } catch (error) {
    console.error("Error in POST /api/events/upload:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/events/upload - Delete event image
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const fileName = searchParams.get("file");

    if (!fileName) {
      return NextResponse.json({ error: "fileName is required" }, { status: 400 });
    }

    // Extract the key from the URL if it's a full URL
    const key = extractR2Key(fileName) || fileName;

    // Verify the file belongs to this user (check if path contains userId)
    if (!key.includes(`/${userId}/`)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete from R2
    await deleteFromR2(key);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error in DELETE /api/events/upload:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
