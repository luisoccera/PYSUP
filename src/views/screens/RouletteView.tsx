import React, { useRef, useState } from 'react';
import { Animated, ImageBackground, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { RouletteControllerState } from '../../controllers/useRouletteController';
import { ContentItem } from '../../models/types';
import { Button, Pill, ProviderBadge } from '../components/ui';
import { PageTitle } from '../layout/AppNavigation';
import { colors } from '../styles/theme';
import { mainStyles as styles } from '../styles/mainStyles';

type RouletteScreenProps = {
  controller: RouletteControllerState;
  likedIds: string[];
  onLike: (id: string) => void;
  onOpen: (item: ContentItem) => void;
};

export function RouletteScreen({ controller, likedIds, onLike, onOpen }: RouletteScreenProps) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const wheelSize = Math.min(compact ? width - 52 : 400, 400);
  const rotation = useRef(new Animated.Value(0)).current;
  const [spinning, setSpinning] = useState(false);
  const result = controller.result;
  const wheelItems = controller.recommendations;
  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${1440 + controller.spinCount * 37}deg`] });

  const spin = () => {
    if (spinning || wheelItems.length < 2) return;
    setSpinning(true);
    rotation.setValue(0);
    Animated.timing(rotation, { toValue: 1, duration: 1450, useNativeDriver: false }).start(() => {
      controller.spin();
      setSpinning(false);
    });
  };

  if (!result) {
    return <View style={styles.emptyState}><Text style={styles.emptyTitle}>Aún no hay títulos disponibles en tu país.</Text></View>;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.rouletteContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.rouletteHeader, compact && styles.rouletteHeaderCompact]}>
        <PageTitle eyebrow="AZAR CON CRITERIO" title="La ruleta de las joyas ocultas" description="Usa lo que ya calificaste, guardaste y disfrutaste. La popularidad resta puntos: aquí ganan la afinidad y los títulos que casi nunca llegan a portada." />
        <View style={styles.antiViralBadge}><Feather name="trending-down" size={16} color={colors.lime} /><Text style={styles.antiViralText}>SIN RANKING VIRAL</Text></View>
      </View>

      <View style={[styles.rouletteLayout, compact && styles.rouletteLayoutCompact]}>
        <View style={styles.wheelColumn}>
          <View style={[styles.wheelFrame, { width: wheelSize, height: wheelSize }]}>
            <View style={styles.wheelPointer}><Feather name="chevron-down" size={24} color={colors.ink} /></View>
            <Animated.View style={[styles.rouletteWheel, { width: wheelSize, height: wheelSize, borderRadius: wheelSize / 2, transform: [{ rotate }] }]}>
              <View style={styles.wheelOrbitOne} />
              <View style={styles.wheelOrbitTwo} />
              {wheelItems.map((item, index) => {
                const angle = ((Math.PI * 2) / wheelItems.length) * index - (Math.PI / 2);
                const radius = (wheelSize / 2) - 49;
                const left = (wheelSize / 2) + Math.cos(angle) * radius - 31;
                const top = (wheelSize / 2) + Math.sin(angle) * radius - 31;
                const active = item.content.id === result.content.id;
                return <View key={item.content.id} style={[styles.wheelNode, { left, top }, active && styles.wheelNodeActive]}><Feather name={active ? 'star' : 'film'} size={17} color={active ? colors.ink : colors.text} /><Text numberOfLines={1} style={[styles.wheelNodeText, active && styles.wheelNodeTextActive]}>{item.content.title}</Text></View>;
              })}
            </Animated.View>
            <View style={styles.wheelHub}><Text style={styles.wheelHubMark}>P</Text><Text style={styles.wheelHubText}>PYSUP</Text></View>
          </View>
          <Button label={spinning ? 'Buscando fuera del radar…' : 'Girar la ruleta'} icon="refresh-cw" disabled={spinning || wheelItems.length < 2} onPress={spin} style={styles.spinButton} />
          <View style={styles.tasteProfile}><Text style={styles.tasteProfileLabel}>TU PERFIL AHORA</Text><View style={styles.tasteProfilePills}>{controller.tasteProfile.map((genre) => <Pill key={genre} label={genre} active />)}</View></View>
        </View>

        <View style={styles.rouletteResultCard}>
          <ImageBackground source={result.content.image} style={styles.rouletteResultImage} imageStyle={styles.rouletteResultImageRadius}>
            <LinearGradient colors={['rgba(7,10,18,0.08)', 'rgba(7,10,18,0.96)']} style={styles.rouletteResultGradient}>
              <View style={styles.hiddenGemPill}><Feather name="eye-off" size={13} color={colors.ink} /><Text style={styles.hiddenGemPillText}>{result.obscurity}% FUERA DEL RADAR</Text></View>
              <View><Text style={styles.rouletteMatch}>{result.affinity}% AFINIDAD REAL</Text><Text style={styles.rouletteResultTitle}>{result.content.title}</Text><Text style={styles.rouletteResultSubtitle}>{result.content.subtitle}</Text></View>
            </LinearGradient>
          </ImageBackground>
          <View style={styles.rouletteResultBody}>
            <View style={styles.rouletteMeta}><Text style={styles.rouletteMetaText}>{result.content.type}</Text><Text style={styles.rouletteMetaText}>{result.content.year}</Text><Text style={styles.rouletteMetaText}>{result.content.duration}</Text>{result.content.providers.map((provider) => <ProviderBadge key={provider} id={provider} compact />)}</View>
            <View style={styles.rouletteReason}><Feather name="compass" size={18} color={colors.lime} /><View style={styles.rouletteReasonCopy}><Text style={styles.rouletteReasonTitle}>Por qué encaja contigo</Text><Text style={styles.rouletteReasonText}>{result.content.reason}</Text></View></View>
            <View style={styles.rouletteReason}><Feather name="archive" size={18} color={colors.blue} /><View style={styles.rouletteReasonCopy}><Text style={styles.rouletteReasonTitle}>Por qué quedó olvidada</Text><Text style={styles.rouletteReasonText}>{result.whyForgotten}</Text></View></View>
            <Text style={styles.editorialSignal}>{result.editorialSignal}</Text>
            <View style={styles.rouletteActions}><Button label="Ver detalles" icon="play" onPress={() => onOpen(result.content)} style={styles.rouletteAction} /><Button label={likedIds.includes(result.content.id) ? 'Ya afinó tu perfil' : 'Más como esto'} icon="heart" variant="secondary" onPress={() => onLike(result.content.id)} style={styles.rouletteAction} /></View>
          </View>
        </View>
      </View>

      <View style={styles.rouletteMethod}>
        <View style={styles.methodCard}><Text style={styles.methodNumber}>72%</Text><Text style={styles.methodTitle}>Afinidad personal</Text><Text style={styles.methodText}>Géneros, calificaciones, guardados y señales positivas del usuario.</Text></View>
        <View style={styles.methodCard}><Text style={styles.methodNumber}>38%</Text><Text style={styles.methodTitle}>Valor de descubrimiento</Text><Text style={styles.methodText}>Premia títulos con poca exposición y buenas señales cualitativas.</Text></View>
        <View style={styles.methodCard}><Text style={[styles.methodNumber, styles.methodPenalty]}>−10%</Text><Text style={styles.methodTitle}>Penalización viral</Text><Text style={styles.methodText}>Una presencia excesiva en tendencias reduce la prioridad del título.</Text></View>
      </View>
    </ScrollView>
  );
}
