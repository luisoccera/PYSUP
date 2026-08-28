import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { MAX_AVATAR_BYTES } from '../../utils/validation';
import { getSupabase, requireUserId } from '../supabase/client';

const BUCKET = 'profile-media';

export const avatarService = {
  async pickAndUpload() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('Necesitamos permiso para elegir una fotografía.');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled) return null;
    const selected = result.assets[0];
    if (selected.fileSize && selected.fileSize > MAX_AVATAR_BYTES) throw new Error('La imagen supera el límite de 5 MB.');

    const resized = await ImageManipulator.manipulateAsync(
      selected.uri,
      [{ resize: { width: 640, height: 640 } }],
      { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
    );
    const bytes = await fetch(resized.uri).then((response) => response.arrayBuffer());
    if (bytes.byteLength > MAX_AVATAR_BYTES) throw new Error('La imagen comprimida supera el límite de 5 MB.');

    const userId = await requireUserId();
    const { data: currentProfile } = await getSupabase().from('profiles').select('avatar_path').eq('id', userId).single();
    const previousPath = currentProfile?.avatar_path as string | null | undefined;
    const path = `${userId}/avatar-${Date.now()}.jpg`;
    const storage = getSupabase().storage.from(BUCKET);
    const { error: uploadError } = await storage.upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
    if (uploadError) throw uploadError;

    const { data, error } = await getSupabase().from('profiles').update({ avatar_path: path }).eq('id', userId).select('avatar_path').single();
    if (error) {
      await storage.remove([path]);
      throw error;
    }
    if (previousPath && previousPath !== path) await storage.remove([previousPath]);
    return data.avatar_path as string;
  },

  async pickAndUploadCover() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error('Necesitamos permiso para elegir una portada.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 5], quality: 0.9 });
    if (result.canceled) return null;
    const selected = result.assets[0];
    if (selected.fileSize && selected.fileSize > MAX_AVATAR_BYTES) throw new Error('La imagen supera el límite de 5 MB.');
    const resized = await ImageManipulator.manipulateAsync(selected.uri, [{ resize: { width: 1600 } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });
    const bytes = await fetch(resized.uri).then((response) => response.arrayBuffer());
    if (bytes.byteLength > MAX_AVATAR_BYTES) throw new Error('La portada comprimida supera el límite de 5 MB.');

    const userId = await requireUserId();
    const { data: currentProfile } = await getSupabase().from('profiles').select('cover_path').eq('id', userId).single();
    const previousPath = currentProfile?.cover_path as string | null | undefined;
    const path = `${userId}/cover-${Date.now()}.jpg`;
    const storage = getSupabase().storage.from(BUCKET);
    const { error: uploadError } = await storage.upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
    if (uploadError) throw uploadError;
    const { data, error } = await getSupabase().from('profiles').update({ cover_path: path }).eq('id', userId).select('cover_path').single();
    if (error) { await storage.remove([path]); throw error; }
    if (previousPath && previousPath !== path) await storage.remove([previousPath]);
    return data.cover_path as string;
  },

  async getSignedUrl(path: string | null, expiresIn = 3600) {
    if (!path) return null;
    const { data, error } = await getSupabase().storage.from(BUCKET).createSignedUrl(path, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  },

  async remove(path: string | null) {
    const userId = await requireUserId();
    if (path) {
      const { error } = await getSupabase().storage.from(BUCKET).remove([path]);
      if (error) throw error;
    }
    const { error } = await getSupabase().from('profiles').update({ avatar_path: null }).eq('id', userId);
    if (error) throw error;
  },

  async removeCover(path: string | null) {
    const userId = await requireUserId();
    if (path) {
      const { error } = await getSupabase().storage.from(BUCKET).remove([path]);
      if (error) throw error;
    }
    const { error } = await getSupabase().from('profiles').update({ cover_path: null }).eq('id', userId);
    if (error) throw error;
  },
};
