import { NextRequest, NextResponse } from "next/server";

const TULUM_API_URL = process.env.TULUM_API_URL ?? "http://localhost:3001";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? "";

interface ProxyOptions {
  userId?: string;
  /** Forward the request's search params to the upstream URL */
  forwardSearchParams?: boolean;
}

/**
 * Forward a Frontend App Router request to the Tulum backend.
 * Auth headers (x-api-key, x-user-id) are injected automatically.
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

    const headers: Record<string, string> = {
      "x-api-key": INTERNAL_API_KEY,
    };

    if (options.userId) {
      headers["x-user-id"] = options.userId;
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
