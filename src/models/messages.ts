import { ChatMessage, Friend } from './types';

export const suggestedFriend: Friend = {
  id: 'f5',
  name: 'Camila Torres',
  handle: '@camilatoma',
  initials: 'CT',
  color: '#C06C84',
  compatibility: 86,
  status: '5 amigos en común',
  online: true,
};

export const initialDirectMessages: Record<string, ChatMessage[]> = {
  f1: [
    { id: 'dm-f1-1', senderId: 'f1', text: '¿Viste que ya salió el episodio nuevo?', sentAt: '20:41', status: 'read' },
    { id: 'dm-f1-2', senderId: 'me', text: 'Todavía no. ¿Armamos una sala más tarde?', sentAt: '20:43', status: 'read' },
    { id: 'dm-f1-3', senderId: 'f1', text: 'Sí, a las 9 me queda perfecto 🙌', sentAt: '20:44', status: 'read' },
  ],
  f2: [
    { id: 'dm-f2-1', senderId: 'f2', text: 'Te mandé una lista de ciencia ficción corta.', sentAt: 'Ayer', status: 'read' },
  ],
};

export const initialRoomMessages: ChatMessage[] = [
  { id: 'room-1', senderId: 'f1', text: 'El inicio ya se siente raro 👀', sentAt: '21:12', status: 'read' },
  { id: 'room-2', senderId: 'me', text: 'Espera a que aparezca la radio.', sentAt: '21:13', status: 'read' },
];
