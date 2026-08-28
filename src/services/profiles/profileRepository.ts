import type { OnboardingResult, ProviderId } from '../../models/types';
import { sanitizePlainText, validateUsername } from '../../utils/validation';
import { getSupabase, requireUserId } from '../supabase/client';
import type { PreferencesRecord, ProfileRecord } from '../supabase/records';
import { getStreamingProviderAdapter } from '../catalog/streamingAdapters';

export const profileRepository = {
  async getCurrent() {
    const userId = await requireUserId();
    const { data, error } = await getSupabase().from('profiles').select('*').eq('id', userId).single();
    if (error) throw error;
    return data as ProfileRecord;
  },

  async getPreferences() {
    const userId = await requireUserId();
    const { data, error } = await getSupabase().from('user_preferences').select('*').eq('user_id', userId).single();
    if (error) throw error;
    return data as PreferencesRecord;
  },

  async completeOnboarding(result: OnboardingResult) {
    const { error } = await getSupabase().rpc('complete_onboarding', {
      selected_country: result.country,
      selected_provider_keys: result.connectedProviders,
      selected_genres: result.preferredGenres,
    });
    if (error) throw error;
  },

  async updateProfile(values: { displayName?: string; username?: string; bio?: string; countryCode?: string }) {
    const userId = await requireUserId();
    const payload: Record<string, string> = {};
    if (values.displayName !== undefined) payload.display_name = sanitizePlainText(values.displayName, 60);
    if (values.username !== undefined) payload.username = validateUsername(values.username);
    if (values.bio !== undefined) payload.bio = sanitizePlainText(values.bio, 240);
    if (values.countryCode !== undefined) payload.country_code = values.countryCode.toUpperCase().slice(0, 2);
    const { data, error } = await getSupabase().from('profiles').update(payload).eq('id', userId).select('*').single();
    if (error) throw error;
    return data as ProfileRecord;
  },

  async updatePreferences(values: Partial<Omit<PreferencesRecord, 'user_id'>>) {
    const userId = await requireUserId();
    const { data, error } = await getSupabase().from('user_preferences').update(values).eq('user_id', userId).select('*').single();
    if (error) throw error;
    return data as PreferencesRecord;
  },

  async setProviderSelection(providerId: ProviderId, selected: boolean) {
    const userId = await requireUserId();
    if (!selected) {
      const { error } = await getSupabase().from('provider_connections').delete().eq('user_id', userId).eq('provider_key', providerId);
      if (error) throw error;
      return;
    }
    const selection = getStreamingProviderAdapter(providerId).selectManually();
    const { error } = await getSupabase().from('provider_connections').upsert({
      user_id: userId,
      provider_key: providerId,
      connection_type: selection.connectionType,
      status: selection.status,
      connected_at: selection.connectedAt,
    }, { onConflict: 'user_id,provider_key' });
    if (error) throw error;
  },

  async getProviderSelections() {
    const userId = await requireUserId();
    const { data, error } = await getSupabase().from('provider_connections').select('provider_key').eq('user_id', userId).eq('status', 'selected');
    if (error) throw error;
    return (data ?? []).map((row) => row.provider_key as ProviderId);
  },

  async getPreferredGenres() {
    const userId = await requireUserId();
    const { data, error } = await getSupabase().from('user_genres').select('genres(name)').eq('user_id', userId);
    if (error) throw error;
    return (data ?? []).flatMap((row) => {
      const genre = row.genres as unknown as { name?: string } | null;
      return genre?.name ? [genre.name] : [];
    });
  },

  async getStats() {
    const { data, error } = await getSupabase().rpc('get_my_profile_stats');
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return (row ?? { watched: 0, reviews: 0, friends: 0, saved: 0 }) as { watched: number; reviews: number; friends: number; saved: number };
  },

  subscribe(userId: string, onChange: () => void) {
    const channel = getSupabase().channel(`profile-state:${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_preferences', filter: `user_id=eq.${userId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'provider_connections', filter: `user_id=eq.${userId}` }, onChange)
      .subscribe();
    return () => { void getSupabase().removeChannel(channel); };
  },
};
