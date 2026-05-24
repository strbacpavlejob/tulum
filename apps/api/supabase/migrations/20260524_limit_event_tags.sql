-- Truncate any existing events that have more than 3 tags
UPDATE events
SET tags = tags[1:3]
WHERE array_length(tags, 1) > 3;

-- Add a CHECK constraint to enforce the 3-tag limit going forward
ALTER TABLE events
  ADD CONSTRAINT events_tags_max_3
  CHECK (array_length(tags, 1) IS NULL OR array_length(tags, 1) <= 3);
