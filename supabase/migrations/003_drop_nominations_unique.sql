-- Drop the unique constraint that prevents admins from nominating multiple movies.
-- Application-level enforcement (one per regular user) is handled in the backend.
alter table nominations drop constraint nominations_movie_night_id_user_id_key;
