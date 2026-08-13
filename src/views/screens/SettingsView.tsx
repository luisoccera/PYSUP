import React from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { countries, providers } from '../../models/catalogue';
import { AppPreferences, PreferenceKey, ProviderId } from '../../models/types';
import { Avatar, Button, IconName, ProviderBadge, SectionTitle } from '../components/ui';
import { PageTitle } from '../layout/AppNavigation';
import { colors } from '../styles/theme';
import { mainStyles as styles } from '../styles/mainStyles';

function SettingToggle({ icon, title, description, value, onChange }: { icon: IconName; title: string; description: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.settingToggleRow}>
      <View style={styles.settingRowIcon}><Feather name={icon} size={18} color={colors.lime} /></View>
      <View style={styles.settingRowCopy}><Text style={styles.settingRowTitle}>{title}</Text><Text style={styles.settingRowDescription}>{description}</Text></View>
      <Switch accessibilityLabel={title} value={value} onValueChange={onChange} trackColor={{ false: colors.line, true: colors.limeDark }} thumbColor={value ? colors.lime : colors.textMuted} />
    </View>
  );
}

export function SettingsScreen({ name, country, connected, preferences, onPreferenceChange, onCountryChange, onConnect, onProfile, onLogout }: { name: string; country: string; connected: ProviderId[]; preferences: AppPreferences; onPreferenceChange: (key: PreferenceKey, value: boolean) => void; onCountryChange: (country: string) => void; onConnect: (id: ProviderId) => void; onProfile: () => void; onLogout: () => void }) {

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <PageTitle eyebrow="PREFERENCIAS DE PYSUP" title="Configuración" description="Administra tu cuenta, región, servicios conectados y la forma en que PYSUP se adapta a ti." />

      <View style={styles.settingsGrid}>
        <View style={styles.settingsMain}>
          <View style={styles.settingsSection}>
            <SectionTitle eyebrow="CUENTA" title="Tu identidad" />
            <Pressable onPress={onProfile} style={({ pressed }) => [styles.accountSettingCard, pressed && styles.cardPressed]}>
              <Avatar initials={name.slice(0, 2).toUpperCase()} size={54} color="#5E4EA1" online />
              <View style={styles.accountSettingCopy}><Text style={styles.accountSettingName}>{name} Ortega</Text><Text style={styles.accountSettingHandle}>@luisencuadro · Ver y editar perfil público</Text></View>
              <Feather name="chevron-right" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.settingsSection}>
            <SectionTitle eyebrow="REGIÓN" title="Catálogo de tu país" />
            <Text style={styles.settingsHelp}>Las recomendaciones y la disponibilidad se comprobarán siempre para el país seleccionado.</Text>
            <View style={styles.settingsCountryGrid}>{countries.map((item) => (
              <Pressable key={item.code} onPress={() => onCountryChange(item.code)} style={[styles.settingsCountry, country === item.code && styles.settingsCountryActive]}>
                <View style={styles.countryCodeBox}><Text style={styles.countryCodeText}>{item.code}</Text></View>
                <Text style={[styles.settingsCountryName, country === item.code && styles.settingsCountryNameActive]}>{item.name}</Text>
                {country === item.code && <Feather name="check-circle" size={17} color={colors.lime} />}
              </Pressable>
            ))}</View>
          </View>

          <View style={styles.settingsSection}>
            <SectionTitle eyebrow="AVISOS" title="Notificaciones" />
            <SettingToggle icon="bell" title="Notificaciones push" description="Invitaciones, novedades y recordatorios importantes." value={preferences.pushNotifications} onChange={(value) => onPreferenceChange('pushNotifications', value)} />
            <SettingToggle icon="users" title="Actividad de amigos" description="Cuando alguien te invite a una sala o recomiende un título." value={preferences.friendActivity} onChange={(value) => onPreferenceChange('friendActivity', value)} />
            <SettingToggle icon="message-circle" title="Respuestas en foros" description="Avisos de respuestas, menciones y soluciones aceptadas." value={preferences.forumReplies} onChange={(value) => onPreferenceChange('forumReplies', value)} />
          </View>

          <View style={styles.settingsSection}>
            <SectionTitle eyebrow="EXPERIENCIA" title="Contenido y reproducción" />
            <SettingToggle icon="eye-off" title="Ocultar spoilers" description="Difumina textos marcados como spoiler hasta que decidas verlos." value={preferences.hideSpoilers} onChange={(value) => onPreferenceChange('hideSpoilers', value)} />
            <SettingToggle icon="play-circle" title="Reproducir avances automáticamente" description="Activa avances silenciosos al abrir una ficha." value={preferences.autoplayTrailers} onChange={(value) => onPreferenceChange('autoplayTrailers', value)} />
            <SettingToggle icon="wifi" title="Video sólo con Wi‑Fi" description="Evita cargar clips y avances con tus datos móviles." value={preferences.wifiOnly} onChange={(value) => onPreferenceChange('wifiOnly', value)} />
          </View>
        </View>

        <View style={styles.settingsSide}>
          <View style={styles.settingsSection}>
            <SectionTitle eyebrow="STREAMING" title="Plataformas conectadas" />
            <View style={styles.connectionsCard}>{providers.map((provider) => { const isConnected = connected.includes(provider.id); return <View key={provider.id} style={styles.connectionRow}><ProviderBadge id={provider.id} /><View style={styles.connectionCopy}><Text style={styles.connectionName}>{provider.name}</Text><Text style={[styles.connectionStatus, isConnected && styles.connectionStatusActive]}>{isConnected ? 'Actividad conectada' : 'Sin conectar'}</Text></View><Pressable onPress={() => onConnect(provider.id)}><Text style={styles.connectionAction}>{isConnected ? 'Quitar' : 'Conectar'}</Text></Pressable></View>; })}</View>
          </View>

          <View style={styles.settingsSection}>
            <SectionTitle eyebrow="PRIVACIDAD" title="Tu actividad" />
            <SettingToggle icon="activity" title="Actividad pública" description="Permite que tus amigos vean lo que estás viendo y calificando." value={preferences.publicActivity} onChange={(value) => onPreferenceChange('publicActivity', value)} />
            <View style={styles.dataActions}>
              <Button label="Descargar mis datos" icon="download" variant="ghost" compact onPress={() => {}} />
              <Button label="Administrar bloqueos" icon="slash" variant="ghost" compact onPress={() => {}} />
            </View>
          </View>

          <View style={styles.settingsSection}>
            <SectionTitle eyebrow="SEGURIDAD" title="Sesión y acceso" />
            <View style={styles.securityNote}><Feather name="shield" size={18} color={colors.success} /><Text style={styles.securityNoteText}>La autenticación en dos pasos y la administración de dispositivos estarán disponibles al conectar el backend.</Text></View>
            <Button label="Cambiar contraseña" icon="key" variant="secondary" onPress={() => {}} />
            <Button label="Cerrar sesión" icon="log-out" variant="danger" onPress={onLogout} style={styles.settingsLogout} />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
