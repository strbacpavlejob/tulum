import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { callTulumApi } from "@/lib/nestjs-client";

// Guest reports are for Tulum admins: the API answers 403 to anyone else.
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return callTulumApi(request, "/reports/guests", {
    forwardSearchParams: true,
  });
}
