-- Migration: add reports tables for bug reports and venue suggestions
-- Idempotent creation of enum and tables

-- Create report_status enum if not exists (migration-safe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status_enum') THEN
    CREATE TYPE public.report_status_enum AS ENUM ('pending','in_review','approved','rejected','resolved');
  END IF;
END $$;

-- Create bugs table
CREATE TABLE IF NOT EXISTS public.bugs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  status public.report_status_enum NOT NULL DEFAULT 'pending',
  description text NOT NULL,
  additional_info text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Create venue_suggestions table
CREATE TABLE IF NOT EXISTS public.venue_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text,
  name text NOT NULL,
  instagram_handle text,
  additional_info text,
  status public.report_status_enum NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Foreign keys to users if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.bugs'::regclass AND conname = 'bugs_user_id_fkey'
    ) THEN
      ALTER TABLE public.bugs ADD CONSTRAINT bugs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'public.venue_suggestions'::regclass AND conname = 'venue_suggestions_user_id_fkey'
    ) THEN
      ALTER TABLE public.venue_suggestions ADD CONSTRAINT venue_suggestions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS bugs_user_id_idx ON public.bugs (user_id);
CREATE INDEX IF NOT EXISTS venue_suggestions_user_id_idx ON public.venue_suggestions (user_id);

-- Grants (match other migrations)
GRANT ALL ON TABLE public.bugs TO anon;
GRANT ALL ON TABLE public.bugs TO authenticated;
GRANT ALL ON TABLE public.bugs TO service_role;

GRANT ALL ON TABLE public.venue_suggestions TO anon;
GRANT ALL ON TABLE public.venue_suggestions TO authenticated;
GRANT ALL ON TABLE public.venue_suggestions TO service_role;
