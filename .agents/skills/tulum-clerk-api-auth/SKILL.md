---
name: tulum-clerk-api-auth
description: Use when changing Clerk authentication, user identity, authorization, or token forwarding between Tulum's Expo app, Next.js host, NestJS API, and Supabase.
---

# Tulum Clerk API authentication

Use the official `clerk-expo` and `clerk-nextjs-patterns` skills for their framework-specific APIs. This skill covers Tulum's integration boundaries and applies to `apps/api`, `apps/mobile`, and `apps/host`.

Before changing auth behavior, inspect the relevant callers and contracts in:

- `apps/api/src/common/guards/clerk-auth.guard.ts` and `apps/api/src/common/clerk-session.ts`
- `apps/api/src/chats/chats.gateway.ts` and `apps/mobile/hooks/useChatSocket.ts` for the chat WebSocket
- `apps/api/src/common/decorators/public.decorator.ts` and `user-id.decorator.ts`
- `apps/api/src/common/guards/admin.guard.ts` and `apps/api/src/app.module.ts`
- `apps/api/src/main.ts`
- `apps/mobile/lib/api.ts` and the relevant `useAuth()` caller
- `apps/host/lib/nestjs-client.ts`, `apps/host/proxy.ts`, and `apps/host/lib/use-supabase.tsx` when those integrations are involved

## Integration rules

- The NestJS API expects a Clerk session token in `Authorization: Bearer <token>`. Derive the API user identity from the verified Clerk auth result, not from client-supplied profile fields.
- Keep `CLERK_AUTHORIZED_PARTIES` handling and the distinction between public routes, HTTP requests, and WebSocket connections explicit. Do not assume HTTP guards authenticate WebSocket events.
- `ChatsGateway` authenticates each socket in a handshake middleware: the client sends its Clerk session token as `auth: { token }`, and the gateway verifies it with the same `verifySessionUserId` check as `ClerkAuthGuard` and stores the result in `socket.data.userId`. Never take a socket's identity from `handshake.auth.userId` or a header, and check chat membership in every event handler.
- `@Public()` is an intentional route opt-out. Review the route and its data exposure before changing its status or adding public routes. On a public route a valid Bearer token still sets the user id; an invalid or missing one leaves the caller anonymous.
- `UserId` and `AdminGuard` read only the Clerk-verified user id; the legacy `x-user-id` fallback was removed. Do not reintroduce it or take the acting user from query or body parameters. A route that reads or changes another user's records must check ownership or use `AdminGuard`.
- Mobile and host NestJS clients forward Clerk session tokens to the API. The host Supabase integration requests its configured `supabase` JWT template; do not substitute that token flow for the NestJS API token without verifying the Clerk and Supabase configuration.
- Never expose Clerk secret keys in mobile or browser bundles, and do not log bearer tokens or full authentication headers.

## Verification

For auth changes, add or update focused tests for the relevant public/private route, missing or invalid token, verified user identity, authorization, and compatibility behavior. Run the API's focused Jest tests and `pnpm --filter tulum-api test:e2e` when HTTP guard/controller behavior changes. Trace the affected mobile or host caller to ensure its token and request contract still match.
