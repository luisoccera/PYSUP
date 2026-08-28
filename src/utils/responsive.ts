export const responsiveBreakpoints = {
  compactPhone: 360,
  phone: 600,
  tablet: 1180,
} as const;

export type ResponsiveDeviceClass = 'compact-phone' | 'phone' | 'tablet' | 'desktop';

export function getResponsiveLayout(width: number, height: number, fontScale = 1) {
  const isCompactPhone = width < responsiveBreakpoints.compactPhone;
  const isPhone = width < responsiveBreakpoints.phone;
  const isTablet = width >= responsiveBreakpoints.phone && width < responsiveBreakpoints.tablet;
  const isDesktop = width >= responsiveBreakpoints.tablet;
  const isLandscape = width > height;
  const deviceClass: ResponsiveDeviceClass = isCompactPhone
    ? 'compact-phone'
    : isPhone
      ? 'phone'
      : isTablet
        ? 'tablet'
        : 'desktop';
  const gutter = isCompactPhone ? 14 : isPhone ? 18 : isTablet ? 24 : 30;
  const contentTop = isPhone ? 20 : 28;

  return {
    width,
    height,
    fontScale,
    deviceClass,
    isCompactPhone,
    isPhone,
    isTablet,
    isDesktop,
    isLandscape,
    gutter,
    contentTop,
    hasWideContent: width >= 840,
  };
}
