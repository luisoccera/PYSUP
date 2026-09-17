import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { initialDirectMessages, initialRoomMessages, suggestedFriend as demoSuggestion } from '../models/messages';
import type { ChatMessage, Friend, FriendsMode } from '../models/types';
import { friendRepository } from '../services/friends/friendRepository';
import { messageRepository } from '../services/friends/messageRepository';
import { presenceRepository } from '../services/friends/presenceRepository';
import { roomRepository } from '../services/rooms/roomRepository';
import { toAppError } from '../utils/errors';

function messageId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function currentTime(value = new Date()) {
  return new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }).format(value);
}

function mapMessage(row: Record<string, unknown>, userId: string): ChatMessage {
  return {
    id: String(row.id),
    senderId: row.sender_id === userId || row.actor_id === userId ? 'me' : String(row.sender_id ?? row.actor_id),
    text: String(row.body ?? (row.payload as { body?: string } | null)?.body ?? ''),
    sentAt: currentTime(new Date(String(row.created_at ?? row.server_occurred_at))),
    status: row.read_at ? 'read' : 'sent',
  };
}

export function useFriendsController(friends: Friend[], onAddFriend: (friend: Friend) => void, options: { isDemo: boolean; userId: string; displayName: string }) {
  const { isDemo, userId, displayName } = options;
  const [mode, setMode] = useState<FriendsMode>('messages');
  const [query, setQuery] = useState('');
  const [activeFriendId, setActiveFriendId] = useState(friends[0]?.id ?? '');
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(friends[0] ? [friends[0].id] : []);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomTitle, setRoomTitle] = useState('Sala privada');
  const [roomInviteCode, setRoomInviteCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [roomIsHost, setRoomIsHost] = useState(false);
  const [roomCanControl, setRoomCanControl] = useState(false);
  const [roomActive, setRoomActive] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [directDraft, setDirectDraft] = useState('');
  const [roomDraft, setRoomDraft] = useState('');
  const [conversationIds, setConversationIds] = useState<Record<string, string>>({});
  const [directMessages, setDirectMessages] = useState<Record<string, ChatMessage[]>>(isDemo ? initialDirectMessages : {});
  const [roomMessages, setRoomMessages] = useState<ChatMessage[]>(isDemo ? initialRoomMessages : []);
  const [suggestedFriend, setSuggestedFriend] = useState<Friend>(demoSuggestion);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [friendRequests, setFriendRequests] = useState<{ id: string; senderId: string; name: string; username: string }[]>([]);
  const [focusedRequestId, setFocusedRequestId] = useState<string | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const presenceFriendIds = friends.map((friend) => friend.id).sort().join(',');
  const [hiddenFriendIds, setHiddenFriendIds] = useState<string[]>([]);
  const sequenceRef = useRef(0);

  const reportError = (error: unknown) => Alert.alert('No se pudo completar la acción', toAppError(error).message);

  useEffect(() => {
    if (isDemo) return;
    const refresh = () => { void friendRepository.listRequests().then((requests) => setFriendRequests(requests.map((request: { id: unknown; sender_id: unknown; sender?: unknown }) => {
      const sender = request.sender as { display_name?: string; username?: string } | null;
      return { id: String(request.id), senderId: String(request.sender_id), name: sender?.display_name ?? 'Usuario de PYSUP', username: sender?.username ?? '' };
    }))).catch(reportError); };
    refresh();
    return friendRepository.subscribe(userId, refresh, 'requests');
  }, [isDemo, userId]);

  useEffect(() => {
    if (isDemo || !userId) return;
    return presenceRepository.subscribe(userId, presenceFriendIds ? presenceFriendIds.split(',') : [], setOnlineUserIds);
  }, [isDemo, userId, presenceFriendIds]);

  useEffect(() => {
    if (!roomActive || !playing) return;
    const timer = setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => clearInterval(timer);
  }, [playing, roomActive]);

  useEffect(() => {
    if (!activeFriendId && friends[0]) setActiveFriendId(friends[0].id);
  }, [activeFriendId, friends]);

  useEffect(() => {
    if (isDemo || query.trim().length < 2) { setShowSuggestion(false); return; }
    const timer = setTimeout(() => {
      void friendRepository.searchUsers(query).then((results) => {
        const first = results[0];
        if (!first) return setShowSuggestion(false);
        const name = String(first.display_name);
        setSuggestedFriend({
          id: String(first.id), name, handle: `@${String(first.username)}`,
          initials: name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
          color: '#457B9D', compatibility: 0, status: 'Usuario de PYSUP', online: false,
        });
        setShowSuggestion(!friends.some((friend) => friend.id === String(first.id)));
      }).catch(reportError);
    }, 350);
    return () => clearTimeout(timer);
  }, [friends, isDemo, query]);

  useEffect(() => {
    if (isDemo || !activeFriendId) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void messageRepository.getOrCreateConversation(activeFriendId).then(async (conversationId) => {
      if (!active) return;
      setConversationIds((current) => ({ ...current, [activeFriendId]: conversationId }));
      const rows = await messageRepository.listMessages(conversationId);
      if (!active) return;
      setDirectMessages((current) => ({ ...current, [activeFriendId]: rows.map((row) => mapMessage(row, userId)) }));
      await messageRepository.markRead(conversationId);
      unsubscribe = messageRepository.subscribe(conversationId, (row) => {
        const message = mapMessage(row, userId);
        setDirectMessages((current) => {
          const list = current[activeFriendId] ?? [];
          return { ...current, [activeFriendId]: list.some((item) => item.id === message.id) ? list.map((item) => item.id === message.id ? message : item) : [...list, message] };
        });
        if (message.senderId !== 'me') void messageRepository.markRead(conversationId).catch(reportError);
      });
    }).catch(reportError);
    return () => { active = false; unsubscribe?.(); };
  }, [activeFriendId, isDemo, userId]);

  useEffect(() => {
    if (isDemo || !roomId) return;
    return roomRepository.subscribe(roomId, (event) => {
      if (event.event_type === 'chat') {
        const message = mapMessage(event, userId);
        setRoomMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message]);
        return;
      }
      const payload = event.payload as { position_ms?: number; playing?: boolean; sequence?: number } | null;
      const incomingSequence = payload?.sequence ?? 0;
      if (!payload || incomingSequence < sequenceRef.current) return;
      sequenceRef.current = incomingSequence;
      setSeconds(Math.round((payload.position_ms ?? 0) / 1000));
      setPlaying(Boolean(payload.playing));
    });
  }, [isDemo, roomId, userId]);

  const joinRoomByCode = async (codeValue: string) => {
    const code = codeValue.trim().toUpperCase();
    if (!code) return;
    if (isDemo) {
      setRoomId('demo-room'); setRoomTitle('Sala compartida'); setRoomInviteCode(code); setRoomIsHost(false); setRoomCanControl(false); setRoomActive(true); setMode('room'); return;
    }
    const joinedRoomId = await roomRepository.joinByCode(code);
    const room = await roomRepository.get(joinedRoomId);
    const remoteSequence = Number(room.playback_sequence ?? 0);
    sequenceRef.current = remoteSequence;
    const isHost = room.host_id === userId;
    setRoomId(joinedRoomId); setRoomTitle(String(room.title)); setRoomInviteCode(String(room.invite_code)); setRoomIsHost(isHost); setRoomCanControl(isHost); setSeconds(Math.round(Number(room.playback_position_ms ?? 0) / 1000)); setPlaying(Boolean(room.playback_playing)); setRoomActive(true); setMode('room'); setJoinCode('');
    const events = await roomRepository.listEvents(joinedRoomId);
    setRoomMessages(events.filter((event) => event.event_type === 'chat').map((event) => mapMessage(event, userId)));
  };

  const resumeActiveRoom = async () => {
    if (isDemo) return;
    const active = await roomRepository.getActiveForUser();
    if (!active) return;
    const { room, role } = active;
    const activeRoomId = String(room.id);
    sequenceRef.current = Number(room.playback_sequence ?? 0);
    setRoomId(activeRoomId); setRoomTitle(String(room.title)); setRoomInviteCode(String(room.invite_code)); setRoomIsHost(role === 'host'); setRoomCanControl(role === 'host' || role === 'moderator'); setSeconds(Math.round(Number(room.playback_position_ms ?? 0) / 1000)); setPlaying(Boolean(room.playback_playing)); setRoomActive(true);
    const events = await roomRepository.listEvents(activeRoomId);
    setRoomMessages(events.filter((event) => event.event_type === 'chat').map((event) => mapMessage(event, userId)));
  };

  useEffect(() => {
    const handleUrl = (value: string | null) => {
      if (!value) return false;
      try {
        const parsed = new URL(value);
        const code = parsed.protocol === 'pysup:' && parsed.hostname === 'room'
          ? parsed.pathname.replace(/^\//, '')
          : parsed.pathname.match(/^\/room\/([^/]+)/)?.[1];
        if (code) { void joinRoomByCode(code).catch(reportError); return true; }
      } catch { /* Se ignoran enlaces que pertenecen a otros flujos. */ }
      return false;
    };
    void Linking.getInitialURL().then((initialUrl) => { if (!handleUrl(initialUrl)) void resumeActiveRoom().catch(reportError); });
    const subscription = Linking.addEventListener('url', ({ url: nextUrl }) => handleUrl(nextUrl));
    return () => subscription.remove();
  }, [isDemo, userId]);

  const normalizedQuery = query.trim().toLowerCase();
  const visibleFriends = useMemo(() => friends.filter((friend) => !hiddenFriendIds.includes(friend.id)).map((friend) => ({ ...friend, online: isDemo ? friend.online : onlineUserIds.includes(friend.id) })), [friends, hiddenFriendIds, isDemo, onlineUserIds]);
  const filteredFriends = useMemo(() => visibleFriends.filter((friend) => `${friend.name} ${friend.handle}`.toLowerCase().includes(normalizedQuery)), [normalizedQuery, visibleFriends]);
  const activeFriend = visibleFriends.find((friend) => friend.id === activeFriendId) ?? visibleFriends[0] ?? null;
  const activeDirectMessages = activeFriend ? directMessages[activeFriend.id] ?? [] : [];
  const selectedRoomFriends = visibleFriends.filter((friend) => selectedRoomIds.includes(friend.id));

  const openConversation = (friendId: string) => { setActiveFriendId(friendId); setMode('messages'); };
  const toggleRoomParticipant = (friendId: string) => setSelectedRoomIds((current) => current.includes(friendId) ? current.filter((id) => id !== friendId) : [...current, friendId]);

  const addSuggestedFriend = () => {
    if (isDemo) {
      onAddFriend(suggestedFriend); setActiveFriendId(suggestedFriend.id); setMode('messages'); setQuery(''); return;
    }
    void friendRepository.sendRequest(suggestedFriend.id)
      .then(() => { setQuery(''); setShowSuggestion(false); Alert.alert('Solicitud enviada', `Avisaremos a ${suggestedFriend.name}.`); })
      .catch(reportError);
  };

  const sendDirectMessage = () => {
    const text = directDraft.trim();
    if (!text || !activeFriend) return;
    const clientId = messageId(`dm-${activeFriend.id}`);
    const optimistic: ChatMessage = { id: clientId, senderId: 'me', text, sentAt: currentTime(), status: isDemo ? 'sent' : 'sending' };
    setDirectMessages((current) => ({ ...current, [activeFriend.id]: [...(current[activeFriend.id] ?? []), optimistic] }));
    setDirectDraft('');
    if (isDemo) return;
    const conversationId = conversationIds[activeFriend.id];
    if (!conversationId) return reportError(new Error('La conversación todavía está conectándose.'));
    void messageRepository.send(conversationId, text, clientId).then((saved) => {
      setDirectMessages((current) => ({ ...current, [activeFriend.id]: (current[activeFriend.id] ?? []).map((message) => message.id === clientId ? mapMessage(saved, userId) : message) }));
    }).catch((error) => {
      setDirectMessages((current) => ({ ...current, [activeFriend.id]: (current[activeFriend.id] ?? []).map((message) => message.id === clientId ? { ...message, status: 'failed' } : message) }));
      reportError(error);
    });
  };

  const createRoom = () => {
    if (!selectedRoomIds.length) return;
    const title = `Sala de ${displayName}`;
    setRoomTitle(title);
    setRoomActive(true);
    setRoomIsHost(true);
    setRoomCanControl(true);
    setSeconds(0);
    if (isDemo) { setRoomId('demo-room'); setRoomInviteCode('DEMO123'); return; }
    void roomRepository.create(title).then(async (room) => {
      const nextRoomId = String(room.id);
      setRoomId(nextRoomId);
      setRoomInviteCode(String(room.invite_code));
      await Promise.all(selectedRoomIds.map((friendId) => roomRepository.invite(nextRoomId, friendId)));
      await roomRepository.sendPlayback(nextRoomId, 'sync', 0, false, 1);
      sequenceRef.current = 1;
    }).catch((error) => { setRoomActive(false); reportError(error); });
  };

  const sendRoomMessage = () => {
    const text = roomDraft.trim();
    if (!text || !roomActive) return;
    const clientId = messageId('room');
    const optimistic = { id: clientId, senderId: 'me' as const, text, sentAt: currentTime(), status: 'sent' as const };
    setRoomMessages((current) => [...current, optimistic]);
    setRoomDraft('');
    if (!isDemo && roomId) void roomRepository.sendChat(roomId, text, clientId).catch(reportError);
  };

  const sendControl = (event: 'play' | 'pause' | 'rewind' | 'forward', nextSeconds: number, nextPlaying: boolean) => {
    if (!roomCanControl) return;
    setSeconds(nextSeconds); setPlaying(nextPlaying);
    const nextSequence = sequenceRef.current + 1;
    sequenceRef.current = nextSequence;
    if (!isDemo && roomId) void roomRepository.sendPlayback(roomId, event, nextSeconds * 1000, nextPlaying, nextSequence).catch(reportError);
  };

  const closeRoom = () => {
    if (!isDemo && roomId) void (roomIsHost ? roomRepository.close(roomId) : roomRepository.leave(roomId)).catch(reportError);
    setRoomActive(false); setPlaying(false); setRoomId(null); setRoomMessages([]); setRoomInviteCode(''); setRoomIsHost(false); setRoomCanControl(false);
  };

  const openRoomInvitation = (invitationId: string) => {
    if (isDemo) { setRoomId('demo-room'); setRoomInviteCode('DEMO123'); setRoomIsHost(false); setRoomCanControl(false); setRoomActive(true); setMode('room'); return; }
    void roomRepository.respondToInvite(invitationId, true).then((joinedRoomId) => {
      setRoomId(String(joinedRoomId)); setRoomIsHost(false); setRoomCanControl(false); setRoomActive(true); setMode('room');
      return Promise.all([roomRepository.get(String(joinedRoomId)), roomRepository.listEvents(String(joinedRoomId))]);
    }).then(([room, events]) => { sequenceRef.current = Number(room.playback_sequence ?? 0); setRoomTitle(String(room.title)); setRoomInviteCode(String(room.invite_code)); setSeconds(Math.round(Number(room.playback_position_ms ?? 0) / 1000)); setPlaying(Boolean(room.playback_playing)); setRoomMessages(events.filter((event) => event.event_type === 'chat').map((event) => mapMessage(event, userId))); }).catch(reportError);
  };

  const respondFriendRequest = (requestId: string, accepted: boolean) => {
    if (isDemo) { setFriendRequests((current) => current.filter((request) => request.id !== requestId)); return; }
    const request = friendRequests.find((item) => item.id === requestId);
    void friendRepository.respondToRequest(requestId, accepted).then(() => {
      setFriendRequests((current) => current.filter((item) => item.id !== requestId));
      if (accepted && request) onAddFriend({ id: request.senderId, name: request.name, handle: `@${request.username}`, initials: request.name.slice(0, 2).toUpperCase(), color: '#5E4EA1', compatibility: 0, status: 'Nuevo amigo', online: false });
    }).catch(reportError);
  };

  const removeActiveFriend = () => {
    if (!activeFriend) return;
    Alert.alert('Eliminar amistad', `¿Quieres quitar a ${activeFriend.name} de tus amigos?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => {
        setHiddenFriendIds((current) => [...current, activeFriend.id]);
        if (!isDemo) void friendRepository.removeFriend(activeFriend.id).catch(reportError);
      } },
    ]);
  };

  const blockActiveFriend = () => {
    if (!activeFriend) return;
    Alert.alert('Bloquear usuario', `¿Quieres bloquear a ${activeFriend.name}? También se eliminará la amistad.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Bloquear', style: 'destructive', onPress: () => {
        setHiddenFriendIds((current) => [...current, activeFriend.id]);
        if (!isDemo) void friendRepository.blockUser(activeFriend.id).catch(reportError);
      } },
    ]);
  };

  const openFriendRequest = (requestId: string) => { setFocusedRequestId(requestId); setMode('messages'); };

  return {
    mode, setMode, query, setQuery, filteredFriends, activeFriend, activeFriendId, activeDirectMessages,
    openConversation, selectedRoomIds, selectedRoomFriends, toggleRoomParticipant, showSuggestion, suggestedFriend,
    addSuggestedFriend, directDraft, setDirectDraft, sendDirectMessage, roomActive, roomTitle, roomId,
    roomInviteCode, roomIsHost, roomCanControl, joinCode, setJoinCode, joinRoomByCode: () => { void joinRoomByCode(joinCode).catch(reportError); },
    openRoomInvitation, createRoom, closeRoom, playing,
    togglePlaying: () => sendControl(playing ? 'pause' : 'play', seconds, !playing),
    seconds,
    rewind: () => sendControl('rewind', Math.max(0, seconds - 10), playing),
    forward: () => sendControl('forward', seconds + 10, playing),
    roomDraft, setRoomDraft, roomMessages, sendRoomMessage,
    friendRequests, focusedRequestId, openFriendRequest, respondFriendRequest,
    removeActiveFriend, blockActiveFriend,
  };
}

export type FriendsControllerState = ReturnType<typeof useFriendsController>;
