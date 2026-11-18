# Naming and folder structure

The conventions each app follows, and why. New code follows them; a file that
breaks one is renamed in its own change, with every import updated.

Names are checked by the ESLint rule `tulum/file-naming`
([`eslint-rules/file-naming.cjs`](../eslint-rules/file-naming.cjs)), which each
app's `eslint.config` turns on as an error. It allows each app's route syntax
and dot suffixes as listed below, and suggests the kebab-case name.

## Names at a glance

| What                         | apps/mobile (Expo)              | apps/host (Next.js)             | apps/api (NestJS)                     |
| ---------------------------- | ------------------------------- | ------------------------------- | ------------------------------------- |
| Folders                      | `kebab-case`                    | `kebab-case`                    | `kebab-case`, one per feature         |
| Component files              | `venue-card.tsx`                | `venue-card.tsx`                | –                                     |
| Hooks                        | `use-venue-card.ts`             | `use-venue-card.ts`             | –                                     |
| Other modules                | `format-date.ts`                | `format-date.ts`                | `like-limit.ts`                       |
| Framework roles              | –                               | –                               | `events.module.ts`, `events.controller.ts`, `events-feed.service.ts`, `create-event.dto.ts`, `admin.guard.ts` |
| Tests                        | –                               | –                               | `events-feed.service.spec.ts`         |
| Exported names               | `VenueCard`, `useVenueCard`, `formatDate` | same                   | `EventsFeedService`, `CreateEventDto` |

- **File and folder names are lowercase with hyphens.** Expo's default
  template and Expo's own guidance use kebab-case (`themed-text.tsx`,
  `use-color-scheme.ts`); Next.js leaves casing to the project, and kebab-case
  is the common choice (shadcn's generated `components/ui` files use it). The
  Nest CLI generates kebab-case names. Lowercase names also avoid the
  case-only rename trouble git has on macOS and Windows.
- **What a file exports keeps JavaScript's casing:** components PascalCase,
  hooks and functions camelCase, NestJS classes PascalCase with the role as a
  suffix (`EventsFeedService` in `events-feed.service.ts`).
- **A dot in a file name has a fixed meaning.** In the API, the part after the
  name is the NestJS role (`.module`, `.controller`, `.service`, `.gateway`,
  `.guard`, `.decorator`, `.dto`, `.interface`, `.spec`). In the apps, dots are
  only for:
  - Metro platform files: `listings-map.web.tsx` and
    `listings-map.native.tsx`, imported as `listings-map`, always next to a
    default `listings-map.tsx` (which may re-export the native one for types);
  - tests (`.test.ts`, `.spec.ts`), type declarations (`.d.ts`), CSS modules
    (`.module.css`) and tool configs (`*.config.js`).

  Don't invent role suffixes (`.component.tsx`, `.hook.ts`) in the apps: in
  the mobile app a dot can mean a platform to Metro.
- **Reserved names stay as the frameworks define them:** Expo Router's
  `_layout.tsx`, `+not-found.tsx`, `+html.tsx`, `index.tsx`; Next.js's
  `page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`,
  `not-found.tsx`, `template.tsx`, `default.tsx`; route segments such as
  `(group)`, `[id]`, `[[...sign-in]]` and private `_folders`.
- **SQL:** migrations are `YYYYMMDDHHMMSS_snake_case.sql`, as the Supabase CLI
  creates them; data fixes `YYYYMMDD_snake_case.sql`.

## Folder structure

Code sits at each app's root, not in `src/` (the API excepted). Both Expo and
Next.js support either; `src/` would only add a level here.

**apps/mobile**

```
app/            routes only: every file here is a screen or a layout
components/     shared components, plus a folder per screen or feature
  ui/           the react-native-reusables kit (keep it whole)
  map/          Leaflet WebView maps for native
  profile/ matches/ inbox/ event-details/ onboarding/ …
hooks/          app-wide hooks (use-app-theme.ts, use-chat-socket.ts)
lib/            plain modules: the API client, i18n, helpers
constants/ store/ types/ providers/ assets/
```

**apps/host**

```
app/            routes: public pages, (protected) dashboard, api/ route handlers
components/     a folder per dashboard feature, plus
  ui/           the shadcn kit (keep it whole)
  common/       form pieces several features share
  sections/     the public pages' sections
lib/            the API client, image and map-style helpers, page copy
hooks/ store/ locales/
public/         static files only, never source modules
```

**apps/api**

```
src/<feature>/  <feature>.module.ts, .controller.ts, .service.ts, dto/, specs
src/common/     guards, decorators, shared rules
src/scrape/     one folder per source under scrapers/, shared pieces under shared/
supabase/       schema.sql, migrations/, data-fixes/
```

## Where code goes

- One component per file, named after it. A screen's pieces go in
  `components/<screen>/`, never under `apps/mobile/app/` (Expo Router would
  turn them into routes).
- Pure logic (no React, no I/O) in its own module with a spec: `like-limit.ts`,
  `venue-similarity.ts`, `scraped-rows.ts`, `matches-model.ts`.
- Data fetching and side effects in hooks named after what they do
  (`use-matches-eligibility.ts`, `use-event-details-data.ts`); state that a
  sheet and its screen share in a hook (`use-field-edit-sheet.ts`).
- Shared helpers once: `apps/mobile/lib/geo.ts` (distance),
  `apps/host/components/common/use-image-file.ts` (picture picking).
- `components/ui/` in both apps is a UI kit: keep it whole, even where a
  component is unused.
- API: one module per feature, thin controllers, one service per
  responsibility. Only `SupabaseService` creates the database client.
- Aim for files under about 300 lines. Data files (translations, copy, option
  lists, API clients) can be longer.

## Sources

- Expo: [App folder structure best practices](https://expo.dev/blog/expo-app-folder-structure-best-practices)
  and the [default template](https://github.com/expo/expo/tree/main/templates/expo-template-default).
- Next.js: [Project structure](https://nextjs.org/docs/app/getting-started/project-structure).
- NestJS: the Nest CLI's generated names (`nest g service users` creates
  `users.service.ts`).
