import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { countries, providers } from '../../models/catalogue';
import { AppPreferences, PreferenceKey, ProviderId } from '../../models/types';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
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

type SettingsProps = {
  name: string;
  username: string;
  avatarUrl: string | null;
  country: string;
  connected: ProviderId[];
  preferences: AppPreferences;
  blockedUsers: { id: string; name: string; username: string }[];
  onPreferenceChange: (key: PreferenceKey, value: boolean) => void;
  onCountryChange: (country: string) => void;
  onConnect: (id: ProviderId) => void;
  onProfile: () => void;
  onLogout: () => void;
  onLogoutAll: () => void;
  onDownloadData: () => void;
  onChangePassword: (password: string) => Promise<unknown>;
  onDeleteAccount: () => void;
  onUnblock: (userId: string) => void;
};

export function SettingsScreen({ name, username, avatarUrl, country, connected, preferences, blockedUsers, onPreferenceChange, onCountryChange, onConnect, onProfile, onLogout, onLogoutAll, onDownloadData, onChangePassword, onDeleteAccount, onUnblock }: SettingsProps) {
  const responsive = useResponsiveLayout();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [blocksOpen, setBlocksOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const savePassword = () => {
    if (passwordBusy) return;
    setPasswordBusy(true);
    setPasswordError('');
    void onChangePassword(newPassword)
      .then(() => { setNewPassword(''); setPasswordOpen(false); })
      .catch((error: unknown) => setPasswordError(error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.'))
      .finally(() => setPasswordBusy(false));
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.screenContent, responsive.isPhone && styles.screenContentPhone, responsive.isTablet && styles.screenContentTablet, { paddingHorizontal: responsive.gutter, paddingTop: responsive.contentTop }]} showsVerticalScrollIndicator={false}>
      <PageTitle eyebrow="PREFERENCIAS DE PYSUP" title="Configuración" description="Administra tu cuenta, región, servicios conectados y la forma en que PYSUP se adapta a ti." />

      <View style={styles.settingsGrid}>
        <View style={[styles.settingsMain, responsive.isPhone && styles.settingsColumnPhone]}>
          <View style={styles.settingsSection}>
            <SectionTitle eyebrow="CUENTA" title="Tu identidad" />
            <Pressable onPress={onProfile} style={({ pressed }) => [styles.accountSettingCard, pressed && styles.cardPressed]}>
              <Avatar initials={name.slice(0, 2).toUpperCase()} uri={avatarUrl} size={54} color="#5E4EA1" online />
              <View style={styles.accountSettingCopy}><Text style={styles.accountSettingName}>{name}</Text><Text style={styles.accountSettingHandle}>@{username} · Ver y editar perfil público</Text></View>
              <Feather name="chevron-right" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <View style={styles.settingsSection}>
            <SectionTitle eyebrow="REGIÓN" title="Catálogo de tu país" />
            <Text style={styles.settingsHelp}>Las recomendaciones y la disponibilidad se comprobarán siempre para el país seleccionado.</Text>
            <View style={styles.settingsCountryGrid}>{countries.map((item) => (
              <Pressable key={item.code} onPress={() => onCountryChange(item.code)} style={[styles.settingsCountry, responsive.isPhone && styles.settingsCountryPhone, country === item.code && styles.settingsCountryActive]}>
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
            <SettingToggle icon="play-circle" title="Permitir reproducción automática" description="Guarda tu preferencia para avances reproducibles; se aplicará cuando el proveedor de catálogo entregue un video compatible." value={preferences.autoplayTrailers} onChange={(value) => onPreferenceChange('autoplayTrailers', value)} />
            <SettingToggle icon="wifi" title="Video sólo con Wi‑Fi" description="Evita cargar clips y avances con tus datos móviles." value={preferences.wifiOnly} onChange={(value) => onPreferenceChange('wifiOnly', value)} />
          </View>
        </View>

        <View style={[styles.settingsSide, responsive.isPhone && styles.settingsColumnPhone]}>
          <View style={styles.settingsSection}>
            <SectionTitle eyebrow="STREAMING" title="Plataformas conectadas" />
            <Text style={styles.settingsHelp}>Estas opciones son selecciones manuales hasta que cada proveedor ofrezca una autorización oficial compatible.</Text>
            <View style={styles.connectionsCard}>{providers.map((provider) => { const isConnected = connected.includes(provider.id); return <View key={provider.id} style={styles.connectionRow}><ProviderBadge id={provider.id} /><View style={styles.connectionCopy}><Text style={styles.connectionName}>{provider.name}</Text><Text style={[styles.connectionStatus, isConnected && styles.connectionStatusActive]}>{isConnected ? 'Selección manual' : 'No seleccionada'}</Text></View><Pressable onPress={() => onConnect(provider.id)}><Text style={styles.connectionAction}>{isConnected ? 'Quitar' : 'Elegir'}</Text></Pressable></View>; })}</View>
          </View>

          <View style={styles.settingsSection}>
            <SectionTitle eyebrow="PRIVACIDAD" title="Tu actividad" />
            <SettingToggle icon="activity" title="Actividad pública" description="Permite que tus amigos vean lo que estás viendo y calificando." value={preferences.publicActivity} onChange={(value) => onPreferenceChange('publicActivity', value)} />
            <View style={styles.dataActions}>
              <Button label="Descargar mis datos" icon="download" variant="ghost" compact onPress={onDownloadData} />
              <Button label="Administrar bloqueos" icon="slash" variant="ghost" compact onPress={() => setBlocksOpen(true)} />
            </View>
          </View>

          <View style={styles.settingsSection}>
            <SectionTitle eyebrow="SEGURIDAD" title="Sesión y acceso" />
            <View style={styles.securityNote}><Feather name="shield" size={18} color={colors.success} /><Text style={styles.securityNoteText}>La sesión se renueva automáticamente y se almacena de forma segura en este dispositivo.</Text></View>
            <Button label="Cambiar contraseña" icon="key" variant="secondary" onPress={() => setPasswordOpen(true)} />
            <Button label="Cerrar sesión en todos los dispositivos" icon="shield" variant="ghost" onPress={onLogoutAll} />
            <Button label="Cerrar sesión" icon="log-out" variant="danger" onPress={onLogout} style={styles.settingsLogout} />
            <Button label="Eliminar mi cuenta" icon="trash-2" variant="danger" onPress={onDeleteAccount} />
          </View>
        </View>
      </View>

      <Modal transparent visible={passwordOpen} animationType="fade" onRequestClose={() => setPasswordOpen(false)}>
        <View style={[styles.modalBackdrop, responsive.isPhone && styles.modalBackdropPhone]}><View style={[styles.composeModal, responsive.isPhone && styles.composeModalPhone]}>
          <Text style={styles.modalEyebrow}>SEGURIDAD</Text><Text style={styles.modalTitle}>Nueva contraseña</Text>
          <Text style={styles.inputLabel}>Contraseña</Text><TextInput value={newPassword} onChangeText={setNewPassword} secureTextEntry autoCapitalize="none" placeholder="Mínimo 8 caracteres" placeholderTextColor={colors.textDim} style={styles.modalInput} />
          {!!passwordError && <Text style={{ color: colors.coral }}>{passwordError}</Text>}
          <View style={styles.modalActions}><Button label="Cancelar" variant="ghost" onPress={() => setPasswordOpen(false)} style={styles.modalAction} /><Button label={passwordBusy ? 'Guardando…' : 'Cambiar'} disabled={passwordBusy || newPassword.length < 8} onPress={savePassword} style={styles.modalAction} /></View>
        </View></View>
      </Modal>

      <Modal transparent visible={blocksOpen} animationType="fade" onRequestClose={() => setBlocksOpen(false)}>
        <View style={[styles.modalBackdrop, responsive.isPhone && styles.modalBackdropPhone]}><View style={[styles.composeModal, responsive.isPhone && styles.composeModalPhone]}>
          <Text style={styles.modalEyebrow}>PRIVACIDAD</Text><Text style={styles.modalTitle}>Usuarios bloqueados</Text>
          {blockedUsers.length ? blockedUsers.map((user) => <View key={user.id} style={styles.connectionRow}><Avatar initials={user.name.slice(0, 2).toUpperCase()} /><View style={styles.connectionCopy}><Text style={styles.connectionName}>{user.name}</Text><Text style={styles.connectionStatus}>@{user.username}</Text></View><Button label="Desbloquear" compact variant="ghost" onPress={() => onUnblock(user.id)} /></View>) : <Text style={styles.settingsHelp}>No tienes usuarios bloqueados.</Text>}
          <Button label="Cerrar" variant="secondary" onPress={() => setBlocksOpen(false)} />
        </View></View>
      </Modal>
    </ScrollView>
  );
}
