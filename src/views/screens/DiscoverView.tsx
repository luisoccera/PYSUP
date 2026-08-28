import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ClipFinderController } from '../../controllers/ClipFinderController';
import { ContentItem } from '../../models/types';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { Pill, SwipeDeck } from '../components/ui';
import { PageTitle } from '../layout/AppNavigation';
import { colors } from '../styles/theme';
import { mainStyles as styles } from '../styles/mainStyles';

export function DiscoverScreen({ country, wifiOnly, items, onOpen, liked, saved, onAction }: { country: string; wifiOnly: boolean; items: ContentItem[]; onOpen: (item: ContentItem) => void; liked: string[]; saved: string[]; onAction: (action: 'pass' | 'like' | 'save', id: string) => void }) {
  const responsive = useResponsiveLayout();
  const [mode, setMode] = useState<'recommendations' | 'identify'>('recommendations');
  const [filter, setFilter] = useState('Todo');
  const [index, setIndex] = useState(0);
  const [notice, setNotice] = useState('');
  const filters = ['Todo', 'Películas', 'Series', 'Anime'];
  const filtered = items.filter((item) => filter === 'Todo' || (filter === 'Películas' && item.type === 'Película') || (filter === 'Series' && item.type === 'Serie') || (filter === 'Anime' && item.type === 'Anime'));
  const item = filtered[index % filtered.length];
  const nextItem = filtered[(index + 1) % filtered.length];

  useEffect(() => setIndex(0), [filter]);

  const handleAction = (action: 'pass' | 'like' | 'save', current: ContentItem) => {
    if (action === 'like') setNotice(liked.includes(current.id) ? 'Quitada de tus favoritas' : 'Añadida a tus favoritas');
    else if (action === 'save') setNotice(saved.includes(current.id) ? 'Quitada de guardadas' : 'Guardada para después');
    else setNotice('Entendido, verás menos títulos así');
    onAction(action, current.id);
    setIndex((value) => value + 1);
    setTimeout(() => setNotice(''), 1800);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.discoverContent, responsive.isPhone && styles.screenContentPhone, responsive.isTablet && styles.screenContentTablet, { paddingHorizontal: responsive.gutter, paddingTop: responsive.contentTop }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.discoverHeader, responsive.isPhone && styles.discoverHeaderPhone]}>
        <PageTitle eyebrow="DESCUBRE SIN PERDER TIEMPO" title={mode === 'recommendations' ? 'Desliza y afina tu gusto' : 'Encuentra una historia desde un clip'} description={mode === 'recommendations' ? 'Izquierda para pasar, arriba para guardar y derecha para decir que te gusta.' : 'Pega un reel, TikTok, publicación de X o sube un fragmento para identificar el título y dónde verlo.'} />
        {mode === 'recommendations' && <View style={styles.discoverCounter}><Text style={styles.discoverCounterValue}>{liked.length + saved.length}</Text><Text style={styles.discoverCounterLabel}>señales hoy</Text></View>}
      </View>
      <View style={[styles.discoverModeTabs, responsive.isPhone && styles.discoverModeTabsPhone]}>
        <Pressable onPress={() => setMode('recommendations')} style={[styles.discoverModeTab, responsive.isPhone && styles.discoverModeTabPhone, mode === 'recommendations' && styles.discoverModeTabActive]}><Feather name="layers" size={16} color={mode === 'recommendations' ? colors.ink : colors.textMuted} /><Text numberOfLines={1} style={[styles.discoverModeText, mode === 'recommendations' && styles.discoverModeTextActive]}>Recomendaciones</Text></Pressable>
        <Pressable onPress={() => setMode('identify')} style={[styles.discoverModeTab, responsive.isPhone && styles.discoverModeTabPhone, mode === 'identify' && styles.discoverModeTabActive]}><Feather name="video" size={16} color={mode === 'identify' ? colors.ink : colors.textMuted} /><Text numberOfLines={1} style={[styles.discoverModeText, mode === 'identify' && styles.discoverModeTextActive]}>Buscar por clip</Text><View style={styles.newBadge}><Text style={styles.newBadgeText}>NUEVO</Text></View></Pressable>
      </View>
      {mode === 'recommendations' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>{filters.map((value) => <Pill key={value} label={value} active={filter === value} onPress={() => setFilter(value)} />)}</ScrollView>
          {item ? <View style={styles.deckArea}>
            <SwipeDeck key={`${filter}-${item.id}`} item={item} nextItem={nextItem} onAction={handleAction} onOpen={onOpen} />
          </View> : <View style={styles.emptyState}><Feather name="compass" size={30} color={colors.textDim} /><Text style={styles.emptyTitle}>No hay más recomendaciones</Text><Text style={styles.emptyText}>Cambia el filtro o vuelve cuando el catálogo de tu país se actualice.</Text></View>}
          <View style={styles.gestureLegend}>
            <View style={styles.legendItem}><Feather name="arrow-left" size={14} color={colors.coral} /><Text style={styles.legendText}>Pasar</Text></View>
            <View style={styles.legendItem}><Feather name="arrow-up" size={14} color={colors.blue} /><Text style={styles.legendText}>Guardar</Text></View>
            <View style={styles.legendItem}><Feather name="arrow-right" size={14} color={colors.lime} /><Text style={styles.legendText}>Me gusta</Text></View>
          </View>
        </>
      ) : <ClipFinderController country={country} wifiOnly={wifiOnly} onOpen={onOpen} />}
      {!!notice && <View style={styles.toast}><Feather name="check-circle" size={17} color={colors.lime} /><Text style={styles.toastText}>{notice}</Text></View>}
    </ScrollView>
  );
}
