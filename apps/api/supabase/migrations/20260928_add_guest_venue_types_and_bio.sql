ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS venue_types text[] DEFAULT '{}'::text[] NOT NULL,
  ADD COLUMN IF NOT EXISTS bio text;
