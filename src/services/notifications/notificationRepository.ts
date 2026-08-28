import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getSupabase, requireUserId } from '../supabase/client';
import type { NotificationRecord } from '../supabase/records';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: true }),
});

export const notificationRepository = {
  async list(limit = 50) {
    const userId = await requireUserId();
    const { data, error } = await getSupabase().from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return data as NotificationRecord[];
  },

  async markRead(notificationId: string) {
    const userId = await requireUserId();
    const { error } = await getSupabase().from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notificationId).eq('user_id', userId);
    if (error) throw error;
  },

  async markAllRead() {
    const userId = await requireUserId();
    const { error } = await getSupabase().from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null);
    if (error) throw error;
  },

  subscribe(userId: string, onNotification: (notification: NotificationRecord) => void) {
    const channel = getSupabase().channel(`notifications:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (payload) => onNotification(payload.new as NotificationRecord))
      .subscribe();
    return () => { void getSupabase().removeChannel(channel); };
  },

  async registerPushToken(projectId?: string) {
    if (Platform.OS === 'web' || !Device.isDevice) return null;
    const existing = await Notifications.getPermissionsAsync();
    const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();
    if (!permission.granted) return null;
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    const userId = await requireUserId();
    const { error } = await getSupabase().from('push_tokens').upsert({
      user_id: userId,
      token,
      platform: Platform.OS,
      active: true,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'user_id,token' });
    if (error) throw error;
    return token;
  },
};
