---
name: tulum-clerk-api-auth
description: Use when changing Clerk authentication, user identity, authorization, or token forwarding between Tulum's Expo app, Next.js host, NestJS API, and Supabase.
---

# Tulum Clerk API authentication

Use the official `clerk-expo` and `clerk-nextjs-patterns` skills for their framework-specific APIs. This skill covers Tulum's integration boundaries and applies to `apps/api`, `apps/mobile`, and `apps/host`.

Before changing auth behavior, inspect the relevant callers and contracts in:

- `apps/api/src/common/guards/clerk-auth.guard.ts`
- `apps/api/src/common/decorators/public.decorator.ts` and `user-id.decorator.ts`
- `apps/api/src/common/guards/admin.guard.ts` and `apps/api/src/app.module.ts`
- `apps/api/src/main.ts`
- `apps/mobile/lib/api.ts` and the relevant `useAuth()` caller
- `apps/host/lib/nestjs-client.ts`, `apps/host/proxy.ts`, and `apps/host/lib/use-supabase.tsx` when those integrations are involved

## Integration rules

- The NestJS API expects a Clerk session token in `Authorization: Bearer <token>`. Derive the API user identity from the verified Clerk auth result, not from client-supplied profile fields.
- Keep `CLERK_AUTHORIZED_PARTIES` handling and the distinction between public routes, HTTP requests, and WebSocket connections explicit. Do not assume HTTP guards authenticate WebSocket events.
- `@Public()` is an intentional route opt-out. Review the route and its data exposure before changing its status or adding public routes.
- `UserId` and `AdminGuard` retain a legacy `x-user-id` fallback. Do not add new reliance on this header or treat it as equivalent to a verified Clerk identity; account for the compatibility path explicitly when changing identity behavior.
- Mobile and host NestJS clients forward Clerk session tokens to the API. The host Supabase integration requests its configured `supabase` JWT template; do not substitute that token flow for the NestJS API token without verifying the Clerk and Supabase configuration.
- Never expose Clerk secret keys in mobile or browser bundles, and do not log bearer tokens or full authentication headers.

## Verification

For auth changes, add or update focused tests for the relevant public/private route, missing or invalid token, verified user identity, authorization, and compatibility behavior. Run the API's focused Jest tests and `pnpm --filter tulum-api test:e2e` when HTTP guard/controller behavior changes. Trace the affected mobile or host caller to ensure its token and request contract still match.
