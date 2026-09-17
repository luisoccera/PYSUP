import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { unaccent } from '@electric-sql/pglite/contrib/unaccent';

const one = '20000000-0000-4000-8000-000000000001';
const two = '20000000-0000-4000-8000-000000000002';
const third = '20000000-0000-4000-8000-000000000003';
const content = '10000000-0000-4000-8000-000000000001';
let db: PGlite;

// Sólo reproduce namespaces/roles de Supabase para ejecutar PostgreSQL real.
// No simula Auth, Storage HTTP ni Realtime; esos servicios requieren pruebas alojadas.
beforeAll(async () => {
  db = new PGlite({ extensions: { citext, pgcrypto, unaccent } });
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage; create schema realtime;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid $$;
  `);
}, 30_000);

afterAll(async () => { await db?.close(); });

async function asUser<T>(userId: string, operation: () => Promise<T>) {
  await db.exec('begin');
  try {
    await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: userId, role: 'authenticated' })]);
    await db.exec('set local role authenticated');
    return await operation();
  } finally { await db.exec('rollback'); }
}

describe('migraciones y RLS ejecutadas en PostgreSQL embebido', () => {
  beforeAll(async () => {
    await db.exec(`
      create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text, created_at timestamptz default now());
      alter table storage.objects enable row level security;
      create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1)-1] $$;
      create table realtime.messages(id bigint, extension text, topic text);
      alter table realtime.messages enable row level security;
      create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic', true) $$;
      create publication supabase_realtime;
      grant usage on schema public, auth, storage, realtime to anon, authenticated, service_role;
      alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
      alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
      grant all on storage.objects, realtime.messages to authenticated, service_role;
    `);
    const directory = resolve(__dirname, '../supabase/migrations');
    for (const file of readdirSync(directory).filter((name) => name.endsWith('.sql')).sort()) {
      await db.exec(readFileSync(resolve(directory, file), 'utf8'));
    }
    await db.query('insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3),($4,$5,$6),($7,$8,$9)', [one, 'one@example.test', { display_name: 'Usuario Uno' }, two, 'two@example.test', { display_name: 'Usuario Dos' }, third, 'three@example.test', { display_name: 'Usuario Tres' }]);
  }, 30_000);

  it('aplica todas las migraciones y fuerza RLS en tablas de aplicación', async () => {
    const result = await db.query<{ protected: boolean }>("select bool_and(relrowsecurity and relforcerowsecurity) as protected from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'");
    expect(result.rows[0].protected).toBe(true);
  });
  it('cada usuario sólo puede leer su perfil y preferencias', async () => {
    await asUser(one, async () => {
      expect((await db.query('select id from public.profiles')).rows).toEqual([{ id: one }]);
      expect((await db.query('select user_id from public.user_preferences')).rows).toEqual([{ user_id: one }]);
      expect((await db.query('update public.user_preferences set public_activity=true where user_id=$1 returning user_id', [two])).rows).toHaveLength(0);
    });
  });
  it('recomienda por país y persiste el rechazo en las siguientes recomendaciones', async () => {
    await asUser(one, async () => {
      const mx = await db.query<{ id: string }>("select id from public.get_personalized_recommendations('MX','any',null,50)");
      expect(mx.rows).toHaveLength(5);
      expect((await db.query("select id from public.get_personalized_recommendations('JP','any',null,50)")).rows).toHaveLength(0);
      await db.query("insert into public.user_interactions(user_id,content_id,interaction_type) values ($1,$2,'pass')", [one, content]);
      const next = await db.query<{ id: string }>("select id from public.get_personalized_recommendations('MX','any',null,50)");
      expect(next.rows.map((row) => row.id)).not.toContain(content);
    });
  });
  it('no recomienda disponibilidad regional caducada', async () => {
    await db.exec('begin');
    try {
      await db.query("update public.content_availability set expires_at=now()-interval '1 hour' where country_code='MX'");
      await db.query("select set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: one, role: 'authenticated' })]);
      await db.exec('set local role authenticated');
      expect((await db.query("select id from public.get_personalized_recommendations('MX','any',null,50)")).rows).toHaveLength(0);
    } finally { await db.exec('rollback'); }
  });
  it('permite publicar pero no forjar campos de moderación', async () => {
    await asUser(one, async () => {
      expect((await db.query("insert into public.forum_topics(author_id,kind,title,body) values ($1,'discussion','Tema válido','Descripción real para el tema') returning author_id", [one])).rows).toEqual([{ author_id: one }]);
      await expect(db.query("insert into public.forum_topics(author_id,kind,title,body,locked_at) values ($1,'discussion','Tema válido','Descripción real para el tema',now())", [one])).rejects.toMatchObject({ code: '42501' });
    });
  });
  it('crea y edita una única reseña mediante el RPC sin cambiar su identidad', async () => {
    await asUser(one, async () => {
      await db.query('select public.upsert_my_review($1,4,$2,false)', [content, 'Una reseña real']);
      await db.query('select public.upsert_my_review($1,5,$2,true)', [content, 'Reseña editada real']);
      const result = await db.query('select user_id,content_id,rating from public.reviews where user_id=$1', [one]);
      expect(result.rows).toEqual([{ user_id: one, content_id: content, rating: 5 }]);
    });
  });
  it('el bloqueo del destinatario también impide solicitudes del remitente', async () => {
    await db.query('insert into public.user_blocks(blocker_id,blocked_id) values ($1,$2)', [two, one]);
    try {
      await asUser(one, async () => {
        expect((await db.query('select public.is_user_blocked($1) as blocked', [two])).rows).toEqual([{ blocked: true }]);
        await expect(db.query('insert into public.friend_requests(sender_id,receiver_id) values ($1,$2)', [one, two])).rejects.toMatchObject({ code: '42501' });
      });
    } finally { await db.query('delete from public.user_blocks where blocker_id=$1', [two]); }
  });
  it('sólo amigos no bloqueados reciben permiso para leer presencia', async () => {
    await db.query('insert into public.friendships(user_low_id,user_high_id) values ($1,$2)', [one, two]);
    try {
      await asUser(one, async () => {
        expect((await db.query('select public.can_read_presence_topic($1) as allowed', [`presence:${two}`])).rows).toEqual([{ allowed: true }]);
        expect((await db.query('select public.can_read_presence_topic($1) as allowed', [`presence:${third}`])).rows).toEqual([{ allowed: false }]);
      });
    } finally { await db.query('delete from public.friendships where user_low_id=$1', [one]); }
  });
  it('un participante puede chatear sin forjar lectura de un mensaje', async () => {
    const conversation = (await db.query<{ id: string }>('insert into public.direct_conversations(user_low_id,user_high_id) values ($1,$2) returning id', [one, two])).rows[0].id;
    try {
      await asUser(one, async () => {
        expect((await db.query('insert into public.direct_messages(conversation_id,sender_id,client_id,body) values ($1,$2,$3,$4) returning body', [conversation, one, 'client-valid-123', 'Mensaje real'])).rows).toEqual([{ body: 'Mensaje real' }]);
        await expect(db.query('insert into public.direct_messages(conversation_id,sender_id,client_id,body,read_at) values ($1,$2,$3,$4,now())', [conversation, one, 'client-valid-456', 'Mensaje real'])).rejects.toMatchObject({ code: '42501' });
      });
      await asUser(third, async () => { expect((await db.query('select * from public.direct_messages where conversation_id=$1', [conversation])).rows).toHaveLength(0); });
    } finally { await db.query('delete from public.direct_conversations where id=$1', [conversation]); }
  });
  it('crea sala con estado del servidor y permite eventos al anfitrión', async () => {
    await asUser(one, async () => {
      const room = (await db.query<{ id: string }>('insert into public.rooms(host_id,title) values ($1,$2) returning id', [one, 'Sala real'])).rows[0];
      await db.query("insert into public.room_events(room_id,actor_id,event_type,payload) values ($1,$2,'play',$3)", [room.id, one, { sequence: 1, position_ms: 12000, playing: true }]);
      const result = await db.query<{ playback_playing: boolean; playback_sequence: number }>('select playback_playing,playback_sequence from public.rooms where id=$1', [room.id]);
      expect(result.rows[0].playback_playing).toBe(true);
      expect(Number(result.rows[0].playback_sequence)).toBe(1);
    });
  });
  it('rechaza archivos de otro usuario y estados de clip forjados', async () => {
    await asUser(one, async () => {
      await expect(db.query("insert into public.clip_analysis_jobs(user_id,source_type,storage_path,source_mime,source_size_bytes,consent_at) values ($1,'upload',$2,'video/mp4',1024,now())", [one, `${two}/file.mp4`])).rejects.toMatchObject({ code: '42501' });
    });
    await asUser(one, async () => {
      await expect(db.query("insert into public.clip_analysis_jobs(user_id,source_type,source_url,status,consent_at) values ($1,'link','https://x.com/test','completed',now())", [one])).rejects.toMatchObject({ code: '42501' });
    });
  });
  it('el presupuesto del servidor cuenta solicitudes y no se expone al cliente', async () => {
    const first = await db.query('select public.consume_security_budget($1,$2,1,60,null) as allowed', [one, 'test:budget']);
    const second = await db.query('select public.consume_security_budget($1,$2,1,60,null) as allowed', [one, 'test:budget']);
    expect(first.rows).toEqual([{ allowed: true }]); expect(second.rows).toEqual([{ allowed: false }]);
    await asUser(one, async () => {
      await expect(db.query('select public.consume_security_budget($1,$2,100,60,null)', [one, 'test:budget'])).rejects.toMatchObject({ code: '42501' });
    });
  });
});
