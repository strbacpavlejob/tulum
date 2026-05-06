import { NextRequest } from "next/server";
import { callTulumApi } from "@/lib/nestjs-client";

export async function GET(request: NextRequest) {
  return callTulumApi(request, "/events/active");
}
