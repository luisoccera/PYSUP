import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { OnboardingControllerState } from '../../controllers/useAuthController';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { countries, genres, providers } from '../../models/catalogue';
import { Button, Logo, Pill, ProviderBadge } from '../components/ui';
import { onboardingStyles } from '../styles/authStyles';
import { colors } from '../styles/theme';

export function OnboardingView({ name, controller }: { name: string; controller: OnboardingControllerState }) {
  const responsive = useResponsiveLayout();
  const {
    step,
    country,
    setCountry,
    connectedProviders: connected,
    preferredGenres: preferred,
    connectingProvider: connecting,
    toggleProvider,
    toggleGenre,
    next,
    skip,
    previous,
    buttonDisabled,
    submitting,
    error,
  } = controller;

  return (
    <LinearGradient colors={[colors.ink, '#11172B']} style={onboardingStyles.page}>
      <SafeAreaView style={onboardingStyles.page}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[onboardingStyles.scroll, { paddingHorizontal: responsive.gutter }]}>
        <View style={onboardingStyles.top}><Logo /><Pressable onPress={skip}><Text style={onboardingStyles.skip}>{step < 2 ? 'Omitir por ahora' : 'Terminar'}</Text></Pressable></View>
        <View style={onboardingStyles.progressRow}>{[0, 1, 2].map((index) => <View key={index} style={[onboardingStyles.progress, index <= step && onboardingStyles.progressActive]} />)}</View>
        <View style={onboardingStyles.content}>
          {step === 0 && (
            <>
              <View style={onboardingStyles.stepIcon}><Text style={onboardingStyles.flagLarge}>🌎</Text></View>
              <Text style={onboardingStyles.kicker}>PASO 1 DE 3</Text>
              <Text style={[onboardingStyles.title, responsive.isPhone && onboardingStyles.titlePhone, responsive.isCompactPhone && onboardingStyles.titleCompactPhone]}>Hola, {name}.{`\n`}¿Dónde ves tus historias?</Text>
              <Text style={onboardingStyles.subtitle}>Usamos tu país para mostrar sólo títulos disponibles en tu región. Puedes cambiarlo después.</Text>
              <View style={onboardingStyles.countryGrid}>
                {countries.map((item) => (
                  <Pressable key={item.code} onPress={() => setCountry(item.code)} style={[onboardingStyles.countryCard, country === item.code && onboardingStyles.countryCardActive]}>
                    <Text style={onboardingStyles.countryFlag}>{item.code}</Text><Text style={[onboardingStyles.countryName, country === item.code && onboardingStyles.countryNameActive]}>{item.name}</Text>
                    {country === item.code && <View style={onboardingStyles.selectedCheck}><Feather name="check" size={13} color={colors.ink} /></View>}
                  </Pressable>
                ))}
              </View>
            </>
          )}
          {step === 1 && (
            <>
              <View style={onboardingStyles.stepIcon}><Feather name="link-2" size={30} color={colors.ink} /></View>
              <Text style={onboardingStyles.kicker}>PASO 2 DE 3</Text>
              <Text style={[onboardingStyles.title, responsive.isPhone && onboardingStyles.titlePhone, responsive.isCompactPhone && onboardingStyles.titleCompactPhone]}>Conecta lo que ya ves</Text>
              <Text style={onboardingStyles.subtitle}>Elige las plataformas que tienes. Por ahora se guardan como selección manual; PYSUP nunca solicitará sus contraseñas ni afirmará que existe una conexión OAuth.</Text>
              <View style={onboardingStyles.providerList}>
                {providers.map((provider) => {
                  const isConnected = connected.includes(provider.id);
                  const isConnecting = connecting === provider.id;
                  return (
                    <View key={provider.id} style={[onboardingStyles.providerCard, isConnected && onboardingStyles.providerCardActive]}>
                      <ProviderBadge id={provider.id} />
                      <View style={onboardingStyles.providerCopy}><Text style={onboardingStyles.providerName}>{provider.name}</Text><Text style={onboardingStyles.providerStatus}>{isConnected ? 'Selección manual activa' : 'No seleccionada'}</Text></View>
                      <Button label={isConnected ? 'Elegida' : 'Elegir'} icon={isConnected ? 'check' : 'plus'} variant={isConnected ? 'ghost' : 'secondary'} compact disabled={isConnecting} onPress={() => toggleProvider(provider.id)} />
                    </View>
                  );
                })}
              </View>
              <View style={onboardingStyles.privacyNote}><Feather name="lock" size={16} color={colors.success} /><Text style={onboardingStyles.privacyText}>La autorización se realiza mediante el proveedor. PYSUP no solicita ni almacena sus contraseñas.</Text></View>
            </>
          )}
          {step === 2 && (
            <>
              <View style={onboardingStyles.stepIcon}><Feather name="heart" size={30} color={colors.ink} /></View>
              <Text style={onboardingStyles.kicker}>PASO 3 DE 3</Text>
              <Text style={[onboardingStyles.title, responsive.isPhone && onboardingStyles.titlePhone, responsive.isCompactPhone && onboardingStyles.titleCompactPhone]}>Danos una primera pista</Text>
              <Text style={onboardingStyles.subtitle}>Elige al menos dos géneros. Tus deslizamientos, calificaciones y reseñas harán el resto.</Text>
              <View style={onboardingStyles.genreGrid}>{genres.map((genre) => <Pill key={genre} label={genre} active={preferred.includes(genre)} onPress={() => toggleGenre(genre)} />)}</View>
              <View style={onboardingStyles.readyCard}>
                <View style={onboardingStyles.readyIcon}><Feather name="zap" size={23} color={colors.lime} /></View>
                <View style={onboardingStyles.readyCopy}><Text style={onboardingStyles.readyTitle}>Tu perfil inicial está listo</Text><Text style={onboardingStyles.readyText}>{connected.length || 0} plataformas · {preferred.length} intereses · {countries.find((item) => item.code === country)?.name}</Text></View>
              </View>
            </>
          )}
        </View>
        <View style={[onboardingStyles.footer, responsive.isPhone && onboardingStyles.footerPhone]}>
          {!!error && <Text accessibilityRole="alert" style={onboardingStyles.subtitle}>{error}</Text>}
          {step > 0 && <Button label="Atrás" icon="arrow-left" variant="ghost" onPress={previous} style={onboardingStyles.backButton} />}
          <Button label={submitting ? 'Guardando…' : step === 2 ? 'Empezar a descubrir' : 'Continuar'} icon="arrow-right" disabled={buttonDisabled} onPress={next} style={onboardingStyles.nextButton} />
        </View>
      </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
