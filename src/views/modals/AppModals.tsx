import React, { useEffect, useState } from 'react';
import { ImageBackground, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppNotification, CommunityReview, ContentAvailability, ContentItem, Review } from '../../models/types';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { Button, IconButton, Pill, WatchOfferButton } from '../components/ui';
import { Stars } from '../screens/ProfileView';
import { colors } from '../styles/theme';
import { mainStyles as styles } from '../styles/mainStyles';

export function ContentModal({ item, visible, onClose, onReview, existingReview, onDeleteReview, communityReviews, currentUserId, onToggleCommunityReviewLike, hideSpoilers, isLiked, isSaved, onLike, onSave, availability, onOpenUrl, onOpenTrailer }: { item: ContentItem | null; visible: boolean; onClose: () => void; onReview: (review: Review) => void; existingReview: Review | null; onDeleteReview: (reviewId: string) => void; communityReviews: CommunityReview[]; currentUserId: string; onToggleCommunityReviewLike: (reviewId: string) => void; hideSpoilers: boolean; isLiked: boolean; isSaved: boolean; onLike: () => void; onSave: () => void; availability: ContentAvailability | null; onOpenUrl: (url: string) => void; onOpenTrailer: (url: string) => void }) {
  const responsive = useResponsiveLayout();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [revealedCommunityReviews, setRevealedCommunityReviews] = useState<string[]>([]);
  useEffect(() => {
    setRating(existingReview?.rating ?? 0);
    setText(existingReview?.text ?? '');
    setReviewing(false);
    setContainsSpoilers(Boolean(existingReview?.containsSpoilers));
    setRevealedCommunityReviews([]);
  }, [existingReview, item?.id]);
  if (!item) return null;
  const publish = () => {
    if (!rating || text.trim().length < 10) return;
    onReview({ id: existingReview?.id ?? `r-${Date.now()}`, contentId: item.id, rating, text: text.trim(), date: existingReview?.date ?? 'Ahora', likes: existingReview?.likes ?? 0, containsSpoilers });
    setText(''); setRating(0); setReviewing(false); setContainsSpoilers(false);
  };
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.detailBackdrop}><View style={[styles.detailModal, responsive.isPhone && styles.detailModalPhone]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <ImageBackground source={item.image} style={[styles.detailHero, responsive.isPhone && styles.detailHeroPhone]} imageStyle={styles.detailHeroRadius}>
            <LinearGradient colors={['rgba(7,10,18,0.12)', colors.panel]} style={[styles.detailGradient, responsive.isPhone && styles.detailGradientPhone]}>
              <View style={styles.detailClose}><IconButton icon="x" label="Cerrar" onPress={onClose} /></View>
              <View style={styles.detailHeroCopy}>{item.match > 0 && <Text style={styles.detailMatch}>{item.match}% PARA TI</Text>}<Text style={[styles.detailTitle, responsive.isPhone && styles.detailTitlePhone]}>{item.title}</Text><Text style={styles.detailSubtitle}>{item.subtitle}</Text></View>
            </LinearGradient>
          </ImageBackground>
          <View style={[styles.detailBody, responsive.isPhone && styles.detailBodyPhone]}>
            <View style={styles.detailMeta}><Text style={styles.detailMetaText}>{item.type}</Text><Text style={styles.detailMetaText}>{item.year}</Text><Text style={styles.detailMetaText}>{item.duration}</Text><Text style={styles.detailMetaText}>{item.maturity}</Text><View style={styles.detailScore}><Feather name="star" size={14} color={colors.yellow} /><Text style={styles.detailMetaText}>{item.score}</Text></View></View>
            <View style={styles.genreRow}>{item.genres.map((genre) => <Pill key={genre} label={genre} />)}</View>
            <Text style={styles.detailSynopsis}>{item.synopsis}</Text>
            {!!item.reason && <View style={styles.reasonCard}><View style={styles.reasonIcon}><Feather name="zap" size={18} color={colors.ink} /></View><View style={styles.reasonCopy}><Text style={styles.reasonTitle}>Por qué te la recomendamos</Text><Text style={styles.reasonText}>{item.reason}</Text></View></View>}
            {availability && <View style={styles.detailAvailability}>
              <View style={styles.watchNowHeader}><View><Text style={styles.watchNowTitle}>Dónde verla</Text><Text style={styles.watchNowSubtitle}>Abre el servicio oficial para reproducir, rentar o comprar.</Text></View><Button label="Tráiler" icon="play-circle" compact variant="ghost" disabled={!availability.trailerUrl} onPress={() => onOpenTrailer(availability.trailerUrl)} /></View>
              {availability.offers.length > 0
                ? <View style={styles.watchOfferGrid}>{availability.offers.map((offer) => <WatchOfferButton key={`${offer.platformId}-${offer.access}`} offer={offer} onPress={() => onOpenUrl(offer.url)} />)}</View>
                : <Text style={styles.noAvailabilityText}>Este título no aparece disponible en el país configurado.</Text>}
              <Text style={styles.availabilityNote}>Confirma el precio y la disponibilidad en tu país antes de continuar.</Text>
            </View>}
            <View style={[styles.detailActions, responsive.isPhone && styles.detailActionsPhone]}><Button label={isLiked ? 'En favoritas' : 'Me gusta'} icon="heart" onPress={onLike} style={styles.detailAction} /><Button label={isSaved ? 'Guardada' : 'Guardar'} icon="bookmark" variant="secondary" onPress={onSave} style={styles.detailAction} /></View>
            <View style={styles.reviewComposer}>
              <View style={styles.reviewComposerTop}><View><Text style={styles.reviewComposerTitle}>¿Ya la viste?</Text><Text style={styles.reviewComposerSub}>Tu opinión mejora tus recomendaciones.</Text></View>{!reviewing && <Button label={existingReview ? 'Editar reseña' : 'Escribir reseña'} icon="edit-3" compact variant="ghost" onPress={() => setReviewing(true)} />}</View>
              {reviewing && <View style={styles.reviewForm}><Text style={styles.inputLabel}>Tu calificación</Text><Stars value={rating} onChange={setRating} size={28} /><TextInput value={text} onChangeText={setText} multiline placeholder="Cuenta qué te gustó o qué no funcionó." placeholderTextColor={colors.textDim} style={[styles.modalInput, styles.modalTextarea]} /><Pressable onPress={() => setContainsSpoilers((current) => !current)} style={styles.topicMetric}><Feather name={containsSpoilers ? 'check-square' : 'square'} size={16} color={containsSpoilers ? colors.lime : colors.textMuted} /><Text style={styles.topicMetricText}>Esta reseña contiene spoilers</Text></Pressable><View style={styles.modalActions}>{existingReview && <Button label="Eliminar" variant="danger" onPress={() => { onDeleteReview(existingReview.id); setReviewing(false); }} style={styles.modalAction} />}<Button label="Cancelar" variant="ghost" onPress={() => setReviewing(false)} style={styles.modalAction} /><Button label={existingReview ? 'Guardar cambios' : 'Publicar reseña'} icon="send" disabled={!rating || text.trim().length < 10} onPress={publish} style={styles.modalAction} /></View></View>}
            </View>
            {!!communityReviews.length && <View style={styles.reviewComposer}><View style={styles.reviewComposerTop}><Text style={styles.reviewComposerTitle}>Reseñas de la comunidad</Text><Text style={styles.detailMetaText}>{(communityReviews.reduce((sum, review) => sum + review.rating, 0) / communityReviews.length).toFixed(1)} / 5 · {communityReviews.length}</Text></View>{communityReviews.map((review) => { const hidden = review.contains_spoilers && hideSpoilers && !revealedCommunityReviews.includes(review.id); return <View key={review.id} style={styles.topicDetailReply}><View style={styles.reviewTop}><View><Text style={styles.topicDetailReplyLabel}>{review.author?.display_name ?? 'Miembro de PYSUP'} · @{review.author?.username ?? 'pysup'}</Text><Text style={styles.reviewDate}>{new Date(review.created_at).toLocaleDateString()}</Text></View><Stars value={review.rating} /></View>{hidden ? <Pressable onPress={() => setRevealedCommunityReviews((current) => [...current, review.id])}><Text style={styles.topicDetailReplyText}>⚠ Reseña con spoilers · Toca para revelar</Text></Pressable> : <Text style={styles.topicDetailReplyText}>{review.body}</Text>}<Button label={review.user_id === currentUserId ? `${review.like_count} personas la encontraron útil` : `${review.like_count} · ${review.my_like ? 'Te pareció útil' : 'Marcar como útil'}`} icon="heart" compact variant="ghost" disabled={review.user_id === currentUserId} onPress={() => onToggleCommunityReviewLike(review.id)} /></View>; })}</View>}
          </View>
        </ScrollView>
      </View></View>
    </Modal>
  );
}

export function NotificationsModal({ visible, notifications, unreadIds, onSelect, onClose }: { visible: boolean; notifications: AppNotification[]; unreadIds: string[]; onSelect: (notification: AppNotification) => void; onClose: () => void }) {
  const responsive = useResponsiveLayout();
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}><Pressable onPress={onClose} style={[styles.notificationBackdrop, responsive.isPhone && styles.notificationBackdropPhone]}><Pressable onPress={(event) => event.stopPropagation()} style={styles.notificationPanel}><View style={styles.notificationHeader}><View><Text style={styles.notificationTitle}>Notificaciones</Text><Text style={styles.notificationSubtitle}>{unreadIds.length ? `${unreadIds.length} ${unreadIds.length === 1 ? 'pendiente' : 'pendientes'}` : 'Todo al día'}</Text></View><IconButton icon="x" label="Cerrar" onPress={onClose} /></View><ScrollView style={styles.notificationList} showsVerticalScrollIndicator={false}>{notifications.map((item) => { const unread = unreadIds.includes(item.id); return <Pressable accessibilityRole="button" accessibilityLabel={`Abrir notificación: ${item.title}`} key={item.id} onPress={() => onSelect(item)} style={({ pressed }) => [styles.notificationRow, !unread && styles.notificationRowRead, pressed && styles.cardPressed]}><View style={[styles.notificationIcon, { backgroundColor: item.color }]}><Feather name={item.icon} size={17} color={colors.ink} /></View><View style={styles.notificationCopy}><Text style={styles.notificationItemTitle}>{item.title}</Text><Text style={styles.notificationItemText}>{item.text}</Text></View>{unread ? <View style={styles.unreadDot} /> : <Feather name="check" size={14} color={colors.success} />}<Feather name="chevron-right" size={16} color={colors.textDim} /></Pressable>; })}</ScrollView></Pressable></Pressable></Modal>;
}
