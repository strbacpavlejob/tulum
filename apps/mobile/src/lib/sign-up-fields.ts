// Fields a Clerk sign-up may still need that guests never see. Username is
// turned off on both instances (27 November 2026), but the app still makes
// one up if Clerk asks for it; a password is chosen only by guests who sign
// up with email, so a Google sign-up that needs one gets a made-up one.

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

/** What completeMissingSignUpFields uses of a Clerk sign-up. */
type IncompleteSignUp = {
  status?: string | null;
  missingFields?: string[];
  emailAddress?: string | null;
  createdSessionId?: string | null;
  update?: (params: {
    username?: string;
    lastName?: string;
    password?: string;
  }) => Promise<{ createdSessionId?: string | null }>;
};

/**
 * Finishes a Google or Apple sign-up that Clerk left at
 * "missing_requirements" by filling in what the instance requires and the
 * provider didn't give (a last name, most often), and returns the new
 * session's id; null when there is nothing it can fill in.
 */
export async function completeMissingSignUpFields(
  signUp: IncompleteSignUp | null | undefined,
): Promise<string | null> {
  if (!signUp?.update || signUp.status !== "missing_requirements") {
    return null;
  }
  const missing = signUp.missingFields ?? [];
  if (!missing.length) return null;

  const fields: { username?: string; lastName?: string; password?: string } =
    {};
  if (missing.includes("username")) {
    fields.username = generatedUsername(signUp.emailAddress);
  }
  if (missing.includes("last_name")) fields.lastName = "User";
  if (missing.includes("password")) fields.password = generatedPassword();

  const updated = await signUp.update(fields);
  return updated.createdSessionId ?? signUp.createdSessionId ?? null;
}
