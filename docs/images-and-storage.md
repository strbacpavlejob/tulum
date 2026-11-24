# Images and storage

All pictures are WebP files in one Cloudflare R2 bucket. Only the API talks to
R2 (`apps/api/src/r2/r2.service.ts`); the database stores public URLs.

| Picture      | Size             | Made where                                          | Key in the bucket          |
| ------------ | ---------------- | --------------------------------------------------- | -------------------------- |
| Event        | up to 500×375    | in the browser (`apps/host/lib/image-utils.ts`), WebP 80% | set by the API         |
| Venue        | up to 200×200    | in the browser, WebP 80%                            | set by the API             |
| Guest photo  | 800×600, cropped | on the API with sharp, WebP 80% (up to 3 per guest) | `guests/<userId>/<uuid>.webp` |
| Scraped event picture | 500×375, cropped | the external picture job, on the API with sharp, WebP 80% ([scrapers.md](scrapers.md#pictures-from-sources)) | `event-images/scraped/<eventId>/picture.webp` |
| Scraped venue picture | 200×200, cropped | the external picture job, as above | `venue-images/scraped/<venueId>/picture.webp` |
| Manual Instagram scrape (`instagram/`) | posts 500×375, profiles 200×200 | on the API (`downloadAndUpload`) | `scraped/instagram/<handle>/…` |
| Imported venue's Instagram picture | 200×200, cropped | the hourly venue picture job, on the API with sharp, WebP 80% ([scrapers.md](scrapers.md#venue-pictures)) | `venue-images/scraped/<venueId>/instagram-profile.webp` |

## Upload path

- **Dashboard:** the host picks a file (`useImageFile` checks type and size:
  JPEG, PNG or WebP up to 5 MB), the browser resizes it to WebP, and the form
  sends it with the event or venue through the site's `/api/events` or
  `/api/venues` routes, which forward to the API.
- **App:** a guest's photo goes to the API, which resizes and stores it.

## Only pictures in R2

- Scrapers save a picture as the source links it; the external picture job
  then stores it in R2 and points the row there, or clears it when the
  source has dropped it ([scrapers.md](scrapers.md#pictures-from-sources)).
- A host's event or venue update that sends a `picture_url` outside the
  bucket is refused (400), unless it is the picture the row already has
  (`assertStoredPictureUrl`).
- The site's image optimizer (`apps/host/next.config.ts`) takes only
  `https://img.tulum-app.com`. The landing page's demo screens show stock
  photos from Unsplash, pravatar and UI Faces, which load unoptimized.

## Deleting

- A host deleting an event or a venue, or uploading a new picture, deletes the
  old picture.
- The old-events cleanup (`CleanupService.deleteOldEvents`, after every
  scrape and `DELETE /events/cleanup`) deletes the pictures of the events it
  deletes, except a picture another event or a venue still uses. A failed
  deletion is logged and leaves the object behind. Pictures of events deleted
  before 24 November 2026 are still in the bucket.

## Configuration (API)

`R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`,
and `R2_PUBLIC_URL`, the public address URLs are built with.
`R2_LEGACY_PUBLIC_URLS` lists older public addresses, so pictures stored under
them can still be recognized and deleted.

The public address is `https://img.tulum-app.com`, the bucket's custom
domain on Cloudflare, since 24 November 2026. Before that it was the bucket's
`r2.dev` URL, which Cloudflare rate-limits and calls non-production; that
address is now `R2_LEGACY_PUBLIC_URLS`, and the data fix
`apps/api/supabase/data-fixes/20261111_r2_custom_domain_urls.sql` moved every
stored URL to the custom domain.

## Supabase Storage

Not used for pictures: they are all in R2.
