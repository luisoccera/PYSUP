begin;

create extension if not exists pgcrypto;
create extension if not exists unaccent;
create extension if not exists citext;

create type public.provider_connection_type as enum ('manual', 'oauth', 'import');
create type public.provider_connection_status as enum ('selected', 'connected', 'expired', 'revoked');
create type public.content_type as enum ('movie', 'series', 'anime');
create type public.availability_status as enum ('available', 'unavailable', 'unknown');
create type public.access_type as enum ('subscription', 'rent', 'purchase');
create type public.interaction_type as enum ('pass', 'like', 'save', 'watch', 'rate', 'review');
create type public.friend_request_status as enum ('pending', 'accepted', 'rejected', 'cancelled');
create type public.room_status as enum ('open', 'closed');
create type public.room_role as enum ('host', 'moderator', 'participant');
create type public.room_event_type as enum ('chat', 'play', 'pause', 'seek', 'rewind', 'forward', 'sync', 'join', 'leave');
create type public.forum_kind as enum ('discussion', 'identify');
create type public.notification_type as enum ('direct_message', 'friend_request', 'room_invite', 'forum_reply', 'review_like', 'recommendation', 'system');
create type public.clip_source_type as enum ('link', 'upload');
create type public.clip_job_status as enum ('pending', 'processing', 'completed', 'failed', 'no_match');
create type public.report_status as enum ('pending', 'reviewed', 'dismissed', 'actioned');

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  username citext not null unique check (username::text ~ '^[a-z0-9_]{3,24}$'),
  bio text check (bio is null or char_length(bio) <= 240),
  avatar_path text,
  cover_path text,
  country_code char(2),
  onboarding_completed_at timestamptz,
  last_active_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  push_notifications boolean not null default true,
  friend_activity boolean not null default true,
  forum_replies boolean not null default true,
  hide_spoilers boolean not null default true,
  public_activity boolean not null default false,
  autoplay_trailers boolean not null default false,
  wifi_only boolean not null default true,
  preferred_format text not null default 'any' check (preferred_format in ('any', 'movie', 'series', 'anime')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.genres (
  id bigint generated always as identity primary key,
  name text not null unique check (char_length(name) between 2 and 60),
  slug text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_genres (
  user_id uuid not null references public.profiles(id) on delete cascade,
  genre_id bigint not null references public.genres(id) on delete cascade,
  weight numeric(5,2) not null default 1 check (weight between -10 and 10),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, genre_id)
);

create table public.provider_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider_key text not null check (provider_key in ('netflix', 'max', 'disney', 'crunchyroll', 'prime')),
  connection_type public.provider_connection_type not null default 'manual',
  status public.provider_connection_status not null default 'selected',
  external_account_ref text,
  connected_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, provider_key)
);

create table public.content_items (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  title text not null check (char_length(title) between 1 and 300),
  content_type public.content_type not null,
  release_year smallint check (release_year between 1888 and 2200),
  duration_minutes integer check (duration_minutes is null or duration_minutes > 0),
  maturity_rating text,
  synopsis text not null default '',
  score numeric(4,2) check (score is null or score between 0 and 10),
  popularity numeric(8,5) not null default 0 check (popularity between 0 and 1),
  discovery_score numeric(8,5) not null default 0.5 check (discovery_score between 0 and 1),
  mood_tags text[] not null default '{}',
  poster_url text,
  backdrop_url text,
  trailer_url text,
  source_name text not null default 'manual',
  source_updated_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (source_name, external_id)
);

create table public.content_genres (
  content_id uuid not null references public.content_items(id) on delete cascade,
  genre_id bigint not null references public.genres(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (content_id, genre_id)
);

create table public.content_providers (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null unique,
  name text not null,
  brand_color text not null default '#8892A6',
  official_base_url text,
  catalog_adapter text not null default 'pending',
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.content_availability (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.content_items(id) on delete cascade,
  provider_id uuid not null references public.content_providers(id) on delete cascade,
  country_code char(2) not null,
  status public.availability_status not null default 'unknown',
  access_type public.access_type not null,
  official_url text not null,
  price_amount numeric(10,2) check (price_amount is null or price_amount >= 0),
  price_currency char(3),
  checked_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (content_id, provider_id, country_code, access_type)
);

create table public.user_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_id uuid not null references public.content_items(id) on delete cascade,
  interaction_type public.interaction_type not null,
  numeric_value numeric(4,2),
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (numeric_value is null or numeric_value between 0 and 10)
);

create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_id uuid not null references public.content_items(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, content_id)
);

create table public.saved_items (
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_id uuid not null references public.content_items(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, content_id)
);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_id uuid not null references public.content_items(id) on delete cascade,
  recommendation_source text not null check (recommendation_source in ('deck', 'roulette', 'notification')),
  score numeric(10,5),
  reasons jsonb not null default '{}'::jsonb,
  shown_at timestamptz not null default timezone('utc', now()),
  selected_at timestamptz,
  dismissed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content_id uuid not null references public.content_items(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 3 and 4000),
  contains_spoilers boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, content_id)
);

create table public.review_likes (
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (review_id, user_id)
);

create view public.content_review_stats with (security_invoker = true) as
select content_id, round(avg(rating)::numeric, 2) as average_rating, count(*) as review_count
from public.reviews where deleted_at is null group by content_id;

create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status public.friend_request_status not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (sender_id <> receiver_id)
);

create unique index friend_requests_one_pending_pair on public.friend_requests (least(sender_id, receiver_id), greatest(sender_id, receiver_id)) where status = 'pending';

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_low_id uuid not null references public.profiles(id) on delete cascade,
  user_high_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (user_low_id < user_high_id),
  unique (user_low_id, user_high_id)
);

create table public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  user_low_id uuid not null references public.profiles(id) on delete cascade,
  user_high_id uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (user_low_id < user_high_id),
  unique (user_low_id, user_high_id)
);

create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  client_id text not null,
  body text not null check (char_length(body) between 1 and 4000),
  delivered_at timestamptz not null default timezone('utc', now()),
  read_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (sender_id, client_id)
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10)),
  host_id uuid not null references public.profiles(id) on delete cascade,
  content_id uuid references public.content_items(id) on delete set null,
  title text not null check (char_length(title) between 1 and 100),
  status public.room_status not null default 'open',
  playback_position_ms bigint not null default 0 check (playback_position_ms >= 0),
  playback_playing boolean not null default false,
  playback_sequence bigint not null default 0 check (playback_sequence >= 0),
  playback_updated_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.room_participants (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.room_role not null default 'participant',
  joined_at timestamptz not null default timezone('utc', now()),
  left_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (room_id, user_id)
);

create table public.room_invitations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invited_user_id uuid not null references public.profiles(id) on delete cascade,
  status public.friend_request_status not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (room_id, invited_user_id)
);

create table public.room_events (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.rooms(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  event_type public.room_event_type not null,
  payload jsonb not null default '{}'::jsonb,
  client_occurred_at timestamptz,
  server_occurred_at timestamptz not null default clock_timestamp(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.forum_topics (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  kind public.forum_kind not null,
  title text not null check (char_length(title) between 5 and 160),
  body text not null check (char_length(body) between 10 and 6000),
  contains_spoilers boolean not null default false,
  accepted_reply_id uuid,
  solved_at timestamptz,
  locked_at timestamptz,
  deleted_at timestamptz,
  search_document tsvector generated always as (to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(body, ''))) stored,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.forum_topics(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 2 and 6000),
  contains_spoilers boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.forum_topics add constraint forum_topics_accepted_reply_fk foreign key (accepted_reply_id) references public.forum_replies(id) on delete set null;

create table public.forum_likes (
  topic_id uuid not null references public.forum_topics(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (topic_id, user_id)
);

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('topic', 'reply', 'review', 'message')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 500),
  status public.report_status not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type public.notification_type not null,
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 500),
  destination jsonb not null default '{}'::jsonb,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index notifications_dedupe_key on public.notifications (user_id, dedupe_key) where dedupe_key is not null;

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('android', 'ios')),
  active boolean not null default true,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, token)
);

create table public.clip_analysis_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type public.clip_source_type not null,
  source_url text,
  storage_path text,
  source_mime text,
  source_size_bytes bigint check (source_size_bytes is null or source_size_bytes between 1 and 83886080),
  source_duration_seconds numeric(8,3) check (source_duration_seconds is null or source_duration_seconds between 0 and 90),
  status public.clip_job_status not null default 'pending',
  progress smallint not null default 0 check (progress between 0 and 100),
  error_code text,
  error_message text,
  consent_at timestamptz not null,
  processing_started_at timestamptz,
  completed_at timestamptz,
  purge_after timestamptz not null default (timezone('utc', now()) + interval '24 hours'),
  confirmed_candidate_id uuid,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((source_type = 'link' and source_url is not null and storage_path is null) or (source_type = 'upload' and storage_path is not null and source_url is null))
);

create table public.clip_candidates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.clip_analysis_jobs(id) on delete cascade,
  content_id uuid references public.content_items(id) on delete set null,
  candidate_title text not null,
  confidence numeric(5,4) not null check (confidence between 0 and 1),
  evidence jsonb not null default '{}'::jsonb,
  rank smallint not null check (rank > 0),
  rejected_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (job_id, rank)
);

alter table public.clip_analysis_jobs add constraint clip_jobs_confirmed_candidate_fk foreign key (confirmed_candidate_id) references public.clip_candidates(id) on delete set null;

create table public.security_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  ip_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index profiles_country_idx on public.profiles(country_code) where deleted_at is null;
create index user_genres_user_idx on public.user_genres(user_id);
create index provider_connections_user_idx on public.provider_connections(user_id, status);
create index content_items_type_idx on public.content_items(content_type) where deleted_at is null;
create index content_items_title_idx on public.content_items using gin (to_tsvector('spanish', title));
create index content_genres_genre_idx on public.content_genres(genre_id, content_id);
create index availability_lookup_idx on public.content_availability(country_code, content_id, status) where deleted_at is null;
create index interactions_user_type_idx on public.user_interactions(user_id, interaction_type, occurred_at desc) where deleted_at is null;
create index interactions_content_idx on public.user_interactions(content_id, occurred_at desc) where deleted_at is null;
create index favorites_user_idx on public.favorites(user_id, created_at desc);
create index saved_items_user_idx on public.saved_items(user_id, created_at desc);
create index recommendations_user_idx on public.recommendations(user_id, shown_at desc);
create index reviews_content_idx on public.reviews(content_id, created_at desc) where deleted_at is null;
create index friend_requests_receiver_idx on public.friend_requests(receiver_id, status, created_at desc);
create index direct_messages_conversation_idx on public.direct_messages(conversation_id, created_at desc) where deleted_at is null;
create index room_participants_user_idx on public.room_participants(user_id, room_id) where left_at is null;
create index room_events_room_time_idx on public.room_events(room_id, server_occurred_at);
create index forum_topics_search_idx on public.forum_topics using gin(search_document);
create index forum_replies_topic_idx on public.forum_replies(topic_id, created_at) where deleted_at is null;
create index notifications_user_idx on public.notifications(user_id, created_at desc);
create index clip_jobs_user_idx on public.clip_analysis_jobs(user_id, created_at desc) where deleted_at is null;
create index clip_jobs_purge_idx on public.clip_analysis_jobs(purge_after) where storage_path is not null and deleted_at is null;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','user_preferences','genres','user_genres','provider_connections','content_items','content_genres',
    'content_providers','content_availability','user_interactions','favorites','saved_items','recommendations','reviews','review_likes','friend_requests',
    'friendships','user_blocks','direct_conversations','direct_messages','rooms','room_participants','room_invitations',
    'room_events','forum_topics','forum_replies','forum_likes','content_reports','notifications','push_tokens',
    'clip_analysis_jobs','clip_candidates','security_events'
  ] loop
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare base_username text;
declare requested_name text;
begin
  base_username := regexp_replace(lower(split_part(coalesce(new.email, 'pysup'), '@', 1)), '[^a-z0-9_]', '', 'g');
  if char_length(base_username) < 3 then base_username := 'pysup'; end if;
  requested_name := trim(coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1), 'Usuario PYSUP'));
  if char_length(requested_name) < 2 then requested_name := 'Usuario PYSUP'; end if;
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    left(requested_name, 60),
    left(base_username, 16) || '_' || substr(replace(new.id::text, '-', ''), 1, 6)
  );
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.complete_onboarding(selected_country text, selected_provider_keys text[], selected_genres text[])
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if selected_country !~ '^[A-Z]{2}$' then raise exception 'invalid country'; end if;
  update public.profiles set country_code = selected_country, onboarding_completed_at = timezone('utc', now()) where id = auth.uid();
  delete from public.provider_connections where user_id = auth.uid();
  insert into public.provider_connections (user_id, provider_key, connection_type, status, connected_at)
  select auth.uid(), provider_key, 'manual'::public.provider_connection_type, 'selected'::public.provider_connection_status, null
  from unnest(selected_provider_keys) as provider_key
  where provider_key in ('netflix','max','disney','crunchyroll','prime');
  delete from public.user_genres where user_id = auth.uid();
  insert into public.user_genres (user_id, genre_id)
  select auth.uid(), g.id from public.genres g where g.name = any(selected_genres);
end;
$$;

create or replace function public.get_my_profile_stats()
returns table(watched bigint, reviews bigint, friends bigint, saved bigint)
language sql stable security definer set search_path = '' as $$
  select
    (select count(distinct content_id) from public.user_interactions where user_id = auth.uid() and interaction_type = 'watch' and deleted_at is null),
    (select count(*) from public.reviews where user_id = auth.uid() and deleted_at is null),
    (select count(*) from public.friendships where user_low_id = auth.uid() or user_high_id = auth.uid()),
    (select count(*) from public.saved_items where user_id = auth.uid());
$$;

create or replace function public.get_personalized_recommendations(selected_country text, selected_format text default 'any', selected_mood text default null, result_limit integer default 20)
returns setof public.content_items language sql volatile security definer set search_path = '' as $$
  with eligible as (
    select distinct ci.id,
      coalesce((select sum(ug.weight) from public.content_genres cg join public.user_genres ug on ug.genre_id = cg.genre_id and ug.user_id = auth.uid() where cg.content_id = ci.id), 0) as genre_affinity,
      coalesce((select sum(case ui.interaction_type when 'like' then 2 when 'save' then 1.5 when 'rate' then coalesce(ui.numeric_value,0)/5 else 0 end) from public.user_interactions ui join public.content_genres liked_cg on liked_cg.content_id = ui.content_id join public.content_genres candidate_cg on candidate_cg.genre_id = liked_cg.genre_id and candidate_cg.content_id = ci.id where ui.user_id = auth.uid() and ui.deleted_at is null and coalesce(ui.metadata ->> 'active', 'true') <> 'false' and ui.id in (select distinct on (latest.content_id, latest.interaction_type) latest.id from public.user_interactions latest where latest.user_id = auth.uid() and latest.deleted_at is null order by latest.content_id, latest.interaction_type, latest.occurred_at desc)), 0) as learned_affinity
    from public.content_items ci
    join public.content_availability ca on ca.content_id = ci.id and ca.country_code = selected_country and ca.status = 'available' and ca.deleted_at is null
    where ci.deleted_at is null
      and (selected_format = 'any' or (selected_format = 'movie' and ci.content_type = 'movie') or (selected_format = 'series' and ci.content_type = 'series') or (selected_format = 'anime' and ci.content_type = 'anime'))
      and (selected_mood is null or selected_mood = any(ci.mood_tags))
      and not exists (select 1 from public.user_interactions seen where seen.user_id = auth.uid() and seen.content_id = ci.id and seen.interaction_type in ('pass','watch') and seen.deleted_at is null)
  )
  select ci.*
  from eligible e
  join public.content_items ci on ci.id = e.id
  order by (e.genre_affinity * 2.0 + e.learned_affinity + e.discovery_score * 3.0 + (1.0 - e.popularity) * 1.5 + random() * 0.25) desc
  limit least(greatest(result_limit, 1), 50);
$$;

create or replace function public.search_profiles(search_query text, result_limit integer default 20)
returns table(id uuid, display_name text, username text, avatar_path text, last_active_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_name, p.username::text, p.avatar_path, p.last_active_at from public.profiles p
  where auth.uid() is not null and p.id <> auth.uid() and p.deleted_at is null
    and not exists (select 1 from public.user_blocks b where (b.blocker_id = auth.uid() and b.blocked_id = p.id) or (b.blocker_id = p.id and b.blocked_id = auth.uid()))
    and (p.username::text ilike '%' || replace(search_query, '%', '') || '%' or p.display_name ilike '%' || replace(search_query, '%', '') || '%')
  limit least(greatest(result_limit, 1), 50);
$$;

create or replace function public.list_forum_topics(search_query text default '', result_limit integer default 50)
returns table(id uuid, kind public.forum_kind, title text, body text, contains_spoilers boolean, solved_at timestamptz, accepted_reply_id uuid, created_at timestamptz, author jsonb, reply_count bigint, like_count bigint)
language sql stable security definer set search_path = '' as $$
  select t.id, t.kind, t.title, t.body, t.contains_spoilers, t.solved_at, t.accepted_reply_id, t.created_at,
    jsonb_build_object('id', p.id, 'display_name', p.display_name, 'username', p.username::text, 'avatar_path', p.avatar_path),
    (select count(*) from public.forum_replies r where r.topic_id = t.id and r.deleted_at is null),
    (select count(*) from public.forum_likes l where l.topic_id = t.id)
  from public.forum_topics t join public.profiles p on p.id = t.author_id
  where auth.uid() is not null and t.deleted_at is null
    and not exists(select 1 from public.user_blocks b where (b.blocker_id = auth.uid() and b.blocked_id = t.author_id) or (b.blocker_id = t.author_id and b.blocked_id = auth.uid()))
    and (search_query = '' or t.search_document @@ websearch_to_tsquery('spanish', search_query))
  order by t.created_at desc limit least(greatest(result_limit, 1), 100);
$$;

create or replace function public.list_forum_replies(selected_topic_id uuid)
returns table(id uuid, body text, contains_spoilers boolean, created_at timestamptz, author jsonb)
language sql stable security definer set search_path = '' as $$
  select r.id, r.body, r.contains_spoilers, r.created_at,
    jsonb_build_object('id', p.id, 'display_name', p.display_name, 'username', p.username::text, 'avatar_path', p.avatar_path)
  from public.forum_replies r join public.profiles p on p.id = r.author_id
  where auth.uid() is not null and r.topic_id = selected_topic_id and r.deleted_at is null
    and not exists(select 1 from public.user_blocks b where (b.blocker_id = auth.uid() and b.blocked_id = r.author_id) or (b.blocker_id = r.author_id and b.blocked_id = auth.uid()))
  order by r.created_at;
$$;

create or replace function public.list_content_reviews(selected_content_id uuid)
returns table(id uuid, user_id uuid, rating smallint, body text, contains_spoilers boolean, created_at timestamptz, author jsonb, like_count bigint, my_like boolean)
language sql stable security definer set search_path = '' as $$
  select r.id, r.user_id, r.rating, r.body, r.contains_spoilers, r.created_at,
    jsonb_build_object('display_name', p.display_name, 'username', p.username::text, 'avatar_path', p.avatar_path),
    (select count(*) from public.review_likes l where l.review_id = r.id),
    exists(select 1 from public.review_likes mine where mine.review_id = r.id and mine.user_id = auth.uid())
  from public.reviews r join public.profiles p on p.id = r.user_id
  where auth.uid() is not null and r.content_id = selected_content_id and r.deleted_at is null
    and not exists(select 1 from public.user_blocks b where (b.blocker_id = auth.uid() and b.blocked_id = r.user_id) or (b.blocker_id = r.user_id and b.blocked_id = auth.uid()))
  order by r.created_at desc limit 100;
$$;

create or replace function public.get_my_friends()
returns table(id uuid, display_name text, username text, avatar_path text, last_active_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_name, p.username::text, p.avatar_path, p.last_active_at
  from public.friendships f
  join public.profiles p on p.id = case when f.user_low_id = auth.uid() then f.user_high_id else f.user_low_id end
  where f.user_low_id = auth.uid() or f.user_high_id = auth.uid();
$$;

create or replace function public.get_my_blocks()
returns table(id uuid, display_name text, username text, avatar_path text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.display_name, p.username::text, p.avatar_path
  from public.user_blocks b join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid();
$$;

create or replace function public.list_friend_requests()
returns table(id uuid, sender_id uuid, created_at timestamptz, sender jsonb)
language sql stable security definer set search_path = '' as $$
  select r.id, r.sender_id, r.created_at,
    jsonb_build_object('id', p.id, 'display_name', p.display_name, 'username', p.username::text, 'avatar_path', p.avatar_path)
  from public.friend_requests r join public.profiles p on p.id = r.sender_id
  where r.receiver_id = auth.uid() and r.status = 'pending'
  order by r.created_at desc;
$$;

create or replace function public.respond_friend_request(selected_request_id uuid, accepted boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare request_row public.friend_requests;
begin
  select * into request_row from public.friend_requests where id = selected_request_id and receiver_id = auth.uid() and status = 'pending' for update;
  if not found then raise exception 'request not found'; end if;
  update public.friend_requests set status = case when accepted then 'accepted'::public.friend_request_status else 'rejected'::public.friend_request_status end, responded_at = timezone('utc', now()) where id = selected_request_id;
  if accepted then
    insert into public.friendships(user_low_id, user_high_id) values (least(request_row.sender_id, request_row.receiver_id), greatest(request_row.sender_id, request_row.receiver_id)) on conflict do nothing;
  end if;
end;
$$;

create or replace function public.remove_friendship(selected_friend_id uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.friendships where user_low_id = least(auth.uid(), selected_friend_id) and user_high_id = greatest(auth.uid(), selected_friend_id);
$$;

create or replace function public.get_or_create_direct_conversation(other_user_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare conversation_id uuid;
begin
  if auth.uid() is null or auth.uid() = other_user_id then raise exception 'invalid participant'; end if;
  if exists (select 1 from public.user_blocks where (blocker_id = auth.uid() and blocked_id = other_user_id) or (blocker_id = other_user_id and blocked_id = auth.uid())) then raise exception 'conversation blocked'; end if;
  if not exists (select 1 from public.friendships where user_low_id = least(auth.uid(), other_user_id) and user_high_id = greatest(auth.uid(), other_user_id)) then raise exception 'friendship required'; end if;
  insert into public.direct_conversations(user_low_id, user_high_id) values (least(auth.uid(), other_user_id), greatest(auth.uid(), other_user_id)) on conflict (user_low_id, user_high_id) do update set updated_at = public.direct_conversations.updated_at returning id into conversation_id;
  return conversation_id;
end;
$$;

create or replace function public.respond_room_invitation(selected_invitation_id uuid, accepted boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare invitation public.room_invitations;
begin
  select * into invitation from public.room_invitations where id = selected_invitation_id and invited_user_id = auth.uid() and status = 'pending' for update;
  if not found then raise exception 'invitation not found'; end if;
  update public.room_invitations set status = case when accepted then 'accepted'::public.friend_request_status else 'rejected'::public.friend_request_status end, responded_at = timezone('utc', now()) where id = selected_invitation_id;
  if accepted then insert into public.room_participants(room_id, user_id) values (invitation.room_id, auth.uid()) on conflict (room_id,user_id) do update set left_at = null; end if;
  return invitation.room_id;
end;
$$;

create or replace function public.join_room_by_code(selected_invite_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare selected_room_id uuid;
begin
  select id into selected_room_id from public.rooms where invite_code = upper(selected_invite_code) and status = 'open';
  if selected_room_id is null then raise exception 'room not found'; end if;
  insert into public.room_participants(room_id,user_id) values (selected_room_id, auth.uid()) on conflict (room_id,user_id) do update set left_at = null;
  return selected_room_id;
end;
$$;

create or replace function public.accept_forum_reply(selected_topic_id uuid, selected_reply_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.forum_topics where id = selected_topic_id and author_id = auth.uid() and deleted_at is null) then raise exception 'not allowed'; end if;
  if not exists(select 1 from public.forum_replies where id = selected_reply_id and topic_id = selected_topic_id and deleted_at is null) then raise exception 'reply not found'; end if;
  update public.forum_topics set accepted_reply_id = selected_reply_id, solved_at = timezone('utc', now()) where id = selected_topic_id;
end;
$$;

create or replace function public.confirm_clip_candidate(selected_job_id uuid, selected_candidate_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from public.clip_analysis_jobs where id = selected_job_id and user_id = auth.uid()) then raise exception 'not allowed'; end if;
  if selected_candidate_id is not null and not exists(select 1 from public.clip_candidates where id = selected_candidate_id and job_id = selected_job_id) then raise exception 'candidate not found'; end if;
  update public.clip_analysis_jobs set confirmed_candidate_id = selected_candidate_id where id = selected_job_id;
  update public.clip_candidates set rejected_at = timezone('utc', now()) where job_id = selected_job_id and selected_candidate_id is not null and id <> selected_candidate_id;
end;
$$;

create or replace function public.retry_clip_analysis(selected_job_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.clip_analysis_jobs set status = 'pending', progress = 0, error_code = null, error_message = null, processing_started_at = null, completed_at = null where id = selected_job_id and user_id = auth.uid() and status in ('failed','no_match');
  if not found then raise exception 'job cannot be retried'; end if;
end;
$$;

create or replace function public.add_host_as_room_participant()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.room_participants(room_id,user_id,role) values(new.id,new.host_id,'host');
  return new;
end;
$$;
create trigger room_host_participant after insert on public.rooms for each row execute function public.add_host_as_room_participant();

create or replace function public.touch_conversation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.direct_conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;
create trigger direct_message_touch_conversation after insert on public.direct_messages for each row execute function public.touch_conversation();

create or replace function public.sync_interaction_flags()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.interaction_type = 'like' then
    if coalesce((new.metadata ->> 'active')::boolean, true) then
      insert into public.favorites(user_id, content_id) values(new.user_id, new.content_id)
      on conflict (user_id, content_id) do update set updated_at = timezone('utc', now());
    else
      delete from public.favorites where user_id = new.user_id and content_id = new.content_id;
    end if;
  elsif new.interaction_type = 'save' then
    if coalesce((new.metadata ->> 'active')::boolean, true) then
      insert into public.saved_items(user_id, content_id) values(new.user_id, new.content_id)
      on conflict (user_id, content_id) do update set updated_at = timezone('utc', now());
    else
      delete from public.saved_items where user_id = new.user_id and content_id = new.content_id;
    end if;
  end if;
  return new;
end;
$$;
create trigger sync_user_interaction_flags after insert on public.user_interactions for each row execute function public.sync_interaction_flags();

create or replace function public.apply_user_block()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.friendships where user_low_id = least(new.blocker_id, new.blocked_id) and user_high_id = greatest(new.blocker_id, new.blocked_id);
  update public.friend_requests set status = 'cancelled', responded_at = timezone('utc', now())
  where status = 'pending' and ((sender_id = new.blocker_id and receiver_id = new.blocked_id) or (sender_id = new.blocked_id and receiver_id = new.blocker_id));
  delete from public.direct_conversations where user_low_id = least(new.blocker_id, new.blocked_id) and user_high_id = greatest(new.blocker_id, new.blocked_id);
  return new;
end;
$$;
create trigger apply_user_block after insert on public.user_blocks for each row execute function public.apply_user_block();

create or replace function public.enforce_write_rate_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); allowed_count integer := tg_argv[0]::integer; window_seconds integer := tg_argv[1]::integer; recent_count integer;
begin
  if actor is null then return new; end if;
  select count(*) into recent_count from public.security_events
  where user_id = actor and event_type = 'write:' || tg_table_name
    and created_at > timezone('utc', now()) - make_interval(secs => window_seconds);
  if recent_count >= allowed_count then raise exception 'rate limit exceeded' using errcode = 'P0001'; end if;
  insert into public.security_events(user_id, event_type, metadata)
  values(actor, 'write:' || tg_table_name, jsonb_build_object('table', tg_table_name));
  return new;
end;
$$;
create trigger rate_limit_interactions before insert on public.user_interactions for each row execute function public.enforce_write_rate_limit('180','60');
create trigger rate_limit_messages before insert on public.direct_messages for each row execute function public.enforce_write_rate_limit('60','60');
create trigger rate_limit_room_events before insert on public.room_events for each row execute function public.enforce_write_rate_limit('120','60');
create trigger rate_limit_forum_topics before insert on public.forum_topics for each row execute function public.enforce_write_rate_limit('10','3600');
create trigger rate_limit_forum_replies before insert on public.forum_replies for each row execute function public.enforce_write_rate_limit('30','3600');
create trigger rate_limit_friend_requests before insert on public.friend_requests for each row execute function public.enforce_write_rate_limit('20','3600');
create trigger rate_limit_clip_jobs before insert on public.clip_analysis_jobs for each row execute function public.enforce_write_rate_limit('10','3600');

create or replace function public.is_room_participant(selected_room_id uuid, selected_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.room_participants rp where rp.room_id = selected_room_id and rp.user_id = selected_user_id and rp.left_at is null);
$$;

create or replace function public.can_control_room(selected_room_id uuid, selected_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.room_participants rp where rp.room_id = selected_room_id and rp.user_id = selected_user_id and rp.left_at is null and rp.role in ('host','moderator'));
$$;

create or replace function public.reconcile_room_playback()
returns trigger language plpgsql security definer set search_path = '' as $$
declare next_sequence bigint; next_position bigint; next_playing boolean; current_sequence bigint;
begin
  if new.event_type not in ('play','pause','seek','rewind','forward','sync') then return new; end if;
  if not public.can_control_room(new.room_id, new.actor_id) then raise exception 'playback control requires host or moderator role'; end if;
  next_sequence := coalesce((new.payload ->> 'sequence')::bigint, 0);
  next_position := greatest(coalesce((new.payload ->> 'position_ms')::bigint, 0), 0);
  next_playing := coalesce((new.payload ->> 'playing')::boolean, false);
  select playback_sequence into current_sequence from public.rooms where id = new.room_id for update;
  if next_sequence <= current_sequence then raise exception 'stale playback event'; end if;
  update public.rooms set playback_sequence = next_sequence, playback_position_ms = next_position, playback_playing = next_playing, playback_updated_at = clock_timestamp() where id = new.room_id;
  return new;
end;
$$;
create trigger reconcile_room_playback before insert on public.room_events for each row execute function public.reconcile_room_playback();

create or replace function public.notify_friend_request()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications(user_id, actor_id, type, title, body, destination, dedupe_key)
  values(new.receiver_id, new.sender_id, 'friend_request', 'Nueva solicitud de amistad', 'Alguien quiere agregarte en PYSUP.', jsonb_build_object('kind','friendRequest','requestId',new.id), 'friend-request:' || new.id::text);
  return new;
end;
$$;
create trigger friend_request_notification after insert on public.friend_requests for each row execute function public.notify_friend_request();

create or replace function public.notify_direct_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare recipient uuid;
begin
  select case when c.user_low_id = new.sender_id then c.user_high_id else c.user_low_id end into recipient from public.direct_conversations c where c.id = new.conversation_id;
  insert into public.notifications(user_id, actor_id, type, title, body, destination, dedupe_key)
  values(recipient, new.sender_id, 'direct_message', 'Nuevo mensaje', left(new.body, 120), jsonb_build_object('kind','friend','friendId',new.sender_id), 'direct-message:' || new.id::text);
  return new;
end;
$$;
create trigger direct_message_notification after insert on public.direct_messages for each row execute function public.notify_direct_message();

create or replace function public.notify_room_invitation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications(user_id, actor_id, type, title, body, destination, dedupe_key)
  select new.invited_user_id, new.inviter_id, 'room_invite', 'Invitación a una sala', r.title, jsonb_build_object('kind','room','invitationId',new.id), 'room-invite:' || new.id::text from public.rooms r where r.id = new.room_id;
  return new;
end;
$$;
create trigger room_invitation_notification after insert on public.room_invitations for each row execute function public.notify_room_invitation();

create or replace function public.notify_forum_reply()
returns trigger language plpgsql security definer set search_path = '' as $$
declare owner_id uuid;
begin
  select author_id into owner_id from public.forum_topics where id = new.topic_id;
  if owner_id <> new.author_id and coalesce((select forum_replies from public.user_preferences where user_id = owner_id), true) then
    insert into public.notifications(user_id, actor_id, type, title, body, destination, dedupe_key)
    values(owner_id, new.author_id, 'forum_reply', 'Nueva respuesta en tu publicación', left(new.body, 120), jsonb_build_object('kind','forum','topicId',new.topic_id), 'forum-reply:' || new.id::text);
  end if;
  return new;
end;
$$;
create trigger forum_reply_notification after insert on public.forum_replies for each row execute function public.notify_forum_reply();

create or replace function public.notify_review_like()
returns trigger language plpgsql security definer set search_path = '' as $$
declare owner_id uuid; selected_content_id uuid;
begin
  select user_id, content_id into owner_id, selected_content_id from public.reviews where id = new.review_id;
  if owner_id <> new.user_id then
    insert into public.notifications(user_id, actor_id, type, title, body, destination, dedupe_key)
    values(owner_id, new.user_id, 'review_like', 'Tu reseña fue útil', 'Alguien reaccionó a tu reseña.', jsonb_build_object('kind','profile','reviewId',new.review_id,'contentId',selected_content_id), 'review-like:' || new.review_id::text || ':' || new.user_id::text);
  end if;
  return new;
end;
$$;
create trigger review_like_notification after insert on public.review_likes for each row execute function public.notify_review_like();

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.genres enable row level security;
alter table public.user_genres enable row level security;
alter table public.provider_connections enable row level security;
alter table public.content_items enable row level security;
alter table public.content_genres enable row level security;
alter table public.content_providers enable row level security;
alter table public.content_availability enable row level security;
alter table public.user_interactions enable row level security;
alter table public.favorites enable row level security;
alter table public.saved_items enable row level security;
alter table public.recommendations enable row level security;
alter table public.reviews enable row level security;
alter table public.review_likes enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.user_blocks enable row level security;
alter table public.direct_conversations enable row level security;
alter table public.direct_messages enable row level security;
alter table public.rooms enable row level security;
alter table public.room_participants enable row level security;
alter table public.room_invitations enable row level security;
alter table public.room_events enable row level security;
alter table public.forum_topics enable row level security;
alter table public.forum_replies enable row level security;
alter table public.forum_likes enable row level security;
alter table public.content_reports enable row level security;
alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;
alter table public.clip_analysis_jobs enable row level security;
alter table public.clip_candidates enable row level security;
alter table public.security_events enable row level security;

create policy profiles_own_select on public.profiles for select using (id = auth.uid());
create policy profiles_own_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy preferences_own_all on public.user_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy genres_authenticated_read on public.genres for select to authenticated using (true);
create policy user_genres_own_all on public.user_genres for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy provider_connections_own_all on public.provider_connections for all using (user_id = auth.uid()) with check (user_id = auth.uid() and connection_type = 'manual');
create policy content_authenticated_read on public.content_items for select to authenticated using (deleted_at is null);
create policy content_genres_authenticated_read on public.content_genres for select to authenticated using (true);
create policy content_providers_authenticated_read on public.content_providers for select to authenticated using (active);
create policy availability_authenticated_read on public.content_availability for select to authenticated using (deleted_at is null);
create policy interactions_own_all on public.user_interactions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy favorites_own_read on public.favorites for select using (user_id = auth.uid());
create policy saved_items_own_read on public.saved_items for select using (user_id = auth.uid());
create policy recommendations_own_read on public.recommendations for select using (user_id = auth.uid());
create policy recommendations_own_insert on public.recommendations for insert with check (user_id = auth.uid());
create policy recommendations_own_update on public.recommendations for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy reviews_authenticated_read on public.reviews for select to authenticated using (deleted_at is null);
create policy reviews_own_insert on public.reviews for insert to authenticated with check (user_id = auth.uid());
create policy reviews_own_update on public.reviews for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy review_likes_authenticated_read on public.review_likes for select to authenticated using (true);
create policy review_likes_own_insert on public.review_likes for insert to authenticated with check (user_id = auth.uid());
create policy review_likes_own_delete on public.review_likes for delete to authenticated using (user_id = auth.uid());
grant select on public.content_review_stats to authenticated;
create policy friend_requests_participants_read on public.friend_requests for select using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy friend_requests_sender_insert on public.friend_requests for insert with check (sender_id = auth.uid() and not exists(select 1 from public.user_blocks b where (b.blocker_id = auth.uid() and b.blocked_id = receiver_id) or (b.blocker_id = receiver_id and b.blocked_id = auth.uid())));
create policy friendships_participants_read on public.friendships for select using (user_low_id = auth.uid() or user_high_id = auth.uid());
create policy blocks_own_all on public.user_blocks for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy conversations_participants_read on public.direct_conversations for select using (user_low_id = auth.uid() or user_high_id = auth.uid());
create policy messages_participants_read on public.direct_messages for select using (exists(select 1 from public.direct_conversations c where c.id = conversation_id and (c.user_low_id = auth.uid() or c.user_high_id = auth.uid())));
create policy messages_participants_insert on public.direct_messages for insert with check (sender_id = auth.uid() and exists(select 1 from public.direct_conversations c where c.id = conversation_id and (c.user_low_id = auth.uid() or c.user_high_id = auth.uid()) and not exists(select 1 from public.user_blocks b where (b.blocker_id = c.user_low_id and b.blocked_id = c.user_high_id) or (b.blocker_id = c.user_high_id and b.blocked_id = c.user_low_id))));
create policy messages_participants_update on public.direct_messages for update using (sender_id <> auth.uid() and exists(select 1 from public.direct_conversations c where c.id = conversation_id and (c.user_low_id = auth.uid() or c.user_high_id = auth.uid()))) with check (sender_id <> auth.uid() and exists(select 1 from public.direct_conversations c where c.id = conversation_id and (c.user_low_id = auth.uid() or c.user_high_id = auth.uid())));
create policy rooms_create on public.rooms for insert with check (host_id = auth.uid());
create policy rooms_participants_read on public.rooms for select using (host_id = auth.uid() or public.is_room_participant(id));
create policy rooms_host_update on public.rooms for update using (host_id = auth.uid()) with check (host_id = auth.uid());
create policy room_participants_read on public.room_participants for select using (public.is_room_participant(room_id));
create policy room_participants_self_update on public.room_participants for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy room_invites_participants_read on public.room_invitations for select using (inviter_id = auth.uid() or invited_user_id = auth.uid());
create policy room_invites_participants_insert on public.room_invitations for insert with check (inviter_id = auth.uid() and public.is_room_participant(room_id));
create policy room_events_participants_read on public.room_events for select using (public.is_room_participant(room_id));
create policy room_events_participants_insert on public.room_events for insert with check (actor_id = auth.uid() and public.is_room_participant(room_id));
create policy forum_topics_authenticated_read on public.forum_topics for select to authenticated using (deleted_at is null);
create policy forum_topics_own_insert on public.forum_topics for insert with check (author_id = auth.uid());
create policy forum_topics_own_update on public.forum_topics for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy forum_replies_authenticated_read on public.forum_replies for select to authenticated using (deleted_at is null);
create policy forum_replies_own_insert on public.forum_replies for insert with check (author_id = auth.uid());
create policy forum_replies_own_update on public.forum_replies for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy forum_likes_authenticated_read on public.forum_likes for select to authenticated using (true);
create policy forum_likes_own_insert on public.forum_likes for insert with check (user_id = auth.uid());
create policy forum_likes_own_delete on public.forum_likes for delete using (user_id = auth.uid());
create policy reports_own_insert on public.content_reports for insert with check (reporter_id = auth.uid());
create policy reports_own_read on public.content_reports for select using (reporter_id = auth.uid());
create policy notifications_own_read on public.notifications for select using (user_id = auth.uid());
create policy notifications_own_update on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_tokens_own_all on public.push_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy clip_jobs_own_select on public.clip_analysis_jobs for select using (user_id = auth.uid());
create policy clip_jobs_own_insert on public.clip_analysis_jobs for insert with check (user_id = auth.uid());
create policy clip_candidates_owner_read on public.clip_candidates for select using (exists(select 1 from public.clip_analysis_jobs j where j.id = job_id and j.user_id = auth.uid()));

revoke update on public.direct_messages from authenticated;
revoke update on public.reviews, public.forum_topics, public.forum_replies, public.room_participants, public.notifications, public.rooms from authenticated;
grant update(read_at) on public.direct_messages to authenticated;
grant update(rating, body, contains_spoilers, deleted_at) on public.reviews to authenticated;
grant update(title, body, contains_spoilers, deleted_at) on public.forum_topics to authenticated;
grant update(body, contains_spoilers, deleted_at) on public.forum_replies to authenticated;
grant update(left_at) on public.room_participants to authenticated;
grant update(read_at) on public.notifications to authenticated;
grant update(title, content_id, status, closed_at) on public.rooms to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-media', 'profile-media', false, 5242880, array['image/jpeg','image/png','image/webp']),
  ('clip-uploads', 'clip-uploads', false, 83886080, array['video/mp4','video/quicktime','video/webm'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy profile_media_owner_read on storage.objects for select to authenticated using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy profile_media_owner_insert on storage.objects for insert to authenticated with check (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy profile_media_owner_delete on storage.objects for delete to authenticated using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = auth.uid()::text);
create policy clips_owner_read on storage.objects for select to authenticated using (bucket_id = 'clip-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy clips_owner_insert on storage.objects for insert to authenticated with check (bucket_id = 'clip-uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy clips_owner_delete on storage.objects for delete to authenticated using (bucket_id = 'clip-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

revoke execute on all functions in schema public from public, anon;

grant execute on function public.complete_onboarding(text,text[],text[]) to authenticated;
grant execute on function public.get_my_profile_stats() to authenticated;
grant execute on function public.get_personalized_recommendations(text,text,text,integer) to authenticated;
grant execute on function public.search_profiles(text,integer) to authenticated;
grant execute on function public.list_forum_topics(text,integer) to authenticated;
grant execute on function public.list_forum_replies(uuid) to authenticated;
grant execute on function public.list_content_reviews(uuid) to authenticated;
grant execute on function public.get_my_friends() to authenticated;
grant execute on function public.get_my_blocks() to authenticated;
grant execute on function public.list_friend_requests() to authenticated;
grant execute on function public.respond_friend_request(uuid,boolean) to authenticated;
grant execute on function public.remove_friendship(uuid) to authenticated;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;
grant execute on function public.respond_room_invitation(uuid,boolean) to authenticated;
grant execute on function public.join_room_by_code(text) to authenticated;
grant execute on function public.accept_forum_reply(uuid,uuid) to authenticated;
grant execute on function public.confirm_clip_candidate(uuid,uuid) to authenticated;
grant execute on function public.retry_clip_analysis(uuid) to authenticated;
grant execute on function public.is_room_participant(uuid,uuid) to authenticated;
grant execute on function public.can_control_room(uuid,uuid) to authenticated;

alter publication supabase_realtime add table public.profiles, public.user_preferences, public.provider_connections, public.user_interactions, public.reviews, public.review_likes, public.friend_requests, public.friendships, public.user_blocks, public.direct_messages, public.room_events, public.notifications, public.clip_analysis_jobs, public.forum_topics, public.forum_replies, public.forum_likes;

commit;
