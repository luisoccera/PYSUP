import { Platform, StyleSheet } from 'react-native';
import { colors, radius, shadow, spacing } from './theme';

export const authStyles = StyleSheet.create({
  page: { flex: 1 },
  keyboard: { flex: 1 },

  scroll: { flexGrow: 1, minHeight: '100%', justifyContent: 'center' },

  scrollWide: { flexDirection: 'row' },

  hero: { flex: 1.12, minHeight: 720, padding: 52, justifyContent: 'space-between', overflow: 'hidden' },

  heroCopy: { maxWidth: 570, zIndex: 2 },

  heroKicker: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },

  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.lime },

  heroKickerText: { color: colors.lime, fontSize: 11, fontWeight: '900', letterSpacing: 1.6 },

  heroTitle: { color: colors.text, fontSize: 52, lineHeight: 57, fontWeight: '900', letterSpacing: -2.2 },

  heroAccent: { color: colors.lime },

  heroText: { color: colors.textMuted, fontSize: 16, lineHeight: 25, marginTop: 20, maxWidth: 520 },

  previewCard: { position: 'absolute', width: 260, height: 344, right: -35, bottom: 38, transform: [{ rotate: '7deg' }], opacity: 0.74 },

  previewPoster: { flex: 1, borderRadius: 28, overflow: 'hidden', justifyContent: 'flex-end', ...shadow },

  previewMoon: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(200,255,90,0.14)', top: 46, right: 24 },

  previewCopy: { padding: 22 },

  previewMatch: { color: colors.lime, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },

  previewTitle: { color: colors.white, fontSize: 31, lineHeight: 30, fontWeight: '900', marginVertical: 7 },

  previewMeta: { color: colors.textMuted, fontSize: 8, fontWeight: '800' },

  previewActions: { position: 'absolute', flexDirection: 'row', gap: 10, bottom: -28, left: 70 },

  previewAction: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, backgroundColor: colors.panel, alignItems: 'center', justifyContent: 'center' },

  heroFoot: { color: colors.textDim, fontSize: 11, fontWeight: '600' },

  authPanel: { width: '42%', maxWidth: 590, minWidth: 480, backgroundColor: 'rgba(7,10,18,0.78)', paddingHorizontal: 64, paddingVertical: 48, justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: colors.line },

  authPanelMobile: { width: '100%', maxWidth: 540, minWidth: 0, alignSelf: 'center', paddingHorizontal: 22, paddingVertical: 42, backgroundColor: 'transparent', borderLeftWidth: 0 },

  mobileLogo: { marginBottom: 44 },

  welcome: { color: colors.text, fontSize: 31, fontWeight: '900', letterSpacing: -1 },

  welcomeSub: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 26 },

  modeSwitch: { flexDirection: 'row', backgroundColor: colors.inkSoft, borderRadius: 15, padding: 4, borderWidth: 1, borderColor: colors.line, marginBottom: 23 },

  modeItem: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },

  modeItemActive: { backgroundColor: colors.panelRaised },

  modeText: { color: colors.textMuted, fontSize: 13, fontWeight: '800' },

  modeTextActive: { color: colors.text },

  fieldGroup: { marginBottom: 15 },
  fieldLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '800', marginBottom: 7 },

  field: { minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.inkSoft, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 11 },

  fieldFocused: { borderColor: colors.lime },
  fieldError: { borderColor: colors.coral },

  input: { flex: 1, color: colors.text, fontSize: 14, paddingVertical: Platform.OS === 'web' ? 15 : 10, outlineStyle: 'none' } as any,
  errorText: { color: colors.coral, fontSize: 11, marginTop: 5 },

  formOptions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 1 },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },

  checkbox: { width: 19, height: 19, borderRadius: 6, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },

  checkboxActive: { backgroundColor: colors.lime, borderColor: colors.lime },

  checkLabel: { color: colors.textMuted, fontSize: 12 },
  terms: { color: colors.textMuted, fontSize: 12, lineHeight: 17, flex: 1 },

  link: { color: colors.lime, fontSize: 12, fontWeight: '800' },

  submit: { marginTop: 22 },

  demoAccess: { marginTop: 10 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 20 },
  dividerLine: { height: 1, backgroundColor: colors.line, flex: 1 },
  dividerText: { color: colors.textDim, fontSize: 11 },

  socialRow: { flexDirection: 'row', gap: 10 },
  socialButton: { flex: 1 },

  secureRow: { flexDirection: 'row', alignItems: 'center', gap: 7, justifyContent: 'center', marginTop: 20 },
  secureText: { color: colors.textDim, fontSize: 10, textAlign: 'center' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 20 },

  recoveryCard: { width: '100%', maxWidth: 430, backgroundColor: colors.panel, borderRadius: radius.xl, padding: 28, borderWidth: 1, borderColor: colors.line, gap: 12, ...shadow },

  recoveryIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },

  recoveryTitle: { color: colors.text, fontSize: 25, fontWeight: '900' },
  recoveryText: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: 6 },

});

export const onboardingStyles = StyleSheet.create({
  page: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.lg },

  top: { width: '100%', maxWidth: 980, alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skip: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },

  progressRow: { flexDirection: 'row', gap: 7, width: '100%', maxWidth: 980, alignSelf: 'center', marginTop: 26 },
  progress: { flex: 1, height: 4, backgroundColor: colors.line, borderRadius: 2 },
  progressActive: { backgroundColor: colors.lime },

  content: { width: '100%', maxWidth: 720, alignSelf: 'center', flex: 1, justifyContent: 'center', paddingVertical: 44 },

  stepIcon: { width: 64, height: 64, borderRadius: 21, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  flagLarge: { fontSize: 31 },

  kicker: { color: colors.lime, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },

  title: { color: colors.text, fontSize: 38, lineHeight: 43, fontWeight: '900', letterSpacing: -1.3 },
  titlePhone: { fontSize: 31, lineHeight: 36, letterSpacing: -0.9 },
  titleCompactPhone: { fontSize: 28, lineHeight: 33 },
  subtitle: { color: colors.textMuted, fontSize: 15, lineHeight: 23, marginTop: 12, marginBottom: 28, maxWidth: 630 },

  countryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  countryCard: { width: '48%', minWidth: 220, flexGrow: 1, minHeight: 72, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  countryCardActive: { borderColor: colors.lime, backgroundColor: 'rgba(200,255,90,0.08)' },
  countryFlag: { color: colors.text, fontSize: 13, fontWeight: '900', letterSpacing: 1, width: 26 },
  countryName: { color: colors.textMuted, fontWeight: '800', flex: 1 },
  countryNameActive: { color: colors.text },
  selectedCheck: { width: 23, height: 23, borderRadius: 8, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },

  providerList: { gap: 10 },
  providerCard: { minHeight: 70, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 13 },
  providerCardActive: { borderColor: 'rgba(98,217,159,0.5)' },
  providerCopy: { flex: 1 },
  providerName: { color: colors.text, fontSize: 14, fontWeight: '900' },
  providerStatus: { color: colors.textMuted, fontSize: 11, marginTop: 3 },

  privacyNote: { marginTop: 15, padding: 13, backgroundColor: 'rgba(98,217,159,0.08)', borderRadius: 13, flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  privacyText: { color: colors.textMuted, fontSize: 11, lineHeight: 17, flex: 1 },

  genreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 25 },

  readyCard: { backgroundColor: colors.panel, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  readyIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: 'rgba(200,255,90,0.10)', alignItems: 'center', justifyContent: 'center' },
  readyCopy: { flex: 1 },
  readyTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  readyText: { color: colors.textMuted, fontSize: 12, marginTop: 4 },

  footer: { width: '100%', maxWidth: 720, alignSelf: 'center', flexDirection: 'row', gap: 12 },
  footerPhone: { paddingBottom: 8 },
  backButton: { flex: 0.45 },
  nextButton: { flex: 1 },

});
