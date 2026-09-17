begin;

-- Defensa en profundidad para roles de aplicación y propietarios sin BYPASSRLS.
-- Superusuarios y service_role siguen requiriendo controles explícitos de servidor.
do $$
declare table_name text;
begin
  foreach table_name in array array[
    'profiles','user_preferences','genres','user_genres','provider_connections','content_items','content_genres',
    'content_providers','content_availability','user_interactions','favorites','saved_items','recommendations',
    'reviews','review_likes','friend_requests','friendships','user_blocks','direct_conversations','direct_messages',
    'rooms','room_participants','room_invitations','room_events','forum_topics','forum_replies','forum_likes',
    'content_reports','notifications','push_tokens','clip_analysis_jobs','clip_candidates','security_events'
  ] loop
    execute format('alter table public.%I force row level security', table_name);
  end loop;
end $$;

-- Los usuarios sin sesión no reciben acceso implícito al esquema de aplicación.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from public, anon;
revoke all on public.security_events from authenticated;

-- Límites estructurales que también aplican si se omite el cliente oficial.
alter table public.direct_messages
  add constraint direct_messages_client_id_length check (char_length(client_id) between 8 and 100);
alter table public.room_events
  add constraint room_events_payload_size check (octet_length(payload::text) <= 8192);
alter table public.user_interactions
  add constraint user_interactions_metadata_size check (octet_length(metadata::text) <= 8192);
alter table public.recommendations
  add constraint recommendations_reasons_size check (octet_length(reasons::text) <= 4096);
alter table public.notifications
  add constraint notifications_destination_size check (octet_length(destination::text) <= 4096);
alter table public.security_events
  add constraint security_events_metadata_size check (octet_length(metadata::text) <= 8192);
alter table public.push_tokens
  add constraint push_tokens_token_length check (char_length(token) between 20 and 512);
alter table public.clip_analysis_jobs
  add constraint clip_jobs_source_url_length check (source_url is null or char_length(source_url) <= 2048),
  add constraint clip_jobs_storage_path_length check (storage_path is null or char_length(storage_path) <= 512);
alter table public.clip_analysis_jobs drop constraint if exists clip_analysis_jobs_check;
alter table public.clip_analysis_jobs add constraint clip_jobs_source_shape check (
  deleted_at is not null or
  ((source_type = 'link' and source_url is not null and storage_path is null)
    or (source_type = 'upload' and storage_path is not null and source_url is null))
);
alter table public.profiles
  add constraint profiles_country_format check (country_code is null or country_code ~ '^[A-Z]{2}$');

-- Sólo estas columnas de perfil y configuración son editables desde el cliente.
revoke update on public.profiles from authenticated;
grant update(display_name, username, bio, avatar_path, cover_path, country_code, last_active_at) on public.profiles to authenticated;

revoke update on public.user_preferences from authenticated;
grant update(push_notifications, friend_activity, forum_replies, hide_spoilers, public_activity, autoplay_trailers, wifi_only, preferred_format)
  on public.user_preferences to authenticated;

revoke insert, update on public.provider_connections from authenticated;
grant insert(user_id, provider_key, connection_type, status, connected_at) on public.provider_connections to authenticated;
grant update(user_id, provider_key, connection_type, status, connected_at) on public.provider_connections to authenticated;

revoke update, delete on public.user_interactions from authenticated;
revoke insert on public.user_interactions, public.direct_messages, public.room_events, public.rooms,
  public.friend_requests, public.room_invitations, public.forum_topics, public.forum_replies,
  public.reviews, public.review_likes, public.forum_likes, public.user_blocks, public.push_tokens from authenticated;
grant insert(user_id, content_id, interaction_type, numeric_value, metadata) on public.user_interactions to authenticated;
grant insert(conversation_id, sender_id, client_id, body) on public.direct_messages to authenticated;
grant insert(room_id, actor_id, event_type, payload, client_occurred_at) on public.room_events to authenticated;
grant insert(host_id, content_id, title) on public.rooms to authenticated;
grant insert(sender_id, receiver_id) on public.friend_requests to authenticated;
grant insert(room_id, inviter_id, invited_user_id) on public.room_invitations to authenticated;
grant insert(author_id, kind, title, body, contains_spoilers) on public.forum_topics to authenticated;
grant insert(topic_id, author_id, body, contains_spoilers) on public.forum_replies to authenticated;
grant insert(user_id, content_id, rating, body, contains_spoilers) on public.reviews to authenticated;
grant insert(review_id, user_id) on public.review_likes to authenticated;
grant insert(topic_id, user_id) on public.forum_likes to authenticated;
grant insert(blocker_id, blocked_id) on public.user_blocks to authenticated;
grant insert(user_id, token, platform, active, last_seen_at) on public.push_tokens to authenticated;
revoke update on public.push_tokens from authenticated;
grant update(user_id, token, platform, active, last_seen_at) on public.push_tokens to authenticated;
revoke insert, delete on public.user_preferences from authenticated;
revoke insert, update on public.recommendations from authenticated;
grant insert(user_id, content_id, recommendation_source, reasons) on public.recommendations to authenticated;
grant update(selected_at, dismissed_at) on public.recommendations to authenticated;

revoke insert on public.content_reports from authenticated;
grant insert(reporter_id, target_type, target_id, reason) on public.content_reports to authenticated;

revoke insert on public.clip_analysis_jobs from authenticated;
grant insert(user_id, source_type, source_url, storage_path, source_mime, source_size_bytes, source_duration_seconds, consent_at)
  on public.clip_analysis_jobs to authenticated;

-- Convierte las selecciones de streaming del cliente en selección manual real.
create or replace function public.protect_manual_provider_connection()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' then
    new.connection_type := 'manual';
    new.status := 'selected';
    new.external_account_ref := null;
    new.connected_at := null;
    new.expires_at := null;
    new.revoked_at := null;
  end if;
  return new;
end;
$$;
create trigger protect_manual_provider_connection
before insert or update on public.provider_connections
for each row execute function public.protect_manual_provider_connection();

-- Impide crear una sala fingiendo estados o secuencias del servidor.
alter table public.rooms alter column invite_code
  set default upper(substr(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 20));
create or replace function public.protect_room_creation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user = 'authenticated' then
    new.invite_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 20));
    new.status := 'open';
    new.playback_position_ms := 0;
    new.playback_playing := false;
    new.playback_sequence := 0;
    new.playback_updated_at := null;
    new.closed_at := null;
  end if;
  return new;
end;
$$;
create trigger protect_room_creation
before insert on public.rooms
for each row execute function public.protect_room_creation();

-- Valida la forma mínima de los eventos; la reconciliación existente valida secuencia y permisos.
create or replace function public.validate_room_event_payload()
returns trigger language plpgsql set search_path = '' as $$
declare body text;
begin
  if new.event_type = 'chat' then
    body := trim(coalesce(new.payload ->> 'body', ''));
    if char_length(body) < 1 or char_length(body) > 4000 then raise exception 'invalid chat body'; end if;
    if char_length(coalesce(new.payload ->> 'client_id', '')) not between 8 and 100 then raise exception 'invalid client id'; end if;
    new.payload := jsonb_build_object('body', body, 'client_id', new.payload ->> 'client_id');
  end if;
  return new;
end;
$$;
create trigger validate_room_event_payload
before insert on public.room_events
for each row execute function public.validate_room_event_payload();

create or replace function public.is_user_blocked(other_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists(select 1 from public.user_blocks b where
    (b.blocker_id = auth.uid() and b.blocked_id = other_user_id)
    or (b.blocker_id = other_user_id and b.blocked_id = auth.uid()));
$$;
revoke all on function public.is_user_blocked(uuid) from public, anon;
grant execute on function public.is_user_blocked(uuid) to authenticated;

create or replace function public.can_read_presence_topic(selected_topic text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare owner_id uuid;
begin
  if auth.uid() is null or selected_topic !~ '^presence:[0-9a-f-]{36}$' then return false; end if;
  begin owner_id := substr(selected_topic, 10)::uuid;
  exception when invalid_text_representation then return false; end;
  if owner_id = auth.uid() then return true; end if;
  return not public.is_user_blocked(owner_id) and exists(select 1 from public.friendships f
    where auth.uid() in (f.user_low_id, f.user_high_id) and owner_id in (f.user_low_id, f.user_high_id));
end;
$$;
revoke all on function public.can_read_presence_topic(text) from public, anon;
grant execute on function public.can_read_presence_topic(text) to authenticated;
create policy pysup_presence_read on realtime.messages for select to authenticated
using (extension = 'presence' and public.can_read_presence_topic(realtime.topic()));
create policy pysup_presence_write on realtime.messages for insert to authenticated
with check (extension = 'presence' and realtime.topic() = 'presence:' || auth.uid()::text);

drop policy if exists friend_requests_sender_insert on public.friend_requests;
create policy friend_requests_sender_insert on public.friend_requests for insert to authenticated
with check (
  sender_id = auth.uid() and status = 'pending' and responded_at is null
  and not public.is_user_blocked(receiver_id)
);

drop policy if exists messages_participants_insert on public.direct_messages;
create policy messages_participants_insert on public.direct_messages for insert to authenticated
with check (sender_id = auth.uid() and read_at is null and deleted_at is null and exists(
  select 1 from public.direct_conversations c where c.id = conversation_id
    and auth.uid() in (c.user_low_id, c.user_high_id)
    and not public.is_user_blocked(case when c.user_low_id = auth.uid() then c.user_high_id else c.user_low_id end)
));

drop policy if exists room_invites_participants_insert on public.room_invitations;
create policy room_invites_participants_insert on public.room_invitations for insert to authenticated
with check (inviter_id = auth.uid() and invited_user_id <> auth.uid() and status = 'pending'
  and responded_at is null and public.can_control_room(room_id) and not public.is_user_blocked(invited_user_id)
  and exists(select 1 from public.rooms r where r.id = room_id and r.status = 'open'));

drop policy if exists forum_replies_own_insert on public.forum_replies;
create policy forum_replies_own_insert on public.forum_replies for insert to authenticated
with check (author_id = auth.uid() and deleted_at is null and exists(
  select 1 from public.forum_topics t where t.id = topic_id and t.deleted_at is null and t.locked_at is null
    and not public.is_user_blocked(t.author_id)
));

drop policy if exists rooms_create on public.rooms;
create policy rooms_create on public.rooms for insert to authenticated
with check (host_id = auth.uid() and status = 'open' and playback_sequence = 0 and playback_position_ms = 0 and not playback_playing and closed_at is null);

drop policy if exists reports_own_insert on public.content_reports;
create policy reports_own_insert on public.content_reports for insert to authenticated
with check (reporter_id = auth.uid() and status = 'pending');

drop policy if exists clip_jobs_own_insert on public.clip_analysis_jobs;
create policy clip_jobs_own_insert on public.clip_analysis_jobs for insert to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
  and progress = 0
  and error_code is null and error_message is null
  and processing_started_at is null and completed_at is null
  and confirmed_candidate_id is null and deleted_at is null
  and (
    (source_type = 'link' and source_url like 'https://%' and char_length(source_url) <= 2048)
    or (source_type = 'upload' and storage_path like auth.uid()::text || '/%'
      and source_mime in ('video/mp4', 'video/quicktime', 'video/webm')
      and source_size_bytes between 1 and 83886080)
  )
  and purge_after <= timezone('utc', now()) + interval '25 hours'
);

-- Presupuesto atómico de servidor: las solicitudes paralelas comparten el mismo bloqueo.
create or replace function public.consume_security_budget(
  selected_user_id uuid, selected_event_type text, allowed_count integer,
  window_seconds integer, selected_ip_hash text default null
)
returns boolean language plpgsql security definer set search_path = '' as $$
declare recent_count integer;
begin
  if allowed_count not between 1 and 10000 or window_seconds not between 1 and 86400
    or char_length(selected_event_type) not between 1 and 100 then raise exception 'invalid security budget'; end if;
  perform pg_advisory_xact_lock(hashtextextended(selected_user_id::text || ':' || selected_event_type, 0));
  select count(*) into recent_count from public.security_events
  where user_id = selected_user_id and event_type = selected_event_type
    and created_at > now() - make_interval(secs => window_seconds);
  if recent_count >= allowed_count then return false; end if;
  insert into public.security_events(user_id, event_type, ip_hash)
    values(selected_user_id, selected_event_type, selected_ip_hash);
  return true;
end;
$$;
revoke all on function public.consume_security_budget(uuid,text,integer,integer,text) from public, anon, authenticated;
grant execute on function public.consume_security_budget(uuid,text,integer,integer,text) to service_role;

create or replace function public.enforce_write_rate_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null then return new; end if;
  if not public.consume_security_budget(actor, 'write:' || tg_table_name, tg_argv[0]::integer, tg_argv[1]::integer, null)
    then raise exception 'rate limit exceeded' using errcode = 'P0001'; end if;
  return new;
end;
$$;

-- El upsert se realiza en servidor para no conceder UPDATE sobre la identidad de una reseña.
create or replace function public.upsert_my_review(selected_content_id uuid, selected_rating integer, selected_body text, selected_spoiler boolean)
returns public.reviews language plpgsql security definer set search_path = '' as $$
declare result public.reviews;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if selected_rating not between 1 and 5 or char_length(trim(selected_body)) not between 3 and 4000 then raise exception 'invalid review'; end if;
  insert into public.reviews(user_id, content_id, rating, body, contains_spoilers)
  values(auth.uid(), selected_content_id, selected_rating, trim(selected_body), coalesce(selected_spoiler, false))
  on conflict(user_id, content_id) do update set rating = excluded.rating, body = excluded.body,
    contains_spoilers = excluded.contains_spoilers, deleted_at = null
  returning * into result;
  return result;
end;
$$;
revoke all on function public.upsert_my_review(uuid,integer,text,boolean) from public, anon;
grant execute on function public.upsert_my_review(uuid,integer,text,boolean) to authenticated;
create trigger rate_limit_reviews before insert or update on public.reviews
for each row execute function public.enforce_write_rate_limit('30','3600');
create trigger rate_limit_rooms before insert on public.rooms
for each row execute function public.enforce_write_rate_limit('10','3600');
create trigger rate_limit_room_invites before insert on public.room_invitations
for each row execute function public.enforce_write_rate_limit('30','3600');
create trigger rate_limit_reports before insert on public.content_reports
for each row execute function public.enforce_write_rate_limit('20','3600');

-- Se consulta metadata de Storage, pero la eliminación siempre usa su API oficial.
create or replace function public.list_expired_clip_objects()
returns table(name text) language sql stable security definer set search_path = '' as $$
  select o.name from storage.objects o where o.bucket_id = 'clip-uploads'
    and o.created_at < now() - interval '24 hours' order by o.created_at limit 500;
$$;
revoke all on function public.list_expired_clip_objects() from public, anon, authenticated;
grant execute on function public.list_expired_clip_objects() to service_role;

revoke all on function public.protect_manual_provider_connection(), public.protect_room_creation(), public.validate_room_event_payload()
  from public, anon, authenticated;

-- El panel/rol de servidor puede consultar métricas agregadas; el cliente nunca ve eventos crudos.
create or replace view public.security_event_hourly with (security_invoker = true) as
select date_trunc('hour', created_at) as bucket, event_type, count(*)::bigint as event_count
from public.security_events
where created_at >= timezone('utc', now()) - interval '30 days'
group by 1, 2;
revoke all on public.security_event_hourly from public, anon, authenticated;
grant select on public.security_event_hourly to service_role;

create index if not exists security_events_type_time_idx on public.security_events(event_type, created_at desc);
create index if not exists security_events_user_time_idx on public.security_events(user_id, created_at desc) where user_id is not null;

-- Evita consultas de cliente que permanezcan ejecutándose indefinidamente.
alter role authenticated set statement_timeout = '10s';
alter role anon set statement_timeout = '5s';

commit;
