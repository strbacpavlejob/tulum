# Maskenbal poster kit (QA QR-7)

The QR codes for the posters, a print sheet and the staff help card for the
KST Maskenbal. Each poster's code opens the event page in the web app
directly, tagged with the poster (`?src=p07`), so after the night you can see
which spots brought guests.

## Before printing

1. Create the event: run `apps/api/supabase/data-fixes/20261111_kst_venue.sql`,
   then `20261111_kst_maskenbal_event.sql` with its date filled in. It
   returns the event's id.
2. On the host (Vercel, tulum-app.com, Production), set
   `MASKENBAL_EVENT_ID` to that id and redeploy. `tulum-app.com/maskenbal`,
   the short link printed under every code, then opens the event (tagged
   `short`), and the guest page's hero links to it. Check it without cookies:

   ```bash
   curl -sI https://tulum-app.com/maskenbal | grep -i '^location'
   ```

   It should show `https://mobile.tulum-app.com/e/<id>?src=short`.
3. Make the kit:

   ```bash
   node scripts/poster-kit/make-posters.mjs --event <id> --posters 12
   ```

   It writes into `scripts/poster-kit/out/`, which isn't committed:
   - `p01.svg` … `p12.svg`: each poster's code, for a print shop's own
     design. Print each at least 10 cm wide, black on white.
   - `posters.html`: every poster on its own A4 page. Print from Chrome at
     100% scale, with headers and footers off.
   - `staff-card.html`: the help card, Serbian and English halves of one A4
     landscape page; cut it in two.
   - `codes.csv`: each poster's link, with a column for where it hangs.
4. Scan `p01` on the screen with a phone. It should open the event page.

## On the night and after

Fill in `codes.csv` as the posters go up. A guest's first poster is kept in
`guests.first_source` (`p01`…, or `short` for the printed link), next to
`first_event_id`. After the night, remove `MASKENBAL_EVENT_ID` and redeploy:
the short link then goes to the guest page and the hero link disappears.

Other options: `--title` (the event's name on the posters), `--web` (the web
app's address), `--short` (the printed link) and `--out`.
