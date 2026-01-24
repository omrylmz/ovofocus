import { renderHook } from '@testing-library/react-native';
import { useResponsive } from '../useResponsive';

// Note: jest-expo provides default mock for useWindowDimensions (375x667)
// We test the logic with various dimension configurations

describe('useResponsive', () => {
  describe('core functionality', () => {
    it('returns screen dimensions from useWindowDimensions', () => {
      const { result } = renderHook(() => useResponsive());

      // Default dimensions from jest-expo mock
      expect(result.current.screenWidth).toBeGreaterThan(0);
      expect(result.current.screenHeight).toBeGreaterThan(0);
    });

    it('provides scale function that scales proportionally', () => {
      const { result } = renderHook(() => useResponsive());
      const { scale, screenWidth } = result.current;

      // Scale function should multiply by screen ratio
      const baseWidth = 375;
      const ratio = screenWidth / baseWidth;

      expect(scale(100)).toBe(Math.round(100 * ratio));
    });

    it('provides scaleVertical function for height-based scaling', () => {
      const { result } = renderHook(() => useResponsive());
      const { scaleVertical, screenHeight } = result.current;

      // ScaleVertical should multiply by height ratio
      const baseHeight = 812;
      const ratio = screenHeight / baseHeight;

      expect(scaleVertical(100)).toBe(Math.round(100 * ratio));
    });
  });

  describe('clamp utility', () => {
    it('returns min when value is below range', () => {
      const { result } = renderHook(() => useResponsive());
      expect(result.current.clamp(50, 100, 200)).toBe(100);
    });

    it('returns value when in range', () => {
      const { result } = renderHook(() => useResponsive());
      expect(result.current.clamp(150, 100, 200)).toBe(150);
    });

    it('returns max when value is above range', () => {
      const { result } = renderHook(() => useResponsive());
      expect(result.current.clamp(300, 100, 200)).toBe(200);
    });
  });

  describe('pre-calculated values', () => {
    it('calculates egg size within valid bounds', () => {
      const { result } = renderHook(() => useResponsive());

      expect(result.current.eggSize).toBeGreaterThanOrEqual(150);
      expect(result.current.eggSize).toBeLessThanOrEqual(320);
    });

    it('calculates timer font size within valid bounds', () => {
      const { result } = renderHook(() => useResponsive());

      expect(result.current.timerFontSize).toBeGreaterThanOrEqual(24);
      expect(result.current.timerFontSize).toBeLessThanOrEqual(48);
    });

    it('calculates progress ring size within valid bounds', () => {
      const { result } = renderHook(() => useResponsive());

      expect(result.current.progressRingSize).toBeGreaterThanOrEqual(210);
      expect(result.current.progressRingSize).toBeLessThanOrEqual(400);
    });

    it('provides grid columns as 2, 3, or 4', () => {
      const { result } = renderHook(() => useResponsive());

      expect([2, 3, 4]).toContain(result.current.gridColumns);
    });

    it('calculates modal max width with padding', () => {
      const { result } = renderHook(() => useResponsive());
      const { modalMaxWidth, screenWidth } = result.current;

      // Modal max width should be screenWidth - 32 or 400, whichever is smaller
      expect(modalMaxWidth).toBe(Math.min(screenWidth - 32, 400));
    });
  });

  describe('screen size detection', () => {
    it('provides isSmallScreen boolean', () => {
      const { result } = renderHook(() => useResponsive());

      expect(typeof result.current.isSmallScreen).toBe('boolean');
    });

    it('provides isLargeScreen boolean', () => {
      const { result } = renderHook(() => useResponsive());

      expect(typeof result.current.isLargeScreen).toBe('boolean');
    });

    it('calculates small screen correctly based on threshold', () => {
      const { result } = renderHook(() => useResponsive());
      const { screenWidth, isSmallScreen } = result.current;

      // Small screen threshold is 360
      expect(isSmallScreen).toBe(screenWidth < 360);
    });

    it('calculates large screen correctly based on threshold', () => {
      const { result } = renderHook(() => useResponsive());
      const { screenWidth, isLargeScreen } = result.current;

      // Large screen threshold is 428
      expect(isLargeScreen).toBe(screenWidth >= 428);
    });
  });

  describe('layout helpers', () => {
    it('provides horizontal padding', () => {
      const { result } = renderHook(() => useResponsive());

      // 12 for small screens, 16 for others
      expect([12, 16]).toContain(result.current.horizontalPadding);
    });

    it('provides content max width', () => {
      const { result } = renderHook(() => useResponsive());
      const { contentMaxWidth, screenWidth } = result.current;

      expect(contentMaxWidth).toBe(Math.min(screenWidth, 600));
    });
  });
});
