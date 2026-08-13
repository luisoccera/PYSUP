import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from './styles/theme';

export function AppLoadingView() {
  return (
    <View style={styles.loading}>
      <View style={styles.mark}><Text style={styles.markText}>P</Text></View>
      <ActivityIndicator color={colors.lime} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mark: {
    width: 70,
    height: 70,
    borderRadius: 23,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-5deg' }],
  },
  markText: {
    color: colors.ink,
    fontSize: 39,
    fontWeight: '900',
    letterSpacing: -3,
    transform: [{ rotate: '5deg' }],
  },
  spinner: { marginTop: 24 },
});
