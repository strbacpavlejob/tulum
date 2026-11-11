type SentrySdk = typeof import("@sentry/react");

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

// Requests that fail on a bad connection ("Failed to fetch" in Chrome,
// "NetworkError…" in Firefox, "Load failed" in Safari) aren't bugs. Reporting
// them would also download the SDK on the networks least able to afford it.
const NETWORK_FAILURE =
  /failed to fetch|networkerror|load failed|network request failed/i;

function isNetworkFailure(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  return NETWORK_FAILURE.test(message);
}

let enabled = false;
let sdk: Promise<SentrySdk | null> | null = null;

// The SDK is about 1.3 MB before compression, since Metro bundles all of it,
// so it stays out of the first load: it's fetched in its own chunk when the
// first error happens. A session without errors never downloads it.
function loadSdk(): Promise<SentrySdk | null> {
  sdk ??= import("@sentry/react").then(
    (Sentry) => {
      Sentry.init({
        dsn,
        environment:
          process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? "development",
        release: process.env.EXPO_PUBLIC_SENTRY_RELEASE,
        // The listeners in initSentry report window errors and rejections;
        // the SDK's own would report each of them a second time.
        integrations: (defaults) =>
          defaults.filter(
            (integration) => integration.name !== "GlobalHandlers",
          ),
      });
      return Sentry;
    },
    // Offline or a failed chunk: the error isn't reported.
    () => null,
  );
  return sdk;
}

// Errors only: no tracing or session replay. Without a DSN (local
// development) nothing is reported. The static export also renders every
// page in Node, where there is no window to listen on.
export function initSentry(): void {
  if (!dsn || typeof window === "undefined" || enabled) return;
  enabled = true;

  window.addEventListener("error", (event) => {
    captureError(event.error ?? event.message);
  });
  window.addEventListener("unhandledrejection", (event) => {
    captureError(event.reason);
  });
}

export function captureError(error: unknown): void {
  if (!enabled || isNetworkFailure(error)) return;
  void loadSdk().then((Sentry) => Sentry?.captureException(error));
}
