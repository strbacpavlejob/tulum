import { BadRequestException } from '@nestjs/common';
import { R2Service } from '../r2/r2.service';

/**
 * Throws unless the picture_url a host's update sends is empty, the row's
 * own picture, or a picture in the bucket: event and venue pictures are
 * uploaded and stored in R2, never linked from other sites.
 */
export function assertStoredPictureUrl(
  r2Service: R2Service,
  pictureUrl: unknown,
  currentPictureUrl: string | null,
): void {
  if (
    pictureUrl === undefined ||
    pictureUrl === null ||
    pictureUrl === '' ||
    pictureUrl === currentPictureUrl
  ) {
    return;
  }
  if (
    typeof pictureUrl === 'string' &&
    r2Service.extractKeyFromUrl(pictureUrl) !== null
  ) {
    return;
  }
  throw new BadRequestException(
    'picture_url must be a picture uploaded to Tulum, not a link to another site',
  );
}
