# API routes

These route handlers check the Clerk session and forward the request to the
Tulum API with `callTulumApi` (`lib/nestjs-client.ts`, `TULUM_API_URL`). They
hold no data access of their own. See [docs/architecture.md](../../../../docs/architecture.md).
