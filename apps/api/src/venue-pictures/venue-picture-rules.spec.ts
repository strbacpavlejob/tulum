import { describe, expect, it } from '@jest/globals';
import {
  findVenueInstagramHandle,
  GoogleMapsPlace,
  instagramHandleFromUrl,
  isInstagramBlankAvatar,
  normalizeInstagramHandle,
  profilePictureUrl,
} from './venue-picture-rules';

// Lasta Club's position in the database; 0.001° of latitude is about 111 m.
const LASTA = { name: 'Lasta Club', latitude: 44.8012, longitude: 20.4419 };

const place = (overrides: Partial<GoogleMapsPlace>): GoogleMapsPlace => ({
  title: 'Lasta',
  latitude: LASTA.latitude,
  longitude: LASTA.longitude,
  website: null,
  instagramUrls: [],
  permanentlyClosed: false,
  ...overrides,
});

describe('instagramHandleFromUrl', () => {
  it.each([
    ['https://www.instagram.com/lastaclub/', 'lastaclub'],
    ['https://instagram.com/Lasta.Club?igsh=abc123', 'lasta.club'],
    ['http://m.instagram.com/lasta_club', 'lasta_club'],
    ['instagram.com/lastaclub', 'lastaclub'],
    ['https://www.instagram.com/_u/lastaclub/', 'lastaclub'],
    ['https://instagr.am/lastaclub', 'lastaclub'],
  ])('reads %s as @%s', (url, handle) => {
    expect(instagramHandleFromUrl(url)).toBe(handle);
  });

  it.each([
    ['a post', 'https://www.instagram.com/p/C1a2b3c4d5e/'],
    ['a reel', 'https://www.instagram.com/reel/C1a2b3c4d5e/'],
    ['a story', 'https://www.instagram.com/stories/lastaclub/123/'],
    ['the sign-in page', 'https://www.instagram.com/accounts/login/'],
    ['Instagram itself', 'https://www.instagram.com/'],
    ['another site', 'https://lastaclub.rs/instagram'],
    ['a look-alike host', 'https://instagram.com.evil.example/lastaclub'],
    ['not a URL', 'lasta club'],
  ])('finds no profile in %s', (_, url) => {
    expect(instagramHandleFromUrl(url)).toBeNull();
  });
});

describe('normalizeInstagramHandle', () => {
  it.each([
    ['lastaclub', 'lastaclub'],
    ['@LastaClub', 'lastaclub'],
    ['  lasta.club ', 'lasta.club'],
    ['https://www.instagram.com/lastaclub/', 'lastaclub'],
  ])('reads %s as @%s', (value, handle) => {
    expect(normalizeInstagramHandle(value)).toBe(handle);
  });

  it.each([[null], [''], ['lasta club'], ['https://www.instagram.com/p/x/']])(
    'finds no handle in %p',
    (value) => {
      expect(normalizeInstagramHandle(value)).toBeNull();
    },
  );
});

describe('profilePictureUrl', () => {
  const profile = {
    username: 'lastaclub',
    fullName: 'Lasta Club',
    profilePicUrl: 'https://scontent.cdninstagram.com/v/t51/small.jpg',
    profilePicUrlHD: 'https://scontent.cdninstagram.com/v/t51/large.jpg',
  };

  it('prefers the larger picture', () => {
    expect(profilePictureUrl(profile)).toBe(profile.profilePicUrlHD);
    expect(profilePictureUrl({ ...profile, profilePicUrlHD: null })).toBe(
      profile.profilePicUrl,
    );
  });

  it("skips Instagram's blank avatar, an account without a picture", () => {
    const blank =
      'https://scontent.cdninstagram.com/v/t51.2885-19/44884218_345707102882519_2446069589734326272_n.jpg?_nc_ht=x';
    expect(isInstagramBlankAvatar(blank)).toBe(true);
    expect(
      profilePictureUrl({
        ...profile,
        profilePicUrl: blank,
        profilePicUrlHD: blank,
      }),
    ).toBeNull();
    expect(
      profilePictureUrl({
        ...profile,
        profilePicUrl: null,
        profilePicUrlHD: null,
      }),
    ).toBeNull();
  });
});

describe('findVenueInstagramHandle', () => {
  it('takes the Instagram profile a place lists as its website', () => {
    const places = [
      place({ website: 'https://www.instagram.com/lastaclub/?hl=en' }),
    ];
    expect(findVenueInstagramHandle(LASTA, places)).toBe('lastaclub');
  });

  it("takes a profile the place's website links to when it's the venue's", () => {
    const places = [
      place({
        website: 'https://lastaclub.rs/',
        instagramUrls: ['https://www.instagram.com/lasta.club.belgrade/'],
      }),
    ];
    expect(findVenueInstagramHandle(LASTA, places)).toBe('lasta.club.belgrade');
  });

  it("ignores profiles a website links to that aren't the venue's", () => {
    // The footer credit of the agency that built the site.
    const places = [
      place({
        website: 'https://lastaclub.rs/',
        instagramUrls: ['https://www.instagram.com/pixelstudio.bg/'],
      }),
    ];
    expect(findVenueInstagramHandle(LASTA, places)).toBeNull();
  });

  it('picks the profile most like the venue among several', () => {
    const places = [
      place({
        website: 'https://lastaclub.rs/',
        instagramUrls: [
          'https://www.instagram.com/pixelstudio.bg/',
          'https://www.instagram.com/lastaclub/',
          'https://www.instagram.com/lastaclub/',
        ],
      }),
    ];
    expect(findVenueInstagramHandle(LASTA, places)).toBe('lastaclub');
  });

  it('only trusts places that have the venue’s name', () => {
    const places = [
      place({
        title: 'Splav Hot Shot',
        website: 'https://www.instagram.com/hotshot.splav/',
      }),
    ];
    expect(findVenueInstagramHandle(LASTA, places)).toBeNull();
  });

  it('accepts a name that differs only in spacing', () => {
    const venue = { ...LASTA, name: 'Akademija 28' };
    const places = [
      place({
        title: 'Akademija28',
        latitude: LASTA.latitude + 0.0025,
        website: 'https://www.instagram.com/akademija28/',
      }),
    ];
    expect(findVenueInstagramHandle(venue, places)).toBe('akademija28');
  });

  it('accepts one name inside the other only very close by', () => {
    const venue = { ...LASTA, name: 'Smokvica' };
    const branch = (latitude: number) =>
      place({
        title: 'Smokvica Kralja Petra',
        latitude,
        website: 'https://www.instagram.com/smokvica/',
      });

    expect(
      findVenueInstagramHandle(venue, [branch(LASTA.latitude + 0.001)]),
    ).toBe('smokvica');
    expect(
      findVenueInstagramHandle(venue, [branch(LASTA.latitude + 0.002)]),
    ).toBeNull();
  });

  it('ignores a namesake across town', () => {
    const places = [
      place({
        latitude: LASTA.latitude + 0.01,
        website: 'https://www.instagram.com/lasta.novibeograd/',
      }),
    ];
    expect(findVenueInstagramHandle(LASTA, places)).toBeNull();
  });

  it('ignores places closed for good and places without a position', () => {
    const website = 'https://www.instagram.com/lastaclub/';
    expect(
      findVenueInstagramHandle(LASTA, [
        place({ website, permanentlyClosed: true }),
        place({ website, latitude: null, longitude: null }),
      ]),
    ).toBeNull();
  });

  it('prefers the nearest of several matching places', () => {
    const places = [
      place({
        latitude: LASTA.latitude + 0.002,
        website: 'https://www.instagram.com/lasta.old/',
      }),
      place({ website: 'https://www.instagram.com/lastaclub/' }),
    ];
    expect(findVenueInstagramHandle(LASTA, places)).toBe('lastaclub');
  });
});
