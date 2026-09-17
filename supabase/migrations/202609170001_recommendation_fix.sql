begin;

-- Corrige el alias original y evita recomendar ofertas caducadas.
-- Las plataformas son selecciones manuales, no acceso al historial de streaming.
create or replace function public.get_personalized_recommendations(selected_country text, selected_format text default 'any', selected_mood text default null, result_limit integer default 20)
returns setof public.content_items language sql volatile security definer set search_path = '' as $$
  with latest_signals as (
    select distinct on (ui.content_id, ui.interaction_type) ui.* from public.user_interactions ui
    where ui.user_id = auth.uid() and ui.deleted_at is null
    order by ui.content_id, ui.interaction_type, ui.occurred_at desc, ui.id
  ), eligible as (
    select distinct ci.id,
      coalesce((select sum(ug.weight) from public.content_genres cg join public.user_genres ug on ug.genre_id = cg.genre_id and ug.user_id = auth.uid() where cg.content_id = ci.id), 0) as genre_affinity,
      coalesce((select sum(case ui.interaction_type
        when 'like' then 2 when 'save' then 1.5 when 'pass' then -1.5
        when 'rate' then (coalesce(ui.numeric_value,3)-3)/2
        when 'review' then (coalesce(ui.numeric_value,3)-3)/2 else 0 end)
        from latest_signals ui join public.content_genres liked on liked.content_id = ui.content_id
        join public.content_genres candidate on candidate.genre_id = liked.genre_id and candidate.content_id = ci.id
        where coalesce(ui.metadata ->> 'active', 'true') <> 'false'), 0) as learned_affinity,
      case when exists(select 1 from public.content_availability a
        join public.content_providers p on p.id = a.provider_id
        join public.provider_connections pc on pc.provider_key = p.provider_key and pc.user_id = auth.uid() and pc.status in ('selected','connected')
        where a.content_id = ci.id and a.country_code = selected_country and a.status = 'available'
          and a.deleted_at is null and (a.expires_at is null or a.expires_at > now()) and a.checked_at >= now() - interval '7 days') then 1.5 else 0 end as provider_affinity
    from public.content_items ci
    join public.content_availability ca on ca.content_id = ci.id and ca.country_code = selected_country and ca.status = 'available' and ca.deleted_at is null
    where auth.uid() is not null and ci.deleted_at is null
      and (ca.expires_at is null or ca.expires_at > now()) and ca.checked_at >= now() - interval '7 days'
      and (selected_format = 'any' or ci.content_type::text = selected_format)
      and (selected_mood is null or selected_mood = any(ci.mood_tags))
      and not exists(select 1 from latest_signals seen where seen.content_id = ci.id and seen.interaction_type in ('pass','watch'))
  )
  select ci.* from eligible e join public.content_items ci on ci.id = e.id
  order by (e.genre_affinity * 2 + e.learned_affinity + e.provider_affinity + ci.discovery_score * 3 + (1-ci.popularity) * 1.5 + random() * 0.25) desc
  limit least(greatest(result_limit, 1), 50);
$$;
revoke all on function public.get_personalized_recommendations(text,text,text,integer) from public, anon;
grant execute on function public.get_personalized_recommendations(text,text,text,integer) to authenticated;

commit;
