import { useEffect, useMemo, useState } from 'react';
import { initialDirectMessages, initialRoomMessages, suggestedFriend } from '../models/messages';
import { ChatMessage, Friend, FriendsMode } from '../models/types';

function messageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function currentTime() {
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

export function useFriendsController(friends: Friend[], onAddFriend: (friend: Friend) => void) {
  const [mode, setMode] = useState<FriendsMode>('messages');
  const [query, setQuery] = useState('');
  const [activeFriendId, setActiveFriendId] = useState(friends[0]?.id ?? '');
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(friends[0] ? [friends[0].id] : []);
  const [roomActive, setRoomActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [seconds, setSeconds] = useState(1432);
  const [directDraft, setDirectDraft] = useState('');
  const [roomDraft, setRoomDraft] = useState('');
  const [directMessages, setDirectMessages] = useState<Record<string, ChatMessage[]>>(initialDirectMessages);
  const [roomMessages, setRoomMessages] = useState<ChatMessage[]>(initialRoomMessages);

  useEffect(() => {
    if (!roomActive || !playing) return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [playing, roomActive]);

  useEffect(() => {
    if (!activeFriendId && friends[0]) setActiveFriendId(friends[0].id);
  }, [activeFriendId, friends]);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredFriends = useMemo(() => friends.filter((friend) => (
    `${friend.name} ${friend.handle}`.toLowerCase().includes(normalizedQuery)
  )), [friends, normalizedQuery]);
  const activeFriend = friends.find((friend) => friend.id === activeFriendId) ?? friends[0] ?? null;
  const activeDirectMessages = activeFriend ? directMessages[activeFriend.id] ?? [] : [];
  const selectedRoomFriends = friends.filter((friend) => selectedRoomIds.includes(friend.id));
  const showSuggestion = !friends.some((friend) => friend.id === suggestedFriend.id)
    && normalizedQuery.length > 1
    && `${suggestedFriend.name} ${suggestedFriend.handle}`.toLowerCase().includes(normalizedQuery);

  const openConversation = (friendId: string) => {
    setActiveFriendId(friendId);
    setMode('messages');
  };

  const toggleRoomParticipant = (friendId: string) => {
    setSelectedRoomIds((current) => current.includes(friendId)
      ? current.filter((id) => id !== friendId)
      : [...current, friendId]);
  };

  const addSuggestedFriend = () => {
    onAddFriend(suggestedFriend);
    setDirectMessages((current) => ({ ...current, [suggestedFriend.id]: current[suggestedFriend.id] ?? [] }));
    setActiveFriendId(suggestedFriend.id);
    setMode('messages');
    setQuery('');
  };

  const sendDirectMessage = () => {
    const text = directDraft.trim();
    if (!text || !activeFriend) return;
    const message: ChatMessage = {
      id: messageId(`dm-${activeFriend.id}`),
      senderId: 'me',
      text,
      sentAt: currentTime(),
      status: 'sent',
    };
    setDirectMessages((current) => ({
      ...current,
      [activeFriend.id]: [...(current[activeFriend.id] ?? []), message],
    }));
    setDirectDraft('');
  };

  const sendRoomMessage = () => {
    const text = roomDraft.trim();
    if (!text || !roomActive) return;
    setRoomMessages((current) => [...current, {
      id: messageId('room'),
      senderId: 'me',
      text,
      sentAt: currentTime(),
      status: 'sent',
    }]);
    setRoomDraft('');
  };

  const closeRoom = () => {
    setRoomActive(false);
    setPlaying(false);
  };

  const openRoomInvitation = (friendId: string) => {
    setSelectedRoomIds((current) => current.includes(friendId) ? current : [...current, friendId]);
    setRoomActive(true);
    setMode('room');
  };

  return {
    mode,
    setMode,
    query,
    setQuery,
    filteredFriends,
    activeFriend,
    activeFriendId,
    activeDirectMessages,
    openConversation,
    selectedRoomIds,
    selectedRoomFriends,
    toggleRoomParticipant,
    showSuggestion,
    suggestedFriend,
    addSuggestedFriend,
    directDraft,
    setDirectDraft,
    sendDirectMessage,
    roomActive,
    openRoomInvitation,
    createRoom: () => selectedRoomIds.length && setRoomActive(true),
    closeRoom,
    playing,
    togglePlaying: () => setPlaying((value) => !value),
    seconds,
    rewind: () => setSeconds((value) => Math.max(0, value - 10)),
    forward: () => setSeconds((value) => value + 10),
    roomDraft,
    setRoomDraft,
    roomMessages,
    sendRoomMessage,
  };
}

export type FriendsControllerState = ReturnType<typeof useFriendsController>;
