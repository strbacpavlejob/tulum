import { isClerkAPIResponseError } from "@clerk/expo";

/** Tries of a rate-limited Clerk call, the first one included. */
const MAX_ATTEMPTS = 5;
/** The wait after the first 429 when Clerk sends no Retry-After; it doubles. */
const FIRST_WAIT_MS = 1_000;
/** Up to this much is added to each wait, so phones that hit the limit
 * together don't all come back together. */
const JITTER_MS = 1_000;

/**
 * Whether Clerk refused the call for its rate limit (429). Clerk allows 5
 * sign-ins and 5 sign-ups every 10 s from one IP address, and a venue's
 * Wi-Fi or a mobile network can put many guests behind one.
 */
export function isRateLimited(error: unknown): boolean {
  return isClerkAPIResponseError(error) && error.status === 429;
}

/**
 * How long to wait before trying again after the attempt-th 429 (1-based):
 * Clerk's Retry-After when it sends one, else 1, 2, 4, 8 s; plus jitter.
 */
export function retryDelayMs(error: unknown, attempt: number): number {
  const retryAfterSeconds = isClerkAPIResponseError(error)
    ? error.retryAfter
    : undefined;
  const base =
    retryAfterSeconds && retryAfterSeconds > 0
      ? retryAfterSeconds * 1000
      : FIRST_WAIT_MS * 2 ** (attempt - 1);
  return base + Math.round(Math.random() * JITTER_MS);
}

/**
 * Runs a Clerk call, and again after a wait each time Clerk answers 429, up
 * to MAX_ATTEMPTS tries. onWait runs before each wait, so the screen can say
 * that lots of people are joining instead of showing an error. Covers the
 * calls that throw (startSSOFlow, the legacy resources) and the Core 3
 * methods, which resolve to { error }. Anything else is passed on as is.
 */
export async function retryOnRateLimit<T>(
  call: () => Promise<T>,
  onWait: () => void,
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    let refusal: unknown;
    try {
      const result = await call();
      const error = (result as { error?: unknown } | null | undefined)?.error;
      if (!isRateLimited(error) || attempt >= MAX_ATTEMPTS) return result;
      refusal = error;
    } catch (err) {
      if (!isRateLimited(err) || attempt >= MAX_ATTEMPTS) throw err;
      refusal = err;
    }
    onWait();
    await new Promise((resolve) =>
      setTimeout(resolve, retryDelayMs(refusal, attempt)),
    );
  }
}
