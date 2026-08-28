import { useWindowDimensions } from 'react-native';
import { getResponsiveLayout } from '../utils/responsive';

export { getResponsiveLayout, responsiveBreakpoints } from '../utils/responsive';

export function useResponsiveLayout() {
  const { width, height, fontScale } = useWindowDimensions();
  return getResponsiveLayout(width, height, fontScale);
}
