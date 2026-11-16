import { NextResponse } from "next/server";

// tulum-app.com/maskenbal, the short link printed under every poster's QR
// code (QA QR-7). It opens the KST Maskenbal's event page in the web app,
// with src=short so the guest is counted as coming from a poster's link, as
// p01…p12 are for their QR codes. Set MASKENBAL_EVENT_ID to the event's id
// for the night and remove it afterwards; without it the link goes to the
// guest page.
const EVENT_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WEB_APP_URL = "https://mobile.tulum-app.com";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const eventId = process.env.MASKENBAL_EVENT_ID?.trim() ?? "";
  if (!EVENT_ID.test(eventId)) {
    return NextResponse.redirect(new URL("/guest", request.url), 307);
  }
  const target = new URL(
    `/e/${eventId}`,
    process.env.NEXT_PUBLIC_TULUM_MOBILE_URL || WEB_APP_URL,
  );
  target.searchParams.set("src", "short");
  return NextResponse.redirect(target, 307);
}
