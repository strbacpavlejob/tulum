# Refactoring

How to clean up or restructure code here without changing what it does.

## Safe refactoring order

Work in this order, and run the checks after every step so a regression is
pinned to the step that caused it.

1. **Baseline.** Run every app's checks ([testing.md](testing.md)) and save
   the results. Compare later runs with this, not with zero: the repo has
   known errors.
2. **Dead code first.** Run knip, confirm each finding by hand, delete what is
   really unused (files, exports, dependencies) and update the lockfile in the
   same change. Less code means less to move later.
3. **Backend next.** API services have good Jest coverage, so they are the
   safest to restructure: move pure rules into plain modules, split services
   by responsibility, keep public method behavior, and update the specs that
   build the services. Run Jest, tsc and `nest build` after each split, and
   compile the whole dependency graph once (a Nest wiring error only shows
   when the app starts).
4. **Frontend after that.** The mobile app has no unit tests, so take the
   cheapest safe moves first:
   - move top-level helpers, constants, types and styles out unchanged;
   - extract presentational blocks into components that get their values as
     props;
   - move state into a child only when nothing else reads it;
   - move logic into custom hooks only when its effects don't depend on the
     order of other effects.

   Never change the order of hooks inside a component, and give a list
   item's `key` at the call site. Check tsc and lint against the baseline, and
   render the screen.
5. **Docs last,** so they describe the final layout.
6. **Full check:** every app's checks, builds and knip again.

Leave a file alone when splitting it would need runtime tests that don't exist
(the swipe deck's paging state, the birthday wheel's scroll timing), and say so.

## Organization rules

Naming, folder structure and where code goes are in
[conventions.md](conventions.md).

## Dead-code check (knip)

```bash
pnpm dlx knip@6.45.1
```

`knip.jsonc` at the root explains each setting:

- `*.web.tsx` and `*.native.tsx` files are entry points, since Metro picks them
  by platform and knip can't follow that.
- `components/ui/` in both apps (`src/components/ui/` in the mobile app) is
  an entry point, so the kit stays and its dependencies count as used.
- Exports used inside their own file don't count as unused
  (`ignoreExportsUsedInFile`), and request-DTO enum members are API values.
- Ignored on purpose: `components/sections/pricing-guest.tsx` (waits for
  Premium), the Supabase CLI and k6.

Before deleting a finding, search for it across the repo, including config
files, `app.json` plugins and scripts.
