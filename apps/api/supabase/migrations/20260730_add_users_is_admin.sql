-- Migration: add is_admin column to users
-- Adds a boolean is_admin column with default false for admin flag

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE public.users ADD COLUMN is_admin boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Ensure service role can manage the new column via existing users policy (service_role already has full access)

-- Grant SELECT/UPDATE to authenticated/service_role if desired (keep existing grants)
GRANT SELECT, UPDATE ON public.users TO service_role;
GRANT SELECT ON public.users TO authenticated;
