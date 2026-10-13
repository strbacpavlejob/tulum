---
name: tulum-matching-reliability
description: Use when changing Tulum event eligibility, swipe filters, like limits, reciprocal matches, match responses, or their mobile/API/database tests. Keep the backend, Supabase RPC, and Expo client behavior consistent.
---

# Tulum matching and swipe reliability

Before changing matching behavior, trace the current flow across:

- `apps/mobile/app/(tabs)/matches.tsx` and `apps/mobile/components/matches/MatchesDeck.tsx`
- `apps/mobile/lib/api.ts`
- `apps/api/src/matches/matches.controller.ts`
- `apps/api/src/matches/matches.service.ts` and `apps/api/src/matches/dto/swipe-decision.dto.ts`
- `apps/api/src/common/like-limit.ts` and its `.spec.ts`
- `apps/api/src/matches/matches.service.spec.ts`
- the current SQL function and relevant schema under `apps/api/supabase/`

Treat the repository's current behavior and API shapes as the contract. Do not infer eligibility or rewrite rules from UI copy alone; trace both callers and the SQL implementation before changing them.

## Invariants to preserve or deliberately test

- The API rejects self-swipes and checks event participation before recording a decision. The mobile screen also has its own ticket, event-time, and location gates; keep client gating and server enforcement distinct.
- Like-limit filters are normalized before use. Current policy is a 20% limit with a minimum of three, capped by the eligible guest count; the effective limit must not fall below likes already used.
- Eligibility accounts for the selected gender and age range, and selected interests use OR matching. Keep the TypeScript helper and the database calculation aligned.
- `submit_guest_swipe_with_limit` is the database-side atomic decision. Preserve its transaction/locking and upsert behavior; do not move enforcement to the client or replace it with a non-atomic read-then-write sequence.
- A match requires a reciprocal like for the same event. Match participant IDs are canonicalized, and concurrent duplicate creation is handled through the unique-violation recovery path.
- Preserve the existing snake_case request/response fields consumed by `apps/mobile/lib/api.ts`, or update and verify all callers in the same change.

## Change and verification workflow

1. Identify the observable behavior and edge cases before editing. Include empty/small eligible groups, reordered or invalid filters, repeat decisions, rejected limits, reciprocal/non-reciprocal likes, and concurrent duplicate match creation where relevant.
2. Keep business rules in the API/database boundary. If changing the RPC or schema, add a new migration, inspect grants and row-security implications, and use the installed Supabase guidance.
3. Add deterministic tests using the existing Jest `.spec.ts` conventions. Test both the pure limit helper and the service path when the changed rule affects both.
4. Run focused API tests:

   ```sh
   pnpm --filter tulum-api exec jest --runInBand src/common/like-limit.spec.ts src/matches/matches.service.spec.ts
   ```

   Run `pnpm --filter tulum-api test:e2e` when controller wiring, request validation, or HTTP behavior changes. For SQL changes, also verify the migration/function behavior against the project's available Supabase test setup; Jest mocks alone do not prove database semantics.
5. Check the mobile/API contract and relevant lint/build commands when the client flow changes. Report checks that could not be run rather than treating them as passed.
