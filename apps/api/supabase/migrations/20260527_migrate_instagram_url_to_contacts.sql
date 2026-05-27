-- Migration: migrate_instagram_url_to_contacts
-- Moves instagram_url from venues to venue_contacts.instagram_handle
-- and adds is_instagram boolean flag to venue_contacts.

-- ── Step 1: Add is_instagram to venue_contacts ────────────────────────────
ALTER TABLE "public"."venue_contacts"
    ADD COLUMN IF NOT EXISTS "is_instagram" boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN "public"."venue_contacts"."is_instagram" IS
    'When true, the venue can be contacted via Instagram DM.';

-- ── Step 2: For venues that already have a contact_id, copy the instagram ──
--           handle into the existing contact row.
UPDATE "public"."venue_contacts" vc
SET
    instagram_handle = COALESCE(
        NULLIF(vc.instagram_handle, ''),
        CASE
            WHEN v.instagram_url LIKE '%instagram.com/%' THEN
                lower(trim(regexp_replace(
                    regexp_replace(v.instagram_url,
                        'https?://(www\.)?instagram\.com/', ''),
                    '/.*$', '')))
            WHEN v.instagram_url LIKE '@%' THEN
                lower(trim(substring(v.instagram_url FROM 2)))
            ELSE
                lower(trim(v.instagram_url))
        END
    ),
    is_instagram = true
FROM "public"."venues" v
WHERE v.contact_id = vc.id
  AND v.instagram_url IS NOT NULL
  AND v.instagram_url <> '';

-- ── Step 3: For venues with instagram_url but NO contact yet, create one ──
DO $$
DECLARE
    v         RECORD;
    new_id    bigint;
    username  text;
BEGIN
    FOR v IN
        SELECT id, instagram_url
        FROM   "public"."venues"
        WHERE  instagram_url IS NOT NULL
          AND  instagram_url <> ''
          AND  contact_id IS NULL
    LOOP
        -- Extract the bare username from the URL.
        -- Works for:  https://www.instagram.com/username/
        --             https://instagram.com/username
        --             @username  (fallback: strip leading @)
        username := CASE
            WHEN v.instagram_url LIKE '%instagram.com/%' THEN
                regexp_replace(
                    regexp_replace(v.instagram_url,
                        'https?://(www\.)?instagram\.com/', ''),
                    '/.*$', '')
            WHEN v.instagram_url LIKE '@%' THEN
                substring(v.instagram_url FROM 2)
            ELSE
                v.instagram_url
        END;
        username := trim(both ' ' from lower(username));

        CONTINUE WHEN username IS NULL OR username = '';

        INSERT INTO "public"."venue_contacts"
            (phone_number, is_instagram, instagram_handle,
             is_viber, is_phone, is_sms, is_whatsapp)
        VALUES ('', true, username, false, false, false, false)
        RETURNING id INTO new_id;

        UPDATE "public"."venues"
        SET    contact_id = new_id
        WHERE  id = v.id;
    END LOOP;
END $$;

-- ── Step 4: Drop instagram_url from venues ────────────────────────────────
ALTER TABLE "public"."venues"
    DROP COLUMN IF EXISTS "instagram_url";
