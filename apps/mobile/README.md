# tulum-app

The Expo app guests use, launched first as a web app (mobile.tulum-app.com).
Details are in [docs/](../../docs/README.md):
[architecture](../../docs/architecture.md#appsmobile),
[business rules](../../docs/business-logic.md),
[local setup](../../docs/local-development.md),
[tests](../../docs/testing.md) and
[deployment](../../docs/deployment.md).

```bash
pnpm --filter tulum-app web         # Expo web on http://localhost:8081
pnpm --filter tulum-app start       # Metro for a device or the emulator
```

Android emulator and browser testing rules: [AGENTS.md](../../AGENTS.md).
