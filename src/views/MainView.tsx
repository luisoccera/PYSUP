import React, { useEffect } from 'react';
import { BackHandler, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { MainController } from '../controllers/useMainController';
import { useConnectivity } from '../hooks/useConnectivity';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';
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
  onLogoutAll: () => void;
};

export function MainView({ controller, onLogout, onLogoutAll }: MainViewProps) {
  const responsive = useResponsiveLayout();
  const { isOffline } = useConnectivity();
  const showSidebar = responsive.isDesktop;
  const wideContent = responsive.hasWideContent;
  const {
    activeTab,
    setActiveTab,
    userId,
    name,
    username,
    bio,
    updatePublicProfile,
    avatarUrl,
    coverUrl,
    profileStats,
    selectedCountry,
    setSelectedCountry,
    connectedProviders,
    toggleProvider,
    preferences,
    updatePreference,
    likedIds,
    items,
    savedIds,
    save,
    interact,
    reviews,
    addReview,
    deleteReview,
    communityReviews,
    toggleCommunityReviewLike,
    topics,
    createTopic,
    loadForumReplies,
    subscribeForumReplies,
    replyToTopic,
    updateForumReply,
    deleteForumReply,
    updateForumTopic,
    deleteForumTopic,
    reportForumTopic,
    blockForumAuthor,
    likeForumTopic,
    acceptForumReply,
    friendsController,
    rouletteController,
    selectedAvailability,
    openExternalUrl,
    openTrailerUrl,
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
    changeAvatar,
    removeAvatar,
    changeCover,
    removeCover,
    downloadMyData,
    changePassword,
    requestPasswordCode,
    deleteAccount,
    blockedUsers,
    unblockUser,
    countryName,
  } = controller;

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (notificationsOpen) { setNotificationsOpen(false); return true; }
      if (selectedContent) { setSelectedContent(null); return true; }
      if (activeTab !== 'home') { setActiveTab('home'); return true; }
      return false;
    });
    return () => subscription.remove();
  }, [activeTab, notificationsOpen, selectedContent, setActiveTab, setNotificationsOpen, setSelectedContent]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <StatusBar style="light" />
      {isOffline && <View accessibilityRole="alert" style={styles.offlineBanner}><Text style={styles.offlineText}>Sin conexión · conservaremos esta pantalla y las acciones remotas volverán al recuperar la red.</Text></View>}
      <View style={styles.shell}>
        {showSidebar && (
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
              countryName={countryName}
              stats={profileStats}
              items={items}
              wide={wideContent}
              onDiscover={() => setActiveTab('discover')}
              onFriends={() => setActiveTab('friends')}
              onOpen={setSelectedContent}
            />
          )}
          {activeTab === 'discover' && (
            <DiscoverScreen
              country={selectedCountry}
              wifiOnly={preferences.wifiOnly}
              items={items}
              onOpen={setSelectedContent}
              liked={likedIds}
              saved={savedIds}
              onAction={interact}
            />
          )}
          {activeTab === 'roulette' && (
            <RouletteScreen
              controller={rouletteController}
              savedIds={savedIds}
              onSave={save}
              onOpen={setSelectedContent}
              onOpenUrl={openExternalUrl}
              onOpenTrailer={openTrailerUrl}
            />
          )}
          {activeTab === 'forum' && <ForumScreen topics={topics} hideSpoilers={preferences.hideSpoilers} onCreate={createTopic} onLoadReplies={loadForumReplies} onSubscribeReplies={subscribeForumReplies} onReply={replyToTopic} onUpdateReply={updateForumReply} onDeleteReply={deleteForumReply} onLike={likeForumTopic} onAcceptReply={acceptForumReply} onUpdate={updateForumTopic} onDelete={deleteForumTopic} onReport={reportForumTopic} onBlockAuthor={blockForumAuthor} focusedTopicId={focusedForumTopicId} onFocusHandled={clearFocusedForumTopic} />}
          {activeTab === 'friends' && <FriendsScreen controller={friendsController} />}
          {activeTab === 'profile' && (
            <ProfileScreen
              name={name}
              username={username}
              bio={bio}
              avatarUrl={avatarUrl}
              coverUrl={coverUrl}
              stats={profileStats}
              hideSpoilers={preferences.hideSpoilers}
              country={selectedCountry}
              items={items}
              reviews={reviews}
              saved={savedIds}
              onOpen={setSelectedContent}
              onEdit={updatePublicProfile}
              onChangeAvatar={changeAvatar}
              onRemoveAvatar={removeAvatar}
              onChangeCover={changeCover}
              onRemoveCover={removeCover}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsScreen
              name={name}
              username={username}
              avatarUrl={avatarUrl}
              country={selectedCountry}
              connected={connectedProviders}
              preferences={preferences}
              onPreferenceChange={updatePreference}
              onCountryChange={setSelectedCountry}
              onConnect={toggleProvider}
              onProfile={() => setActiveTab('profile')}
              onLogout={onLogout}
              onLogoutAll={onLogoutAll}
              onDownloadData={downloadMyData}
              onChangePassword={changePassword}
              onRequestPasswordCode={requestPasswordCode}
              onDeleteAccount={deleteAccount}
              blockedUsers={blockedUsers}
              onUnblock={unblockUser}
            />
          )}
        </View>
      </View>
      {!showSidebar && <MobileNav active={activeTab} onSelect={setActiveTab} />}
      <ContentModal
        item={selectedContent}
        visible={!!selectedContent}
        onClose={() => setSelectedContent(null)}
        onReview={addReview}
        existingReview={selectedContent ? reviews.find((review) => review.contentId === selectedContent.id) ?? null : null}
        onDeleteReview={deleteReview}
        communityReviews={communityReviews}
        currentUserId={userId}
        onToggleCommunityReviewLike={toggleCommunityReviewLike}
        hideSpoilers={preferences.hideSpoilers}
        isLiked={!!selectedContent && likedIds.includes(selectedContent.id)}
        isSaved={!!selectedContent && savedIds.includes(selectedContent.id)}
        onLike={toggleSelectedLike}
        onSave={toggleSelectedSave}
        availability={selectedAvailability}
        onOpenUrl={openExternalUrl}
        onOpenTrailer={openTrailerUrl}
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
