-- Migration: ensure guests table supports onboarding profile data
-- The table already exists; this migration is a safe no-op if already applied.

-- Ensure the guests table exists with all required columns
CREATE TABLE IF NOT EXISTS "public"."guests" (
    "user_id"      text                   NOT NULL,
    "gender"       public.gender_enum,
    "seeking"      public.seeking_enum,
    "interested_in" public.gender_enum[]  NOT NULL DEFAULT '{}',
    "interests"    text[]                 NOT NULL DEFAULT '{}',
    "picture_urls" text[]                 NOT NULL DEFAULT '{}',
    "birthday"     timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

-- Primary key (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.guests'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE public.guests ADD CONSTRAINT guests_pkey PRIMARY KEY (user_id);
  END IF;
END $$;

-- Foreign key to users (idempotent via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.guests'::regclass
      AND conname = 'guests_user_id_fkey'
  ) THEN
    ALTER TABLE public.guests
      ADD CONSTRAINT guests_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Index for fast lookup by user_id
CREATE INDEX IF NOT EXISTS guests_user_id_idx ON public.guests (user_id);

-- Grant access (matches existing table grants in schema.sql)
GRANT ALL ON TABLE public.guests TO anon;
GRANT ALL ON TABLE public.guests TO authenticated;
GRANT ALL ON TABLE public.guests TO service_role;
