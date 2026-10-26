import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes that don't require authentication. The marketing
// pages are skipped by the matcher below and never get here; they stay listed
// so that a broader matcher can't put them behind sign-in.
const isPublicRoute = createRouteMatcher([
  "/",
  "/host(.*)",
  "/guest(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/privacy(.*)",
  "/privacy-policy(.*)",
  "/terms(.*)",
  "/terms-of-service(.*)",
  "/support(.*)",
  "/sso-callback",
  "/api/events/active",
]);

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/events(.*)",
  "/map(.*)",
  "/venues(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Every route except Next.js internals, static files (unless found in
    // search params) and the public marketing pages: /, /guest, /host,
    // /privacy, /privacy-policy, /terms, /terms-of-service, /support and
    // anything under them (.+ rather than .*, so / itself is skipped too).
    // Those pages don't use Clerk. Running clerkMiddleware on them sent every
    // first visit through the development instance's handshake, 3 redirects
    // before the page, and clients without cookies (crawlers) looped forever
    // (QA TASK-004). Next reads the matcher at build time, so it must stay a
    // string literal.
    "/((?!_next|(?:guest|host|privacy|privacy-policy|terms|terms-of-service|support)(?:/|$)|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).+)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
