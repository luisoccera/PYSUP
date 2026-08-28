import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, Logo } from './components/ui';
import { colors } from './styles/theme';
import { toAppError } from '../utils/errors';

export function FatalStateView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <View style={styles.page}><Logo /><Feather name="alert-triangle" size={38} color={colors.coral} /><Text style={styles.title}>No pudimos conectar PYSUP</Text><Text accessibilityRole="alert" style={styles.body}>{message}</Text><Button label="Reintentar conexión" icon="refresh-cw" onPress={onRetry} /></View>;
}

export function PasswordRecoveryView({ onSubmit }: { onSubmit: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const submit = async () => {
    if (submitting.current) return;
    if (password.length < 8) return setError('La nueva contraseña debe tener al menos 8 caracteres.');
    if (password !== confirmation) return setError('Las contraseñas no coinciden.');
    submitting.current = true;
    setLoading(true);
    setError('');
    try { await onSubmit(password); }
    catch (caught) { setError(toAppError(caught).message); }
    finally { submitting.current = false; setLoading(false); }
  };
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.page}><Logo /><Feather name="key" size={38} color={colors.lime} /><Text style={styles.title}>Crea una nueva contraseña</Text><Text style={styles.body}>El enlace fue validado. Este cambio se aplicará a tu misma cuenta en todos los dispositivos.</Text><TextInput accessibilityLabel="Nueva contraseña" secureTextEntry value={password} onChangeText={setPassword} placeholder="Mínimo 8 caracteres" placeholderTextColor={colors.textDim} style={styles.input} /><TextInput accessibilityLabel="Confirmar nueva contraseña" secureTextEntry value={confirmation} onChangeText={setConfirmation} placeholder="Repite la contraseña" placeholderTextColor={colors.textDim} style={styles.input} />{!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}<Button label={loading ? 'Actualizando…' : 'Guardar nueva contraseña'} icon="shield" disabled={loading} onPress={() => { void submit(); }} /></KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, minHeight: '100%', backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 28 },
  title: { color: colors.text, fontSize: 25, fontWeight: '900', textAlign: 'center', marginTop: 8 },
  body: { color: colors.textMuted, fontSize: 13, lineHeight: 20, textAlign: 'center', maxWidth: 480 },
  input: { width: '100%', maxWidth: 460, minHeight: 52, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.panel, color: colors.text, paddingHorizontal: 16 },
  error: { color: colors.coral, fontSize: 12, maxWidth: 460, textAlign: 'center' },
});
