# Images and storage

All pictures are WebP files in one Cloudflare R2 bucket. Only the API talks to
R2 (`apps/api/src/r2/r2.service.ts`); the database stores public URLs.

| Picture      | Size             | Made where                                          | Key in the bucket          |
| ------------ | ---------------- | --------------------------------------------------- | -------------------------- |
| Event        | up to 500×375    | in the browser (`apps/host/lib/image-utils.ts`), WebP 80% | set by the API         |
| Venue        | up to 200×200    | in the browser, WebP 80%                            | set by the API             |
| Guest photo  | 800×600, cropped | on the API with sharp, WebP 80% (up to 3 per guest) | `guests/<userId>/<uuid>.webp` |
| Scraped poster or profile picture | as the source | downloaded and stored by the API (`downloadAndUpload`), or kept as the source's URL, per scraper config (`imagePolicy`) | |

## Upload path

- **Dashboard:** the host picks a file (`useImageFile` checks type and size:
  JPEG, PNG or WebP up to 5 MB), the browser resizes it to WebP, and the form
  sends it with the event or venue through the site's `/api/events` or
  `/api/venues` routes, which forward to the API.
- **App:** a guest's photo goes to the API, which resizes and stores it.

## Configuration (API)

`R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`,
and `R2_PUBLIC_URL`, the public address URLs are built with.
`R2_LEGACY_PUBLIC_URLS` lists older public addresses, so pictures stored under
them can still be recognized and deleted.

The public address is the bucket's `r2.dev` URL for now, which Cloudflare
rate-limits and calls non-production. The launch moves it to
`img.tulum-app.com` (see [launch-plan.md](launch-plan.md)), with the data fix
`apps/api/supabase/data-fixes/20261111_r2_custom_domain_urls.sql` for stored
URLs.

## Supabase Storage

Not used for pictures: they are all in R2.
