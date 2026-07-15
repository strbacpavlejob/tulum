ALTER TABLE public.venues
  ADD COLUMN IF NOT EXISTS min_age_male integer DEFAULT 18 NOT NULL,
  ADD COLUMN IF NOT EXISTS min_age_female integer DEFAULT 18 NOT NULL;
