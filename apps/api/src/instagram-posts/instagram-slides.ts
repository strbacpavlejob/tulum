import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import satori from 'satori';
import sharp from 'sharp';
import {
  EventGroup,
  formatDay,
  formatTime,
  GROUP_LABELS,
  GROUP_SHORT_LABELS,
  GROUP_VENUE_TYPES,
  PostEvent,
  PostKind,
  slideText,
  VenueType,
} from './instagram-post-rules';

/*
 * Draws a weekly post's slides as 1080×1350 JPEGs (4:5, the tallest shape
 * Instagram's feed shows), and a story as a 1080×1920 one (9:16). Satori
 * lays a picture out and turns its text into shapes, so no fonts need
 * installing where the API runs, and sharp draws it.
 */

export const SLIDE_WIDTH = 1080;
export const SLIDE_HEIGHT = 1350;

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

/* Instagram covers a story's top with the account and the progress bars,
 * and its bottom with the reply field, so text stays out of these bands. */
export const STORY_SAFE_TOP = 250;
export const STORY_SAFE_BOTTOM = 280;

/** Where on an event's slide its venue is tagged: the picture's middle. */
export const VENUE_TAG_POSITION = { x: 0.5, y: 0.44 };

export type Slide =
  | {
      type: 'cover';
      kind: PostKind;
      /** "30 Nov – 6 Dec" */
      dateRange: string;
      eventCount: number;
      /** The groups the post's events are in, for the week's cover. */
      groups: EventGroup[];
    }
  | { type: 'event'; event: PostEvent; picture: Buffer }
  | { type: 'closing' };

export interface Story {
  event: PostEvent;
  picture: Buffer;
  /** "Tonight", "Tomorrow", "Saturday": storyDay in instagram-story-rules. */
  day: string;
}

export interface SlidePage {
  number: number;
  total: number;
}

/* The event's picture, 4:3 like the stored ones (500×375). */
const CARD_WIDTH = 840;
const CARD_HEIGHT = 630;

const PADDING = 64;
const WHITE = '#ffffff';
const LILAC = '#c4b5fd';
const VIOLET = '#8b5cf6';
/* The apps' primary colour. */
const BRAND = '#6747f7';
const NIGHT = '#140a30';
const NIGHT_BACKGROUND = `linear-gradient(160deg, ${NIGHT} 0%, #2a1170 52%, ${BRAND} 100%)`;

const GROUP_COLORS: Record<EventGroup, { background: string; text: string }> = {
  bars: { background: '#ff7a59', text: WHITE },
  clubs: { background: VIOLET, text: WHITE },
  food: { background: '#ffb627', text: '#2b1600' },
  culture: { background: '#ec4899', text: WHITE },
};

/* The capybara on an event's slide, by its venue's type; a group's cover
 * shows its first type's. The week's cover and the closing slide have the
 * landing page's (apps/host/public/images/mascots). */
const MASCOT_FILES: Record<VenueType | 'week' | 'app', string> = {
  bar: 'mascot-bar.webp',
  tavern: 'mascot-tavern.webp',
  club: 'mascot-club.webp',
  restaurant: 'mascot-restaurant.webp',
  cafe: 'mascot-cafe.webp',
  event_venue: 'mascot-event-venue.webp',
  week: 'mascot-week.webp',
  app: 'mascot-app.webp',
};

type Mascot = keyof typeof MASCOT_FILES;

const ASSETS_DIR = path.join(
  __dirname,
  '..',
  '..',
  'assets',
  'instagram-posts',
);

/* Nunito comes as one file per alphabet. Satori falls back from one font to
 * the next only when their names differ, so each file has its own name and
 * FONT_FAMILY lists them all: Serbian Latin and Cyrillic titles need it. */
const FONT_FILES = [
  ['latin', 'Nunito'],
  ['latin-ext', 'Nunito Latin Ext'],
  ['cyrillic', 'Nunito Cyrillic'],
  ['cyrillic-ext', 'Nunito Cyrillic Ext'],
] as const;

const FONT_WEIGHTS = [800, 900] as const;

const FONT_FAMILY = FONT_FILES.map(([, name]) => `"${name}"`).join(', ');

/* Icons from Lucide (lucide.dev, ISC licence), on a 24×24 grid. */
const ICONS = {
  calendar:
    '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  pin: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  // martini
  bars: '<path d="M8 22h8"/><path d="M12 11v11"/><path d="m19 3-7 8-7-8Z"/>',
  // disc-3
  clubs:
    '<circle cx="12" cy="12" r="10"/><path d="M6 12c0-1.7.7-3.2 1.8-4.2"/><circle cx="12" cy="12" r="2"/><path d="M18 12c0 1.7-.7 3.2-1.8 4.2"/>',
  // utensils
  food: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  // ticket
  culture:
    '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>',
};

type IconName = keyof typeof ICONS;

/* Tulum's logo (apps/host/components/common/logo.tsx) in white, with its
 * cut-outs in the slides' night colour. */
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="744" height="622" viewBox="0 0 744 622" fill="none" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"><path d="M36.9492 341.045C101.849 487.045 298.449 581.945 362.649 609.745C365.449 610.745 368.349 611.145 371.149 611.145C374.049 611.045 376.749 610.445 379.249 609.345C381.749 608.245 384.049 606.645 385.949 604.545C387.849 602.545 389.449 600.045 390.649 597.245C413.149 531.045 474.749 321.645 409.949 175.545C382.349 113.445 336.349 62.6453 281.849 34.2453C227.449 5.84527 169.049 2.24527 119.649 24.2453C70.1492 46.1453 33.6492 91.8452 18.1492 151.245C2.64925 210.645 9.44924 278.945 36.9492 341.045Z" fill="${NIGHT}" stroke="${WHITE}"/><path d="M706.349 341.045C641.549 487.045 444.949 581.945 380.749 609.745C377.849 610.745 374.949 611.145 372.149 611.145C369.349 611.045 366.649 610.445 364.149 609.345C361.549 608.245 359.349 606.645 357.349 604.545C355.449 602.545 353.849 600.045 352.749 597.245C330.149 531.045 268.649 321.645 333.449 175.545C360.949 113.445 407.049 62.6453 461.449 34.2453C515.949 5.84527 574.249 2.24527 623.749 24.2453C673.149 46.1453 709.649 91.8452 725.149 151.245C740.649 210.645 733.849 278.945 706.349 341.045Z" fill="${WHITE}" stroke="${WHITE}"/><path d="M200.349 294.845C159.349 294.845 126.249 261.745 126.249 220.745C126.249 179.745 159.349 146.645 200.349 146.645C241.349 146.645 274.449 179.745 274.449 220.745C274.449 261.745 241.349 294.845 200.349 294.845Z" fill="${WHITE}" stroke="${NIGHT}"/><path d="M532.349 307.845C491.349 307.845 458.249 274.745 458.249 233.745C458.249 192.745 491.349 159.645 532.349 159.645C573.349 159.645 606.449 192.745 606.449 233.745C606.449 274.745 573.349 307.845 532.349 307.845Z" fill="${NIGHT}" stroke="${WHITE}"/></svg>`;

type Style = Record<string, string | number>;
type Child = SlideNode | string | null | false;

/* The element tree Satori takes, without React. */
interface SlideNode {
  type: 'div' | 'img';
  props: { style: Style; src?: string; children?: (SlideNode | string)[] };
}

interface Size {
  width: number;
  height: number;
}

const SLIDE_SIZE: Size = { width: SLIDE_WIDTH, height: SLIDE_HEIGHT };
const STORY_SIZE: Size = { width: STORY_WIDTH, height: STORY_HEIGHT };

interface SlideAssets {
  fonts: {
    name: string;
    data: Buffer;
    weight: (typeof FONT_WEIGHTS)[number];
    style: 'normal';
  }[];
  /** Each capybara as a PNG data URI. */
  mascots: Record<Mascot, string>;
  logo: string;
}

let assets: Promise<SlideAssets> | null = null;

/** Draws a slide as a JPEG. */
export async function renderSlide(
  slide: Slide,
  page: SlidePage,
): Promise<Buffer> {
  const loaded = await loadAssets();
  const tree =
    slide.type === 'cover'
      ? coverSlide(slide, page, loaded)
      : slide.type === 'event'
        ? eventSlide(
            slide.event,
            await eventPicture(slide.picture, SLIDE_SIZE),
            page,
            loaded,
          )
        : closingSlide(page, loaded);
  return draw(tree, SLIDE_SIZE, loaded);
}

/** Draws a story as a JPEG. */
export async function renderStory(story: Story): Promise<Buffer> {
  const loaded = await loadAssets();
  const picture = await eventPicture(story.picture, STORY_SIZE);
  return draw(storyFrame(story, picture, loaded), STORY_SIZE, loaded);
}

async function draw(
  tree: SlideNode,
  size: Size,
  { fonts }: SlideAssets,
): Promise<Buffer> {
  const svg = await satori(tree as unknown as Parameters<typeof satori>[0], {
    width: size.width,
    height: size.height,
    fonts,
  });
  // Full-resolution colour keeps the text's edges sharp.
  return sharp(Buffer.from(svg))
    .jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
    .toBuffer();
}

function loadAssets(): Promise<SlideAssets> {
  assets ??= readAssets().catch((error: unknown) => {
    // Let the next post try again.
    assets = null;
    throw error;
  });
  return assets;
}

async function readAssets(): Promise<SlideAssets> {
  const fontDir = path.join(
    path.dirname(require.resolve('@fontsource/nunito/package.json')),
    'files',
  );
  const fonts = await Promise.all(
    FONT_FILES.flatMap(([subset, name]) =>
      FONT_WEIGHTS.map(async (weight) => ({
        name,
        weight,
        style: 'normal' as const,
        data: await readFile(
          path.join(fontDir, `nunito-${subset}-${weight}-normal.woff`),
        ),
      })),
    ),
  );

  const mascots = {} as Record<Mascot, string>;
  for (const [mascot, file] of Object.entries(MASCOT_FILES)) {
    const png = await sharp(path.join(ASSETS_DIR, file)).png().toBuffer();
    mascots[mascot as Mascot] = dataUri('image/png', png);
  }
  return { fonts, mascots, logo: svgDataUri(LOGO_SVG) };
}

/* The event's picture for its card, and blurred and darkened for the
 * background. */
async function eventPicture(picture: Buffer, size: Size) {
  const card = await sharp(picture)
    .resize(CARD_WIDTH, CARD_HEIGHT, { fit: 'cover' })
    .jpeg({ quality: 90 })
    .toBuffer();
  // Blurred small, then enlarged: the same look for a fraction of the work.
  const backdrop = await sharp(picture)
    .resize(size.width / 5, size.height / 5, { fit: 'cover' })
    .blur(10)
    .modulate({ brightness: 0.75, saturation: 1.3 })
    .resize(size.width, size.height)
    .jpeg({ quality: 80 })
    .toBuffer();
  return {
    card: dataUri('image/jpeg', card),
    backdrop: dataUri('image/jpeg', backdrop),
  };
}

function coverSlide(
  slide: Extract<Slide, { type: 'cover' }>,
  page: SlidePage,
  { mascots, logo }: SlideAssets,
): SlideNode {
  if (slide.kind === 'week') {
    return frame(
      NIGHT_BACKGROUND,
      [
        glow(-160, 180, 620, 'rgba(139, 92, 246, 0.55)'),
        glow(620, 760, 640, 'rgba(236, 72, 153, 0.35)'),
        image(mascots.week, {
          position: 'absolute',
          left: -40,
          bottom: 150,
          width: 720,
          height: 600,
        }),
      ],
      header(page, logo),
      box(
        { display: 'flex', flexDirection: 'column', marginTop: 64 },
        box({ fontSize: 132, fontWeight: 900, lineHeight: 1 }, 'This week'),
        box(
          {
            display: 'flex',
            alignItems: 'center',
            gap: 28,
            marginTop: 18,
            fontSize: 132,
            fontWeight: 900,
            lineHeight: 1,
          },
          'in',
          highlight('Belgrade', 132),
        ),
      ),
      dateChip(slide.dateRange, 46),
      box({ flexGrow: 1 }),
      box(
        {
          display: 'flex',
          alignSelf: 'flex-end',
          marginBottom: 44,
        },
        swipePill(`${slide.eventCount} picks`, BRAND, WHITE),
      ),
      box(
        { display: 'flex', gap: 16, flexWrap: 'wrap' },
        ...slide.groups.map((group) =>
          chip(group, GROUP_SHORT_LABELS[group], 36),
        ),
      ),
    );
  }

  const colors = GROUP_COLORS[slide.kind];
  return frame(
    NIGHT_BACKGROUND,
    [
      glow(560, -120, 640, 'rgba(139, 92, 246, 0.5)'),
      glow(-220, 820, 700, `${colors.background}55`),
      image(mascots[GROUP_VENUE_TYPES[slide.kind][0]], {
        position: 'absolute',
        right: -30,
        bottom: 40,
        width: 760,
        height: 633,
      }),
    ],
    header(page, logo),
    box(
      {
        marginTop: 72,
        fontSize: 36,
        fontWeight: 900,
        letterSpacing: 5,
        color: LILAC,
      },
      'THIS WEEK IN BELGRADE',
    ),
    box(
      {
        display: 'flex',
        marginTop: 20,
        maxWidth: 900,
        fontSize: 124,
        fontWeight: 900,
        lineHeight: 1.02,
      },
      GROUP_LABELS[slide.kind],
    ),
    dateChip(slide.dateRange, 46),
    box({ flexGrow: 1 }),
    box(
      { display: 'flex', alignSelf: 'flex-start' },
      swipePill(`${slide.eventCount} picks`, colors.background, colors.text),
    ),
  );
}

function eventSlide(
  event: PostEvent,
  picture: { card: string; backdrop: string },
  page: SlidePage,
  { mascots, logo }: SlideAssets,
): SlideNode {
  const title = slideText(event.title);
  const time = formatTime(event.startsAt);
  // Midnight is what the sources store when they give no time.
  const when =
    time === '00:00'
      ? formatDay(event.startsAt)
      : `${formatDay(event.startsAt)} · ${time}`;

  return frame(
    NIGHT,
    [
      image(picture.backdrop, {
        position: 'absolute',
        left: 0,
        top: 0,
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
      }),
      box({
        position: 'absolute',
        left: 0,
        top: 0,
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        backgroundImage:
          'linear-gradient(180deg, rgba(20, 10, 48, 0.55) 0%, rgba(20, 10, 48, 0.7) 45%, rgba(20, 10, 48, 0.94) 72%, rgba(20, 10, 48, 0.98) 100%)',
      }),
      image(mascots[event.venueType], {
        position: 'absolute',
        right: -60,
        bottom: -20,
        width: 456,
        height: 380,
      }),
    ],
    header(page, logo),
    box(
      { display: 'flex', marginTop: 36 },
      chip(event.group, GROUP_LABELS[event.group], 34),
    ),
    image(picture.card, {
      alignSelf: 'center',
      marginTop: 34,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: 34,
      border: `10px solid ${WHITE}`,
      transform: 'rotate(-2deg)',
      boxShadow: '0 24px 60px rgba(0, 0, 0, 0.55)',
    }),
    box(
      {
        display: 'block',
        marginTop: 44,
        maxWidth: 680,
        fontSize: title.length > 42 ? 56 : 66,
        fontWeight: 900,
        lineHeight: 1.08,
        lineClamp: 3,
      },
      title,
    ),
    infoRow('calendar', when, { marginTop: 20 }),
    infoRow('pin', slideText(event.venueName), { marginTop: 10 }),
  );
}

function closingSlide(
  page: SlidePage,
  { mascots, logo }: SlideAssets,
): SlideNode {
  const line = { fontSize: 100, fontWeight: 900, lineHeight: 1.08 };
  return frame(
    NIGHT_BACKGROUND,
    [
      glow(-200, 120, 680, 'rgba(139, 92, 246, 0.5)'),
      glow(560, 760, 680, 'rgba(236, 72, 153, 0.32)'),
      image(mascots.app, {
        position: 'absolute',
        left: 300,
        bottom: 150,
        width: 480,
        height: 720,
      }),
    ],
    header(page, logo),
    box(
      { display: 'flex', flexDirection: 'column', marginTop: 64 },
      box(line, 'Discover events.'),
      box(line, 'Meet people.'),
      box(
        { ...line, display: 'flex', alignItems: 'center', gap: 24 },
        'Find',
        highlight('your vibe.', 100),
      ),
    ),
    box({ flexGrow: 1 }),
    box(
      { display: 'flex', alignSelf: 'center' },
      swipePill('tulum-app.com', BRAND, WHITE, 52),
    ),
  );
}

/*
 * A story: the event's picture over a blur of it, its group, title, day and
 * time and venue, its venue type's capybara, and the call to action. The
 * text keeps to the band between STORY_SAFE_TOP and STORY_SAFE_BOTTOM.
 */
function storyFrame(
  { event, day }: Story,
  picture: { card: string; backdrop: string },
  { mascots, logo }: SlideAssets,
): SlideNode {
  const title = slideText(event.title);
  const time = formatTime(event.startsAt);
  // Midnight is what the sources store when they give no time.
  const when =
    time === '00:00'
      ? formatDay(event.startsAt)
      : `${formatDay(event.startsAt)} · ${time}`;

  return canvas(
    STORY_SIZE,
    `${STORY_SAFE_TOP}px ${PADDING}px ${STORY_SAFE_BOTTOM}px`,
    NIGHT,
    [
      image(picture.backdrop, {
        position: 'absolute',
        left: 0,
        top: 0,
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
      }),
      box({
        position: 'absolute',
        left: 0,
        top: 0,
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
        backgroundImage:
          'linear-gradient(180deg, rgba(20, 10, 48, 0.6) 0%, rgba(20, 10, 48, 0.62) 30%, rgba(20, 10, 48, 0.92) 58%, rgba(20, 10, 48, 0.98) 100%)',
      }),
      glow(-220, 60, 640, 'rgba(139, 92, 246, 0.45)'),
      image(mascots[event.venueType], {
        position: 'absolute',
        right: -60,
        bottom: STORY_SAFE_BOTTOM - 10,
        width: 456,
        height: 380,
      }),
    ],
    box(
      {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
      },
      brand(logo),
      box(
        { display: 'flex', fontSize: 46, fontWeight: 900 },
        highlight(day, 46),
      ),
    ),
    image(picture.card, {
      alignSelf: 'center',
      marginTop: 40,
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: 34,
      border: `10px solid ${WHITE}`,
      transform: 'rotate(-2deg)',
      boxShadow: '0 24px 60px rgba(0, 0, 0, 0.55)',
    }),
    box(
      { display: 'flex', marginTop: 44 },
      chip(event.group, GROUP_LABELS[event.group], 34),
    ),
    box(
      {
        display: 'block',
        marginTop: 22,
        maxWidth: 680,
        fontSize: title.length > 42 ? 60 : 72,
        fontWeight: 900,
        lineHeight: 1.06,
        lineClamp: 3,
      },
      title,
    ),
    infoRow('calendar', when, { marginTop: 22 }),
    infoRow('pin', slideText(event.venueName), { marginTop: 10 }),
    box({ flexGrow: 1 }),
    box(
      { display: 'flex', alignSelf: 'flex-start', marginTop: 28 },
      swipePill('Join on tulum-app.com', BRAND, WHITE),
    ),
  );
}

/*
 * The slide: its background, the absolutely placed layers (lights, the
 * capybara, a backdrop picture), then the content in a column. Like a
 * browser, Satori paints positioned boxes over static ones, so the content
 * is positioned too, which puts it over the layers before it.
 */
function frame(
  background: string,
  layers: Child[],
  ...content: Child[]
): SlideNode {
  return canvas(SLIDE_SIZE, PADDING, background, layers, ...content);
}

function canvas(
  size: Size,
  padding: string | number,
  background: string,
  layers: Child[],
  ...content: Child[]
): SlideNode {
  return box(
    {
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      width: size.width,
      height: size.height,
      color: WHITE,
      fontFamily: FONT_FAMILY,
      ...(background.startsWith('linear-gradient')
        ? { backgroundImage: background }
        : { backgroundColor: background }),
    },
    ...layers,
    // Grows to the picture's height; a height of 100% would add the padding.
    box(
      {
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        flexGrow: 1,
        padding,
      },
      ...content,
    ),
  );
}

function header(page: SlidePage, logo: string): SlideNode {
  return box(
    {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
    },
    brand(logo),
    box(
      {
        display: 'flex',
        padding: '10px 24px',
        borderRadius: 999,
        backgroundColor: 'rgba(10, 4, 30, 0.55)',
        fontSize: 30,
        fontWeight: 800,
      },
      `${page.number}/${page.total}`,
    ),
  );
}

/* Tulum's logo and name. */
function brand(logo: string): SlideNode {
  return box(
    { display: 'flex', alignItems: 'center', gap: 16 },
    image(logo, { width: 67, height: 56 }),
    box({ fontSize: 50, fontWeight: 900, letterSpacing: -0.5 }, 'tulum'),
  );
}

/* A soft light behind the content. */
function glow(left: number, top: number, size: number, color: string) {
  return box({
    position: 'absolute',
    left,
    top,
    width: size,
    height: size,
    backgroundImage: `radial-gradient(circle, ${color} 0%, rgba(0, 0, 0, 0) 70%)`,
  });
}

/* A word on a glowing violet pill, as in "in Belgrade". */
function highlight(text: string, fontSize: number): SlideNode {
  return box(
    {
      display: 'flex',
      padding: `${Math.round(fontSize * 0.04)}px ${Math.round(fontSize * 0.24)}px ${Math.round(fontSize * 0.1)}px`,
      borderRadius: Math.round(fontSize * 0.36),
      backgroundColor: VIOLET,
      boxShadow: '0 0 48px rgba(139, 92, 246, 0.85)',
    },
    text,
  );
}

function dateChip(text: string, fontSize: number): SlideNode {
  return box(
    {
      display: 'flex',
      alignSelf: 'flex-start',
      alignItems: 'center',
      gap: 16,
      marginTop: 40,
      padding: '14px 30px',
      borderRadius: 999,
      backgroundColor: 'rgba(255, 255, 255, 0.14)',
      fontSize,
      fontWeight: 800,
    },
    icon('calendar', WHITE, fontSize),
    text,
  );
}

/* A group's pill: its colour, icon and name. */
function chip(group: EventGroup, label: string, fontSize: number): SlideNode {
  const colors = GROUP_COLORS[group];
  return box(
    {
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '14px 30px',
      borderRadius: 999,
      backgroundColor: colors.background,
      color: colors.text,
      fontSize,
      fontWeight: 900,
      boxShadow: `0 0 36px ${colors.background}88`,
    },
    icon(group, colors.text, Math.round(fontSize * 1.05)),
    label,
  );
}

function swipePill(
  text: string,
  background: string,
  color: string,
  fontSize = 42,
): SlideNode {
  return box(
    {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '18px 36px',
      borderRadius: 999,
      backgroundColor: background,
      color,
      fontSize,
      fontWeight: 900,
      boxShadow: `0 0 44px ${background}99`,
    },
    text,
    icon('arrow', color, fontSize),
  );
}

function infoRow(name: IconName, text: string, style: Style): SlideNode {
  return box(
    { display: 'flex', alignItems: 'center', gap: 16, ...style },
    icon(name, LILAC, 40),
    box(
      {
        display: 'block',
        maxWidth: 600,
        fontSize: 38,
        fontWeight: 800,
        lineClamp: 1,
      },
      text,
    ),
  );
}

function icon(name: IconName, color: string, size: number): SlideNode {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
  return image(svgDataUri(svg), { width: size, height: size });
}

function box(style: Style, ...children: Child[]): SlideNode {
  return {
    type: 'div',
    props: {
      style,
      children: children.filter(
        (child): child is SlideNode | string =>
          child !== null && child !== false,
      ),
    },
  };
}

function image(src: string, style: Style): SlideNode {
  return { type: 'img', props: { src, style } };
}

function dataUri(type: string, data: Buffer): string {
  return `data:${type};base64,${data.toString('base64')}`;
}

function svgDataUri(svg: string): string {
  return dataUri('image/svg+xml', Buffer.from(svg));
}
