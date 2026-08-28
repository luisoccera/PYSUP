// Punto de entrada estable para la capa de repositorios. Las implementaciones
// permanecen junto al dominio que atienden y las vistas nunca acceden a Supabase.
export { accountService as accountRepository } from '../services/account/accountService';
export { authService as authRepository } from '../services/auth/authService';
export { catalogRepository } from '../services/catalog/catalogRepository';
export { interactionRepository } from '../services/catalog/interactionRepository';
export { streamingProviderAdapters } from '../services/catalog/streamingAdapters';
export { clipRepository } from '../services/clips/clipRepository';
export { friendRepository } from '../services/friends/friendRepository';
export { messageRepository } from '../services/friends/messageRepository';
export { presenceRepository } from '../services/friends/presenceRepository';
export { forumRepository } from '../services/forums/forumRepository';
export { notificationRepository } from '../services/notifications/notificationRepository';
export { profileRepository } from '../services/profiles/profileRepository';
export { roomRepository } from '../services/rooms/roomRepository';
