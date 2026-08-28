import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('flujos de producción PYSUP', () => {
  it('usa Supabase Auth real para acceso, registro, OAuth y recuperación', () => {
    const source = read('src/services/auth/authService.ts');
    expect(source).toContain('signInWithPassword');
    expect(source).toContain('.auth.signUp');
    expect(source).toContain('resetPasswordForEmail');
    expect(source).toContain('signInWithOAuth');
    expect(source).toContain('exchangeCodeForSession');
    expect(source).not.toMatch(/password\s*===|email\s*===\s*['"]demo/i);
  });

  it('persiste sesión de forma distinta en móvil y web', () => {
    const source = read('src/services/supabase/storage.ts');
    expect(source).toContain('SecureStore');
    expect(source).toContain('localStorage');
    expect(source).toContain('CHUNK_SIZE');
  });

  it('guarda onboarding y nunca marca una selección manual como OAuth', () => {
    expect(read('src/services/profiles/profileRepository.ts')).toContain("rpc('complete_onboarding'");
    const adapters = read('src/services/catalog/streamingAdapters.ts');
    expect(adapters).toContain('supportsOAuth: false');
    expect(adapters).toContain("connectionType: 'manual'");
  });

  it('sincroniza favoritos, guardados y reseñas con entidades remotas', () => {
    const source = read('src/services/catalog/interactionRepository.ts');
    expect(source).toContain("type === 'like' ? 'favorites' : 'saved_items'");
    expect(source).toContain("from('reviews').upsert");
    expect(source).toContain("from('review_likes')");
  });

  it('completa CRUD, respuestas, likes y reportes de foros', () => {
    const source = read('src/services/forums/forumRepository.ts');
    ['create(', 'update(', 'remove(', 'reply(', 'updateReply(', 'removeReply(', 'setLike(', 'report('].forEach((contract) => expect(source).toContain(contract));
    expect(read('src/views/screens/ForumView.tsx')).toContain('Responder en la conversación');
  });

  it('implementa amistades, bloqueos, presencia y estados de lectura', () => {
    const friends = read('src/services/friends/friendRepository.ts');
    expect(friends).toContain('sendRequest');
    expect(friends).toContain('respondToRequest');
    expect(friends).toContain('removeFriend');
    expect(friends).toContain('blockUser');
    expect(read('src/services/friends/presenceRepository.ts')).toContain(".on('presence'");
    expect(read('src/services/friends/messageRepository.ts')).toContain('markRead');
  });

  it('usa reloj, secuencia, permisos y reconexión reales en salas', () => {
    const rooms = read('src/services/rooms/roomRepository.ts');
    expect(rooms).toContain('getActiveForUser');
    expect(rooms).toContain('joinByCode');
    expect(rooms).toContain('server_occurred_at');
    const migration = read('supabase/migrations/202608270001_initial_schema.sql');
    expect(migration).toContain('reconcile_room_playback');
    expect(migration).toContain('stale playback event');
    expect(migration).toContain('playback control requires host or moderator role');
  });

  it('enruta notificaciones reales por destinos tipados', () => {
    const controller = read('src/controllers/useMainController.ts');
    ['content', 'forum', 'friend', 'friendRequest', 'room', 'profile', 'roulette'].forEach((destination) => expect(controller).toContain(destination));
    expect(read('src/services/notifications/notificationRepository.ts')).toContain("table: 'notifications'");
  });

  it('procesa clips fuera del cliente sin resultados o evidencia fija', () => {
    const controller = read('src/controllers/useClipFinderController.ts');
    expect(controller).not.toContain('catalogue[2]');
    expect(controller).not.toContain('setTimeout');
    const worker = read('supabase/functions/clip-analysis/index.ts');
    expect(worker).toContain("['frames', 'audio', 'ocr', 'transcription']");
    expect(worker).toContain('clip_worker_not_configured');
  });

  it('configura identificadores, scheme, enlaces y perfiles EAS', () => {
    const app = JSON.parse(read('app.json')).expo;
    expect(app.scheme).toBe('pysup');
    expect(app.android.package).toBe('app.pysup.mobile');
    expect(app.ios.bundleIdentifier).toBe('app.pysup.mobile');
    const eas = JSON.parse(read('eas.json'));
    expect(Object.keys(eas.build)).toEqual(expect.arrayContaining(['development', 'preview', 'production']));
  });

  it('mantiene las vistas separadas del acceso directo a Supabase', () => {
    const main = read('src/views/MainView.tsx');
    const modals = read('src/views/modals/AppModals.tsx');
    expect(`${main}\n${modals}`).not.toMatch(/\.from\(['"]/);
    expect(read('src/repositories/index.ts')).toContain('catalogRepository');
  });
});
