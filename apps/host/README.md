# tulum-host

The Next.js site (tulum-app.com): the landing pages and the venue host
dashboard. Details are in [docs/](../../docs/README.md):
[architecture](../../docs/architecture.md#appshost),
[local setup](../../docs/local-development.md),
[tests](../../docs/testing.md),
[deployment](../../docs/deployment.md#vercel-site-and-web-app) and
[images](../../docs/images-and-storage.md).

```bash
pnpm --filter tulum-host dev        # http://localhost:3000
```

`supabase/functions/` holds the Clerk webhooks (`create-user`,
`delete-user`), deployed separately with the Supabase CLI
([deployment](../../docs/deployment.md#supabase)).
