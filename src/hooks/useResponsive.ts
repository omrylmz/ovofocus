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
// With bar layout, timer needs less height than circular ring
const TIMER_SECTION_RATIO = 0.16;   // 16% - bar layout is more compact
const EGG_SECTION_RATIO = 0.61;     // 61% - egg gets more space
const CONTROLS_SECTION_RATIO = 0.23; // 23% - comfortable controls

// Egg sizing bounds
const EGG_MIN_SIZE = 150;
const EGG_MAX_SIZE = 340;

// Grid column breakpoints
const GRID_2_COL_MAX = 360;
const GRID_4_COL_MIN = 500;

// Minimum safe area for Android virtual nav bar
// SafeAreaProvider reports real insets; this is a small fallback for edge cases
const MIN_BOTTOM_SAFE_AREA = 16;

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

  // Timer bar dimensions
  timerBarWidth: number;
  timerBarHeight: number;

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
  // (kept for backwards compatibility if ring is re-enabled)
  const progressRingSize = clamp(
    Math.round(timerSectionHeight * 0.85),
    120,
    200
  );

  // Timer font: scales with screen width for bar layout
  // Larger and more prominent since it's the main visual element
  const timerFontSize = clamp(
    Math.round(screenWidth * 0.12),
    36,
    56
  );

  // Egg size: 70% of egg section height, clamped
  // Also consider width constraint (48% of screen width)
  const eggByHeight = Math.round(eggSectionHeight * 0.70);
  const eggByWidth = Math.round(screenWidth * 0.48);
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

  // Timer bar dimensions
  // Width: 85% of screen width, clamped between 280-400px
  const timerBarWidth = clamp(
    Math.round(screenWidth * 0.85),
    280,
    400
  );
  // Height: proportional to timer section, clamped between 20-32px
  const timerBarHeight = clamp(
    Math.round(timerSectionHeight * 0.18),
    20,
    32
  );

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
    timerBarWidth,
    timerBarHeight,
    horizontalPadding,
    contentMaxWidth,
  };
}
