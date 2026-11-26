import { describe, expect, it } from '@jest/globals';
import {
  buildCaption,
  DEFAULT_MAX_SLIDES,
  formatDateRange,
  formatDay,
  formatTime,
  GROUP_VENUE_TYPES,
  groupOfVenueType,
  isVenueType,
  maxSlides,
  parseSchedule,
  pickEvents,
  PostEvent,
  postWindow,
  slideText,
  withoutPromoted,
} from './instagram-post-rules';

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

describe('parseSchedule', () => {
  it('uses the default schedule when the variable is unset', () => {
    const { byWeekday, invalid } = parseSchedule(undefined);
    expect([...byWeekday]).toEqual([
      [1, 'week'],
      [2, 'culture'],
      [3, 'food'],
      [4, 'bars'],
      [5, 'clubs'],
    ]);
    expect(invalid).toEqual([]);
  });

  it('posts nothing for "off" or an empty value', () => {
    expect(parseSchedule('off').byWeekday.size).toBe(0);
    expect(parseSchedule(' ').byWeekday.size).toBe(0);
  });

  it('reads days and kinds in any case, and reports the entries it leaves out', () => {
    const { byWeekday, invalid } = parseSchedule(
      'Sat:Week, sun:clubs, fri:parties, monday:bars, tue',
    );
    expect([...byWeekday]).toEqual([
      [6, 'week'],
      [0, 'clubs'],
    ]);
    expect(invalid).toEqual(['fri:parties', 'monday:bars', 'tue']);
  });
});

describe('maxSlides', () => {
  it('takes 3 to 20 slides and falls back to the default otherwise', () => {
    expect(maxSlides(undefined)).toBe(DEFAULT_MAX_SLIDES);
    expect(maxSlides('12')).toBe(12);
    expect(maxSlides('2')).toBe(DEFAULT_MAX_SLIDES);
    expect(maxSlides('21')).toBe(DEFAULT_MAX_SLIDES);
    expect(maxSlides('ten')).toBe(DEFAULT_MAX_SLIDES);
  });
});

describe('postWindow', () => {
  it('covers the rest of the week, until Monday 00:00 in Belgrade', () => {
    const now = new Date('2026-11-25T17:05:00Z');
    expect(postWindow(now)).toEqual({
      date: '2026-11-25',
      weekday: 3,
      lastDate: '2026-11-29',
      from: now,
      until: new Date('2026-11-29T23:00:00Z'),
    });
  });

  it('on a Monday, covers that whole week', () => {
    const window = postWindow(new Date('2026-11-30T17:05:00Z'));
    expect(window.weekday).toBe(1);
    expect(window.lastDate).toBe('2026-12-06');
    expect(window.until).toEqual(new Date('2026-12-06T23:00:00Z'));
  });

  it('on a Sunday, covers what is left of the day', () => {
    const window = postWindow(new Date('2026-11-29T17:05:00Z'));
    expect(window.lastDate).toBe('2026-11-29');
    expect(window.until).toEqual(new Date('2026-11-29T23:00:00Z'));
  });

  it("goes by Belgrade's date, not UTC's", () => {
    // 23:30 UTC on Sunday is Monday 00:30 in Belgrade.
    const window = postWindow(new Date('2026-11-29T23:30:00Z'));
    expect(window.date).toBe('2026-11-30');
    expect(window.weekday).toBe(1);
  });

  it('ends a week in summer time at midnight summer time', () => {
    // The clocks go forward on Sunday 28 March 2027.
    const window = postWindow(new Date('2027-03-24T17:05:00Z'));
    expect(window.until).toEqual(new Date('2027-03-28T22:00:00Z'));
  });
});

describe('venue types', () => {
  it('puts each venue type in its post', () => {
    expect(groupOfVenueType('bar')).toBe('bars');
    expect(groupOfVenueType('tavern')).toBe('bars');
    expect(groupOfVenueType('club')).toBe('clubs');
    expect(groupOfVenueType('restaurant')).toBe('food');
    expect(groupOfVenueType('cafe')).toBe('food');
    expect(groupOfVenueType('event_venue')).toBe('culture');
  });

  it('knows which venues.venue_type values the posts show', () => {
    expect(isVenueType('tavern')).toBe(true);
    expect(isVenueType('event_venue')).toBe(true);
    expect(isVenueType('stadium')).toBe(false);
    expect(isVenueType(null)).toBe(false);
  });
});

describe('pickEvents', () => {
  it("shows one group's events, a venue and a title once each, in date order", () => {
    const events = [
      event({ id: 'a', startsAt: '2026-11-28T19:00:00Z', venueId: 'v1' }),
      event({ id: 'b', startsAt: '2026-11-26T19:00:00Z', venueId: 'v1' }),
      event({ id: 'c', startsAt: '2026-11-27T19:00:00Z', title: 'Jazz Night' }),
      event({
        id: 'd',
        startsAt: '2026-11-27T20:00:00Z',
        title: 'JAZZ night!',
      }),
      event({ id: 'e', startsAt: '2026-11-27T21:00:00Z', group: 'clubs' }),
    ];
    expect(pickEvents(events, 'bars', 8).map((e) => e.id)).toEqual(['b', 'c']);
  });

  it('takes the events more guests are going to first', () => {
    const events = [
      event({ id: 'quiet', startsAt: '2026-11-26T19:00:00Z' }),
      event({ id: 'busy', startsAt: '2026-11-29T19:00:00Z', guestCount: 12 }),
      event({ id: 'some', startsAt: '2026-11-28T19:00:00Z', guestCount: 3 }),
    ];
    expect(pickEvents(events, 'bars', 2).map((e) => e.id)).toEqual([
      'some',
      'busy',
    ]);
  });

  it('spreads the picks over the days while nobody has joined anything', () => {
    const events = [
      event({ id: 'thu-1', startsAt: '2026-11-26T18:00:00Z' }),
      event({ id: 'thu-2', startsAt: '2026-11-26T19:00:00Z' }),
      event({ id: 'thu-3', startsAt: '2026-11-26T20:00:00Z' }),
      event({ id: 'fri-1', startsAt: '2026-11-27T19:00:00Z' }),
      event({ id: 'sat-1', startsAt: '2026-11-28T19:00:00Z' }),
    ];
    expect(pickEvents(events, 'bars', 4).map((e) => e.id)).toEqual([
      'thu-1',
      'thu-2',
      'fri-1',
      'sat-1',
    ]);
  });

  it("takes the week's groups in turn, so the bars don't fill the post", () => {
    const events = [
      ...['1', '2', '3', '4', '5', '6'].map((n) =>
        event({ id: `bar-${n}`, group: 'bars' }),
      ),
      event({ id: 'club-1', group: 'clubs' }),
      event({ id: 'culture-1', group: 'culture' }),
      event({ id: 'food-1', group: 'food' }),
      event({ id: 'food-2', group: 'food' }),
    ];
    const groups = pickEvents(events, 'week', 6).map((e) => e.group);
    expect(groups.filter((g) => g === 'bars')).toHaveLength(2);
    expect(groups.filter((g) => g === 'clubs')).toHaveLength(1);
    expect(groups.filter((g) => g === 'culture')).toHaveLength(1);
    expect(groups.filter((g) => g === 'food')).toHaveLength(2);
  });
});

describe('buildCaption', () => {
  // Thursday 26 November, 18:05 in Belgrade.
  const window = postWindow(new Date('2026-11-26T17:05:00Z'));

  it('lists the events with their venues tagged, how Tulum works and hashtags', () => {
    const caption = buildCaption(
      'bars',
      [
        event({
          id: 'a',
          title: 'Jazz Night',
          startsAt: '2026-11-27T19:00:00Z',
          instagramHandle: 'kptm.bar',
        }),
        event({
          id: 'b',
          title: 'Quiz',
          startsAt: '2026-11-28T19:00:00Z',
          venueName: 'Bar Central',
        }),
      ],
      window,
    );
    expect(caption).toBe(
      [
        'Bars & taverns this week 🍸 26 – 29 Nov',
        '',
        '🍸 Fri 27 Nov · Jazz Night at @kptm.bar',
        '🍸 Sat 28 Nov · Quiz at Bar Central',
        '',
        'Join an event on Tulum, check in when you get there and meet the people who are there too 👉 tulum-app.com',
        '',
        '#beograd #belgrade #belgradeevents #thingstodoinbelgrade #tulumapp #belgradebars #kafana #beogradnocu',
      ].join('\n'),
    );
  });

  it("drops a title's own @ and #, so only the venues are tagged", () => {
    const caption = buildCaption(
      'week',
      [
        event({
          id: 'a',
          title: 'Night with @dj_x #party',
          instagramHandle: 'venue',
        }),
      ],
      window,
    );
    expect(caption).toContain('Night with dj_x party at @venue');
    expect(caption.match(/@/g)).toHaveLength(1);
  });

  it("keeps within Instagram's 2,200 characters, 20 tags and 30 hashtags", () => {
    const events = Array.from({ length: 30 }, (_, i) =>
      event({
        id: `e${i}`,
        title: 'A very long title '.repeat(10),
        instagramHandle: `venue_${i}`,
      }),
    );
    const caption = buildCaption('week', events, window);
    expect(caption.length).toBeLessThanOrEqual(2_200);
    expect((caption.match(/@/g) ?? []).length).toBeLessThanOrEqual(20);
    expect((caption.match(/#/g) ?? []).length).toBeLessThanOrEqual(30);
    expect(caption).toContain('tulum-app.com');
  });
});

describe('dates and text on the slides', () => {
  it('names the days a post covers', () => {
    expect(formatDateRange(postWindow(new Date('2026-11-26T17:05:00Z')))).toBe(
      '26 – 29 Nov',
    );
    expect(formatDateRange(postWindow(new Date('2026-11-30T17:05:00Z')))).toBe(
      '30 Nov – 6 Dec',
    );
    expect(formatDateRange(postWindow(new Date('2026-11-29T17:05:00Z')))).toBe(
      '29 Nov',
    );
  });

  it("shows an event's day and time in Belgrade", () => {
    expect(formatDay('2026-12-04T21:00:00Z')).toBe('Fri 4 Dec');
    expect(formatTime('2026-12-04T21:00:00Z')).toBe('22:00');
    expect(formatTime('2027-07-02T20:00:00Z')).toBe('22:00');
  });

  it('leaves out emoji and flags, which the font lacks, and keeps every alphabet', () => {
    expect(slideText('🎉 Đorđe & Београд ✨ 🇿🇦\n  night ❤️‍🔥')).toBe(
      'Đorđe & Београд night',
    );
  });
});

describe('withoutPromoted', () => {
  it('leaves out promoted events, and others with a promoted title', () => {
    const events = [
      event({ id: 'a' }),
      event({ id: 'b', title: 'Jazz Night 🎷' }),
      event({ id: 'c' }),
      event({ id: 'd', title: '🎉' }),
    ];

    expect(
      withoutPromoted(events, [
        { eventId: 'a', title: 'Event a' },
        { eventId: 'elsewhere', title: 'JAZZ night' },
        // A title of emoji alone leaves out nothing else.
        { eventId: 'emoji', title: '🎶' },
      ]).map((e) => e.id),
    ).toEqual(['c', 'd']);
  });
});
