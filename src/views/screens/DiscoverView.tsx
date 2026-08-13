import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ClipFinderController } from '../../controllers/ClipFinderController';
import { catalogue } from '../../models/catalogue';
import { ContentItem } from '../../models/types';
import { Pill, SwipeDeck } from '../components/ui';
import { PageTitle } from '../layout/AppNavigation';
import { colors } from '../styles/theme';
import { mainStyles as styles } from '../styles/mainStyles';

export function DiscoverScreen({ onOpen, liked, saved, onLiked, onSaved }: { onOpen: (item: ContentItem) => void; liked: string[]; saved: string[]; onLiked: (id: string) => void; onSaved: (id: string) => void }) {
  const [mode, setMode] = useState<'recommendations' | 'identify'>('recommendations');
  const [filter, setFilter] = useState('Todo');
  const [index, setIndex] = useState(0);
  const [notice, setNotice] = useState('');
  const filters = ['Todo', 'Películas', 'Series', 'Anime'];
  const filtered = catalogue.filter((item) => filter === 'Todo' || (filter === 'Películas' && item.type === 'Película') || (filter === 'Series' && item.type === 'Serie') || (filter === 'Anime' && item.type === 'Anime'));
  const item = filtered[index % filtered.length];
  const nextItem = filtered[(index + 1) % filtered.length];

  useEffect(() => setIndex(0), [filter]);

  const handleAction = (action: 'pass' | 'like' | 'save', current: ContentItem) => {
    if (action === 'like') { onLiked(current.id); setNotice(liked.includes(current.id) ? 'Ya estaba en tus favoritas' : 'Añadida a tus favoritas'); }
    else if (action === 'save') { onSaved(current.id); setNotice(saved.includes(current.id) ? 'Ya estaba guardada' : 'Guardada para después'); }
    else setNotice('Entendido, verás menos títulos así');
    setIndex((value) => value + 1);
    setTimeout(() => setNotice(''), 1800);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.discoverContent} showsVerticalScrollIndicator={false}>
      <View style={styles.discoverHeader}>
        <PageTitle eyebrow="DESCUBRE SIN PERDER TIEMPO" title={mode === 'recommendations' ? 'Desliza y afina tu gusto' : 'Encuentra una historia desde un clip'} description={mode === 'recommendations' ? 'Izquierda para pasar, arriba para guardar y derecha para decir que te gusta.' : 'Pega un reel, TikTok, publicación de X o sube un fragmento para identificar el título y dónde verlo.'} />
        {mode === 'recommendations' && <View style={styles.discoverCounter}><Text style={styles.discoverCounterValue}>{liked.length + saved.length}</Text><Text style={styles.discoverCounterLabel}>señales hoy</Text></View>}
      </View>
      <View style={styles.discoverModeTabs}>
        <Pressable onPress={() => setMode('recommendations')} style={[styles.discoverModeTab, mode === 'recommendations' && styles.discoverModeTabActive]}><Feather name="layers" size={16} color={mode === 'recommendations' ? colors.ink : colors.textMuted} /><Text style={[styles.discoverModeText, mode === 'recommendations' && styles.discoverModeTextActive]}>Recomendaciones</Text></Pressable>
        <Pressable onPress={() => setMode('identify')} style={[styles.discoverModeTab, mode === 'identify' && styles.discoverModeTabActive]}><Feather name="video" size={16} color={mode === 'identify' ? colors.ink : colors.textMuted} /><Text style={[styles.discoverModeText, mode === 'identify' && styles.discoverModeTextActive]}>Buscar por clip o enlace</Text><View style={styles.newBadge}><Text style={styles.newBadgeText}>NUEVO</Text></View></Pressable>
      </View>
      {mode === 'recommendations' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>{filters.map((value) => <Pill key={value} label={value} active={filter === value} onPress={() => setFilter(value)} />)}</ScrollView>
          <View style={styles.deckArea}>
            <SwipeDeck key={`${filter}-${item.id}`} item={item} nextItem={nextItem} onAction={handleAction} onOpen={onOpen} />
          </View>
          <View style={styles.gestureLegend}>
            <View style={styles.legendItem}><Feather name="arrow-left" size={14} color={colors.coral} /><Text style={styles.legendText}>Pasar</Text></View>
            <View style={styles.legendItem}><Feather name="arrow-up" size={14} color={colors.blue} /><Text style={styles.legendText}>Guardar</Text></View>
            <View style={styles.legendItem}><Feather name="arrow-right" size={14} color={colors.lime} /><Text style={styles.legendText}>Me gusta</Text></View>
          </View>
        </>
      ) : <ClipFinderController onOpen={onOpen} />}
      {!!notice && <View style={styles.toast}><Feather name="check-circle" size={17} color={colors.lime} /><Text style={styles.toastText}>{notice}</Text></View>}
    </ScrollView>
  );
}
