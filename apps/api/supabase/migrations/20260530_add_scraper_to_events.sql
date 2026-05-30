-- Add scraper field to events table (mirrors the scraper column on venues)
ALTER TABLE "public"."events"
  ADD COLUMN IF NOT EXISTS "scraper" "text";
