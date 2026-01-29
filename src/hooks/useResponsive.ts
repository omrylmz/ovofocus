import { useWindowDimensions } from 'react-native';

// Base dimensions (iPhone 11/12/13)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Breakpoints
const SMALL_SCREEN_WIDTH = 360;
const LARGE_SCREEN_WIDTH = 428;

// Egg sizing bounds
const EGG_MIN_SIZE = 150;
const EGG_MAX_SIZE = 320;
const EGG_SCREEN_RATIO = 0.45; // 45% of screen width

// Grid column breakpoints
const GRID_2_COL_MAX = 360;
const GRID_4_COL_MIN = 500;

export interface ResponsiveValues {
  // Screen dimensions
  screenWidth: number;
  screenHeight: number;

  // Screen size categories
  isSmallScreen: boolean;
  isLargeScreen: boolean;

  // Scaling utilities
  scale: (size: number) => number;
  scaleVertical: (size: number) => number;
  clamp: (value: number, min: number, max: number) => number;

  // Pre-calculated responsive values
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

  // Screen size categories
  const isSmallScreen = screenWidth < SMALL_SCREEN_WIDTH;
  const isLargeScreen = screenWidth >= LARGE_SCREEN_WIDTH;

  // Scale factor based on screen width
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

  // Pre-calculated responsive values
  const eggSize = clamp(
    Math.round(screenWidth * EGG_SCREEN_RATIO),
    EGG_MIN_SIZE,
    EGG_MAX_SIZE
  );

  // Timer font scales with egg
  const timerFontSize = clamp(
    Math.round(eggSize * 0.3),
    24,
    48
  );

  // Progress ring - constrained to fit within timer section (max ~180px)
  const progressRingSize = clamp(
    Math.round(eggSize * 0.9),
    140,
    180
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
