import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ImageBackground,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { RouletteControllerState } from '../../controllers/useRouletteController';
import { ContentItem } from '../../models/types';
import { Button, Pill, ProviderBadge, WatchOfferButton } from '../components/ui';
import { PageTitle } from '../layout/AppNavigation';
import { colors } from '../styles/theme';
import { mainStyles as styles } from '../styles/mainStyles';

type RouletteScreenProps = {
  controller: RouletteControllerState;
  savedIds: string[];
  onSave: (id: string) => void;
  onOpen: (item: ContentItem) => void;
  onOpenUrl: (url: string) => void;
  onOpenTrailer: (url: string) => void;
};

const blindNodes = ['?', 'P', '?', 'S', '?', 'Y', '?', 'U'];

export function RouletteScreen({ controller, savedIds, onSave, onOpen, onOpenUrl, onOpenTrailer }: RouletteScreenProps) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const wheelSize = Math.min(compact ? width - 52 : 390, 390);
  const rotation = useRef(new Animated.Value(0)).current;
  const [spinning, setSpinning] = useState(false);
  const [showSynopsis, setShowSynopsis] = useState(false);
  const result = controller.result;
  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '1477deg'] });

  useEffect(() => setShowSynopsis(false), [result?.content.id]);

  const spin = () => {
    if (spinning || controller.loading || !controller.recommendations.length) return;
    setSpinning(true);
    setShowSynopsis(false);
    rotation.setValue(0);
    Animated.timing(rotation, { toValue: 1, duration: 1450, useNativeDriver: false }).start(() => {
      controller.spin();
      setSpinning(false);
    });
  };

  const noMatches = !controller.loading && controller.recommendations.length === 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.rouletteContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.rouletteHeader, compact && styles.rouletteHeaderCompact]}>
        <PageTitle
          eyebrow="ELECCIÓN A CIEGAS"
          title="Dime cómo te sientes. Lo demás es sorpresa."
          description="No verás títulos, portadas, géneros ni pistas antes del giro. Puedes responder dos preguntas o dejar que PYSUP decida todo por ti."
        />
        <View style={styles.antiViralBadge}><Feather name="eye-off" size={16} color={colors.lime} /><Text style={styles.antiViralText}>CERO PISTAS</Text></View>
      </View>

      <View style={[styles.rouletteSetupCard, compact && styles.rouletteSetupCardCompact]}>
        <View style={styles.rouletteQuestionBlock}>
          <Text style={styles.rouletteQuestionStep}>01 · OPCIONAL</Text>
          <Text style={styles.rouletteQuestion}>¿Cuál es tu estado de ánimo?</Text>
          <View style={styles.rouletteChoiceRow}>
            <Pill label="Sorpréndeme" icon="shuffle" active={!controller.selectedMood} onPress={() => controller.selectMood(null)} />
            {controller.moodOptions.map((mood) => (
              <Pill key={mood.id} label={mood.label} icon={mood.icon} active={controller.selectedMood === mood.id} onPress={() => controller.selectMood(mood.id)} />
            ))}
          </View>
        </View>
        <View style={[styles.rouletteQuestionDivider, compact && styles.rouletteQuestionDividerCompact]} />
        <View style={styles.rouletteQuestionBlock}>
          <Text style={styles.rouletteQuestionStep}>02 · OPCIONAL</Text>
          <Text style={styles.rouletteQuestion}>¿Película o serie?</Text>
          <View style={styles.rouletteChoiceRow}>
            {controller.formatOptions.map((format) => (
              <Pill key={format.id} label={format.label} active={controller.selectedFormat === format.id} onPress={() => controller.selectFormat(format.id)} />
            ))}
          </View>
        </View>
      </View>

      {!!controller.error && <View style={styles.rouletteNoMatch}><Feather name="alert-circle" size={24} color={colors.coral} /><Text style={styles.emptyText}>{controller.error}</Text></View>}

      {noMatches ? (
        <View style={styles.rouletteNoMatch}>
          <Feather name="search" size={26} color={colors.blue} />
          <Text style={styles.emptyTitle}>No encontramos una opción con esa combinación en tu país.</Text>
          <Text style={styles.emptyText}>Puedes omitir el ánimo o dejar el formato en “Me da igual”.</Text>
          <Button label="Sorpréndeme sin filtros" icon="shuffle" onPress={() => { controller.selectMood(null); controller.selectFormat('any'); }} style={styles.spinButton} />
        </View>
      ) : (
        <View style={[styles.rouletteLayout, compact && styles.rouletteLayoutCompact]}>
          <View style={[styles.wheelColumn, compact && styles.wheelColumnCompact]}>
            <View style={[styles.wheelFrame, { width: wheelSize, height: wheelSize }]}>
              <View style={styles.wheelPointer}><Feather name="chevron-down" size={24} color={colors.ink} /></View>
              <Animated.View style={[styles.rouletteWheel, { width: wheelSize, height: wheelSize, borderRadius: wheelSize / 2, transform: [{ rotate }] }]}>
                <View style={styles.wheelOrbitOne} />
                <View style={styles.wheelOrbitTwo} />
                {blindNodes.map((label, index) => {
                  const angle = ((Math.PI * 2) / blindNodes.length) * index - (Math.PI / 2);
                  const radius = (wheelSize / 2) - 44;
                  const left = (wheelSize / 2) + Math.cos(angle) * radius - 25;
                  const top = (wheelSize / 2) + Math.sin(angle) * radius - 25;
                  return <View key={`${label}-${index}`} style={[styles.wheelNode, styles.wheelNodeBlind, { left, top }]}><Text style={styles.wheelBlindText}>{label}</Text></View>;
                })}
              </Animated.View>
              <View style={styles.wheelHub}><Feather name="help-circle" size={30} color={colors.lime} /><Text style={styles.wheelHubText}>SIN PISTAS</Text></View>
            </View>
            <Button label={spinning || controller.loading ? 'Eligiendo para ti…' : result ? 'Dame otra opción' : 'Girar y revelar'} icon={result ? 'refresh-cw' : 'play'} disabled={spinning || controller.loading} onPress={spin} style={styles.spinButton} />
            <View style={styles.blindPromise}><Feather name="lock" size={14} color={colors.textDim} /><Text style={styles.blindPromiseText}>La selección permanece oculta hasta que termine la animación.</Text></View>
          </View>

          {!result ? (
            <View style={[styles.rouletteResultCard, styles.rouletteLockedCard, compact && styles.rouletteResultCardCompact]}>
              <View style={styles.rouletteLockedIcon}><Feather name="eye-off" size={42} color={colors.lime} /></View>
              <Text style={styles.rouletteLockedEyebrow}>RECOMENDACIÓN OCULTA</Text>
              <Text style={styles.rouletteLockedTitle}>Aquí aparecerá tu elección.</Text>
              <Text style={styles.rouletteLockedText}>Después del giro podrás leer la sinopsis, abrir el tráiler y elegir en qué plataforma verla.</Text>
              <View style={styles.rouletteLockedChecks}>
                <Text style={styles.rouletteLockedCheck}>✓ Sin adelantar título ni portada</Text>
                <Text style={styles.rouletteLockedCheck}>✓ Disponible en tu país</Text>
                <Text style={styles.rouletteLockedCheck}>✓ Fuera de las recomendaciones virales típicas</Text>
              </View>
            </View>
          ) : (
            <View style={[styles.rouletteResultCard, compact && styles.rouletteResultCardCompact]}>
              <ImageBackground source={result.content.image} style={styles.rouletteResultImage} imageStyle={styles.rouletteResultImageRadius}>
                <LinearGradient colors={['rgba(7,10,18,0.08)', 'rgba(7,10,18,0.96)']} style={styles.rouletteResultGradient}>
                  <View style={styles.hiddenGemPill}><Feather name="unlock" size={13} color={colors.ink} /><Text style={styles.hiddenGemPillText}>REVELADA</Text></View>
                  <View>{result.affinity > 0 && <Text style={styles.rouletteMatch}>{result.affinity}% AFINIDAD</Text>}<Text style={styles.rouletteResultTitle}>{result.content.title}</Text><Text style={styles.rouletteResultSubtitle}>{result.content.subtitle}</Text></View>
                </LinearGradient>
              </ImageBackground>
              <View style={styles.rouletteResultBody}>
                <View style={styles.rouletteMeta}><Text style={styles.rouletteMetaText}>{result.content.type}</Text><Text style={styles.rouletteMetaText}>{result.content.year}</Text><Text style={styles.rouletteMetaText}>{result.content.duration}</Text>{result.content.providers.map((provider) => <ProviderBadge key={provider} id={provider} compact />)}</View>
                <View style={styles.previewActions}>
                  <Button label="Previsualizar tráiler" icon="play-circle" onPress={() => onOpenTrailer(result.availability.trailerUrl)} style={styles.previewAction} />
                  <Button label={showSynopsis ? 'Ocultar sinopsis' : 'Leer sinopsis'} icon="align-left" variant="secondary" onPress={() => setShowSynopsis((current) => !current)} style={styles.previewAction} />
                </View>
                {showSynopsis && <View style={styles.rouletteSynopsis}><Text style={styles.rouletteSynopsisLabel}>SINOPSIS SIN SPOILERS</Text><Text style={styles.rouletteSynopsisText}>{result.content.synopsis}</Text></View>}
                <View style={styles.watchNowHeader}>
                  <View><Text style={styles.watchNowTitle}>Dónde verla ahora</Text><Text style={styles.watchNowSubtitle}>Suscripción, renta o compra según disponibilidad.</Text></View>
                  <Feather name="external-link" size={17} color={colors.lime} />
                </View>
                <View style={styles.watchOfferGrid}>
                  {result.availability.offers.map((offer) => <WatchOfferButton key={`${offer.platformId}-${offer.access}`} offer={offer} onPress={() => onOpenUrl(offer.url)} />)}
                </View>
                {!result.availability.offers.length && <Text style={styles.availabilityNote}>No hay una oferta regional vigente. El adaptador de catálogo debe actualizar este título antes de abrir una plataforma.</Text>}
                <Text style={styles.availabilityNote}>La disponibilidad cambia por país. PYSUP abrirá el servicio oficial para confirmar el título antes de pagar o reproducir.</Text>
                {!!result.content.reason && <View style={styles.rouletteReason}><Feather name="compass" size={18} color={colors.lime} /><View style={styles.rouletteReasonCopy}><Text style={styles.rouletteReasonTitle}>Por qué encaja contigo</Text><Text style={styles.rouletteReasonText}>{result.content.reason}</Text></View></View>}
                <View style={styles.rouletteActions}>
                  <Button label="No es para mí" icon="x" variant="ghost" onPress={controller.rejectResult} style={styles.rouletteAction} />
                  <Button label={savedIds.includes(result.content.id) ? 'Ya está guardada' : 'Guardar para después'} icon="bookmark" variant="secondary" onPress={() => onSave(result.content.id)} style={styles.rouletteAction} />
                  <Button label="Ver ficha completa" icon="info" onPress={() => onOpen(result.content)} style={styles.rouletteAction} />
                </View>
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}
