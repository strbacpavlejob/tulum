/**
 * The profile details one guest sees about another. The routes that return
 * other guests send these fields from a guests row and no other profile
 * details.
 */

type GuestRow = Record<string, unknown> | null | undefined;

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

const list = (value: unknown): string[] =>
  Array.isArray(value) ? (value as string[]) : [];

/**
 * On the Matches deck. Every guest checked in at the same event sees these,
 * before anyone has liked anyone.
 */
export function deckProfileDetails(guest: GuestRow) {
  return { bio: text(guest?.bio) };
}

/**
 * On the profile sheet in a chat. Only the guest they matched with sees
 * these. Rows from before the add_guest_profile_details migration have no
 * detail columns, so those come back empty.
 */
export function matchProfileDetails(guest: GuestRow) {
  const height = guest?.height_cm;
  return {
    bio: text(guest?.bio),
    seeking: text(guest?.seeking),
    work: text(guest?.work),
    education: text(guest?.education),
    height_cm: typeof height === 'number' ? height : null,
    languages: list(guest?.languages),
    drinking: text(guest?.drinking),
    smoking: text(guest?.smoking),
    pets: list(guest?.pets),
    star_sign: text(guest?.star_sign),
    relationship_status: text(guest?.relationship_status),
    sexuality: text(guest?.sexuality),
    has_children: text(guest?.has_children),
    religion: text(guest?.religion),
  };
}
