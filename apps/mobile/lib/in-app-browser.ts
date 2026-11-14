/** An app's own browser that the web app was opened in, such as Instagram's. */
export type InAppBrowser = {
  /** The app's name, to show the guest. */
  app: string;
  platform: "android" | "ios" | "other";
};

// User agent marks of the apps whose links open in their own browser. Google
// refuses sign-in in these (disallowed_useragent).
const IN_APP_BROWSERS: [RegExp, string][] = [
  [/Instagram/i, "Instagram"],
  // Messenger's browser is Facebook's.
  [/FBAN|FBAV|FB_IAB|FBIOS|FB4A/i, "Facebook"],
  [/musical_ly|BytedanceWebview|TikTok/i, "TikTok"],
  [/Snapchat/i, "Snapchat"],
  [/LinkedInApp/i, "LinkedIn"],
  [/Twitter/i, "X"],
  [/\bLine\//i, "LINE"],
];

/** The in-app browser the user agent belongs to, or null for a real browser. */
export function detectInAppBrowser(userAgent: string): InAppBrowser | null {
  const match = IN_APP_BROWSERS.find(([pattern]) => pattern.test(userAgent));
  if (!match) return null;
  const platform = /Android/i.test(userAgent)
    ? "android"
    : /iPhone|iPad|iPod/i.test(userAgent)
      ? "ios"
      : "other";
  return { app: match[1], platform };
}

/**
 * An Android intent link that opens the page in Chrome: one tap from an
 * in-app browser. Android falls back to the page in the default browser
 * when Chrome isn't installed.
 */
export function chromeIntentUrl(pageUrl: string): string {
  const url = new URL(pageUrl);
  const fallback = encodeURIComponent(url.href);
  return `intent://${url.host}${url.pathname}${url.search}${url.hash}#Intent;scheme=${url.protocol.replace(":", "")};package=com.android.chrome;S.browser_fallback_url=${fallback};end`;
}
