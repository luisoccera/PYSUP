import React from 'react';
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ClipFinderController } from '../../controllers/useClipFinderController';
import { ContentItem } from '../../models/types';
import { Button, Pill, ProviderBadge } from '../components/ui';
import { styles } from '../styles/clipFinderStyles';
import { colors } from '../styles/theme';

export function ClipFinderView({ controller, onOpen }: { controller: ClipFinderController; onOpen: (item: ContentItem) => void }) {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const {
    source,
    selectSource,
    url,
    changeUrl,
    file,
    analysisState: state,
    error,
    consent,
    toggleConsent,
    canAnalyze,
    urlSupported,
    fileDescription,
    progress,
    statusLabel,
    result,
    pickVideo,
    analyze,
    reset,
  } = controller;

  return (
    <View style={styles.root}>
      <View style={[styles.introGrid, compact && styles.introGridCompact]}>
        <View style={styles.finderCard}>
          <View style={styles.finderHeader}>
            <View style={styles.finderIcon}><Feather name="film" size={24} color={colors.ink} /></View>
            <View style={styles.finderHeaderCopy}>
              <Text style={styles.finderEyebrow}>IDENTIFICACIÓN VISUAL</Text>
              <Text style={styles.finderTitle}>¿De qué película es este clip?</Text>
            </View>
            <View style={styles.demoBadge}><Text style={styles.demoBadgeText}>DEMO</Text></View>
          </View>
          <Text style={styles.finderDescription}>Pega un enlace público o sube un fragmento. PYSUP combinará imagen, diálogo y contexto para encontrar el título y su disponibilidad regional.</Text>

          <View style={styles.sourceTabs}>
            <Pressable onPress={() => selectSource('link')} style={[styles.sourceTab, source === 'link' && styles.sourceTabActive]}>
              <Feather name="link-2" size={16} color={source === 'link' ? colors.ink : colors.textMuted} />
              <Text style={[styles.sourceTabText, source === 'link' && styles.sourceTabTextActive]}>Pegar enlace</Text>
            </Pressable>
            <Pressable onPress={() => selectSource('file')} style={[styles.sourceTab, source === 'file' && styles.sourceTabActive]}>
              <Feather name="upload-cloud" size={16} color={source === 'file' ? colors.ink : colors.textMuted} />
              <Text style={[styles.sourceTabText, source === 'file' && styles.sourceTabTextActive]}>Subir fragmento</Text>
            </Pressable>
          </View>

          {source === 'link' ? (
            <View>
              <Text style={styles.inputLabel}>Enlace público</Text>
              <View style={[styles.urlInput, !urlSupported && styles.urlInputError]}>
                <Feather name="link" size={18} color={colors.textDim} />
                <TextInput
                  value={url}
                  onChangeText={changeUrl}
                  placeholder="Pega aquí un enlace público de TikTok, X, Instagram o YouTube"
                  placeholderTextColor={colors.textDim}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={state === 'idle'}
                  style={styles.input}
                />
                {!!url && urlSupported && <Feather name="check-circle" size={17} color={colors.success} />}
              </View>
              <View style={styles.networks}>
                <Pill label="TikTok" icon="music" />
                <Pill label="Instagram Reels" icon="instagram" />
                <Pill label="X" icon="twitter" />
                <Pill label="YouTube Shorts" icon="youtube" />
              </View>
            </View>
          ) : (
            <Pressable disabled={state !== 'idle'} onPress={pickVideo} style={({ pressed }) => [styles.dropzone, pressed && styles.dropzonePressed, !!file && styles.dropzoneSelected]}>
              <View style={styles.uploadIcon}><Feather name={file ? 'check' : 'upload-cloud'} size={25} color={file ? colors.ink : colors.lime} /></View>
              <Text style={styles.dropzoneTitle}>{file ? file.name : 'Selecciona un fragmento'}</Text>
              <Text style={styles.dropzoneText}>{fileDescription}</Text>
              {!file && <Text style={styles.dropzoneAction}>Explorar archivos</Text>}
            </Pressable>
          )}

          <Pressable onPress={toggleConsent} style={styles.consentRow}>
            <View style={[styles.checkbox, consent && styles.checkboxActive]}>{consent && <Feather name="check" size={13} color={colors.ink} />}</View>
            <Text style={styles.consentText}>Confirmo que el enlace es público o que tengo permiso para analizar este fragmento. El archivo se elimina después del procesamiento.</Text>
          </Pressable>

          {!!error && <View style={styles.errorRow}><Feather name="alert-circle" size={15} color={colors.coral} /><Text style={styles.errorText}>{error}</Text></View>}

          {state !== 'idle' && state !== 'complete' && (
            <View style={styles.progressCard}>
              <View style={styles.progressTop}><Text style={styles.progressLabel}>{statusLabel}</Text><Text style={styles.progressValue}>{progress}%</Text></View>
              <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
              <View style={styles.analysisSignals}>
                <View style={styles.signal}><Feather name="image" size={13} color={progress >= 24 ? colors.lime : colors.textDim} /><Text style={styles.signalText}>Fotogramas</Text></View>
                <View style={styles.signal}><Feather name="mic" size={13} color={progress >= 58 ? colors.lime : colors.textDim} /><Text style={styles.signalText}>Diálogo</Text></View>
                <View style={styles.signal}><Feather name="map-pin" size={13} color={progress >= 82 ? colors.lime : colors.textDim} /><Text style={styles.signalText}>Disponibilidad</Text></View>
              </View>
            </View>
          )}

          {state === 'idle' && <Button label="Identificar película o serie" icon="search" disabled={!canAnalyze} onPress={analyze} style={styles.analyzeButton} />}
        </View>

        <View style={styles.howCard}>
          <Text style={styles.howEyebrow}>CÓMO FUNCIONARÍA</Text>
          <Text style={styles.howTitle}>Tres señales, una respuesta</Text>
          {[
            { number: '01', icon: 'image' as const, title: 'Escenas', text: 'Objetos, locaciones, vestuario, créditos y composición visual.' },
            { number: '02', icon: 'volume-2' as const, title: 'Audio', text: 'Diálogo transcrito, música y huella acústica sin conservar el clip.' },
            { number: '03', icon: 'database' as const, title: 'Catálogo', text: 'Candidatos cruzados con país, proveedor y disponibilidad vigente.' },
          ].map((step) => (
            <View key={step.number} style={styles.howStep}>
              <Text style={styles.stepNumber}>{step.number}</Text>
              <View style={styles.stepIcon}><Feather name={step.icon} size={18} color={colors.lime} /></View>
              <View style={styles.stepCopy}><Text style={styles.stepTitle}>{step.title}</Text><Text style={styles.stepText}>{step.text}</Text></View>
            </View>
          ))}
          <View style={styles.privacyCard}><Feather name="shield" size={18} color={colors.success} /><View style={styles.privacyCopy}><Text style={styles.privacyTitle}>Privacidad desde el diseño</Text><Text style={styles.privacyText}>Sin publicar el clip, sin entrenar modelos con él y con eliminación automática después del análisis.</Text></View></View>
        </View>
      </View>

      {state === 'complete' && (
        <View style={styles.resultSection}>
          <View style={styles.resultHeading}><View><Text style={styles.resultEyebrow}>94% DE CONFIANZA</Text><Text style={styles.resultHeadingTitle}>Encontramos una coincidencia</Text></View><Button label="Analizar otro" icon="rotate-ccw" variant="ghost" compact onPress={reset} /></View>
          <View style={[styles.resultCard, compact && styles.resultCardCompact]}>
            <ImageBackground source={result.image} style={[styles.resultImage, compact && styles.resultImageCompact]} imageStyle={styles.resultImageRadius}>
              <LinearGradient colors={['transparent', 'rgba(7,10,18,0.86)']} style={StyleSheet.absoluteFill} />
              <View style={styles.confidenceBadge}><Text style={styles.confidenceValue}>94%</Text><Text style={styles.confidenceLabel}>COINCIDE</Text></View>
            </ImageBackground>
            <View style={styles.resultCopy}>
              <Text style={styles.resultType}>{result.type.toUpperCase()} · {result.year}</Text>
              <Text style={styles.resultTitle}>{result.title}</Text>
              <Text style={styles.resultSubtitle}>{result.subtitle}</Text>
              <View style={styles.resultMeta}><Text style={styles.resultMetaText}>{result.duration}</Text><Text style={styles.resultMetaText}>{result.maturity}</Text>{result.genres.map((genre) => <Pill key={genre} label={genre} />)}</View>
              <Text style={styles.resultSynopsis}>{result.synopsis}</Text>
              <View style={styles.evidenceCard}><Feather name="target" size={17} color={colors.lime} /><View style={styles.evidenceCopy}><Text style={styles.evidenceTitle}>Por qué coincide</Text><Text style={styles.evidenceText}>La iluminación de la cabina, el emblema de la misión y una línea parcial del diálogo aparecen en materiales verificados de este título.</Text></View></View>
              <View style={styles.availabilityRow}><View><Text style={styles.availabilityLabel}>Disponible en México</Text><Text style={styles.availabilityNote}>Incluido con tu suscripción</Text></View>{result.providers.map((id) => <ProviderBadge key={id} id={id} />)}</View>
              <View style={styles.resultActions}><Button label="Ver ficha completa" icon="arrow-up-right" onPress={() => onOpen(result)} style={styles.resultAction} /><Button label="No es esta" icon="x" variant="secondary" onPress={reset} style={styles.resultAction} /></View>
            </View>
          </View>
          <Text style={styles.disclaimer}>Resultado demostrativo del MVP. La identificación real requiere un servicio de análisis y licencias de catálogo; la disponibilidad debe consultarse de nuevo al momento de mostrarla.</Text>
        </View>
      )}
    </View>
  );
}
