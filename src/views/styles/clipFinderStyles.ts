import { StyleSheet } from 'react-native';
import { colors, radius, shadow, spacing } from './theme';

export const styles = StyleSheet.create({
  root: { width: '100%', paddingBottom: 30 },

  introGrid: { flexDirection: 'row', gap: 20, alignItems: 'stretch' },

  introGridCompact: { flexDirection: 'column' },

  finderCard: { flex: 1.45, backgroundColor: colors.panel, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.lg, ...shadow },

  finderHeader: { flexDirection: 'row', alignItems: 'center', gap: 13 },

  finderIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center' },

  finderHeaderCopy: { flex: 1 },

  finderEyebrow: { color: colors.lime, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },

  finderTitle: { color: colors.text, fontSize: 22, lineHeight: 27, fontWeight: '900', marginTop: 3 },

  demoBadge: { backgroundColor: 'rgba(111,168,255,0.1)', borderWidth: 1, borderColor: 'rgba(111,168,255,0.3)', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 },

  demoBadgeText: { color: colors.blue, fontSize: 8, fontWeight: '900', letterSpacing: 1 },

  finderDescription: { color: colors.textMuted, fontSize: 12, lineHeight: 19, marginTop: 15 },

  sourceTabs: { flexDirection: 'row', backgroundColor: colors.inkSoft, borderRadius: 14, borderWidth: 1, borderColor: colors.line, padding: 4, marginVertical: 20 },

  sourceTab: { flex: 1, minHeight: 42, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },

  sourceTabActive: { backgroundColor: colors.lime },

  sourceTabText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },

  sourceTabTextActive: { color: colors.ink },

  inputLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', marginBottom: 7 },

  urlInput: { minHeight: 54, borderRadius: 15, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.inkSoft, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },

  urlInputError: { borderColor: 'rgba(255,107,107,0.65)' },

  input: { flex: 1, color: colors.text, fontSize: 13, outlineStyle: 'none' } as any,
  networks: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },

  dropzone: { minHeight: 170, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.textDim, backgroundColor: colors.inkSoft, alignItems: 'center', justifyContent: 'center', padding: 22 },

  dropzonePressed: { opacity: 0.72 },

  dropzoneSelected: { borderColor: colors.lime, backgroundColor: 'rgba(200,255,90,0.05)' },

  uploadIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(200,255,90,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },

  dropzoneTitle: { color: colors.text, fontSize: 14, fontWeight: '900', textAlign: 'center' },

  dropzoneText: { color: colors.textMuted, fontSize: 10, marginTop: 5, textAlign: 'center' },

  dropzoneAction: { color: colors.lime, fontSize: 11, fontWeight: '900', marginTop: 11 },

  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 18 },

  checkbox: { width: 19, height: 19, borderRadius: 6, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },

  checkboxActive: { backgroundColor: colors.lime, borderColor: colors.lime },

  consentText: { flex: 1, color: colors.textMuted, fontSize: 10, lineHeight: 15 },

  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: 12, backgroundColor: 'rgba(255,107,107,0.08)', borderRadius: 11, padding: 10 },

  errorText: { color: colors.coral, fontSize: 10, lineHeight: 15, flex: 1 },

  analyzeButton: { marginTop: 18 },

  progressCard: { marginTop: 18, backgroundColor: colors.inkSoft, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, padding: 14 },

  progressTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },

  progressLabel: { color: colors.text, fontSize: 11, fontWeight: '800' },

  progressValue: { color: colors.lime, fontSize: 11, fontWeight: '900' },

  progressTrack: { height: 5, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden', marginTop: 10 },

  progressFill: { height: '100%', backgroundColor: colors.lime, borderRadius: 3 },

  analysisSignals: { flexDirection: 'row', flexWrap: 'wrap', gap: 13, marginTop: 12 },

  signal: { flexDirection: 'row', alignItems: 'center', gap: 5 },

  signalText: { color: colors.textMuted, fontSize: 9 },

  howCard: { flex: 0.72, minWidth: 270, backgroundColor: colors.panel, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, padding: spacing.lg },

  howEyebrow: { color: colors.lime, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },

  howTitle: { color: colors.text, fontSize: 21, fontWeight: '900', marginTop: 5, marginBottom: 17 },

  howStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 13, borderTopWidth: 1, borderTopColor: colors.line },

  stepNumber: { color: colors.textDim, fontSize: 9, fontWeight: '900', marginTop: 5 },

  stepIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: 'rgba(200,255,90,0.08)', alignItems: 'center', justifyContent: 'center' },

  stepCopy: { flex: 1 },

  stepTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },

  stepText: { color: colors.textMuted, fontSize: 10, lineHeight: 15, marginTop: 3 },

  privacyCard: { flexDirection: 'row', gap: 9, backgroundColor: 'rgba(98,217,159,0.07)', borderRadius: 13, padding: 12, marginTop: 15 },

  privacyCopy: { flex: 1 },

  privacyTitle: { color: colors.success, fontSize: 10, fontWeight: '900' },

  privacyText: { color: colors.textMuted, fontSize: 9, lineHeight: 14, marginTop: 3 },

  resultSection: { marginTop: 24 },

  resultHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 14 },

  resultEyebrow: { color: colors.lime, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },

  resultHeadingTitle: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 4 },

  resultCard: { flexDirection: 'row', backgroundColor: colors.panel, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', ...shadow },

  resultCardCompact: { flexDirection: 'column' },

  resultImage: { width: '38%', minHeight: 410 },

  resultImageCompact: { width: '100%', minHeight: 270 },

  resultImageRadius: { borderTopLeftRadius: radius.xl, borderBottomLeftRadius: radius.xl },

  confidenceBadge: { position: 'absolute', left: 18, top: 18, width: 64, height: 64, borderRadius: 20, backgroundColor: colors.lime, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-3deg' }] },

  confidenceValue: { color: colors.ink, fontSize: 17, fontWeight: '900' },

  confidenceLabel: { color: colors.ink, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },

  resultCopy: { flex: 1, padding: spacing.lg },

  resultType: { color: colors.lime, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },

  resultTitle: { color: colors.text, fontSize: 32, lineHeight: 36, fontWeight: '900', letterSpacing: -1, marginTop: 5 },

  resultSubtitle: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginTop: 4 },

  resultMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 13 },

  resultMetaText: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },

  resultSynopsis: { color: colors.text, fontSize: 12, lineHeight: 19, marginTop: 14 },

  evidenceCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: 'rgba(200,255,90,0.06)', borderRadius: 13, padding: 12, marginTop: 14 },

  evidenceCopy: { flex: 1 },

  evidenceTitle: { color: colors.text, fontSize: 10, fontWeight: '900' },

  evidenceText: { color: colors.textMuted, fontSize: 9, lineHeight: 14, marginTop: 3 },

  availabilityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between', marginTop: 15, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 14 },

  availabilityLabel: { color: colors.text, fontSize: 11, fontWeight: '900' },

  availabilityNote: { color: colors.success, fontSize: 9, marginTop: 3 },

  resultActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 17 },

  resultAction: { flex: 1, minWidth: 160 },

  disclaimer: { color: colors.textDim, fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 11, paddingHorizontal: 20 },

});
