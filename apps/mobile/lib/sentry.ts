// Error reporting. The web build reports to Sentry (sentry.web.ts); native
// builds don't yet. The native track adds @sentry/react-native here.

export function initSentry(): void {}

export function captureError(_error: unknown): void {}
