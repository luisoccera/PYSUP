import React, { useState } from 'react';
import { ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { catalogue, countries } from '../../models/catalogue';
import { ContentItem, Review } from '../../models/types';
import { Avatar, Button, IconButton, MiniPoster, SectionTitle, Stat } from '../components/ui';
import { colors } from '../styles/theme';
import { mainStyles as styles } from '../styles/mainStyles';

export function Stars({ value, onChange, size = 20 }: { value: number; onChange?: (value: number) => void; size?: number }) {
  return <View style={styles.stars}>{[1, 2, 3, 4, 5].map((star) => <Pressable key={star} accessibilityRole={onChange ? 'button' : undefined} accessibilityLabel={onChange ? `${star} estrellas` : undefined} disabled={!onChange} onPress={() => onChange?.(star)} hitSlop={5}><Feather name="star" size={size} color={star <= value ? colors.yellow : colors.textDim} /></Pressable>)}</View>;
}

export function ProfileScreen({ name, country, reviews, liked, saved, onOpen, onEdit }: { name: string; country: string; reviews: Review[]; liked: string[]; saved: string[]; onOpen: (item: ContentItem) => void; onEdit: (name: string) => void }) {
  const [editOpen, setEditOpen] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [bio, setBio] = useState('Las mejores historias siempre dejan algo para discutir. Ciencia ficción, misterio y finales imposibles.');
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHero}>
        <LinearGradient colors={['#4D3F72', '#1B2A41', colors.inkSoft]} style={styles.cover}>
          <View style={styles.coverOrbOne} /><View style={styles.coverOrbTwo} />
          <Button label="Editar perfil" icon="edit-2" variant="secondary" compact onPress={() => { setDraftName(name); setEditOpen(true); }} style={styles.editProfileButton} />
        </LinearGradient>
        <View style={styles.profileIdentity}>
          <View style={styles.profileAvatar}><Avatar initials={name.slice(0, 2).toUpperCase()} size={96} color="#5E4EA1" online /></View>
          <View style={styles.profileCopy}><Text style={styles.profileName}>{name} Ortega</Text><Text style={styles.profileHandle}>@luisencuadro · {country} · {countries.find((item) => item.code === country)?.name}</Text><Text style={styles.profileBio}>{bio}</Text></View>
          <View style={styles.profileStats}><Stat value={`${liked.length + 38}`} label="favoritas" /><View style={styles.statDivider} /><Stat value={`${reviews.length}`} label="reseñas" /><View style={styles.statDivider} /><Stat value="12" label="amigos" /></View>
        </View>
      </View>

      <View style={styles.profileGrid}>
        <View style={[styles.profileMain, styles.profileMainFull]}>
          <SectionTitle eyebrow="TU VOZ" title="Reseñas recientes" />
          <View style={styles.reviewsList}>{reviews.map((review) => { const content = catalogue.find((item) => item.id === review.contentId)!; return (
            <Pressable key={review.id} onPress={() => onOpen(content)} style={styles.reviewCard}>
              <ImageBackground source={{ uri: content.image }} style={styles.reviewPoster} imageStyle={styles.reviewPosterRadius}><LinearGradient colors={['transparent', 'rgba(7,10,18,0.7)']} style={StyleSheet.absoluteFill} /></ImageBackground>
              <View style={styles.reviewContent}><View style={styles.reviewTop}><View><Text style={styles.reviewTitle}>{content.title}</Text><Text style={styles.reviewDate}>{review.date}</Text></View><Stars value={review.rating} /></View><Text numberOfLines={3} style={styles.reviewText}>{review.text}</Text><View style={styles.reviewLikes}><Feather name="heart" size={13} color={colors.textMuted} /><Text style={styles.reviewLikesText}>{review.likes} personas encontraron útil esta reseña</Text></View></View>
            </Pressable>
          ); })}</View>
          <SectionTitle eyebrow="TU LISTA" title="Guardadas para después" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRow}>{catalogue.filter((item) => saved.includes(item.id) || ['orbit-9', 'paper-gods'].includes(item.id)).slice(0, 4).map((item) => <MiniPoster key={item.id} item={item} onPress={() => onOpen(item)} width={158} />)}</ScrollView>
        </View>
      </View>

      <Modal transparent visible={editOpen} animationType="fade" onRequestClose={() => setEditOpen(false)}><View style={styles.modalBackdrop}><View style={styles.composeModal}>
        <View style={styles.modalHeader}><View><Text style={styles.modalEyebrow}>PERFIL PÚBLICO</Text><Text style={styles.modalTitle}>Edita tu presentación</Text></View><IconButton icon="x" label="Cerrar" onPress={() => setEditOpen(false)} /></View>
        <View style={styles.editAvatarRow}><Avatar initials={draftName.slice(0, 2).toUpperCase()} size={72} color="#5E4EA1" /><View><Button label="Cambiar foto" icon="camera" variant="secondary" compact onPress={() => {}} /><Text style={styles.imageHint}>JPG o PNG · Máx. 5 MB</Text></View></View>
        <Text style={styles.inputLabel}>Nombre</Text><TextInput value={draftName} onChangeText={setDraftName} style={styles.modalInput} />
        <Text style={styles.inputLabel}>Biografía</Text><TextInput value={bio} onChangeText={setBio} multiline maxLength={180} style={[styles.modalInput, styles.modalTextareaSmall]} />
        <View style={styles.modalActions}><Button label="Cancelar" variant="ghost" onPress={() => setEditOpen(false)} style={styles.modalAction} /><Button label="Guardar cambios" icon="check" onPress={() => { onEdit(draftName.trim() || name); setEditOpen(false); }} style={styles.modalAction} /></View>
      </View></View></Modal>
    </ScrollView>
  );
}
