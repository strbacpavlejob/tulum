---
name: tulum-frontend-patterns
description: Use when changing styling in apps/mobile or apps/host, or Zustand state in apps/mobile. Keep Tulum's distinct NativeWind/Tailwind versions and existing frontend conventions instead of mixing setup patterns.
---

# Tulum frontend styling and state

Check the relevant app's `package.json` before relying on version-specific behavior; update this skill if either styling stack or state-management stack changes.

## Mobile: NativeWind and Tailwind

- The mobile app currently uses NativeWind 4.x with Tailwind CSS 3.x. Do not apply NativeWind v5 / Tailwind v4 setup, CSS-first `@theme` configuration, or migration instructions unless the user explicitly requests an upgrade.
- Preserve the existing setup: `apps/mobile/tailwind.config.js` uses `nativewind/preset` and the `light`/`dark` theme objects; `global.css` uses Tailwind's three `@tailwind` directives; Metro wraps the Expo config with `withNativeWind` and points to `./global.css`; Babel uses `babel-preset-expo` with NativeWind.
- Prefer existing theme values and component patterns over introducing parallel tokens or new styling dependencies. Keep platform-specific behavior explicit and verify that classes work on the intended native and web targets.
- For third-party components that do not accept `className`, inspect the installed NativeWind v4 API and existing wrappers before adding interop or changing component APIs.

## Host: Tailwind CSS

- `apps/host` uses Tailwind CSS v4 with `@tailwindcss/postcss`; its `app/globals.css` imports `tailwindcss` and defines CSS-first `@theme inline` tokens.
- Keep host styles within that v4 setup. Do not copy the mobile app's Tailwind v3 config or NativeWind Metro/Babel integration into the Next.js app.
- Prefer the existing CSS variables, theme tokens, and component patterns over adding a second theme system or changing the app's styling architecture.

## Zustand

- Reuse the existing store at `apps/mobile/store/useStore.ts` before creating another global store.
- Preserve its typed `MyStore` state-and-actions shape, default-exported `useStore` hook, immutable updates, and individually selected state/actions in components.
- Keep related derived state in sync. For example, event changes may also affect filtered events, map pins, tickets, and cached per-event swipe candidates.
- Do not add `subscribeWithSelector`, persistence middleware, a new store folder, or a store rewrite merely to follow a generic template. Add middleware only for a demonstrated requirement and verify it against the installed Zustand version.
- Use `useStore.getState()` in non-component code only where needed; components should subscribe through selectors.

## Verification

Run `pnpm --filter tulum-app lint` for mobile code changes and the relevant host lint/build command for `apps/host`. For mobile styling/configuration changes, also run the relevant Expo export or device check when available; do not assume web output proves iOS and Android behavior.
