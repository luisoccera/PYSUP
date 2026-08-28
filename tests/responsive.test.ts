import { describe, expect, it } from 'vitest';
import { getResponsiveLayout } from '../src/utils/responsive';

describe('responsive layout', () => {
  it.each([
    [320, 568, 'compact-phone', 14, false],
    [390, 844, 'phone', 18, false],
    [768, 1024, 'tablet', 24, false],
    [1024, 768, 'tablet', 24, true],
    [1440, 900, 'desktop', 30, true],
  ] as const)('clasifica %i x %i como %s', (width, height, deviceClass, gutter, hasWideContent) => {
    const layout = getResponsiveLayout(width, height);
    expect(layout.deviceClass).toBe(deviceClass);
    expect(layout.gutter).toBe(gutter);
    expect(layout.hasWideContent).toBe(hasWideContent);
  });

  it('cambia a navegación de escritorio sólo cuando existe ancho suficiente', () => {
    expect(getResponsiveLayout(1179, 820).isDesktop).toBe(false);
    expect(getResponsiveLayout(1180, 820).isDesktop).toBe(true);
  });

  it('detecta orientación sin depender de una plataforma concreta', () => {
    expect(getResponsiveLayout(844, 390).isLandscape).toBe(true);
    expect(getResponsiveLayout(390, 844).isLandscape).toBe(false);
  });
});
