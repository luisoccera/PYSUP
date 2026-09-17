begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select plan(12);

select ok((select bool_and(relrowsecurity and relforcerowsecurity) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'), 'RLS forzada en tablas de aplicación');
select ok(not has_table_privilege('anon', 'public.profiles', 'SELECT'), 'sin perfiles para anon');
select ok(not has_table_privilege('authenticated', 'public.security_events', 'INSERT'), 'sin eventos administrativos desde cliente');
select ok(not has_function_privilege('authenticated', 'public.consume_security_budget(uuid,text,integer,integer,text)', 'EXECUTE'), 'presupuesto restringido a servidor');
select ok(not has_column_privilege('authenticated', 'public.rooms', 'playback_sequence', 'INSERT'), 'no se puede forjar secuencia inicial');
select ok(not has_column_privilege('authenticated', 'public.direct_messages', 'read_at', 'INSERT'), 'no se puede forjar mensaje leído');
select ok(not has_column_privilege('authenticated', 'public.forum_topics', 'locked_at', 'INSERT'), 'moderación no disponible al publicar');
select ok(not has_column_privilege('authenticated', 'public.clip_analysis_jobs', 'status', 'INSERT'), 'no se puede forjar clip completado');

insert into auth.users(id, email, raw_user_meta_data) values
  ('10000000-0000-4000-8000-000000000001', 'rls-one@example.test', '{"display_name":"RLS Uno"}'),
  ('10000000-0000-4000-8000-000000000002', 'rls-two@example.test', '{"display_name":"RLS Dos"}');
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*) from public.profiles), 1::bigint, 'sólo perfil propio visible');
select is((select count(*) from public.profiles where id = '10000000-0000-4000-8000-000000000002'), 0::bigint, 'perfil ajeno protegido');
select is((select count(*) from public.user_preferences where user_id = '10000000-0000-4000-8000-000000000002'), 0::bigint, 'preferencias ajenas protegidas');
select ok(not public.can_read_presence_topic('presence:10000000-0000-4000-8000-000000000002'), 'no presencia de desconocidos');
reset role;
select * from finish();
rollback;
