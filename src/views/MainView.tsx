import React from 'react';
import { SafeAreaView, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MainController } from '../controllers/useMainController';
import { AppHeader, MobileNav, Sidebar } from './layout/AppNavigation';
import { ContentModal, NotificationsModal } from './modals/AppModals';
import { DiscoverScreen } from './screens/DiscoverView';
import { ForumScreen } from './screens/ForumView';
import { FriendsScreen } from './screens/FriendsView';
import { HomeScreen } from './screens/HomeView';
import { ProfileScreen } from './screens/ProfileView';
import { RouletteScreen } from './screens/RouletteView';
import { SettingsScreen } from './screens/SettingsView';
import { mainStyles as styles } from './styles/mainStyles';

type MainViewProps = {
  controller: MainController;
  onLogout: () => void;
};

export function MainView({ controller, onLogout }: MainViewProps) {
  const { width } = useWindowDimensions();
  const wide = width >= 980;
  const {
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
    friendsController,
    rouletteController,
    selectedContent,
    setSelectedContent,
    notificationsOpen,
    setNotificationsOpen,
    notifications,
    unreadNotificationIds,
    openNotification,
    focusedForumTopicId,
    clearFocusedForumTopic,
    toggleSelectedLike,
    toggleSelectedSave,
  } = controller;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <View style={styles.shell}>
        {wide && (
          <Sidebar
            active={activeTab}
            onSelect={setActiveTab}
            onLogout={onLogout}
            connected={connectedProviders}
          />
        )}
        <View style={styles.main}>
          <AppHeader
            name={name}
            country={selectedCountry}
            notificationCount={unreadNotificationIds.length}
            onNotifications={() => setNotificationsOpen(true)}
            onProfile={() => setActiveTab('profile')}
            onSettings={() => setActiveTab('settings')}
          />
          {activeTab === 'home' && (
            <HomeScreen
              name={name}
              wide={wide}
              onDiscover={() => setActiveTab('discover')}
              onFriends={() => setActiveTab('friends')}
              onOpen={setSelectedContent}
            />
          )}
          {activeTab === 'discover' && (
            <DiscoverScreen
              onOpen={setSelectedContent}
              liked={likedIds}
              saved={savedIds}
              onLiked={like}
              onSaved={save}
            />
          )}
          {activeTab === 'roulette' && (
            <RouletteScreen controller={rouletteController} likedIds={likedIds} onLike={like} onOpen={setSelectedContent} />
          )}
          {activeTab === 'forum' && <ForumScreen topics={topics} onCreate={createTopic} focusedTopicId={focusedForumTopicId} onFocusHandled={clearFocusedForumTopic} />}
          {activeTab === 'friends' && <FriendsScreen controller={friendsController} />}
          {activeTab === 'profile' && (
            <ProfileScreen
              name={name}
              country={selectedCountry}
              reviews={reviews}
              liked={likedIds}
              saved={savedIds}
              onOpen={setSelectedContent}
              onEdit={setName}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsScreen
              name={name}
              country={selectedCountry}
              connected={connectedProviders}
              preferences={preferences}
              onPreferenceChange={updatePreference}
              onCountryChange={setSelectedCountry}
              onConnect={toggleProvider}
              onProfile={() => setActiveTab('profile')}
              onLogout={onLogout}
            />
          )}
        </View>
      </View>
      {!wide && <MobileNav active={activeTab} onSelect={setActiveTab} />}
      <ContentModal
        item={selectedContent}
        visible={!!selectedContent}
        onClose={() => setSelectedContent(null)}
        onReview={addReview}
        isLiked={!!selectedContent && likedIds.includes(selectedContent.id)}
        isSaved={!!selectedContent && savedIds.includes(selectedContent.id)}
        onLike={toggleSelectedLike}
        onSave={toggleSelectedSave}
      />
      <NotificationsModal
        visible={notificationsOpen}
        notifications={notifications}
        unreadIds={unreadNotificationIds}
        onSelect={openNotification}
        onClose={() => setNotificationsOpen(false)}
      />
    </SafeAreaView>
  );
}
