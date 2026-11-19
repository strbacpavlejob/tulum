// The Clerk instance requires a username and a password at sign-up. Guests
// sign in with Google, Apple or an email code and never use either, so the
// app fills them in.

const CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function randomCharacters(length: number): string {
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
  }
  return result;
}

/**
 * A username from the email address, such as "anam4821" for
 * ana.m@example.com: letters, digits and underscores, 4 to 64 characters,
 * and at least one letter (the instance refuses all-digit usernames).
 */
export function generatedUsername(emailAddress: string | null | undefined) {
  const prefix = (emailAddress?.split("@")[0] ?? "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 40);
  const suffix = Math.floor(1000 + Math.random() * 9000);
  const name = /[a-zA-Z]/.test(prefix) ? prefix : `guest${prefix}`;
  return `${name}${suffix}`.toLowerCase();
}

/** A long random password nobody types, to satisfy the instance. */
export function generatedPassword() {
  return `Tl!${randomCharacters(24)}#${Date.now()}`;
}
