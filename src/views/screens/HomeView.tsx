import React from 'react';
import { ImageBackground, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { catalogue } from '../../models/catalogue';
import { ContentItem } from '../../models/types';
import { Avatar, Button, MiniPoster, ProviderBadge, SectionTitle, Stat } from '../components/ui';
import { PageTitle } from '../layout/AppNavigation';
import { colors } from '../styles/theme';
import { mainStyles as styles } from '../styles/mainStyles';

export function HomeScreen({ name, wide, onDiscover, onFriends, onOpen }: { name: string; wide: boolean; onDiscover: () => void; onFriends: () => void; onOpen: (item: ContentItem) => void }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <PageTitle eyebrow="TU NOCHE, MEJOR ELEGIDA" title={`Hola, ${name}. ¿Qué vemos hoy?`} description="Afinamos estas sugerencias con tu actividad, tus reseñas y lo que está disponible en México." />
      <View style={[styles.homeHero, wide && styles.homeHeroWide]}>
        <ImageBackground source={catalogue[0].image} style={styles.homeHeroImage} imageStyle={styles.homeHeroRadius}>
          <LinearGradient colors={wide ? ['rgba(7,10,18,0.97)', 'rgba(7,10,18,0.62)', 'rgba(7,10,18,0.1)'] : ['rgba(7,10,18,0.18)', 'rgba(7,10,18,0.98)']} start={{ x: 0, y: 0 }} end={{ x: wide ? 1 : 0, y: 1 }} style={styles.homeHeroGradient}>
            <View style={styles.heroInfo}>
              <View style={styles.heroBadges}><Text style={styles.heroMatch}>96% PARA TI</Text><Text style={styles.heroPremiere}>ESTRENO</Text></View>
              <Text style={styles.heroTitle}>Señal nocturna</Text>
              <Text style={styles.heroSubtitle}>Una llamada. Dos épocas. Ninguna salida.</Text>
              <View style={styles.heroMeta}><Text style={styles.heroMetaText}>2025</Text><Text style={styles.heroMetaText}>1 h 58 min</Text><Text style={styles.heroMetaText}>16+</Text><ProviderBadge id="netflix" compact /></View>
              <Text numberOfLines={3} style={styles.heroSynopsis}>{catalogue[0].synopsis}</Text>
              <View style={styles.heroActions}><Button label="Ver detalles" icon="play" onPress={() => onOpen(catalogue[0])} style={styles.heroPrimary} /><Button label="Descubrir más" icon="compass" variant="secondary" onPress={onDiscover} style={styles.heroSecondary} /></View>
              <View style={styles.friendSignal}><View style={styles.avatarPile}><Avatar initials="SR" size={26} color="#9B7EDE" /><View style={styles.piledAvatar}><Avatar initials="MG" size={26} color="#3BA99C" /></View></View><Text style={styles.friendSignalText}>A Sofía y Mateo también les gustó</Text></View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>

      <View style={[styles.dashboardGrid, wide && styles.dashboardGridWide]}>
        <View style={[styles.dashboardMain, wide && styles.dashboardMainWide]}>
          <SectionTitle eyebrow="SELECCIÓN PERSONAL" title="También podrían gustarte" action="Ir al mazo" onAction={onDiscover} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRow}>{catalogue.slice(1).map((item) => <MiniPoster key={item.id} item={item} onPress={() => onOpen(item)} />)}</ScrollView>
        </View>
        <View style={[styles.dashboardSide, wide && styles.dashboardSideWide]}>
          <SectionTitle eyebrow="MODO EN PAREJA" title="Vean juntos" />
          <View style={styles.watchTogetherCard}>
            <View style={styles.watchTogetherTop}><View style={styles.roomIcon}><Feather name="radio" size={22} color={colors.lime} /></View><View style={styles.livePill}><View style={styles.liveSmall} /><Text style={styles.liveText}>SINCRONIZADO</Text></View></View>
            <Text style={styles.watchTogetherTitle}>Una sala, dos cuentas</Text>
            <Text style={styles.watchTogetherText}>Invita a alguien, abre el título en sus plataformas y mantén pausa, reproducción y avance en el mismo momento.</Text>
            <View style={styles.watchPeople}><Avatar initials="TÚ" size={38} color="#5E4EA1" online /><View style={styles.watchLine} /><View style={styles.addPerson}><Feather name="plus" size={18} color={colors.textMuted} /></View></View>
            <Button label="Crear una sala" icon="users" onPress={onFriends} />
          </View>
        </View>
      </View>

      <View style={styles.insightCard}>
        <View style={styles.insightIcon}><Feather name="trending-up" size={22} color={colors.ink} /></View>
        <View style={styles.insightCopy}><Text style={styles.insightTitle}>Tu gusto esta semana</Text><Text style={styles.insightText}>Elegiste historias de misterio un 38% más que el mes pasado. Las recomendaciones ya se ajustaron.</Text></View>
        <View style={styles.insightStats}><Stat value="12" label="vistas" /><View style={styles.statDivider} /><Stat value="4.6" label="promedio" /><View style={styles.statDivider} /><Stat value="8" label="reseñas" /></View>
      </View>
    </ScrollView>
  );
}
