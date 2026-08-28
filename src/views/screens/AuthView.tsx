import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { AuthControllerState } from '../../controllers/useAuthController';
import { Button, Logo } from '../components/ui';
import { authStyles } from '../styles/authStyles';
import { colors } from '../styles/theme';

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  secure?: boolean;
  error?: string;
  keyboardType?: 'default' | 'email-address';
};

function Field({ label, value, onChangeText, placeholder, icon, secure, error, keyboardType }: FieldProps) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={authStyles.fieldGroup}>
      <Text style={authStyles.fieldLabel}>{label}</Text>
      <View style={[authStyles.field, focused && authStyles.fieldFocused, !!error && authStyles.fieldError]}>
        <Feather name={icon} size={18} color={focused ? colors.lime : colors.textDim} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textDim}
          style={authStyles.input}
          secureTextEntry={secure && !visible}
          keyboardType={keyboardType}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
          autoCorrect={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {secure && (
          <Pressable accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'} onPress={() => setVisible((current) => !current)} hitSlop={10}>
            <Feather name={visible ? 'eye-off' : 'eye'} size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={authStyles.errorText}>{error}</Text>}
    </View>
  );
}

export function AuthView({ controller }: { controller: AuthControllerState }) {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [legalOpen, setLegalOpen] = useState<'terms' | 'privacy' | null>(null);
  const {
    mode,
    switchMode,
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword: confirm,
    setConfirmPassword: setConfirm,
    remember,
    toggleRemember,
    acceptedTerms: accepted,
    toggleAcceptedTerms,
    submitted,
    errors,
    loading,
    error,
    info,
    submit,
    canEnterDemo,
    enterDemo,
    continueWithProvider,
    recoveryOpen,
    recoverySent,
    openRecovery,
    closeRecovery,
    sendRecovery,
  } = controller;

  return (
    <LinearGradient colors={[colors.ink, '#10162A', '#131020']} style={authStyles.page}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={authStyles.keyboard}>
        <ScrollView contentContainerStyle={[authStyles.scroll, wide && authStyles.scrollWide]} keyboardShouldPersistTaps="handled">
          {wide && (
            <View style={authStyles.hero}>
              <Logo />
              <View style={authStyles.heroCopy}>
                <View style={authStyles.heroKicker}><View style={authStyles.liveDot} /><Text style={authStyles.heroKickerText}>TU PRÓXIMA HISTORIA ESTÁ AQUÍ</Text></View>
                <Text style={authStyles.heroTitle}>Menos tiempo buscando.{`\n`}Más tiempo <Text style={authStyles.heroAccent}>viendo.</Text></Text>
                <Text style={authStyles.heroText}>PYSUP entiende lo que disfrutas, compara el catálogo disponible en tu país y convierte cada recomendación en una conversación.</Text>
              </View>
              <View style={authStyles.previewCard}>
                <View style={authStyles.previewPoster}>
                  <LinearGradient colors={['#253653', '#151A27']} style={StyleSheet.absoluteFill} />
                  <View style={authStyles.previewMoon} />
                  <View style={authStyles.previewCopy}>
                    <Text style={authStyles.previewMatch}>96% PARA TI</Text>
                    <Text style={authStyles.previewTitle}>Señal{`\n`}nocturna</Text>
                    <Text style={authStyles.previewMeta}>MISTERIO · CIENCIA FICCIÓN</Text>
                  </View>
                </View>
                <View style={authStyles.previewActions}>
                  <View style={[authStyles.previewAction, { borderColor: colors.coral }]}><Feather name="x" size={23} color={colors.coral} /></View>
                  <View style={[authStyles.previewAction, { backgroundColor: colors.lime, borderColor: colors.lime }]}><Feather name="heart" size={21} color={colors.ink} /></View>
                </View>
              </View>
              <Text style={authStyles.heroFoot}>Recomendaciones disponibles para tu catálogo local</Text>
            </View>
          )}

          <View style={[authStyles.authPanel, !wide && authStyles.authPanelMobile]}>
            {!wide && <View style={authStyles.mobileLogo}><Logo /></View>}
            <Text style={authStyles.welcome}>{mode === 'login' ? 'Qué bueno verte' : 'Crea tu espacio'}</Text>
            <Text style={authStyles.welcomeSub}>{mode === 'login' ? 'Entra para seguir descubriendo historias.' : 'Tu perfil, tus plataformas y tus recomendaciones en un solo lugar.'}</Text>
            <View style={authStyles.modeSwitch}>
              <Pressable onPress={() => switchMode('login')} style={[authStyles.modeItem, mode === 'login' && authStyles.modeItemActive]}><Text style={[authStyles.modeText, mode === 'login' && authStyles.modeTextActive]}>Iniciar sesión</Text></Pressable>
              <Pressable onPress={() => switchMode('register')} style={[authStyles.modeItem, mode === 'register' && authStyles.modeItemActive]}><Text style={[authStyles.modeText, mode === 'register' && authStyles.modeTextActive]}>Crear cuenta</Text></Pressable>
            </View>

            {mode === 'register' && <Field label="Nombre público" value={name} onChangeText={setName} placeholder="¿Cómo te llamamos?" icon="user" error={submitted ? errors.name : undefined} />}
            <Field label="Correo electrónico" value={email} onChangeText={setEmail} placeholder="nombre@correo.com" icon="mail" keyboardType="email-address" error={submitted ? errors.email : undefined} />
            <Field label="Contraseña" value={password} onChangeText={setPassword} placeholder="Mínimo 8 caracteres" icon="lock" secure error={submitted ? errors.password : undefined} />
            {mode === 'register' && <Field label="Confirmar contraseña" value={confirm} onChangeText={setConfirm} placeholder="Repite tu contraseña" icon="shield" secure error={submitted ? errors.confirm : undefined} />}

            {mode === 'login' ? (
              <View style={authStyles.formOptions}>
                <Pressable onPress={toggleRemember} style={authStyles.checkRow}>
                  <View style={[authStyles.checkbox, remember && authStyles.checkboxActive]}>{remember && <Feather name="check" size={13} color={colors.ink} />}</View>
                  <Text style={authStyles.checkLabel}>Recordarme</Text>
                </Pressable>
                <Pressable onPress={openRecovery}><Text style={authStyles.link}>¿Olvidaste tu contraseña?</Text></Pressable>
              </View>
            ) : (
              <>
                <Pressable onPress={toggleAcceptedTerms} style={authStyles.checkRow}>
                  <View style={[authStyles.checkbox, accepted && authStyles.checkboxActive]}>{accepted && <Feather name="check" size={13} color={colors.ink} />}</View>
                  <Text style={authStyles.terms}>Acepto las condiciones legales de PYSUP.</Text>
                </Pressable>
                <View style={authStyles.formOptions}><Pressable onPress={() => setLegalOpen('terms')}><Text style={authStyles.link}>Ver Términos</Text></Pressable><Pressable onPress={() => setLegalOpen('privacy')}><Text style={authStyles.link}>Ver Aviso de privacidad</Text></Pressable></View>
                {submitted && errors.accepted && <Text style={authStyles.errorText}>{errors.accepted}</Text>}
              </>
            )}

            {!!error && <Text accessibilityRole="alert" style={authStyles.errorText}>{error}</Text>}
            {!!info && <Text accessibilityRole="alert" style={[authStyles.secureText, { color: colors.success }]}>{info}</Text>}
            <Button label={loading ? 'Procesando…' : mode === 'login' ? 'Entrar a PYSUP' : 'Crear mi cuenta'} onPress={submit} icon="arrow-right" disabled={loading} style={authStyles.submit} />
            {mode === 'login' && canEnterDemo && <Button label="Entrar al demo local" onPress={enterDemo} icon="play-circle" variant="ghost" disabled={loading} style={authStyles.demoAccess} />}
            <View style={authStyles.divider}><View style={authStyles.dividerLine} /><Text style={authStyles.dividerText}>o continúa con</Text><View style={authStyles.dividerLine} /></View>
            <View style={authStyles.socialRow}>
              <Button label="Google" onPress={() => continueWithProvider('google')} icon="chrome" variant="secondary" disabled={loading} style={authStyles.socialButton} />
              <Button label="Apple" onPress={() => continueWithProvider('apple')} icon="smartphone" variant="secondary" disabled={loading} style={authStyles.socialButton} />
            </View>
            <View style={authStyles.secureRow}><Feather name="shield" size={14} color={colors.success} /><Text style={authStyles.secureText}>Tus credenciales de streaming nunca se guardan en PYSUP.</Text></View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal transparent visible={recoveryOpen} animationType="fade" onRequestClose={closeRecovery}>
        <View style={authStyles.modalBackdrop}>
          <View style={authStyles.recoveryCard}>
            <View style={authStyles.recoveryIcon}><Feather name={recoverySent ? 'check' : 'key'} size={25} color={colors.ink} /></View>
            <Text style={authStyles.recoveryTitle}>{recoverySent ? 'Revisa tu correo' : 'Recupera tu acceso'}</Text>
            <Text style={authStyles.recoveryText}>{recoverySent ? `Enviamos instrucciones a ${email || 'tu correo'}.` : 'Escribe tu correo y te enviaremos un enlace seguro para restablecer tu contraseña.'}</Text>
            {!recoverySent && <Field label="Correo" value={email} onChangeText={setEmail} placeholder="nombre@correo.com" icon="mail" keyboardType="email-address" />}
            {!!error && <Text accessibilityRole="alert" style={authStyles.errorText}>{error}</Text>}
            <Button label={loading ? 'Enviando…' : recoverySent ? 'Entendido' : 'Enviar enlace'} disabled={loading} onPress={() => recoverySent ? closeRecovery() : sendRecovery()} />
            {!recoverySent && <Button label="Cancelar" onPress={closeRecovery} variant="ghost" />}
          </View>
        </View>
      </Modal>

      <Modal transparent visible={legalOpen !== null} animationType="fade" onRequestClose={() => setLegalOpen(null)}>
        <View style={authStyles.modalBackdrop}><View style={authStyles.recoveryCard}>
          <Text style={authStyles.recoveryTitle}>{legalOpen === 'terms' ? 'Términos de uso' : 'Aviso de privacidad'}</Text>
          <ScrollView style={{ maxHeight: 360 }}>
            <Text style={authStyles.recoveryText}>{legalOpen === 'terms'
              ? 'PYSUP no transmite ni concede acceso a contenido audiovisual. Cada persona usa legalmente su propia plataforma. Sólo puedes analizar enlaces públicos o archivos autorizados; no subas obras completas, contenido ilícito ni material destinado a evadir protecciones. La disponibilidad y precios deben confirmarse con el proveedor oficial.'
              : 'PYSUP guarda perfil, país, preferencias e interacciones necesarias para operar. Mensajes y salas sólo son visibles para participantes. Los clips son privados, usan enlaces temporales y se eliminan al terminar o vencer la purga. Puedes exportar tus datos o eliminar tu cuenta desde Configuración. PYSUP no solicita contraseñas de streaming ni usa clips para entrenar modelos.'}</Text>
          </ScrollView>
          <Button label="Cerrar" onPress={() => setLegalOpen(null)} />
        </View></View>
      </Modal>
    </LinearGradient>
  );
}
