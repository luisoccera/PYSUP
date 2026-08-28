import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');
const migration = readFileSync(resolve(root, 'supabase/migrations/202608270001_initial_schema.sql'), 'utf8');

const requiredTables = [
  'profiles', 'user_preferences', 'user_genres', 'provider_connections', 'content_items', 'content_genres',
  'content_providers', 'content_availability', 'user_interactions', 'favorites', 'saved_items', 'recommendations',
  'reviews', 'friendships', 'friend_requests', 'user_blocks', 'direct_conversations', 'direct_messages', 'rooms',
  'room_participants', 'room_invitations', 'room_events', 'forum_topics', 'forum_replies', 'forum_likes',
  'notifications', 'clip_analysis_jobs', 'clip_candidates',
];

describe('contrato reproducible de Supabase', () => {
  it.each(requiredTables)('crea y protege %s con RLS', (table) => {
    expect(migration).toContain(`create table public.${table}`);
    expect(migration).toContain(`alter table public.${table} enable row level security`);
  });

  it('protege mensajes y salas por participación', () => {
    expect(migration).toContain('messages_participants_read');
    expect(migration).toContain('public.is_room_participant(room_id)');
    expect(migration).toContain('revoke update on public.direct_messages from authenticated');
  });

  it('persiste onboarding, países, recomendaciones e interacciones negativas', () => {
    expect(migration).toContain('complete_onboarding');
    expect(migration).toContain('get_personalized_recommendations');
    expect(migration).toContain("interaction_type in ('pass','watch')");
    expect(migration).toContain('ca.country_code = selected_country');
    expect(migration).toContain('selected_mood = any(ci.mood_tags)');
    expect(migration).toContain('sync_user_interaction_flags');
  });

  it('incluye tiempo de servidor, notificaciones y limpieza de clips', () => {
    expect(migration).toContain('server_occurred_at timestamptz not null default clock_timestamp()');
    expect(migration).toContain('direct_message_notification');
    expect(migration).toContain('purge_after');
    expect(migration).toContain('enforce_write_rate_limit');
    expect(migration).toContain('revoke execute on all functions in schema public from public, anon');
  });
});

describe('servicios sin acceso directo desde vistas', () => {
  const serviceContracts = [
    ['auth/authService.ts', ['signIn', 'signUp', 'sendPasswordRecovery']],
    ['catalog/interactionRepository.ts', ['record', 'upsertReview']],
    ['forums/forumRepository.ts', ['create', 'reply', 'setLike']],
    ['friends/friendRepository.ts', ['sendRequest', 'respondToRequest']],
    ['friends/messageRepository.ts', ['send', 'subscribe', 'markRead']],
    ['rooms/roomRepository.ts', ['sendPlayback', 'sendChat', 'subscribe']],
    ['notifications/notificationRepository.ts', ['markRead', 'registerPushToken']],
    ['clips/clipRepository.ts', ['createFromLink', 'createFromFile', 'retry']],
  ] as const;

  it.each(serviceContracts)('expone el contrato %s', (relativePath, methods) => {
    const source = readFileSync(resolve(root, 'src/services', relativePath), 'utf8');
    methods.forEach((method) => expect(source).toContain(`${method}(`));
  });

  it('no permite consultas Supabase desde vistas', () => {
    const viewFiles = ['MainView.tsx', 'screens/AuthView.tsx', 'screens/ForumView.tsx', 'screens/FriendsView.tsx'];
    viewFiles.forEach((file) => expect(readFileSync(resolve(root, 'src/views', file), 'utf8')).not.toMatch(/\.from\(['"]/));
  });
});
