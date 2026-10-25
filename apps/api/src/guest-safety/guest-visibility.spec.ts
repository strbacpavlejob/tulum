import { describe, expect, it } from '@jest/globals';
import { guestVisibility, isShownTo } from './guest-visibility';

describe('guestVisibility', () => {
  it.each(['everyone', 'liked', 'hidden'])('reads %s', (visibility) => {
    expect(guestVisibility({ visibility })).toBe(visibility);
  });

  // Rows from before the guest_safety_controls migration, and anything the
  // CHECK constraint would refuse, keep the old behavior.
  it.each([
    ['a row without the column', {}],
    ['null', { visibility: null }],
    ['an unknown value', { visibility: 'friends' }],
    ['no row', null],
  ])('reads %s as everyone', (_, row) => {
    expect(guestVisibility(row as Record<string, unknown> | null)).toBe(
      'everyone',
    );
  });
});

describe('isShownTo', () => {
  it.each([
    // visibility, blocked, liked the viewer, shown
    ['everyone', false, false, true],
    ['everyone', false, true, true],
    ['liked', false, false, false],
    ['liked', false, true, true],
    ['hidden', false, false, false],
    ['hidden', false, true, false],
    // A block hides a guest whatever their setting.
    ['everyone', true, false, false],
    ['liked', true, true, false],
  ] as const)(
    '%s, blocked %p, liked the viewer %p: shown %p',
    (visibility, blocked, likedViewer, shown) => {
      expect(isShownTo(visibility, { blocked, likedViewer })).toBe(shown);
    },
  );
});
