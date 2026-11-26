import { describe, expect, it } from '@jest/globals';
import { GROUP_VENUE_TYPES, PostEvent } from './instagram-post-rules';
import {
  DEFAULT_STORY_EVENTS,
  dueSlot,
  hasStoryTitle,
  nextSlot,
  parseStorySchedule,
  pickStoryEvents,
  retryAt,
  storyCount,
  storyDay,
  storyEventRange,
  storyWindow,
  storyWindowHours,
} from './instagram-story-rules';

const TIMES = ['10:00', '15:00', '18:00'];

function event(
  overrides: Partial<PostEvent> & Pick<PostEvent, 'id'>,
): PostEvent {
  const group = overrides.group ?? 'bars';
  return {
    title: `Event ${overrides.id}`,
    startsAt: '2026-11-27T19:00:00Z',
    pictureUrl: `https://img.tulum-app.com/event-images/${overrides.id}.webp`,
    venueId: `venue-${overrides.id}`,
    venueName: `Venue ${overrides.id}`,
    venueType: GROUP_VENUE_TYPES[group][0],
    group,
    instagramHandle: null,
    guestCount: 0,
    ...overrides,
  };
}

/* A repeatable stand-in for Math.random. */
function seeded(seed = 1): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

describe('parseStorySchedule', () => {
  it('posts at 10:00, 15:00 and 18:00 when the variable is unset', () => {
    expect(parseStorySchedule(undefined)).toEqual({
      times: TIMES,
      invalid: [],
    });
  });

  it('sorts the times, drops repeats and reports what it leaves out', () => {
    expect(parseStorySchedule('18:00, 9:30,18:00, 25:00, noon')).toEqual({
      times: ['09:30', '18:00'],
      invalid: ['25:00', 'noon'],
    });
  });

  it('posts nothing for "off" or an empty value', () => {
    expect(parseStorySchedule('off').times).toEqual([]);
    expect(parseStorySchedule(' ').times).toEqual([]);
  });
});

describe('storyEventRange and storyCount', () => {
  it('shows 2 or 3 events unless INSTAGRAM_STORIES_EVENTS says otherwise', () => {
    expect(storyEventRange(undefined)).toEqual({ min: 2, max: 3 });
    expect(storyEventRange('3')).toEqual({ min: 3, max: 3 });
    expect(storyEventRange(' 1 - 4 ')).toEqual({ min: 1, max: 4 });
  });

  it.each(['0', '4-2', '11', 'three', '2-'])(
    'falls back to 2–3 for %s',
    (value) => {
      expect(storyEventRange(value)).toEqual(DEFAULT_STORY_EVENTS);
    },
  );

  it('picks a count from the range at random', () => {
    expect(storyCount({ min: 2, max: 3 }, () => 0)).toBe(2);
    expect(storyCount({ min: 2, max: 3 }, () => 0.99)).toBe(3);
    expect(storyCount({ min: 3, max: 3 }, () => 0.99)).toBe(3);
  });
});

describe('storyWindowHours and storyWindow', () => {
  it('looks 48 hours ahead unless INSTAGRAM_STORIES_WINDOW_HOURS says otherwise', () => {
    expect(storyWindowHours(undefined)).toBe(48);
    expect(storyWindowHours('24')).toBe(24);
    expect(storyWindowHours('1')).toBe(48);
    expect(storyWindowHours('200')).toBe(48);
    expect(storyWindowHours('1.5')).toBe(48);
  });

  it('starts an hour after the run: a story outlives an event starting sooner', () => {
    const now = new Date('2026-11-27T09:00:00Z');
    expect(storyWindow(now, 48)).toEqual({
      from: new Date('2026-11-27T10:00:00Z'),
      until: new Date('2026-11-29T09:00:00Z'),
    });
  });
});

describe('dueSlot, nextSlot and retryAt', () => {
  it('finds the slot that started less than 45 minutes ago, Belgrade time', () => {
    // 10:00 in Belgrade is 09:00 UTC in November.
    expect(dueSlot(new Date('2026-11-27T09:00:00Z'), TIMES)).toMatchObject({
      key: '2026-11-27T10:00',
      at: new Date('2026-11-27T09:00:00Z'),
    });
    expect(dueSlot(new Date('2026-11-27T09:44:59Z'), TIMES)?.key).toBe(
      '2026-11-27T10:00',
    );
    expect(dueSlot(new Date('2026-11-27T09:45:00Z'), TIMES)).toBeNull();
    expect(dueSlot(new Date('2026-11-27T08:59:00Z'), TIMES)).toBeNull();
    expect(dueSlot(new Date('2026-11-27T17:10:00Z'), TIMES)?.key).toBe(
      '2026-11-27T18:00',
    );
  });

  it('follows summer time', () => {
    expect(dueSlot(new Date('2026-07-01T08:00:00Z'), TIMES)?.key).toBe(
      '2026-07-01T10:00',
    );
  });

  it('finds a late slot from the day before after midnight', () => {
    // 00:10 on the 28th in Belgrade.
    expect(dueSlot(new Date('2026-11-27T23:10:00Z'), ['23:50'])?.key).toBe(
      '2026-11-27T23:50',
    );
  });

  it('finds the next slot, tomorrow after the last one', () => {
    expect(nextSlot(new Date('2026-11-27T09:05:00Z'), TIMES)?.key).toBe(
      '2026-11-27T15:00',
    );
    expect(nextSlot(new Date('2026-11-27T17:30:00Z'), TIMES)?.key).toBe(
      '2026-11-28T10:00',
    );
    expect(nextSlot(new Date('2026-11-27T17:30:00Z'), [])).toBeNull();
  });

  it('tries a failed slot again 10 and 30 minutes after its time, then stops', () => {
    const slot = dueSlot(new Date('2026-11-27T09:00:00Z'), TIMES)!;
    expect(retryAt(slot, 1)).toEqual(new Date('2026-11-27T09:10:00Z'));
    expect(retryAt(slot, 2)).toEqual(new Date('2026-11-27T09:30:00Z'));
    expect(retryAt(slot, 3)).toBeNull();
  });
});

describe('hasStoryTitle', () => {
  it('needs text once emoji are left out', () => {
    expect(hasStoryTitle({ title: '🎉🎶' })).toBe(false);
    expect(hasStoryTitle({ title: 'Jazz 🎷' })).toBe(true);
  });
});

describe('pickStoryEvents', () => {
  const groups = ['bars', 'clubs', 'food', 'culture'] as const;
  const events = [
    ...Array.from({ length: 8 }, (_, i) =>
      event({ id: `bar-${i}`, venueId: `bar-venue-${i % 3}` }),
    ),
    event({ id: 'club', group: 'clubs' }),
    event({ id: 'dinner', group: 'food' }),
    event({ id: 'gig', group: 'culture' }),
  ];

  it('takes each event from a group the run has not shown yet', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const picks = pickStoryEvents(events, 4, { random: seeded(seed) });
      expect(new Set(picks.map((e) => e.group))).toEqual(new Set(groups));
    }
  });

  it('never shows two events at one venue, or one title twice', () => {
    const sameVenue = [
      event({ id: 'a', venueId: 'v1' }),
      event({ id: 'b', venueId: 'v1', group: 'clubs' }),
      event({ id: 'c', title: 'Jazz Night' }),
      event({ id: 'd', title: 'JAZZ night!', group: 'food' }),
    ];
    for (let seed = 1; seed <= 20; seed++) {
      const picks = pickStoryEvents(sameVenue, 4, { random: seeded(seed) });
      expect(picks).toHaveLength(2);
      expect(new Set(picks.map((e) => e.venueId)).size).toBe(2);
    }
  });

  it("prefers venues the last day's stories didn't show, but uses them when it must", () => {
    const bars = [
      event({ id: 'shown', venueId: 'recent' }),
      event({ id: 'fresh' }),
    ];
    for (let seed = 1; seed <= 10; seed++) {
      expect(
        pickStoryEvents(bars, 1, {
          recentVenueIds: new Set(['recent']),
          random: seeded(seed),
        }).map((e) => e.id),
      ).toEqual(['fresh']);
    }
    expect(
      pickStoryEvents(bars, 2, { recentVenueIds: new Set(['recent']) }),
    ).toHaveLength(2);
  });

  it('gives each venue an even chance, however many events it has', () => {
    const busy = Array.from({ length: 9 }, (_, i) =>
      event({ id: `busy-${i}`, venueId: 'busy', title: `Night ${i}` }),
    );
    const quiet = event({ id: 'quiet', venueId: 'quiet' });
    const random = seeded(7);
    let quietPicks = 0;
    for (let run = 0; run < 400; run++) {
      const [pick] = pickStoryEvents([...busy, quiet], 1, { random });
      if (pick.id === 'quiet') quietPicks += 1;
    }
    // Half the time, not a tenth.
    expect(quietPicks).toBeGreaterThan(160);
    expect(quietPicks).toBeLessThan(240);
  });

  it("adds to a run's earlier picks, and returns only the new ones in date order", () => {
    const earlier = event({ id: 'club', group: 'clubs', venueId: 'v-club' });
    const later = [
      event({ id: 'late', group: 'food', startsAt: '2026-11-28T20:00:00Z' }),
      event({ id: 'soon', group: 'culture', startsAt: '2026-11-27T12:00:00Z' }),
      event({ id: 'same-venue', group: 'bars', venueId: 'v-club' }),
    ];
    const picks = pickStoryEvents(later, 3, {
      picked: [earlier],
      random: seeded(3),
    });
    expect(picks.map((e) => e.id)).toEqual(['soon', 'late']);
  });

  it('picks the same events for the same random numbers', () => {
    expect(pickStoryEvents(events, 3, { random: seeded(42) })).toEqual(
      pickStoryEvents([...events].reverse(), 3, { random: seeded(42) }),
    );
  });

  it('returns what there is when there are fewer events than asked for', () => {
    expect(pickStoryEvents(events.slice(0, 1), 3)).toHaveLength(1);
    expect(pickStoryEvents([], 3)).toEqual([]);
  });
});

describe('storyDay', () => {
  // Friday 27 November, 10:00 in Belgrade.
  const now = new Date('2026-11-27T09:00:00Z');

  it('calls an event tonight, today, tomorrow or by its weekday', () => {
    expect(storyDay('2026-11-27T19:00:00Z', now)).toBe('Tonight');
    expect(storyDay('2026-11-27T12:00:00Z', now)).toBe('Today');
    expect(storyDay('2026-11-28T19:00:00Z', now)).toBe('Tomorrow');
    expect(storyDay('2026-11-29T19:00:00Z', now)).toBe('Sunday');
  });

  it("calls tomorrow's small hours tonight, unless the time is midnight (no time given)", () => {
    // 01:30 and 00:00 on Saturday in Belgrade.
    expect(storyDay('2026-11-28T00:30:00Z', now)).toBe('Tonight');
    expect(storyDay('2026-11-27T23:00:00Z', now)).toBe('Tomorrow');
  });
});
