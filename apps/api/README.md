# tulum-api

The NestJS API: every read and write of app data, the scrapers and the chat
socket. Everything about it is in [docs/](../../docs/README.md):
[architecture](../../docs/architecture.md#appsapi),
[business rules](../../docs/business-logic.md),
[scrapers](../../docs/scrapers.md),
[local setup](../../docs/local-development.md),
[tests](../../docs/testing.md) and
[deployment](../../docs/deployment.md#railway-api).

```bash
pnpm --filter tulum-api start:dev   # http://localhost:3001, Swagger JSON at /api-json
./node_modules/.bin/jest            # from apps/api
```

Agents: don't start this API against real data (its scheduled scrapers write);
see [AGENTS.md](../../AGENTS.md).
