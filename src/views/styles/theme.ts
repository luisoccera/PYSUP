import { Platform } from 'react-native';

export const colors = {
  ink: '#070A12',
  inkSoft: '#0D111D',
  panel: '#121725',
  panelSoft: '#181E2E',
  panelRaised: '#202738',
  line: '#2A3245',
  text: '#F7F8FB',
  textMuted: '#9AA5B8',
  textDim: '#6F7B90',
  lime: '#C8FF5A',
  limeDark: '#86B92B',
  coral: '#FF6B6B',
  blue: '#6FA8FF',
  purple: '#A780FF',
  yellow: '#FFC857',
  success: '#62D99F',
  white: '#FFFFFF',
  black: '#000000',
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  pill: 999,
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const shadow = Platform.select({
  web: { boxShadow: '0 14px 28px rgba(0, 0, 0, 0.30)' } as any,
  default: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.3,
    shadowRadius: 28,
    elevation: 12,
  },
})!;
