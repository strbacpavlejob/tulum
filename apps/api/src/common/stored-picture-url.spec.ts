import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from '@jest/globals';
import { R2Service } from '../r2/r2.service';
import { assertStoredPictureUrl } from './stored-picture-url';

const R2 = 'https://img.tulum-app.com';

const r2 = {
  extractKeyFromUrl: (url: string) =>
    url.startsWith(`${R2}/`) ? url.slice(R2.length + 1) : null,
} as unknown as R2Service;

describe('assertStoredPictureUrl', () => {
  it.each([
    ['no picture_url', undefined],
    ['a removed picture', null],
    ['an empty picture', ''],
    ['a picture in the bucket', `${R2}/event-images/host/venue/new.webp`],
  ])('accepts %s', (_name, pictureUrl) => {
    expect(() =>
      assertStoredPictureUrl(r2, pictureUrl, 'https://eventzeka.com/old.jpg'),
    ).not.toThrow();
  });

  it("accepts the row's own picture, even before it is moved to R2", () => {
    expect(() =>
      assertStoredPictureUrl(
        r2,
        'https://framerusercontent.com/v1.jpg',
        'https://framerusercontent.com/v1.jpg',
      ),
    ).not.toThrow();
  });

  it.each([
    ['a link to another site', 'https://images.unsplash.com/photo.jpg'],
    ['something other than a URL', 42],
  ])('refuses %s', (_name, pictureUrl) => {
    expect(() => assertStoredPictureUrl(r2, pictureUrl, null)).toThrow(
      BadRequestException,
    );
  });
});
