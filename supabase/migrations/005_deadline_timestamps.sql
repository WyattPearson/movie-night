-- Add optional deadline timestamps for nominations and voting phases.
-- When set, the homepage shows live countdown timers.
-- Feature 3 (auto-scheduling) will populate these automatically;
-- admins can also set them manually via the admin panel.
ALTER TABLE movie_nights
  ADD COLUMN nominations_close_at timestamptz,
  ADD COLUMN voting_close_at timestamptz;
