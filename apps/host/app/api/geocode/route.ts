import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// GET /api/geocode - Geocode an address using OpenStreetMap Nominatim
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get("address");

    if (!address || address.trim().length < 3) {
      return NextResponse.json(
        { error: "Invalid address parameter" },
        { status: 400 }
      );
    }

    // Use OpenStreetMap Nominatim API for geocoding
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "Tulum Host App", // Nominatim requires a User-Agent
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to geocode address" },
        { status: response.status }
      );
    }

    const results = await response.json();

    if (results && results.length > 0) {
      const { lat, lon, display_name } = results[0];
      return NextResponse.json({
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        display_name,
      });
    }

    return NextResponse.json(
      { error: "No results found for address" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Error in GET /api/geocode:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
