import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Base dimensions (iPhone 11/12/13)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Breakpoints
const SMALL_SCREEN_WIDTH = 360;
const LARGE_SCREEN_WIDTH = 428;

// Fixed element heights
const HEADER_HEIGHT = 56;
const STATS_BAR_HEIGHT = 60;

// Proportional section ratios (must sum to 1.0)
const TIMER_SECTION_RATIO = 0.18;   // 18% - progress ring + time
const EGG_SECTION_RATIO = 0.60;     // 60% - main focal point
const CONTROLS_SECTION_RATIO = 0.22; // 22% - buttons + padding

// Egg sizing bounds
const EGG_MIN_SIZE = 150;
const EGG_MAX_SIZE = 320;

// Grid column breakpoints
const GRID_2_COL_MAX = 360;
const GRID_4_COL_MIN = 500;

// Minimum safe area for Android virtual nav bar
const MIN_BOTTOM_SAFE_AREA = 24;

export interface ResponsiveValues {
  // Screen dimensions
  screenWidth: number;
  screenHeight: number;

  // Screen size categories
  isSmallScreen: boolean;
  isLargeScreen: boolean;

  // Safe area insets
  safeAreaTop: number;
  safeAreaBottom: number;

  // Proportional section heights (CRITICAL for layout)
  availableContentHeight: number;
  timerSectionHeight: number;
  eggSectionHeight: number;
  controlsSectionHeight: number;

  // Scaling utilities
  scale: (size: number) => number;
  scaleVertical: (size: number) => number;
  clamp: (value: number, min: number, max: number) => number;

  // Pre-calculated responsive values (based on section heights)
  eggSize: number;
  timerFontSize: number;
  progressRingSize: number;
  gridColumns: number;
  modalMaxWidth: number;

  // Layout helpers
  horizontalPadding: number;
  contentMaxWidth: number;
}

export function useResponsive(): ResponsiveValues {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Safe area with minimum for Android virtual nav
  const safeAreaTop = insets.top;
  const safeAreaBottom = Math.max(insets.bottom, MIN_BOTTOM_SAFE_AREA);

  // Screen size categories
  const isSmallScreen = screenWidth < SMALL_SCREEN_WIDTH;
  const isLargeScreen = screenWidth >= LARGE_SCREEN_WIDTH;

  // Scale factors
  const widthScale = screenWidth / BASE_WIDTH;
  const heightScale = screenHeight / BASE_HEIGHT;

  // Utility functions
  const scale = (size: number): number => {
    return Math.round(size * widthScale);
  };

  const scaleVertical = (size: number): number => {
    return Math.round(size * heightScale);
  };

  const clamp = (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value));
  };

  // ==========================================================================
  // PROPORTIONAL LAYOUT SYSTEM
  // ==========================================================================
  // Calculate available height for content sections after subtracting fixed
  // elements and safe areas. Then distribute proportionally.
  // ==========================================================================

  const availableContentHeight = screenHeight
    - HEADER_HEIGHT
    - STATS_BAR_HEIGHT
    - safeAreaTop
    - safeAreaBottom;

  // Proportional section heights
  const timerSectionHeight = Math.round(availableContentHeight * TIMER_SECTION_RATIO);
  const eggSectionHeight = Math.round(availableContentHeight * EGG_SECTION_RATIO);
  const controlsSectionHeight = Math.round(availableContentHeight * CONTROLS_SECTION_RATIO);

  // ==========================================================================
  // ELEMENT SIZES (based on section heights, not screen width)
  // ==========================================================================

  // Progress ring: 85% of timer section height, clamped
  const progressRingSize = clamp(
    Math.round(timerSectionHeight * 0.85),
    120,
    200
  );

  // Timer font: 35% of progress ring size
  const timerFontSize = clamp(
    Math.round(progressRingSize * 0.35),
    24,
    48
  );

  // Egg size: 65% of egg section height, clamped
  // Also consider width constraint (45% of screen width)
  const eggByHeight = Math.round(eggSectionHeight * 0.65);
  const eggByWidth = Math.round(screenWidth * 0.45);
  const eggSize = clamp(
    Math.min(eggByHeight, eggByWidth),
    EGG_MIN_SIZE,
    EGG_MAX_SIZE
  );

  // Grid columns based on width
  const gridColumns = screenWidth < GRID_2_COL_MAX
    ? 2
    : screenWidth >= GRID_4_COL_MIN
      ? 4
      : 3;

  // Modal max width for tablets
  const modalMaxWidth = Math.min(screenWidth - 32, 400);

  // Layout helpers
  const horizontalPadding = isSmallScreen ? 12 : 16;
  const contentMaxWidth = Math.min(screenWidth, 600);

  return {
    screenWidth,
    screenHeight,
    isSmallScreen,
    isLargeScreen,
    safeAreaTop,
    safeAreaBottom,
    availableContentHeight,
    timerSectionHeight,
    eggSectionHeight,
    controlsSectionHeight,
    scale,
    scaleVertical,
    clamp,
    eggSize,
    timerFontSize,
    progressRingSize,
    gridColumns,
    modalMaxWidth,
    horizontalPadding,
    contentMaxWidth,
  };
}
