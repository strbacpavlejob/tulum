import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-client";
import { uploadToR2 } from "@/lib/r2-client";

const VENUES_TABLE = "venues";

interface VenueCreateData {
  host_id: string;
  name: string;
  venue_type: string;
  latitude: number;
  longitude: number;
  address: string;
  capacity: number;
  description?: string;
}

// GET /api/venues - Get all venues or venues by host_id
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const hostId = searchParams.get("host_id");


    let query = supabase.from(VENUES_TABLE).select("*");

    if (hostId) {
      query = query.eq("host_id", hostId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error getting venues:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error in GET /api/venues:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/venues - Create a new venue
export async function POST(request: NextRequest) {
  try {
    const authResult = await auth();
    
    if (!authResult.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") || "";
    let venue: VenueCreateData;
    let imageFile: File | null = null;

    // Handle both JSON and FormData
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      
      // Extract venue data
      venue = {
        host_id: authResult.userId,
        name: formData.get("name") as string,
        venue_type: formData.get("venue_type") as string,
        latitude: parseFloat(formData.get("latitude") as string),
        longitude: parseFloat(formData.get("longitude") as string),
        address: formData.get("address") as string,
        capacity: parseInt(formData.get("capacity") as string, 10),
        description: (formData.get("description") as string) || undefined,
      };
      
      // Extract image file if present
      imageFile = formData.get("picture") as File | null;
    } else {
      venue = await request.json() as VenueCreateData;
      venue.host_id = authResult.userId;
    }

    console.log("Creating venue with data:", venue);

    // Create service role client to bypass RLS (auth already verified by Clerk)
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

    // Upload image to storage if provided
    let pictureUrl: string | null = null;
    if (imageFile && imageFile.size > 0) {
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const key = `venue-images/${authResult.userId}/temp/${timestamp}-${randomStr}.webp`;

      // Convert file to buffer
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload to Cloudflare R2
      pictureUrl = await uploadToR2(key, buffer, "image/webp");
    }

    // Add picture_url to venue data
    const venueData = {
      ...venue,
      picture_url: pictureUrl,
    };

    const { data, error } = await supabaseAdmin
      .from(VENUES_TABLE)
      .insert(venueData)
      .select()
      .single();

    if (error) {
      console.error("Error creating venue:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      console.error("No data returned from Supabase insert");
      return NextResponse.json(
        { error: "Failed to create venue - no data returned" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/venues:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
