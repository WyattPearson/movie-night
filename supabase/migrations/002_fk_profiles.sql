-- Rewire user_id FKs from auth.users → profiles
-- Enables PostgREST auto-joins (nominations → profiles, etc.)
-- Cascade delete still works: auth.users → profiles → child tables

alter table nominations drop constraint nominations_user_id_fkey;
alter table nominations add constraint nominations_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

alter table votes drop constraint votes_user_id_fkey;
alter table votes add constraint votes_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

alter table post_watch_ratings drop constraint post_watch_ratings_user_id_fkey;
alter table post_watch_ratings add constraint post_watch_ratings_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

alter table rsvps drop constraint rsvps_user_id_fkey;
alter table rsvps add constraint rsvps_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

alter table snack_signups drop constraint snack_signups_user_id_fkey;
alter table snack_signups add constraint snack_signups_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;
