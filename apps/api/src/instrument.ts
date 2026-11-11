// Sentry has to start before Nest and the libraries it instruments are
// loaded, so main.ts imports this file first. Without SENTRY_DSN (local
// development, tests) the SDK stays off and sends nothing.
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment:
    process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
  // Railway sets this to the deployed commit, so errors name the release.
  release: process.env.RAILWAY_GIT_COMMIT_SHA,
  // Errors only: no tracesSampleRate, so no performance tracing. IP addresses
  // and request bodies stay out too (sendDefaultPii is off by default).
});
