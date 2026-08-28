import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from './styles/theme';

type State = { error: Error | null };

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (__DEV__) console.error('PYSUP render error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.page}>
        <Text style={styles.mark}>P</Text>
        <Text style={styles.title}>PYSUP necesita recuperarse</Text>
        <Text style={styles.body}>La pantalla encontró un error inesperado. Tus datos remotos no se modificaron.</Text>
        <Pressable accessibilityRole="button" onPress={() => this.setState({ error: null })} style={styles.button}>
          <Text style={styles.buttonText}>Intentar de nuevo</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: colors.ink },
  mark: { width: 64, height: 64, borderRadius: 18, textAlign: 'center', textAlignVertical: 'center', paddingTop: 7, color: colors.ink, backgroundColor: colors.lime, fontSize: 36, fontWeight: '900' },
  title: { color: colors.text, fontSize: 24, fontWeight: '800', marginTop: 24, textAlign: 'center' },
  body: { color: colors.textMuted, fontSize: 15, lineHeight: 22, marginTop: 10, maxWidth: 460, textAlign: 'center' },
  button: { marginTop: 22, backgroundColor: colors.lime, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  buttonText: { color: colors.ink, fontWeight: '800' },
});
