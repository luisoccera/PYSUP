import React, { useEffect, useState } from 'react';
import { ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { countries } from '../../models/catalogue';
import { ContentItem, Review } from '../../models/types';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { Avatar, Button, IconButton, MiniPoster, SectionTitle, Stat } from '../components/ui';
import { colors } from '../styles/theme';
import { mainStyles as styles } from '../styles/mainStyles';

export function Stars({ value, onChange, size = 20 }: { value: number; onChange?: (value: number) => void; size?: number }) {
  return <View style={styles.stars}>{[1, 2, 3, 4, 5].map((star) => <Pressable key={star} accessibilityRole={onChange ? 'button' : undefined} accessibilityLabel={onChange ? `${star} estrellas` : undefined} disabled={!onChange} onPress={() => onChange?.(star)} hitSlop={5}><Feather name="star" size={size} color={star <= value ? colors.yellow : colors.textDim} /></Pressable>)}</View>;
}

export function ProfileScreen({ name, username, bio: initialBio, avatarUrl, coverUrl, stats, hideSpoilers, country, items, reviews, saved, onOpen, onEdit, onChangeAvatar, onRemoveAvatar, onChangeCover, onRemoveCover }: { name: string; username: string; bio: string; avatarUrl: string | null; coverUrl: string | null; stats: { watched: number; reviews: number; friends: number; saved: number }; hideSpoilers: boolean; country: string; items: ContentItem[]; reviews: Review[]; saved: string[]; onOpen: (item: ContentItem) => void; onEdit: (name: string, bio: string, username: string) => Promise<void>; onChangeAvatar: () => void; onRemoveAvatar: () => void; onChangeCover: () => void; onRemoveCover: () => void }) {
  const responsive = useResponsiveLayout();
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftUsername, setDraftUsername] = useState(username);
  const [bio, setBio] = useState(initialBio);
  const [revealedReviews, setRevealedReviews] = useState<string[]>([]);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');
  useEffect(() => setBio(initialBio), [initialBio]);
  const saveProfile = async () => {
    if (editBusy) return;
    setEditBusy(true); setEditError('');
    try { await onEdit(draftName.trim() || name, bio, draftUsername); setEditOpen(false); }
    catch (error) { setEditError(error instanceof Error ? error.message : 'No se pudo guardar el perfil.'); }
    finally { setEditBusy(false); }
  };
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.screenContent, responsive.isPhone && styles.screenContentPhone, responsive.isTablet && styles.screenContentTablet, { paddingHorizontal: responsive.gutter, paddingTop: responsive.contentTop }]} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHero}>
        <View style={styles.cover}>
          {coverUrl ? <ImageBackground source={{ uri: coverUrl }} style={StyleSheet.absoluteFill} resizeMode="cover"><LinearGradient colors={['rgba(7,10,18,0.05)', 'rgba(7,10,18,0.75)']} style={StyleSheet.absoluteFill} /></ImageBackground> : <LinearGradient colors={['#4D3F72', '#1B2A41', colors.inkSoft]} style={StyleSheet.absoluteFill}><View style={styles.coverOrbOne} /><View style={styles.coverOrbTwo} /></LinearGradient>}
          <Button label="Editar perfil" icon="edit-2" variant="secondary" compact onPress={() => { setDraftName(name); setDraftUsername(username); setBio(initialBio); setEditError(''); setEditOpen(true); }} style={styles.editProfileButton} />
        </View>
        <View style={[styles.profileIdentity, responsive.isPhone && styles.profileIdentityPhone]}>
          <View style={styles.profileAvatar}><Avatar initials={name.slice(0, 2).toUpperCase()} uri={avatarUrl} size={96} color="#5E4EA1" online /></View>
          <View style={[styles.profileCopy, responsive.isPhone && styles.profileCopyPhone]}><Text style={styles.profileName}>{name}</Text><Text style={styles.profileHandle}>@{username} · {countries.find((item) => item.code === country)?.name ?? country}</Text><Text style={styles.profileBio}>{bio || 'Aún no has escrito una biografía.'}</Text></View>
          <View style={[styles.profileStats, responsive.isPhone && styles.profileStatsPhone]}><Stat value={`${stats.saved || saved.length}`} label="guardadas" /><View style={styles.statDivider} /><Stat value={`${stats.reviews || reviews.length}`} label="reseñas" /><View style={styles.statDivider} /><Stat value={`${stats.friends}`} label="amigos" /></View>
        </View>
      </View>

      <View style={styles.profileGrid}>
        <View style={[styles.profileMain, styles.profileMainFull]}>
          <SectionTitle eyebrow="TU VOZ" title="Reseñas recientes" />
          <View style={styles.reviewsList}>{reviews.map((review) => { const content = items.find((item) => item.id === review.contentId); if (!content) return null; return (
            <Pressable key={review.id} onPress={() => onOpen(content)} style={[styles.reviewCard, responsive.isCompactPhone && styles.reviewCardCompactPhone]}>
              <ImageBackground source={content.image} style={styles.reviewPoster} imageStyle={styles.reviewPosterRadius}><LinearGradient colors={['transparent', 'rgba(7,10,18,0.7)']} style={StyleSheet.absoluteFill} /></ImageBackground>
              <View style={styles.reviewContent}><View style={styles.reviewTop}><View><Text style={styles.reviewTitle}>{content.title}</Text><Text style={styles.reviewDate}>{review.date}</Text></View><Stars value={review.rating} /></View>{review.containsSpoilers && hideSpoilers && !revealedReviews.includes(review.id) ? <Pressable onPress={() => setRevealedReviews((current) => [...current, review.id])}><Text style={styles.reviewText}>⚠ Reseña con spoilers · Toca para revelar</Text></Pressable> : <Text numberOfLines={3} style={styles.reviewText}>{review.text}</Text>}<View style={styles.reviewLikes}><Feather name="heart" size={13} color={colors.textMuted} /><Text style={styles.reviewLikesText}>{review.likes} personas encontraron útil esta reseña</Text></View></View>
            </Pressable>
          ); })}</View>
          <SectionTitle eyebrow="TU LISTA" title="Guardadas para después" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRow}>{items.filter((item) => saved.includes(item.id)).slice(0, 4).map((item) => <MiniPoster key={item.id} item={item} onPress={() => onOpen(item)} width={158} />)}</ScrollView>
        </View>
      </View>

      <Modal transparent visible={editOpen} animationType="fade" onRequestClose={() => setEditOpen(false)}><View style={[styles.modalBackdrop, responsive.isPhone && styles.modalBackdropPhone]}><View style={[styles.composeModal, responsive.isPhone && styles.composeModalPhone]}>
        <View style={styles.modalHeader}><View><Text style={styles.modalEyebrow}>PERFIL PÚBLICO</Text><Text style={styles.modalTitle}>Edita tu presentación</Text></View><IconButton icon="x" label="Cerrar" onPress={() => setEditOpen(false)} /></View>
        <View style={styles.editAvatarRow}><Avatar initials={draftName.slice(0, 2).toUpperCase()} uri={avatarUrl} size={72} color="#5E4EA1" /><View><Button label="Cambiar foto" icon="camera" variant="secondary" compact onPress={onChangeAvatar} />{!!avatarUrl && <Button label="Quitar foto" icon="trash-2" variant="ghost" compact onPress={onRemoveAvatar} />}<Text style={styles.imageHint}>JPG o PNG · Máx. 5 MB</Text></View></View>
        <View style={styles.modalActions}><Button label="Cambiar portada" icon="image" variant="secondary" compact onPress={onChangeCover} style={styles.modalAction} />{!!coverUrl && <Button label="Quitar portada" icon="trash-2" variant="ghost" compact onPress={onRemoveCover} style={styles.modalAction} />}</View>
        <Text style={styles.inputLabel}>Nombre</Text><TextInput value={draftName} onChangeText={setDraftName} style={styles.modalInput} />
        <Text style={styles.inputLabel}>Nombre de usuario</Text><TextInput value={draftUsername} onChangeText={setDraftUsername} autoCapitalize="none" maxLength={24} style={styles.modalInput} />
        <Text style={styles.inputLabel}>Biografía</Text><TextInput value={bio} onChangeText={setBio} multiline maxLength={180} style={[styles.modalInput, styles.modalTextareaSmall]} />
        {!!editError && <Text accessibilityRole="alert" style={{ color: colors.coral }}>{editError}</Text>}
        <View style={styles.modalActions}><Button label="Cancelar" variant="ghost" disabled={editBusy} onPress={() => setEditOpen(false)} style={styles.modalAction} /><Button label={editBusy ? 'Guardando…' : 'Guardar cambios'} icon="check" disabled={editBusy || !/^[a-zA-Z0-9_]{3,24}$/.test(draftUsername)} onPress={() => { void saveProfile(); }} style={styles.modalAction} /></View>
      </View></View></Modal>
    </ScrollView>
  );
}
