import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { countries } from '../../models/catalogue';
import { ProviderId, TabId } from '../../models/types';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import { Avatar, IconButton, IconName, Logo, ProviderBadge } from '../components/ui';
import { colors } from '../styles/theme';
import { mainStyles as styles } from '../styles/mainStyles';

export const navItems: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'home', label: 'Inicio', icon: 'home' },
  { id: 'discover', label: 'Descubrir', icon: 'compass' },
  { id: 'roulette', label: 'Ruleta', icon: 'disc' },
  { id: 'forum', label: 'Foros', icon: 'message-circle' },
  { id: 'friends', label: 'Amigos', icon: 'users' },
  { id: 'settings', label: 'Config.', icon: 'settings' },
];

export function AppHeader({ name, country, notificationCount, onNotifications, onProfile, onSettings }: { name: string; country: string; notificationCount: number; onNotifications: () => void; onProfile: () => void; onSettings: () => void }) {
  const { isPhone, isCompactPhone } = useResponsiveLayout();
  const selectedCountry = countries.find((item) => item.code === country);
  return (
    <View style={[styles.appHeader, isPhone && styles.appHeaderPhone]}>
      <View style={styles.headerContext}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cambiar país" onPress={onSettings} style={({ pressed }) => [styles.locationChip, pressed && styles.headerPressed]}><Text style={styles.locationFlag}>{selectedCountry?.code}</Text>{!isCompactPhone && <Text numberOfLines={1} style={styles.locationText}>{selectedCountry?.name}</Text>}<Feather name="chevron-down" size={13} color={colors.textMuted} /></Pressable>
      </View>
      <View style={styles.headerActions}>
        <IconButton icon="bell" label={`Notificaciones${notificationCount ? `, ${notificationCount} ${notificationCount === 1 ? 'nueva' : 'nuevas'}` : ''}`} onPress={onNotifications} badge={notificationCount > 0} />
        <Pressable accessibilityRole="button" accessibilityLabel="Abrir mi perfil" onPress={onProfile} style={({ pressed }) => [styles.headerAvatarButton, pressed && styles.headerPressed]}>
          <Avatar initials={name.slice(0, 2).toUpperCase()} size={42} color="#5E4EA1" online />
        </Pressable>
      </View>
    </View>
  );
}

export function Sidebar({ active, onSelect, onLogout, connected }: { active: TabId; onSelect: (tab: TabId) => void; onLogout: () => void; connected: ProviderId[] }) {
  return (
    <View style={styles.sidebar}>
      <Logo />
      <View style={styles.sidebarNav}>
        {navItems.map((item) => (
          <Pressable key={item.id} onPress={() => onSelect(item.id)} style={[styles.sidebarItem, active === item.id && styles.sidebarItemActive]}>
            <View style={[styles.sidebarIcon, active === item.id && styles.sidebarIconActive]}><Feather name={item.icon} size={19} color={active === item.id ? colors.ink : colors.textMuted} /></View>
            <Text style={[styles.sidebarLabel, active === item.id && styles.sidebarLabelActive]}>{item.id === 'settings' ? 'Configuración' : item.label}</Text>
            {item.id === 'forum' && <View style={styles.navBadge}><Text style={styles.navBadgeText}>3</Text></View>}
          </Pressable>
        ))}
      </View>
      <View style={styles.sidebarBottom}>
        <Text style={styles.sidebarCaption}>PLATAFORMAS</Text>
        <View style={styles.sidebarProviders}>{connected.length ? connected.map((id) => <ProviderBadge key={id} id={id} connected compact />) : <Text style={styles.noConnections}>Sin conexiones</Text>}</View>
        <Pressable onPress={onLogout} style={styles.logout}><Feather name="log-out" size={17} color={colors.textMuted} /><Text style={styles.logoutText}>Cerrar sesión</Text></Pressable>
      </View>
    </View>
  );
}

export function MobileNav({ active, onSelect }: { active: TabId; onSelect: (tab: TabId) => void }) {
  const insets = useSafeAreaInsets();
  const { isCompactPhone } = useResponsiveLayout();
  return (
    <View style={[styles.mobileNav, { height: 64 + insets.bottom, paddingBottom: Math.max(insets.bottom, 5) }]}>
      {navItems.map((item) => (
        <Pressable key={item.id} onPress={() => onSelect(item.id)} style={styles.mobileNavItem}>
          <View style={[styles.mobileNavIcon, active === item.id && styles.mobileNavIconActive]}><Feather name={item.icon} size={isCompactPhone ? 18 : 20} color={active === item.id ? colors.ink : colors.textDim} /></View>
          <Text numberOfLines={1} style={[styles.mobileNavLabel, active === item.id && styles.mobileNavLabelActive]}>{isCompactPhone && item.id === 'discover' ? 'Explorar' : item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function PageTitle({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  const { isPhone, isCompactPhone } = useResponsiveLayout();
  return (
    <View style={styles.pageTitleWrap}>
      {eyebrow && <Text style={styles.pageEyebrow}>{eyebrow}</Text>}
      <Text style={[styles.pageTitle, isPhone && styles.pageTitlePhone, isCompactPhone && styles.pageTitleCompactPhone]}>{title}</Text>
      {description && <Text style={styles.pageDescription}>{description}</Text>}
    </View>
  );
}
