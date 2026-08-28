import { AppNotification } from './types';

export const initialNotifications: AppNotification[] = [
  {
    id: 'notification-room-sofia',
    icon: 'users',
    title: 'Sofía te invitó a una sala',
    text: 'Señal nocturna · Hoy, 9:30 p. m.',
    color: '#C8FF5A',
    destination: { kind: 'room', invitationId: 'demo-invitation-f1' },
  },
  {
    id: 'notification-forum-replies',
    icon: 'message-circle',
    title: '3 respuestas nuevas',
    text: 'En “Series cortas que sí cierran bien”.',
    color: '#6FA8FF',
    destination: { kind: 'forum', topicId: 't2' },
  },
  {
    id: 'notification-direct-message',
    icon: 'message-square',
    title: 'Mateo te envió un mensaje',
    text: 'Te compartió una lista de ciencia ficción corta.',
    color: '#A780FF',
    destination: { kind: 'friend', friendId: 'f2' },
  },
  {
    id: 'notification-review-useful',
    icon: 'heart',
    title: 'Tu reseña fue útil',
    text: '18 personas reaccionaron a tu reseña de Órbita nueve.',
    color: '#FF6B6B',
    destination: { kind: 'profile', reviewId: 'r1' },
  },
  {
    id: 'notification-hidden-gem',
    icon: 'film',
    title: 'Encontramos una joya fuera del radar',
    text: 'La ruleta ya tiene una recomendación basada en tus gustos.',
    color: '#FFC857',
    destination: { kind: 'roulette' },
  },
];
