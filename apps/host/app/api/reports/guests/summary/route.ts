import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { callTulumApi } from "@/lib/nestjs-client";

// How many guest reports wait for a review. Admins only (403 otherwise).
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return callTulumApi(request, "/reports/guests/summary");
}
