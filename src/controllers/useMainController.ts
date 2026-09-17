import { useEffect, useMemo, useState } from 'react';
import { Alert, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Network from 'expo-network';
import Constants from 'expo-constants';
import { useFriendsController } from './useFriendsController';
import { useRouletteController } from './useRouletteController';
import { getContentAvailability } from '../models/availability';
import { catalogue, countries, initialFriends, initialTopics } from '../models/catalogue';
import { defaultPreferences, seedReviews } from '../models/defaults';
import { initialNotifications } from '../models/notifications';
import type {
  AppNotification, AppPreferences, CommunityReview, ContentAvailability, ContentItem, ForumTopic, Friend,
  ForumReply, NotificationDestination, PreferenceKey, ProviderId, Review, TabId,
} from '../models/types';
import { catalogRepository } from '../services/catalog/catalogRepository';
import { accountService } from '../services/account/accountService';
import { authService } from '../services/auth/authService';
import { interactionRepository } from '../services/catalog/interactionRepository';
import { forumRepository, ForumTopicRecord } from '../services/forums/forumRepository';
import { friendRepository } from '../services/friends/friendRepository';
import { notificationRepository } from '../services/notifications/notificationRepository';
import { profileRepository } from '../services/profiles/profileRepository';
import { avatarService } from '../services/profiles/avatarService';
import { toAppError } from '../utils/errors';

type MainControllerOptions = {
  userId: string;
  username: string;
  initialBio: string;
  avatarPath?: string | null;
  coverPath?: string | null;
  isDemo: boolean;
  initialName: string;
  country: string;
  initialConnected: ProviderId[];
};

const preferenceColumns: Record<PreferenceKey, keyof Omit<import('../services/supabase/records').PreferencesRecord, 'user_id' | 'preferred_format'>> = {
  pushNotifications: 'push_notifications',
  friendActivity: 'friend_activity',
  forumReplies: 'forum_replies',
  hideSpoilers: 'hide_spoilers',
  publicActivity: 'public_activity',
  autoplayTrailers: 'autoplay_trailers',
  wifiOnly: 'wifi_only',
};

function addToList(current: string[], id: string) {
  return current.includes(id) ? current : [...current, id];
}

function asDestination(value: Record<string, unknown>): NotificationDestination {
  const kind = value.kind;
  if (kind === 'content' && typeof value.contentId === 'string') return { kind, contentId: value.contentId };
  if (kind === 'forum' && typeof value.topicId === 'string') return { kind, topicId: value.topicId };
  if (kind === 'friend' && typeof value.friendId === 'string') return { kind, friendId: value.friendId };
  if (kind === 'friendRequest' && typeof value.requestId === 'string') return { kind, requestId: value.requestId };
  if (kind === 'room' && typeof value.invitationId === 'string') return { kind, invitationId: value.invitationId };
  if (kind === 'profile') return { kind, reviewId: typeof value.reviewId === 'string' ? value.reviewId : undefined };
  return { kind: 'roulette' };
}

function mapTopic(row: ForumTopicRecord, currentUserId: string): ForumTopic {
  const author = row.author?.display_name ?? 'Miembro de PYSUP';
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    author,
    initials: author.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
    time: new Date(row.created_at).toLocaleDateString(),
    tags: [row.kind === 'identify' ? 'Ayúdame a encontrarla' : 'Debate', ...(row.contains_spoilers ? ['Con spoilers'] : [])],
    replies: Number(row.reply_count ?? 0),
    likes: Number(row.like_count ?? 0),
    solved: Boolean(row.solved_at),
    authorId: row.author?.id,
    isOwn: row.author?.id === currentUserId,
  };
}

export function useMainController(options: MainControllerOptions) {
  const { userId, username, initialBio, avatarPath, coverPath, isDemo, initialName, country, initialConnected } = options;
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [name, setNameState] = useState(initialName);
  const [profileUsername, setProfileUsername] = useState(username);
  const [bio, setBio] = useState(initialBio);
  const [profileAvatarPath, setProfileAvatarPath] = useState(avatarPath ?? null);
  const [profileCoverPath, setProfileCoverPath] = useState(coverPath ?? null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [profileStats, setProfileStats] = useState({ watched: 0, reviews: 0, friends: 0, saved: 0 });
  const [selectedCountry, setSelectedCountryState] = useState(country || 'MX');
  const [connectedProviders, setConnectedProviders] = useState<ProviderId[]>(initialConnected);
  const [preferences, setPreferences] = useState<AppPreferences>(defaultPreferences);
  const [items, setItems] = useState<ContentItem[]>(isDemo ? catalogue : []);
  const [likedIds, setLikedIds] = useState<string[]>(isDemo ? ['signal-noir'] : []);
  const [savedIds, setSavedIds] = useState<string[]>(isDemo ? ['orbit-9'] : []);
  const [reviews, setReviews] = useState<Review[]>(isDemo ? seedReviews : []);
  const [topics, setTopics] = useState<ForumTopic[]>(isDemo ? initialTopics : []);
  const [friends, setFriends] = useState<Friend[]>(isDemo ? initialFriends : []);
  const [blockedUsers, setBlockedUsers] = useState<{ id: string; name: string; username: string }[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>(isDemo ? initialNotifications : []);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [selectedAvailability, setSelectedAvailability] = useState<ContentAvailability | null>(null);
  const [communityReviews, setCommunityReviews] = useState<CommunityReview[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadNotificationIds, setUnreadNotificationIds] = useState(isDemo ? initialNotifications.map((item) => item.id) : [] as string[]);
  const [focusedForumTopicId, setFocusedForumTopicId] = useState<string | null>(null);

  const reportError = (error: unknown) => Alert.alert('No se pudo completar la acción', toAppError(error).message);

  useEffect(() => {
    if (isDemo) return;
    let active = true;
    void Promise.all([
      profileRepository.getPreferences(),
      interactionRepository.listIds('like'),
      interactionRepository.listIds('save'),
      interactionRepository.listMyReviews(),
      forumRepository.list(),
      friendRepository.listFriends(),
      friendRepository.listBlocks(),
      notificationRepository.list(),
      profileRepository.getStats(),
    ]).then(([remotePreferences, likes, saves, remoteReviews, remoteTopics, remoteFriends, remoteBlocks, remoteNotifications, remoteStats]) => {
      if (!active) return;
      setPreferences({
        pushNotifications: remotePreferences.push_notifications,
        friendActivity: remotePreferences.friend_activity,
        forumReplies: remotePreferences.forum_replies,
        hideSpoilers: remotePreferences.hide_spoilers,
        publicActivity: remotePreferences.public_activity,
        autoplayTrailers: remotePreferences.autoplay_trailers,
        wifiOnly: remotePreferences.wifi_only,
      });
      setLikedIds(likes);
      setSavedIds(saves);
      setReviews(remoteReviews);
      void Promise.all(remoteReviews.map((review) => catalogRepository.getContent(review.contentId))).then((reviewItems) => {
        if (!active) return;
        setItems((current) => [...current, ...reviewItems.flatMap((item) => item && !current.some((existing) => existing.id === item.id) ? [item] : [])]);
      }).catch(reportError);
      setTopics(remoteTopics.map((topic) => mapTopic(topic, userId)));
      setFriends(remoteFriends.map((friend: Record<string, unknown>) => ({
        id: String(friend.id), name: String(friend.display_name), handle: `@${String(friend.username)}`,
        initials: String(friend.display_name).split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
        color: '#5E4EA1', compatibility: 0, status: 'Disponible en PYSUP', online: false,
      })));
      setBlockedUsers(remoteBlocks.map((blocked: Record<string, unknown>) => ({ id: String(blocked.id), name: String(blocked.display_name), username: String(blocked.username) })));
      const mapped = remoteNotifications.map((notification): AppNotification => ({
        id: notification.id,
        icon: notification.type === 'direct_message' ? 'message-circle' : notification.type === 'friend_request' ? 'users' : notification.type === 'review_like' ? 'heart' : notification.type === 'forum_reply' ? 'message-square' : 'film',
        title: notification.title,
        text: notification.body,
        color: '#B8FF3D',
        destination: asDestination(notification.destination),
      }));
      setNotifications(mapped);
      setUnreadNotificationIds(remoteNotifications.filter((item) => !item.read_at).map((item) => item.id));
      setProfileStats(remoteStats);
    }).catch(reportError);
    const unsubscribe = notificationRepository.subscribe(userId, (notification) => {
      if (!active) return;
      setNotifications((current) => [{
        id: notification.id,
        icon: notification.type === 'direct_message' ? 'message-circle' : 'film',
        title: notification.title,
        text: notification.body,
        color: '#B8FF3D',
        destination: asDestination(notification.destination),
      }, ...current]);
      setUnreadNotificationIds((current) => addToList(current, notification.id));
    });
    const unsubscribeForums = forumRepository.subscribe(() => {
      void forumRepository.list().then((remoteTopics) => { if (active) setTopics(remoteTopics.map((topic) => mapTopic(topic, userId))); }).catch(reportError);
    });
    const unsubscribeProfile = profileRepository.subscribe(userId, () => {
      void Promise.all([profileRepository.getCurrent(), profileRepository.getPreferences(), profileRepository.getProviderSelections()]).then(([profile, remotePreferences, providers]) => {
        if (!active) return;
        setNameState(profile.display_name); setProfileUsername(profile.username); setBio(profile.bio ?? ''); setProfileAvatarPath(profile.avatar_path); setProfileCoverPath(profile.cover_path); setSelectedCountryState(profile.country_code ?? ''); setConnectedProviders(providers);
        setPreferences({ pushNotifications: remotePreferences.push_notifications, friendActivity: remotePreferences.friend_activity, forumReplies: remotePreferences.forum_replies, hideSpoilers: remotePreferences.hide_spoilers, publicActivity: remotePreferences.public_activity, autoplayTrailers: remotePreferences.autoplay_trailers, wifiOnly: remotePreferences.wifi_only });
      }).catch(reportError);
    });
    const unsubscribeInteractions = interactionRepository.subscribe(userId, () => {
      void Promise.all([interactionRepository.listIds('like'), interactionRepository.listIds('save'), interactionRepository.listMyReviews(), profileRepository.getStats()]).then(([likes, saves, remoteReviews, remoteStats]) => {
        if (!active) return;
        setLikedIds(likes); setSavedIds(saves); setReviews(remoteReviews); setProfileStats(remoteStats);
      }).catch(reportError);
    });
    const unsubscribeFriends = friendRepository.subscribe(userId, () => {
      void Promise.all([friendRepository.listFriends(), friendRepository.listBlocks(), profileRepository.getStats()]).then(([remoteFriends, remoteBlocks, remoteStats]) => {
        if (!active) return;
        setFriends(remoteFriends.map((friend: Record<string, unknown>) => ({ id: String(friend.id), name: String(friend.display_name), handle: `@${String(friend.username)}`, initials: String(friend.display_name).split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(), color: '#5E4EA1', compatibility: 0, status: 'Disponible en PYSUP', online: false })));
        setBlockedUsers(remoteBlocks.map((blocked: Record<string, unknown>) => ({ id: String(blocked.id), name: String(blocked.display_name), username: String(blocked.username) })));
        setProfileStats(remoteStats);
      }).catch(reportError);
    }, 'main');
    return () => { active = false; unsubscribe(); unsubscribeForums(); unsubscribeProfile(); unsubscribeInteractions(); unsubscribeFriends(); };
  }, [isDemo, userId]);

  useEffect(() => {
    if (isDemo || !profileAvatarPath) return setAvatarUrl(null);
    let active = true;
    void avatarService.getSignedUrl(profileAvatarPath).then((url) => { if (active) setAvatarUrl(url); }).catch(reportError);
    return () => { active = false; };
  }, [isDemo, profileAvatarPath]);

  useEffect(() => {
    if (isDemo || !profileCoverPath) return setCoverUrl(null);
    let active = true;
    void avatarService.getSignedUrl(profileCoverPath).then((url) => { if (active) setCoverUrl(url); }).catch(reportError);
    return () => { active = false; };
  }, [isDemo, profileCoverPath]);

  useEffect(() => {
    if (isDemo) return;
    let active = true;
    void catalogRepository.getRecommendations({ country: selectedCountry, limit: 30 })
      .then((recommendations) => { if (active) setItems((current) => [...recommendations, ...current.filter((item) => !recommendations.some((recommended) => recommended.id === item.id))]); })
      .catch(reportError);
    return () => { active = false; };
  }, [isDemo, selectedCountry]);

  useEffect(() => {
    if (!selectedContent) return setSelectedAvailability(null);
    if (isDemo) return setSelectedAvailability(getContentAvailability(selectedContent, selectedCountry));
    let active = true;
    void catalogRepository.getAvailability(selectedContent.id, selectedCountry)
      .then((availability) => { if (active) setSelectedAvailability(availability); })
      .catch(reportError);
    return () => { active = false; };
  }, [isDemo, selectedContent, selectedCountry]);

  useEffect(() => {
    if (!selectedContent || isDemo) return setCommunityReviews([]);
    let active = true;
    void interactionRepository.listContentReviews(selectedContent.id).then((items) => { if (active) setCommunityReviews(items); }).catch(reportError);
    return () => { active = false; };
  }, [isDemo, selectedContent]);

  const setName = (value: string) => {
    const next = value.trim();
    if (!next) return;
    setNameState(next);
    if (!isDemo) void profileRepository.updateProfile({ displayName: next }).catch(reportError);
  };

  const updatePublicProfile = async (nextName: string, nextBio: string, nextUsername: string) => {
    const cleanName = nextName.trim();
    if (!cleanName) return;
    if (!isDemo) {
      const saved = await profileRepository.updateProfile({ displayName: cleanName, bio: nextBio, username: nextUsername });
      setNameState(saved.display_name); setBio(saved.bio ?? ''); setProfileUsername(saved.username);
      return;
    }
    setNameState(cleanName); setBio(nextBio.trim()); setProfileUsername(nextUsername.trim().toLowerCase());
  };

  const setSelectedCountry = (value: string) => {
    setSelectedCountryState(value);
    if (!isDemo) void profileRepository.updateProfile({ countryCode: value }).catch(reportError);
  };

  const toggleProvider = (id: ProviderId) => {
    const selected = !connectedProviders.includes(id);
    setConnectedProviders((current) => selected ? [...current, id] : current.filter((item) => item !== id));
    if (!isDemo) void profileRepository.setProviderSelection(id, selected).catch(reportError);
  };

  const updatePreference = (key: PreferenceKey, value: boolean) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    if (!isDemo) void profileRepository.updatePreferences({ [preferenceColumns[key]]: value }).catch(reportError);
  };

  const interact = (action: 'pass' | 'like' | 'save', id: string) => {
    if (action === 'pass') {
      if (!isDemo) void interactionRepository.record(id, 'pass').catch(reportError);
      return;
    }
    const current = action === 'like' ? likedIds : savedIds;
    const active = !current.includes(id);
    if (action === 'like') setLikedIds((items) => active ? addToList(items, id) : items.filter((item) => item !== id));
    if (action === 'save') setSavedIds((items) => active ? addToList(items, id) : items.filter((item) => item !== id));
    if (!isDemo) void interactionRepository.setFlag(id, action as 'like' | 'save', active).catch(reportError);
  };
  const like = (id: string) => interact('like', id);
  const save = (id: string) => interact('save', id);
  const toggleSelectedLike = () => selectedContent && like(selectedContent.id);
  const toggleSelectedSave = () => selectedContent && save(selectedContent.id);

  const addReview = (review: Review) => {
    setReviews((current) => [review, ...current.filter((item) => item.contentId !== review.contentId)]);
    if (!isDemo) void interactionRepository.upsertReview(review.contentId, review.rating, review.text, Boolean(review.containsSpoilers)).then((saved) => {
      setReviews((current) => current.map((item) => item.contentId === review.contentId ? { ...item, id: String(saved.id), date: String(saved.updated_at ?? saved.created_at) } : item));
    }).catch(reportError);
  };

  const deleteReview = (reviewId: string) => {
    setReviews((current) => current.filter((review) => review.id !== reviewId));
    if (!isDemo) void interactionRepository.deleteReview(reviewId).catch(reportError);
  };

  const toggleCommunityReviewLike = (reviewId: string) => {
    const review = communityReviews.find((item) => item.id === reviewId);
    if (!review || review.user_id === userId) return;
    const liked = !review.my_like;
    setCommunityReviews((current) => current.map((item) => item.id === reviewId ? { ...item, my_like: liked, like_count: Math.max(0, item.like_count + (liked ? 1 : -1)) } : item));
    if (!isDemo) void interactionRepository.setReviewLike(reviewId, liked).catch(reportError);
  };

  const changeAvatar = () => {
    if (isDemo) return Alert.alert('Modo demo', 'La subida de fotografías requiere una cuenta conectada a Supabase.');
    void avatarService.pickAndUpload().then((path) => { if (path) setProfileAvatarPath(path); }).catch(reportError);
  };

  const removeAvatar = () => {
    if (isDemo) return setProfileAvatarPath(null);
    void avatarService.remove(profileAvatarPath).then(() => setProfileAvatarPath(null)).catch(reportError);
  };

  const changeCover = () => {
    if (isDemo) return Alert.alert('Modo demo', 'La subida de portadas requiere una cuenta conectada a Supabase.');
    void avatarService.pickAndUploadCover().then((path) => { if (path) setProfileCoverPath(path); }).catch(reportError);
  };

  const removeCover = () => {
    if (isDemo) return setProfileCoverPath(null);
    void avatarService.removeCover(profileCoverPath).then(() => setProfileCoverPath(null)).catch(reportError);
  };

  const downloadMyData = () => {
    if (isDemo) return Alert.alert('Modo demo', 'La exportación sólo incluye datos de una cuenta real.');
    void accountService.requestDataExport().catch(reportError);
  };

  const changePassword = (password: string, currentPassword: string, nonce?: string) => {
    if (isDemo) return Promise.reject(new Error('El modo demo no tiene contraseña.'));
    return authService.updatePassword(password, currentPassword, nonce);
  };

  const requestPasswordCode = () => isDemo
    ? Promise.reject(new Error('El modo demo no tiene una cuenta de correo.'))
    : authService.requestPasswordCode();

  const deleteAccount = () => {
    if (isDemo) return Alert.alert('Modo demo', 'No existe una cuenta remota que eliminar.');
    Alert.alert('Eliminar cuenta', 'Esta acción elimina tu cuenta y datos asociados. No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar definitivamente', style: 'destructive', onPress: () => { void accountService.deleteAccount().catch(reportError); } },
    ]);
  };

  const unblockUser = (blockedId: string) => {
    setBlockedUsers((current) => current.filter((item) => item.id !== blockedId));
    if (!isDemo) void friendRepository.unblockUser(blockedId).catch(reportError);
  };

  const createTopic = async (topic: ForumTopic) => {
    const authored = { ...topic, author: name, authorId: userId, isOwn: true, initials: name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() };
    if (isDemo) { setTopics((current) => [authored, ...current]); return authored; }
    const created = await forumRepository.create({ kind: topic.kind, title: topic.title, body: topic.body });
    const saved = { ...authored, id: String(created.id) };
    setTopics((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
    return saved;
  };

  const loadForumReplies = async (topicId: string): Promise<ForumReply[]> => {
    if (isDemo) return [{ id: 'demo-reply', body: 'También me fijé en ese detalle. Parece confirmar que no es un error de continuidad.', author: 'Comunidad PYSUP', initials: 'CP', time: 'Demo', containsSpoilers: false }];
    const rows = await forumRepository.listReplies(topicId);
    return rows.map((row: Record<string, unknown>) => {
      const authorRecord = row.author as { id?: string; display_name?: string } | null;
      const author = authorRecord?.display_name ?? 'Miembro de PYSUP';
      const authorId = typeof authorRecord?.id === 'string' ? authorRecord.id : undefined;
      return { id: String(row.id), body: String(row.body), author, initials: author.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(), time: new Date(String(row.created_at)).toLocaleDateString(), containsSpoilers: Boolean(row.contains_spoilers), authorId, isOwn: authorId === userId };
    });
  };

  const replyToTopic = async (topicId: string, body: string, spoiler: boolean): Promise<ForumReply> => {
    if (isDemo) {
      const reply = { id: `reply-${Date.now()}`, body, author: name, initials: name.slice(0, 2).toUpperCase(), time: 'Ahora', containsSpoilers: spoiler, authorId: userId, isOwn: true };
      setTopics((current) => current.map((topic) => topic.id === topicId ? { ...topic, replies: topic.replies + 1 } : topic));
      return reply;
    }
    const row = await forumRepository.reply(topicId, body, spoiler);
    setTopics((current) => current.map((topic) => topic.id === topicId ? { ...topic, replies: topic.replies + 1 } : topic));
    return { id: String(row.id), body: String(row.body), author: name, initials: name.slice(0, 2).toUpperCase(), time: 'Ahora', containsSpoilers: Boolean(row.contains_spoilers), authorId: userId, isOwn: true };
  };

  const updateForumReply = async (replyId: string, body: string, spoiler: boolean) => {
    if (!isDemo) await forumRepository.updateReply(replyId, body, spoiler);
  };

  const deleteForumReply = async (replyId: string) => {
    if (!isDemo) await forumRepository.removeReply(replyId);
  };

  const subscribeForumReplies = (topicId: string, onReplies: (items: ForumReply[]) => void) => {
    if (isDemo) return () => undefined;
    return forumRepository.subscribeReplies(topicId, () => { void loadForumReplies(topicId).then(onReplies).catch(reportError); });
  };

  const updateForumTopic = async (topicId: string, title: string, body: string) => {
    if (!isDemo) await forumRepository.update(topicId, { title, body });
    setTopics((current) => current.map((topic) => topic.id === topicId ? { ...topic, title: title.trim(), body: body.trim() } : topic));
  };

  const deleteForumTopic = async (topicId: string) => {
    if (!isDemo) await forumRepository.remove(topicId);
    setTopics((current) => current.filter((topic) => topic.id !== topicId));
  };

  const reportForumTopic = async (topicId: string, reason: string) => {
    if (isDemo) return;
    await forumRepository.report('topic', topicId, reason);
  };

  const blockForumAuthor = async (authorId: string) => {
    if (!isDemo) await friendRepository.blockUser(authorId);
    setTopics((current) => current.filter((topic) => topic.authorId !== authorId));
  };

  const addFriend = (friend: Friend) => setFriends((current) => current.some((item) => item.id === friend.id) ? current : [...current, friend]);
  const friendsController = useFriendsController(friends, addFriend, { isDemo, userId, displayName: name });
  const rouletteController = useRouletteController({ likedIds, savedIds, reviews, country: selectedCountry, isDemo });
  const countryName = useMemo(() => countries.find((item) => item.code === selectedCountry)?.name ?? selectedCountry, [selectedCountry]);

  const openExternalUrl = async (url: string) => {
    if (!url) return Alert.alert('Enlace no disponible', 'El proveedor de catálogo todavía no publicó un enlace oficial.');
    try { await Linking.openURL(url); }
    catch { Alert.alert('No pudimos abrir el enlace', 'Revisa que el servicio esté disponible en tu dispositivo.'); }
  };

  const openTrailerUrl = async (url: string) => {
    if (preferences.wifiOnly) {
      const network = await Network.getNetworkStateAsync();
      if (network.type !== Network.NetworkStateType.WIFI && network.type !== Network.NetworkStateType.ETHERNET) return Alert.alert('Video limitado a Wi-Fi', 'Desactiva “Video sólo con WiFi” en Configuración si quieres usar datos móviles.');
    }
    return openExternalUrl(url);
  };

  const openNotification = (notification: AppNotification) => {
    setNotificationsOpen(false);
    setUnreadNotificationIds((current) => current.filter((id) => id !== notification.id));
    if (!isDemo) void notificationRepository.markRead(notification.id).catch(reportError);
    const destination = notification.destination;
    if (destination.kind === 'content') {
      const content = items.find((item) => item.id === destination.contentId);
      if (content) setSelectedContent(content);
    } else if (destination.kind === 'forum') {
      setFocusedForumTopicId(destination.topicId); setActiveTab('forum');
    } else if (destination.kind === 'friend') {
      friendsController.openConversation(destination.friendId); setActiveTab('friends');
    } else if (destination.kind === 'friendRequest') {
      friendsController.openFriendRequest(destination.requestId); setActiveTab('friends');
    } else if (destination.kind === 'room') {
      friendsController.openRoomInvitation(destination.invitationId); setActiveTab('friends');
    } else if (destination.kind === 'profile') setActiveTab('profile');
    else setActiveTab('roulette');
  };

  useEffect(() => {
    if (isDemo || !preferences.pushNotifications) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    void notificationRepository.registerPushToken(projectId).catch(reportError);
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const raw = response.notification.request.content.data?.destination;
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
      openNotification({
        id: String(response.notification.request.identifier),
        icon: 'film',
        title: response.notification.request.content.title ?? 'PYSUP',
        text: response.notification.request.content.body ?? '',
        color: '#B8FF3D',
        destination: asDestination(raw as Record<string, unknown>),
      });
    });
    return () => subscription.remove();
  }, [isDemo, preferences.pushNotifications]);

  return {
    activeTab, setActiveTab, userId, username: profileUsername, bio, avatarPath: profileAvatarPath, avatarUrl, coverPath: profileCoverPath, coverUrl, profileStats, isDemo, name, setName, updatePublicProfile,
    selectedCountry, setSelectedCountry, countryName, connectedProviders, toggleProvider,
    preferences, updatePreference, items, likedIds, savedIds, like, save, interact,
    reviews, addReview, deleteReview, communityReviews, toggleCommunityReviewLike, topics, createTopic, loadForumReplies, subscribeForumReplies, replyToTopic, updateForumReply, deleteForumReply, updateForumTopic, deleteForumTopic, reportForumTopic, blockForumAuthor,
    likeForumTopic: (topicId: string, liked: boolean) => isDemo ? Promise.resolve() : forumRepository.setLike(topicId, liked),
    acceptForumReply: (topicId: string, replyId: string) => isDemo ? Promise.resolve() : forumRepository.acceptReply(topicId, replyId),
    friends, friendsController, rouletteController,
    selectedAvailability, openExternalUrl, openTrailerUrl, notifications, unreadNotificationIds, openNotification,
    focusedForumTopicId, clearFocusedForumTopic: () => setFocusedForumTopicId(null),
    selectedContent, setSelectedContent, notificationsOpen, setNotificationsOpen,
    toggleSelectedLike, toggleSelectedSave,
    changeAvatar, removeAvatar, changeCover, removeCover, downloadMyData, changePassword, requestPasswordCode, deleteAccount,
    blockedUsers, unblockUser,
  };
}

export type MainController = ReturnType<typeof useMainController>;
