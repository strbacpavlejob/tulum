/**
 * Sign in with Apple. Hidden until Clerk's production instance has Apple
 * credentials (an Apple Developer account's Services ID and key) and Apple
 * is turned back on there; Google and email work without it. An iOS App
 * Store build that offers Google needs it back (App Store guideline 4.8),
 * and the in-app browser notice in lib/i18n.ts should then name Apple again.
 */
export const APPLE_SIGN_IN_ENABLED = false;
