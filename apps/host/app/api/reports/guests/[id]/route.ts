import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { callTulumApi } from "@/lib/nestjs-client";

// An admin sets a guest report's status. Admins only (403 otherwise).
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  return callTulumApi(request, `/reports/guests/${encodeURIComponent(id)}`);
}
