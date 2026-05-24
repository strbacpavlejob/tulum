import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const TULUM_API_URL = process.env.TULUM_API_URL ?? "http://localhost:3001";

interface ProxyOptions {
  /** Forward the request's search params to the upstream URL */
  forwardSearchParams?: boolean;
}

/**
 * Forward a Next.js App Router request to the Tulum backend.
 * The Clerk JWT is forwarded as Authorization: Bearer <token>.
 */
export async function callTulumApi(
  request: NextRequest,
  path: string,
  options: ProxyOptions = {},
): Promise<NextResponse> {
  try {
    const url = new URL(path, TULUM_API_URL);

    if (options.forwardSearchParams) {
      request.nextUrl.searchParams.forEach((value, key) =>
        url.searchParams.set(key, value),
      );
    }

    const { getToken } = await auth();
    const token = await getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const contentType = request.headers.get("content-type");
    if (contentType) {
      headers["content-type"] = contentType;
    }

    const method = request.method;
    const hasBody = !["GET", "HEAD"].includes(method);

    const upstream = await fetch(url.toString(), {
      method,
      headers,
      ...(hasBody ? { body: request.body, duplex: "half" as never } : {}),
    });

    const data: unknown = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (error) {
    console.error(`[proxy] error forwarding to ${path}:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
