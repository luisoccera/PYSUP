import { useState } from 'react';
import { Alert, Linking } from 'react-native';
import { useFriendsController } from './useFriendsController';
import { useRouletteController } from './useRouletteController';
import { getContentAvailability } from '../models/availability';
import { defaultPreferences, seedReviews } from '../models/defaults';
import { catalogue, initialFriends, initialTopics } from '../models/catalogue';
import { initialNotifications } from '../models/notifications';
import {
  AppNotification,
  AppPreferences,
  ContentItem,
  ForumTopic,
  Friend,
  PreferenceKey,
  ProviderId,
  Review,
  TabId,
} from '../models/types';

type MainControllerOptions = {
  initialName: string;
  country: string;
  initialConnected: ProviderId[];
};

function toggleInList(current: string[], id: string) {
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
}

function addToList(current: string[], id: string) {
  return current.includes(id) ? current : [...current, id];
}

export function useMainController({ initialName, country, initialConnected }: MainControllerOptions) {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [name, setName] = useState(initialName);
  const [selectedCountry, setSelectedCountry] = useState(country);
  const [connectedProviders, setConnectedProviders] = useState<ProviderId[]>(initialConnected);
  const [preferences, setPreferences] = useState<AppPreferences>(defaultPreferences);
  const [likedIds, setLikedIds] = useState<string[]>(['signal-noir']);
  const [savedIds, setSavedIds] = useState<string[]>(['orbit-9']);
  const [reviews, setReviews] = useState<Review[]>(seedReviews);
  const [topics, setTopics] = useState<ForumTopic[]>(initialTopics);
  const [friends, setFriends] = useState<Friend[]>(initialFriends);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadNotificationIds, setUnreadNotificationIds] = useState(initialNotifications.map((item) => item.id));
  const [focusedForumTopicId, setFocusedForumTopicId] = useState<string | null>(null);

  const toggleProvider = (id: ProviderId) => {
    setConnectedProviders((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  };

  const updatePreference = (key: PreferenceKey, value: boolean) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const like = (id: string) => setLikedIds((current) => addToList(current, id));
  const save = (id: string) => setSavedIds((current) => addToList(current, id));
  const toggleSelectedLike = () => selectedContent && setLikedIds((current) => toggleInList(current, selectedContent.id));
  const toggleSelectedSave = () => selectedContent && setSavedIds((current) => toggleInList(current, selectedContent.id));
  const addReview = (review: Review) => setReviews((current) => [review, ...current]);
  const createTopic = (topic: ForumTopic) => setTopics((current) => [topic, ...current]);
  const addFriend = (friend: Friend) => setFriends((current) => current.some((item) => item.id === friend.id) ? current : [...current, friend]);
  const friendsController = useFriendsController(friends, addFriend);
  const rouletteController = useRouletteController({ likedIds, savedIds, reviews, country: selectedCountry });
  const selectedAvailability = selectedContent ? getContentAvailability(selectedContent, selectedCountry) : null;

  const openExternalUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('No pudimos abrir el enlace', 'Inténtalo de nuevo o revisa que el servicio esté disponible en tu dispositivo.');
    }
  };

  const openNotification = (notification: AppNotification) => {
    setNotificationsOpen(false);
    setUnreadNotificationIds((current) => current.filter((id) => id !== notification.id));
    const destination = notification.destination;
    if (destination.kind === 'content') {
      const content = catalogue.find((item) => item.id === destination.contentId);
      if (content) setSelectedContent(content);
      return;
    }
    if (destination.kind === 'forum') {
      setFocusedForumTopicId(destination.topicId);
      setActiveTab('forum');
      return;
    }
    if (destination.kind === 'friend') {
      friendsController.openConversation(destination.friendId);
      setActiveTab('friends');
      return;
    }
    if (destination.kind === 'room') {
      friendsController.openRoomInvitation(destination.friendId);
      setActiveTab('friends');
      return;
    }
    if (destination.kind === 'profile') {
      setActiveTab('profile');
      return;
    }
    setActiveTab('roulette');
  };

  return {
    activeTab,
    setActiveTab,
    name,
    setName,
    selectedCountry,
    setSelectedCountry,
    connectedProviders,
    toggleProvider,
    preferences,
    updatePreference,
    likedIds,
    savedIds,
    like,
    save,
    reviews,
    addReview,
    topics,
    createTopic,
    friends,
    friendsController,
    rouletteController,
    selectedAvailability,
    openExternalUrl,
    notifications: initialNotifications,
    unreadNotificationIds,
    openNotification,
    focusedForumTopicId,
    clearFocusedForumTopic: () => setFocusedForumTopicId(null),
    selectedContent,
    setSelectedContent,
    notificationsOpen,
    setNotificationsOpen,
    toggleSelectedLike,
    toggleSelectedSave,
  };
}

export type MainController = ReturnType<typeof useMainController>;
