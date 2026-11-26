# Testing

Run the checks for the app you change, and compare with the baseline below:
the counts are what main already has, so only differences are regressions.

## Checks per app

| App           | Command (from the app folder)                          | Baseline (18 Nov 2026)                    |
| ------------- | ------------------------------------------------------ | ----------------------------------------- |
| `apps/api`    | `./node_modules/.bin/jest`                             | 65 suites, 722 tests, all pass (26 Nov)   |
|               | `./node_modules/.bin/tsc --noEmit -p tsconfig.json`    | 0 errors (specs included)                 |
|               | `./node_modules/.bin/eslint "src/**/*.ts" "test/**/*.ts"` | about 245 errors, mostly `no-unsafe-*` on mocks in specs |
|               | `./node_modules/.bin/nest build`                       | passes                                    |
| `apps/mobile` | `./node_modules/.bin/tsc --noEmit -p tsconfig.json`    | 69 errors (svg props in `illustrations/hands.tsx`, untyped store selectors) |
|               | `./node_modules/.bin/eslint .` (or `pnpm lint`)        | about 43 errors, 27 warnings, mostly React Compiler rules (`react-hooks/refs`, `set-state-in-effect`) |
| `apps/host`   | `./node_modules/.bin/tsc --noEmit -p tsconfig.json`    | 0 errors                                  |
|               | `./node_modules/.bin/eslint`                           | about 33 errors, 17 warnings, mostly React Compiler rules |
|               | `./node_modules/.bin/next build`                       | passes                                    |
| workspace     | `pnpm dlx knip@6.45.1`                                 | no findings                               |

Notes:

- The API's `lint` script runs `eslint --fix`; use the command above to check
  without changing files.
- Prettier: the API has `.prettierrc` (single quotes). The host and mobile code
  follow Prettier's defaults; check them with
  `apps/api/node_modules/.bin/prettier --no-config --check <files>`.
- `pnpm --filter tulum-api test:e2e` doesn't load (no module mapping, and its
  only test expects `GET /` to be public). For HTTP-level checks, write a
  supertest spec in `src/`, like `src/route-authorization.spec.ts`.
- Specs can't reach Postgres. Services run over an in-memory supabase-js fake
  in specs such as `events/events-crud.controller.spec.ts`; Postgres functions
  (the swipe RPC, the deck) need a real database to be proven.
- The mobile app has no unit-test runner. Pure modules can be checked with a
  scratch Jest config using the API's ts-jest; screens are checked in the
  browser or on the emulator.

## Writing tests

- API: Jest with `@jest/globals` imports, typed mocks
  (`jest.fn<(arg: T) => R>()`), one spec next to the code it covers. A bug fix
  gets a test that fails without the fix.
- Keep tests deterministic: fake timers (`jest.useFakeTimers({ now })`) for
  time rules, and `TZ=… jest` on the command line for time zones.

## Browser and emulator checks

The rules are in [AGENTS.md](../AGENTS.md) and apply to people as well as
agents:

- Expo web runs on `http://localhost:8081`, signed in with a development
  account only.
- Against the real API, only do things that read. Some screens write when
  opened (event details records a "seen" engagement).
- Flows that write use a stand-in API on port 3001, or the read-only proxy
  `node scripts/tulum-readonly-api-proxy.mjs` (port 3002), which forwards only
  reading GET routes and answers writes with 503. `TULUM_PROXY_FIXTURES` can
  answer chosen routes from a JSON file.
- Use a 375×667 viewport for small-phone checks.

## Load tests

The k6 kit and the staging seed are in [loadtest/](../loadtest/README.md).
They run against a staging project with real Clerk tokens, never production.
