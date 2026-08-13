import React, { useState } from 'react';
import { ImageBackground, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppNotification, ContentItem, Review } from '../../models/types';
import { Button, IconButton, Pill, ProviderBadge } from '../components/ui';
import { Stars } from '../screens/ProfileView';
import { colors } from '../styles/theme';
import { mainStyles as styles } from '../styles/mainStyles';

export function ContentModal({ item, visible, onClose, onReview, isLiked, isSaved, onLike, onSave }: { item: ContentItem | null; visible: boolean; onClose: () => void; onReview: (review: Review) => void; isLiked: boolean; isSaved: boolean; onLike: () => void; onSave: () => void }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [reviewing, setReviewing] = useState(false);
  if (!item) return null;
  const publish = () => {
    if (!rating || text.trim().length < 10) return;
    onReview({ id: `r-${Date.now()}`, contentId: item.id, rating, text: text.trim(), date: 'Ahora', likes: 0 });
    setText(''); setRating(0); setReviewing(false);
  };
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.detailBackdrop}><View style={styles.detailModal}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <ImageBackground source={item.image} style={styles.detailHero} imageStyle={styles.detailHeroRadius}>
            <LinearGradient colors={['rgba(7,10,18,0.12)', colors.panel]} style={styles.detailGradient}>
              <View style={styles.detailClose}><IconButton icon="x" label="Cerrar" onPress={onClose} /></View>
              <View style={styles.detailHeroCopy}><Text style={styles.detailMatch}>{item.match}% PARA TI</Text><Text style={styles.detailTitle}>{item.title}</Text><Text style={styles.detailSubtitle}>{item.subtitle}</Text></View>
            </LinearGradient>
          </ImageBackground>
          <View style={styles.detailBody}>
            <View style={styles.detailMeta}><Text style={styles.detailMetaText}>{item.type}</Text><Text style={styles.detailMetaText}>{item.year}</Text><Text style={styles.detailMetaText}>{item.duration}</Text><Text style={styles.detailMetaText}>{item.maturity}</Text><View style={styles.detailScore}><Feather name="star" size={14} color={colors.yellow} /><Text style={styles.detailMetaText}>{item.score}</Text></View></View>
            <View style={styles.genreRow}>{item.genres.map((genre) => <Pill key={genre} label={genre} />)}</View>
            <Text style={styles.detailSynopsis}>{item.synopsis}</Text>
            <View style={styles.reasonCard}><View style={styles.reasonIcon}><Feather name="zap" size={18} color={colors.ink} /></View><View style={styles.reasonCopy}><Text style={styles.reasonTitle}>Por qué te la recomendamos</Text><Text style={styles.reasonText}>{item.reason}</Text></View></View>
            <View style={styles.availableRow}><Text style={styles.availableLabel}>Disponible en</Text>{item.providers.map((id) => <ProviderBadge key={id} id={id} />)}</View>
            <View style={styles.detailActions}><Button label={isLiked ? 'En favoritas' : 'Me gusta'} icon="heart" onPress={onLike} style={styles.detailAction} /><Button label={isSaved ? 'Guardada' : 'Guardar'} icon="bookmark" variant="secondary" onPress={onSave} style={styles.detailAction} /></View>
            <View style={styles.reviewComposer}>
              <View style={styles.reviewComposerTop}><View><Text style={styles.reviewComposerTitle}>¿Ya la viste?</Text><Text style={styles.reviewComposerSub}>Tu opinión mejora tus recomendaciones.</Text></View>{!reviewing && <Button label="Escribir reseña" icon="edit-3" compact variant="ghost" onPress={() => setReviewing(true)} />}</View>
              {reviewing && <View style={styles.reviewForm}><Text style={styles.inputLabel}>Tu calificación</Text><Stars value={rating} onChange={setRating} size={28} /><TextInput value={text} onChangeText={setText} multiline placeholder="Cuenta qué te gustó o qué no funcionó. Puedes avisar si hay spoilers." placeholderTextColor={colors.textDim} style={[styles.modalInput, styles.modalTextarea]} /><View style={styles.modalActions}><Button label="Cancelar" variant="ghost" onPress={() => setReviewing(false)} style={styles.modalAction} /><Button label="Publicar reseña" icon="send" disabled={!rating || text.trim().length < 10} onPress={publish} style={styles.modalAction} /></View></View>}
            </View>
          </View>
        </ScrollView>
      </View></View>
    </Modal>
  );
}

export function NotificationsModal({ visible, notifications, unreadIds, onSelect, onClose }: { visible: boolean; notifications: AppNotification[]; unreadIds: string[]; onSelect: (notification: AppNotification) => void; onClose: () => void }) {
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}><Pressable onPress={onClose} style={styles.notificationBackdrop}><Pressable onPress={() => {}} style={styles.notificationPanel}><View style={styles.notificationHeader}><View><Text style={styles.notificationTitle}>Notificaciones</Text><Text style={styles.notificationSubtitle}>{unreadIds.length ? `${unreadIds.length} ${unreadIds.length === 1 ? 'pendiente' : 'pendientes'}` : 'Todo al día'}</Text></View><IconButton icon="x" label="Cerrar" onPress={onClose} /></View><ScrollView style={styles.notificationList} showsVerticalScrollIndicator={false}>{notifications.map((item) => { const unread = unreadIds.includes(item.id); return <Pressable accessibilityRole="button" accessibilityLabel={`Abrir notificación: ${item.title}`} key={item.id} onPress={() => onSelect(item)} style={({ pressed }) => [styles.notificationRow, !unread && styles.notificationRowRead, pressed && styles.cardPressed]}><View style={[styles.notificationIcon, { backgroundColor: item.color }]}><Feather name={item.icon} size={17} color={colors.ink} /></View><View style={styles.notificationCopy}><Text style={styles.notificationItemTitle}>{item.title}</Text><Text style={styles.notificationItemText}>{item.text}</Text></View>{unread ? <View style={styles.unreadDot} /> : <Feather name="check" size={14} color={colors.success} />}<Feather name="chevron-right" size={16} color={colors.textDim} /></Pressable>; })}</ScrollView></Pressable></Pressable></Modal>;
}
