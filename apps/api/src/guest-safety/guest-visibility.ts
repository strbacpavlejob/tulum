/**
 * Who sees a guest on an event's guest list and in the Matches deck
 * (guests.visibility, QA TASK-001):
 * - everyone: every guest going to the event;
 * - liked: only the guests they have liked at that event;
 * - hidden: nobody, and Matches is paused for them.
 * A block either way hides two guests from each other whatever their
 * settings, and a guest always sees themselves.
 */
export const GUEST_VISIBILITIES = ['everyone', 'liked', 'hidden'] as const;

export type GuestVisibility = (typeof GUEST_VISIBILITIES)[number];

/**
 * A guests row's visibility. Rows read before
 * supabase/migrations/20261025103255_guest_safety_controls.sql is applied
 * have none, which is the old behavior: everyone.
 */
export function guestVisibility(
  guest: Record<string, unknown> | null | undefined,
): GuestVisibility {
  const value = guest?.visibility;
  return GUEST_VISIBILITIES.includes(value as GuestVisibility)
    ? (value as GuestVisibility)
    : 'everyone';
}

/**
 * Whether a guest with this visibility shows up for another guest at an
 * event. blocked: either of them blocked the other. likedViewer: the guest
 * liked the viewer at this event.
 */
export function isShownTo(
  visibility: GuestVisibility,
  { blocked, likedViewer }: { blocked: boolean; likedViewer: boolean },
): boolean {
  if (blocked) return false;
  if (visibility === 'everyone') return true;
  return visibility === 'liked' && likedViewer;
}
