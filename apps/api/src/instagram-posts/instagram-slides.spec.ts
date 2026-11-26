import { describe, expect, it } from '@jest/globals';
import sharp from 'sharp';
import { EventGroup, VenueType } from './instagram-post-rules';
import { renderSlide, SLIDE_HEIGHT, SLIDE_WIDTH } from './instagram-slides';

/* Instagram takes JPEGs in sRGB, up to 8 MB and 1440 px wide, from 4:5 to
 * 1.91:1. */
async function expectInstagramJpeg(jpeg: Buffer) {
  const metadata = await sharp(jpeg).metadata();
  expect(metadata).toMatchObject({
    format: 'jpeg',
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    space: 'srgb',
  });
  expect(jpeg.length).toBeLessThan(8 * 1024 * 1024);
}

describe('renderSlide', () => {
  it('draws the cover, an event and the closing slide', async () => {
    const picture = await sharp({
      create: { width: 500, height: 375, channels: 3, background: '#3355aa' },
    })
      .webp()
      .toBuffer();

    await expectInstagramJpeg(
      await renderSlide(
        {
          type: 'cover',
          kind: 'week',
          dateRange: '30 Nov – 6 Dec',
          eventCount: 8,
          groups: ['clubs', 'bars', 'culture', 'food'],
        },
        { number: 1, total: 3 },
      ),
    );
    await expectInstagramJpeg(
      await renderSlide(
        {
          type: 'event',
          event: {
            id: 'e1',
            title: '🎉 Đorđe Balašević tribute – Београд ноћ ✨',
            startsAt: '2026-12-04T21:00:00Z',
            pictureUrl: 'https://img.tulum-app.com/event-images/e1.webp',
            venueId: 'v1',
            venueName: 'Народно позориште у Београду',
            venueType: 'event_venue',
            group: 'culture',
            instagramHandle: null,
            guestCount: 3,
          },
          picture,
        },
        { number: 2, total: 3 },
      ),
    );
    await expectInstagramJpeg(
      await renderSlide({ type: 'closing' }, { number: 3, total: 3 }),
    );
  }, 60_000);

  it.each<[VenueType, EventGroup]>([
    ['bar', 'bars'],
    ['tavern', 'bars'],
    ['club', 'clubs'],
    ['restaurant', 'food'],
    ['cafe', 'food'],
    ['event_venue', 'culture'],
  ])(
    "draws a %s's event with its capybara",
    async (venueType, group) => {
      const picture = await sharp({
        create: { width: 500, height: 375, channels: 3, background: '#aa5533' },
      })
        .webp()
        .toBuffer();
      await expectInstagramJpeg(
        await renderSlide(
          {
            type: 'event',
            event: {
              id: `e-${venueType}`,
              title: 'Friday night',
              startsAt: '2026-12-04T21:00:00Z',
              pictureUrl: `https://img.tulum-app.com/event-images/e-${venueType}.webp`,
              venueId: `v-${venueType}`,
              venueName: 'Venue',
              venueType,
              group,
              instagramHandle: null,
              guestCount: 0,
            },
            picture,
          },
          { number: 2, total: 4 },
        ),
      );
    },
    30_000,
  );

  it.each<EventGroup>(['bars', 'clubs', 'food', 'culture'])(
    "draws the %s post's cover",
    async (kind) => {
      await expectInstagramJpeg(
        await renderSlide(
          {
            type: 'cover',
            kind,
            dateRange: '2 – 6 Dec',
            eventCount: 5,
            groups: [kind],
          },
          { number: 1, total: 7 },
        ),
      );
    },
    30_000,
  );
});
