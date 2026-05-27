-- Strip HTML tags and decode HTML entities from descriptions scraped by GoOut.
-- Affects: events (via venue join) and venues (scraper = 'goout').

-- ─── Helper: strip HTML from a text value ────────────────────────────────────
-- 1. Remove all HTML tags                → replace with space
-- 2. Decode common HTML entities
-- 3. Collapse consecutive whitespace     → single space
-- 4. Trim leading/trailing whitespace

-- ─── venues ──────────────────────────────────────────────────────────────────
UPDATE public.venues
SET
  description = trim(
    regexp_replace(
      replace(replace(replace(replace(replace(
        regexp_replace(description, '<[^>]+>', ' ', 'g'),
        '&amp;',  '&'),
        '&lt;',   '<'),
        '&gt;',   '>'),
        '&quot;', '"'),
        '&#39;',  ''''),
      '\s+', ' ', 'g'
    )
  )
WHERE scraper = 'goout'
  AND description IS NOT NULL
  AND description ~ '<[^>]+>|&(amp|lt|gt|quot|#39|nbsp);';

-- ─── events (joined to goout venues) ─────────────────────────────────────────
UPDATE public.events e
SET
  description = trim(
    regexp_replace(
      replace(replace(replace(replace(replace(
        regexp_replace(e.description, '<[^>]+>', ' ', 'g'),
        '&amp;',  '&'),
        '&lt;',   '<'),
        '&gt;',   '>'),
        '&quot;', '"'),
        '&#39;',  ''''),
      '\s+', ' ', 'g'
    )
  )
FROM public.venues v
WHERE e.venue_id = v.id
  AND v.scraper = 'goout'
  AND e.description ~ '<[^>]+>|&(amp|lt|gt|quot|#39|nbsp);';
