# Repository instructions

## Supabase access is read-only for AI

- Use the project-local CLI through `pnpm exec supabase`.
- Use Supabase CLI commands only for inspection. Check `--help` or official documentation before using a command; if it may change remote or local state, do not run it.
- Database queries must be side-effect-free reads only. Do not run DDL, DML, data-modifying CTEs, or functions with side effects.
- Do not use the CLI, MCP, SQL, APIs, SDKs, or another route to change Supabase data, schema, migrations, project settings, secrets, auth, storage, functions, or deployments. Preserve `read_only=true` on the configured Supabase MCP connection.
- If a task requires a Supabase write, stop and report that it is blocked by this policy rather than bypassing it through another interface.

This is an agent instruction, not an operating-system permission boundary. The CLI does not enforce read-only SQL: database commands using a database password are governed by that database user's permissions, not the PAT's scopes. True enforcement requires a database credential with read-only privileges and a scoped PAT limited to read permissions for Management API operations.

## Clerk MCP access for reads

- For questions about data held in Clerk, such as user counts, users, sessions, or organizations, use the configured `clerk` MCP server as the source of truth when it is available. It is listed in `mcp.json` and `.vscode/mcp.json`.
- Use read-only MCP operations for information requests. Do not change Clerk data or settings unless the user explicitly asks for that change.
- Treat Clerk results as sensitive and return only the information needed to answer the request; do not expose credentials or unrelated user data.
- If the Clerk MCP server or a required read tool is unavailable, use the official Clerk CLI's read-only commands only when the target instance is clear from the current project configuration. Do not log in, change Clerk data/settings, or silently substitute local/Supabase data. If the CLI cannot access the target, state the limitation and ask before using another access method.

## Visual browser testing

- To check a ticket in the Expo web app at `http://localhost:8081`, prefer the Claude in Chrome extension when your tools include it (`mcp__claude-in-chrome__*`, for example in Claude Code). Opening the page, clicking through the flow and taking screenshots with it is much faster than writing CDP scripts.
  - The extension is installed in Chromium's default profile, not in the dedicated test profile below. If no browser is connected, start `chromium` without `--user-data-dir`, confirm it with `list_connected_browsers`, then work in your own tab from `tabs_context_mcp` (`createIfEmpty`) and close the tabs you opened when you finish.
  - The app must be signed in with the development account in that profile. If it shows the sign-in screen, ask the user to sign in; never enter credentials yourself.
  - The extension can't stub requests before a page loads, so the app talks to whatever runs on `localhost:3001`. Against the real API, keep to checks that only read: many screens write when used, and some when merely opened (event details records a 'seen' engagement for a signed-in user), which the Supabase rule above forbids. For flows that write, the real API must not be running (ask the user to stop it if it is): serve the routes the flow needs from a local stand-in on port 3001, and stop it when you finish.
  - `resize_window` may not shrink the window to phone width (on this desktop the page stayed 640 px wide), so when the exact 375x667 layout matters, use the Playwright path below.
- Otherwise, use the project `playwright` MCP server (`.github/mcp.json`) with the dedicated browser started by `bash scripts/start-tulum-test-browser.sh`. Trust this repository in Copilot CLI if prompted so the project MCP config loads.
- Use a 375x667 viewport for iPhone SE checks, inspect screenshots, and do not add E2E tests unless requested.
- Treat both browser profiles as credentials: use only a development account in the app, and never read, copy, print, or commit Clerk cookies, session tokens, or browser storage.
- Do not add an application auth bypass or rely on `x-user-id` to test signed-in screens; preserve real Clerk token verification.

## Android emulator testing

- Start the emulator with `bash scripts/start-tulum-android-emulator.sh`. It boots the `Medium_Phone_API_36` AVD (Android 16; `TULUM_AVD` picks another one, and extra arguments such as `-no-window` go to the emulator) and runs `adb reverse` for ports 8081 (Metro) and 3001 (API), so the app's default `EXPO_PUBLIC_API_URL` of `http://localhost:3001` reaches this machine. Rerun it after the emulator or the adb server restarts; it reuses a running emulator.
- Drive the device with the user-scope `mobile-mcp` MCP server (`mcp__mobile-mcp__*`). Its device id is the AVD name (`Medium_Phone_API_36`), not the adb serial. Find tap targets with `mobile_list_elements_on_screen`; screenshots are downscaled, so scale their coordinates as the tool result says. Without the MCP server, plain `adb` does the same: `adb exec-out screencap -p`, `adb shell uiautomator dump`, `adb shell input tap|text|keyevent`, `adb logcat`.
- Test the app as a debug build. It loads its JavaScript from Metro, so JS edits reload without a rebuild. Build and install it with `pnpm --dir apps/mobile exec expo run:android --no-bundler` (run it in the background: the first build took about 13 minutes, including the Gradle, NDK and CMake downloads), start Metro with the `mobile-web` launch configuration (or `pnpm --dir apps/mobile exec expo start`), then open the app (`com.anonymous.tulumapp` until `android.package` is set). Rebuild only after native changes: a new native package, or plugin, permission or icon changes in `app.json`. Don't use the Expo Go app on the emulator; it is a 2025 build for an older SDK.
- `apps/mobile/android` is generated and gitignored. While `app.json` has no `android.package`, prebuild writes a placeholder package and a permissions list into `app.json` and switches the `android`/`ios` scripts in `package.json` to `expo run:*`; revert those edits unless the user wants them.
- The browser rules above apply here too: the user signs in on the emulator (Google or Apple; never enter credentials yourself), checks against the real API only read, and flows that write need the stand-in API on port 3001. Never read or copy the app's stored session from the device.
