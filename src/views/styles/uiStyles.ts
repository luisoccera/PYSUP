import { StyleSheet } from 'react-native';
import { colors, radius, shadow, spacing } from './theme';

export const styles = StyleSheet.create({
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  logoMark: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },

  logoMarkCompact: { width: 34, height: 34, borderRadius: 11 },

  logoMarkText: { color: colors.ink, fontSize: 22, fontWeight: '900', letterSpacing: -2, transform: [{ rotate: '5deg' }] },

  logoMarkTextCompact: { fontSize: 19 },

  logoText: { color: colors.text, fontSize: 23, fontWeight: '900', letterSpacing: 2.5 },

  button: { minHeight: 52, paddingHorizontal: 20, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1 },

  button_primary: { backgroundColor: colors.lime, borderColor: colors.lime },

  button_secondary: { backgroundColor: colors.panelRaised, borderColor: colors.line },

  button_ghost: { backgroundColor: 'transparent', borderColor: colors.line },

  button_danger: { backgroundColor: 'rgba(255,107,107,0.12)', borderColor: 'rgba(255,107,107,0.4)' },

  buttonCompact: { minHeight: 38, paddingHorizontal: 14, borderRadius: 12 },

  buttonText: { color: colors.text, fontSize: 15, fontWeight: '800' },

  buttonTextPrimary: { color: colors.ink },

  buttonTextCompact: { fontSize: 13 },

  iconButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },

  notificationDot: { position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: colors.coral, borderWidth: 1.5, borderColor: colors.panel },

  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },

  disabled: { opacity: 0.42 },

  avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.18)' },

  avatarText: { color: colors.white, fontWeight: '900' },

  onlineDot: { position: 'absolute', width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: colors.inkSoft, right: 0, bottom: 1 },

  pill: { minHeight: 30, paddingHorizontal: 11, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: 'rgba(18,23,37,0.75)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },

  pillActive: { backgroundColor: colors.lime, borderColor: colors.lime },

  pillText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },

  pillTextActive: { color: colors.ink },

  providerBadge: { minWidth: 42, height: 32, borderRadius: 10, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },

  providerBadgeCompact: { minWidth: 33, height: 25, borderRadius: 8, paddingHorizontal: 6 },

  providerBadgeText: { color: colors.white, fontSize: 12, fontWeight: '900' },

  providerBadgeTextCompact: { fontSize: 10 },

  watchOffer: { flexGrow: 1, minWidth: 152, minHeight: 58, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panelRaised, paddingHorizontal: 11, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10 },

  watchOfferMark: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  watchOfferMarkText: { color: colors.white, fontSize: 15, fontWeight: '900' },

  watchOfferMarkTextDark: { color: colors.ink },

  watchOfferCopy: { flex: 1 },

  watchOfferName: { color: colors.text, fontSize: 12, fontWeight: '900' },

  watchOfferAccess: { color: colors.textMuted, fontSize: 9, fontWeight: '700', marginTop: 2 },

  sectionTitleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: spacing.md },

  sectionTitleCopy: { flex: 1 },

  eyebrow: { color: colors.lime, fontSize: 11, fontWeight: '900', letterSpacing: 1.6, marginBottom: 5 },

  sectionTitle: { color: colors.text, fontSize: 23, lineHeight: 28, fontWeight: '900', letterSpacing: -0.5 },

  textAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5 },

  textActionLabel: { color: colors.lime, fontWeight: '800', fontSize: 13 },

  matchRow: { gap: 7 },

  matchValue: { color: colors.lime, fontWeight: '900', fontSize: 12 },

  matchTrack: { height: 4, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' },

  matchFill: { height: '100%', backgroundColor: colors.lime, borderRadius: 2 },

  miniPoster: { height: 240, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.panel, marginRight: 12 },

  miniPosterImage: { flex: 1 },

  miniPosterImageRadius: { borderRadius: radius.lg },

  miniPosterGradient: { flex: 1, justifyContent: 'space-between', padding: 13 },

  miniPosterTop: { alignItems: 'flex-start' },

  matchChip: { color: colors.ink, backgroundColor: colors.lime, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5, fontSize: 11, fontWeight: '900', overflow: 'hidden' },

  miniPosterTitle: { color: colors.white, fontSize: 16, fontWeight: '900', marginBottom: 3 },

  miniPosterMeta: { color: '#D0D5DF', fontSize: 11, fontWeight: '600' },

  deckWrap: { width: '100%', maxWidth: 470, alignSelf: 'center', paddingBottom: 92 },
  deckWrapPhone: { paddingBottom: 84 },

  swipeCard: { height: 620, borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.panel, ...shadow },

  nextCard: { position: 'absolute', left: 12, right: 12, top: 15, height: 620, transform: [{ scale: 0.96 }], opacity: 0.55 },

  swipePressable: { flex: 1 },

  swipeImage: { flex: 1 },

  swipeImageRadius: { borderRadius: radius.xl },

  swipeGradient: { flex: 1, justifyContent: 'space-between', padding: 22 },
  swipeGradientPhone: { padding: 16 },

  swipeTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },

  matchBig: { backgroundColor: colors.lime, width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-3deg' }] },

  matchBigValue: { color: colors.ink, fontWeight: '900', fontSize: 17 },

  matchBigLabel: { color: colors.ink, fontWeight: '900', fontSize: 8, letterSpacing: 1 },

  providerRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },

  swipeCopy: { gap: 10 },

  swipeType: { color: colors.lime, fontSize: 11, letterSpacing: 1.6, fontWeight: '900' },

  swipeTitle: { color: colors.white, fontSize: 38, lineHeight: 40, fontWeight: '900', letterSpacing: -1.4, maxWidth: 360 },
  swipeTitlePhone: { fontSize: 31, lineHeight: 34, letterSpacing: -0.9 },

  swipeSubtitle: { color: '#E7EAF0', fontSize: 14, lineHeight: 20, fontWeight: '600' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  rating: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  ratingText: { color: colors.white, fontWeight: '900', fontSize: 13 },

  metaText: { color: '#D2D7E1', fontSize: 12, fontWeight: '700' },

  genreRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },

  whyRow: { backgroundColor: 'rgba(7,10,18,0.72)', borderWidth: 1, borderColor: 'rgba(200,255,90,0.18)', borderRadius: 15, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },

  whyText: { flex: 1, color: '#D7DDE7', fontSize: 12, lineHeight: 17 },

  gestureStamp: { position: 'absolute', top: 120, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 8, borderWidth: 3, transform: [{ rotate: '-10deg' }] },

  likeStamp: { left: 25, borderColor: colors.lime },

  passStamp: { right: 25, borderColor: colors.coral, transform: [{ rotate: '10deg' }] },

  saveStamp: { top: 96, alignSelf: 'center', borderColor: colors.blue, transform: [{ rotate: '0deg' }] },

  likeStampText: { color: colors.lime, fontSize: 20, fontWeight: '900' },

  passStampText: { color: colors.coral, fontSize: 20, fontWeight: '900' },

  saveStampText: { color: colors.blue, fontSize: 20, fontWeight: '900' },

  swipeActions: { position: 'absolute', bottom: 16, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 18 },

  swipeAction: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, ...shadow },

  swipeActionPass: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.panel, borderColor: 'rgba(255,107,107,0.32)' },

  swipeActionSave: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.panel, borderColor: 'rgba(111,168,255,0.32)' },

  swipeActionLike: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.lime, borderColor: colors.lime },

  stat: { alignItems: 'center', minWidth: 72 },

  statValue: { color: colors.text, fontSize: 21, fontWeight: '900' },

  statLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 3 },

});
