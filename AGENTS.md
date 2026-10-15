# Repository instructions

## Supabase access is read-only for AI

- Use the project-local CLI through `pnpm exec supabase`.
- Use Supabase CLI commands only for inspection. Check `--help` or official documentation before using a command; if it may change remote or local state, do not run it.
- Database queries must be side-effect-free reads only. Do not run DDL, DML, data-modifying CTEs, or functions with side effects.
- Do not use the CLI, MCP, SQL, APIs, SDKs, or another route to change Supabase data, schema, migrations, project settings, secrets, auth, storage, functions, or deployments. Preserve `read_only=true` on the configured Supabase MCP connection.
- If a task requires a Supabase write, stop and report that it is blocked by this policy rather than bypassing it through another interface.

This is an agent instruction, not an operating-system permission boundary. The CLI does not enforce read-only SQL: database commands using a database password are governed by that database user's permissions, not the PAT's scopes. True enforcement requires a database credential with read-only privileges and a scoped PAT limited to read permissions for Management API operations.
