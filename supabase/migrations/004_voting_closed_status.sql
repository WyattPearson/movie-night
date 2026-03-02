-- Add 'voting_closed' status between 'voting_open' and 'completed'.
-- Voting is locked but results are not yet revealed (suspense phase).
ALTER TYPE movie_night_status ADD VALUE 'voting_closed' AFTER 'voting_open';
