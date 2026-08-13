import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  ImageBackground,
  PanResponder,
  Platform,
  Pressable,
  StyleProp,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ContentItem, ProviderId } from '../../models/types';
import { providers } from '../../models/catalogue';
import { colors } from '../styles/theme';
import { styles } from '../styles/uiStyles';

export type IconName = React.ComponentProps<typeof Feather>['name'];

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.logoRow}>
      <View style={[styles.logoMark, compact && styles.logoMarkCompact]}>
        <Text style={[styles.logoMarkText, compact && styles.logoMarkTextCompact]}>P</Text>
      </View>
      {!compact && <Text style={styles.logoText}>PYSUP</Text>}
    </View>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({ label, onPress, icon, variant = 'primary', disabled, compact, style }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        compact && styles.buttonCompact,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon && <Feather name={icon} size={compact ? 16 : 18} color={variant === 'primary' ? colors.ink : colors.text} />}
      <Text style={[styles.buttonText, variant === 'primary' && styles.buttonTextPrimary, compact && styles.buttonTextCompact]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, badge }: { icon: IconName; label: string; onPress: () => void; badge?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Feather name={icon} size={20} color={colors.text} />
      {badge && <View style={styles.notificationDot} />}
    </Pressable>
  );
}

export function Avatar({ initials, color = colors.purple, size = 42, online }: { initials: string; color?: string; size?: number; online?: boolean }) {
  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
        <Text style={[styles.avatarText, { fontSize: Math.max(11, size * 0.31) }]}>{initials}</Text>
      </View>
      {online !== undefined && <View style={[styles.onlineDot, { backgroundColor: online ? colors.success : colors.textDim }]} />}
    </View>
  );
}

export function Pill({ label, active = false, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName }) {
  const inner = (
    <>
      {icon && <Feather name={icon} size={14} color={active ? colors.ink : colors.textMuted} />}
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </>
  );
  if (!onPress) return <View style={[styles.pill, active && styles.pillActive]}>{inner}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pill, active && styles.pillActive, pressed && styles.pressed]}>
      {inner}
    </Pressable>
  );
}

export function ProviderBadge({ id, connected, compact = false }: { id: ProviderId; connected?: boolean; compact?: boolean }) {
  const provider = providers.find((item) => item.id === id)!;
  return (
    <View style={[styles.providerBadge, { backgroundColor: provider.color }, compact && styles.providerBadgeCompact]}>
      <Text style={[styles.providerBadgeText, compact && styles.providerBadgeTextCompact]}>{provider.shortName}</Text>
      {connected && <Feather name="check" size={11} color={provider.foreground} />}
    </View>
  );
}

export function SectionTitle({ eyebrow, title, action, onAction }: { eyebrow?: string; title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionTitleCopy}>
        {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action && onAction && (
        <Pressable onPress={onAction} style={styles.textAction}>
          <Text style={styles.textActionLabel}>{action}</Text>
          <Feather name="arrow-up-right" size={16} color={colors.lime} />
        </Pressable>
      )}
    </View>
  );
}

export function MatchBar({ value }: { value: number }) {
  return (
    <View style={styles.matchRow}>
      <Text style={styles.matchValue}>{value}% para ti</Text>
      <View style={styles.matchTrack}>
        <View style={[styles.matchFill, { width: `${value}%` }]} />
      </View>
    </View>
  );
}

export function MiniPoster({ item, onPress, width = 172 }: { item: ContentItem; onPress: () => void; width?: number }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.miniPoster, { width }, pressed && styles.pressed]}>
      <ImageBackground source={item.image} style={styles.miniPosterImage} imageStyle={styles.miniPosterImageRadius}>
        <LinearGradient colors={['transparent', 'rgba(7,10,18,0.96)']} style={styles.miniPosterGradient}>
          <View style={styles.miniPosterTop}><Text style={styles.matchChip}>{item.match}%</Text></View>
          <View>
            <Text numberOfLines={1} style={styles.miniPosterTitle}>{item.title}</Text>
            <Text style={styles.miniPosterMeta}>{item.type} · {item.year}</Text>
          </View>
        </LinearGradient>
      </ImageBackground>
    </Pressable>
  );
}

type SwipeAction = 'pass' | 'like' | 'save';

export function SwipeDeck({ item, nextItem, onAction, onOpen }: {
  item: ContentItem;
  nextItem?: ContentItem;
  onAction: (action: SwipeAction, item: ContentItem) => void;
  onOpen: (item: ContentItem) => void;
}) {
  const pan = useRef(new Animated.ValueXY()).current;
  const locked = useRef(false);

  useEffect(() => {
    pan.setValue({ x: 0, y: 0 });
    locked.current = false;
  }, [item.id, pan]);

  const rotate = pan.x.interpolate({ inputRange: [-220, 0, 220], outputRange: ['-10deg', '0deg', '10deg'], extrapolate: 'clamp' });
  const likeOpacity = pan.x.interpolate({ inputRange: [30, 110], outputRange: [0, 1], extrapolate: 'clamp' });
  const passOpacity = pan.x.interpolate({ inputRange: [-110, -30], outputRange: [1, 0], extrapolate: 'clamp' });
  const saveOpacity = pan.y.interpolate({ inputRange: [-130, -35], outputRange: [1, 0], extrapolate: 'clamp' });

  const finish = (action: SwipeAction, x: number, y: number) => {
    if (locked.current) return;
    locked.current = true;
    Animated.timing(pan, { toValue: { x, y }, duration: 220, useNativeDriver: false }).start(() => onAction(action, item));
  };

  const reset = () => Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 6, tension: 55, useNativeDriver: false }).start();

  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 7 || Math.abs(gesture.dy) > 7,
    onPanResponderMove: (_, gesture) => pan.setValue({ x: gesture.dx, y: gesture.dy * 0.4 }),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy < -100 && Math.abs(gesture.dx) < 90) finish('save', 0, -700);
      else if (gesture.dx > 95) finish('like', 700, gesture.dy);
      else if (gesture.dx < -95) finish('pass', -700, gesture.dy);
      else reset();
    },
    onPanResponderTerminate: reset,
  }), [item.id]);

  return (
    <View style={styles.deckWrap}>
      {nextItem && (
        <View style={[styles.swipeCard, styles.nextCard]}>
          <ImageBackground source={nextItem.image} style={styles.swipeImage} imageStyle={styles.swipeImageRadius} />
        </View>
      )}
      <Animated.View {...responder.panHandlers} style={[styles.swipeCard, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] }]}>
        <Pressable onPress={() => onOpen(item)} style={styles.swipePressable}>
          <ImageBackground source={item.image} style={styles.swipeImage} imageStyle={styles.swipeImageRadius}>
            <LinearGradient colors={['rgba(7,10,18,0.05)', 'rgba(7,10,18,0.12)', 'rgba(7,10,18,0.98)']} locations={[0, 0.48, 1]} style={styles.swipeGradient}>
              <View style={styles.swipeTopRow}>
                <View style={styles.matchBig}><Text style={styles.matchBigValue}>{item.match}%</Text><Text style={styles.matchBigLabel}>MATCH</Text></View>
                <View style={styles.providerRow}>{item.providers.map((id) => <ProviderBadge key={id} id={id} compact />)}</View>
              </View>
              <View style={styles.swipeCopy}>
                <Text style={styles.swipeType}>{item.type.toUpperCase()} · {item.year}</Text>
                <Text style={styles.swipeTitle}>{item.title}</Text>
                <Text style={styles.swipeSubtitle}>{item.subtitle}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.rating}><Feather name="star" size={15} color={colors.yellow} /><Text style={styles.ratingText}>{item.score}</Text></View>
                  <Text style={styles.metaText}>{item.duration}</Text>
                  <Text style={styles.metaText}>{item.maturity}</Text>
                </View>
                <View style={styles.genreRow}>{item.genres.map((genre) => <Pill key={genre} label={genre} />)}</View>
                <View style={styles.whyRow}><Feather name="zap" size={16} color={colors.lime} /><Text numberOfLines={2} style={styles.whyText}>{item.reason}</Text></View>
              </View>
              <Animated.View style={[styles.gestureStamp, styles.likeStamp, { opacity: likeOpacity }]}><Text style={styles.likeStampText}>ME GUSTA</Text></Animated.View>
              <Animated.View style={[styles.gestureStamp, styles.passStamp, { opacity: passOpacity }]}><Text style={styles.passStampText}>PASAR</Text></Animated.View>
              <Animated.View style={[styles.gestureStamp, styles.saveStamp, { opacity: saveOpacity }]}><Text style={styles.saveStampText}>GUARDAR</Text></Animated.View>
            </LinearGradient>
          </ImageBackground>
        </Pressable>
      </Animated.View>
      <View style={styles.swipeActions}>
        <Pressable accessibilityLabel="No me interesa" onPress={() => finish('pass', -700, 0)} style={[styles.swipeAction, styles.swipeActionPass]}><Feather name="x" size={28} color={colors.coral} /></Pressable>
        <Pressable accessibilityLabel="Guardar para después" onPress={() => finish('save', 0, -700)} style={[styles.swipeAction, styles.swipeActionSave]}><Feather name="bookmark" size={22} color={colors.blue} /></Pressable>
        <Pressable accessibilityLabel="Me gusta" onPress={() => finish('like', 700, 0)} style={[styles.swipeAction, styles.swipeActionLike]}><Feather name="heart" size={27} color={colors.ink} /></Pressable>
      </View>
    </View>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}
