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

- For Expo web checks, use the project `playwright` MCP server with the dedicated browser started by `bash scripts/start-tulum-test-browser.sh`; the Expo app is at `http://localhost:8081`. Trust this repository in Copilot CLI if prompted so the project MCP config loads.
- Use a 375x667 viewport for iPhone SE checks, inspect screenshots, and do not add E2E tests unless requested.
- Treat the dedicated browser profile as a credential: use only a development account, and never read, copy, print, or commit Clerk cookies, session tokens, or browser storage.
- Do not add an application auth bypass or rely on `x-user-id` to test signed-in screens; preserve real Clerk token verification.
