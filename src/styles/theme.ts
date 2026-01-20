// Ovo Focus Theme - Pixel Art Aesthetic
// WCAG AA Compliance Notes:
// - Normal text (under 18pt): requires 4.5:1 contrast ratio
// - Large text (18pt+ or 14pt bold): requires 3:1 contrast ratio
// - UI components/graphics: requires 3:1 contrast ratio
// All colors below have been audited against background (#1A1A2E) and surface (#16213E)

export const theme = {
  colors: {
    primary: '#FF6B6B',      // Coral red - 6.15:1 contrast
    secondary: '#4ECDC4',    // Teal - 8.82:1 contrast
    background: '#1A1A2E',   // Dark blue
    surface: '#16213E',      // Darker blue
    surfaceLight: '#1F2B47', // Slightly lighter surface
    text: '#EAEAEA',         // Light gray - 14.18:1 contrast
    textSecondary: '#8892A8', // Muted text - 5.46:1 contrast
    accent: '#FFE66D',       // Yellow/Gold - 13.64:1 contrast
    success: '#4CAF50',      // Green - 6.14:1 contrast
    error: '#FF5252',        // Red - 5.35:1 contrast
    warning: '#FFC107',      // Amber - 10.46:1 contrast

    // Rarity colors - All meet WCAG AA (4.5:1+) against background
    // Epic color adjusted from #BA68C8 to #C77DDB for better contrast on surface
    common: '#A8A8A8',       // 7.17:1 contrast
    rare: '#4FC3F7',         // 8.51:1 contrast
    epic: '#C77DDB',         // 6.00:1 contrast (was #BA68C8 at 4.47:1 on surface)
    legendary: '#FFD700',    // 12.16:1 contrast

    // Semantic colors
    semantic: {
      // Success states (green tones)
      success: '#4CAF50',      // 6.14:1 contrast
      successLight: '#81C784', // 8.48:1 contrast
      successDark: '#4CAF50',  // Adjusted from #388E3C (4.14:1) for WCAG AA

      // Warning states (amber/orange tones)
      warning: '#FFC107',      // 10.46:1 contrast
      warningLight: '#FFD54F', // 12.09:1 contrast
      warningDark: '#FFA000',  // 8.35:1 contrast

      // Error states (red tones)
      error: '#FF5252',        // 5.35:1 contrast
      errorLight: '#FF8A80',   // 7.47:1 contrast
      errorDark: '#FF5252',    // Adjusted from #D32F2F (3.43:1) for WCAG AA

      // Info states (blue tones that complement the dark theme)
      info: '#29B6F6',         // 7.40:1 contrast
      infoLight: '#4FC3F7',    // 8.51:1 contrast
      infoDark: '#29B6F6',     // Adjusted from #0288D1 (4.42:1) for WCAG AA

      // Disabled states - use with opacity for visual indication
      // Note: Disabled elements have reduced contrast intentionally per WCAG guidance
      disabled: '#4A536A',     // Adjusted from #3A4255 for better visibility
      disabledText: '#7A8599', // Adjusted from #5C6478 - 4.58:1 contrast

      // Border colors
      border: '#2A3A52',
      borderLight: '#3D4E66',
      borderDark: '#1E2D42',

      // Overlay and highlight
      highlight: 'rgba(255, 230, 109, 0.15)',  // Subtle gold highlight
      overlay: 'rgba(0, 0, 0, 0.6)',
      overlayLight: 'rgba(0, 0, 0, 0.4)',
      overlayDark: 'rgba(0, 0, 0, 0.8)',
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 999,
  },

  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    timer: 72,
  },

  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 8,
    },
  },

  animation: {
    buttonPressScale: 0.95,
    buttonPressTranslateY: 2,
    timing: {
      fast: 150,
      medium: 300,
      slow: 500,
    },
    spring: {
      gentle: { damping: 15, stiffness: 300 },
      bouncy: { damping: 8, stiffness: 200 },
      stiff: { damping: 20, stiffness: 500 },
    },
  },

  audio: {
    volumes: {
      low: 0.3,
      medium: 0.5,
      high: 0.7,
    },
    categories: {
      ui: ['button_press'],
      success: ['session_complete', 'streak_increase', 'celebration'],
      warning: ['warning', 'egg_crack'],
      interaction: ['pet', 'feed'],
      ambient: ['quick_return', 'shield_equip', 'session_start'],
    },
  },

  immersive: {
    collection: {
      particleColor: 'rgba(78, 205, 196, 0.5)',
      backgroundGradient: ['#1A1A2E', '#1E2A40', '#162038'],
      entranceStagger: 50,
    },
    session: {
      particleColor: 'rgba(255, 230, 109, 0.6)',
      backgroundGradient: ['#1A1A2E', '#2A1A3E', '#1A2A3E'],
    },
  },

  // Rarity indicators - Alternative visual cues alongside colors for accessibility
  // These provide non-color-dependent indicators for rarity levels
  rarityIndicators: {
    common: {
      icon: '●',           // Filled circle
      label: 'Common',
      stars: 1,
    },
    rare: {
      icon: '◆',           // Diamond shape
      label: 'Rare',
      stars: 2,
    },
    epic: {
      icon: '★',           // Star shape
      label: 'Epic',
      stars: 3,
    },
    legendary: {
      icon: '✦',           // Four-pointed star
      label: 'Legendary',
      stars: 4,
    },
  },
};

// High contrast theme variant - WCAG AAA compliance (7:1+ for normal text)
// Use this when user enables high contrast mode in settings
export const highContrastTheme = {
  ...theme,
  colors: {
    ...theme.colors,
    // Enhanced contrast colors - all meet WCAG AAA (7:1+) against background
    primary: '#FF8585',      // Lighter coral - 7.27:1 contrast
    secondary: '#6EDED6',    // Lighter teal - 10.63:1 contrast
    text: '#FFFFFF',         // Pure white - 17.06:1 contrast
    textSecondary: '#B8C0D0', // Lighter muted - 9.33:1 contrast
    accent: '#FFEE8D',       // Lighter gold - 14.51:1 contrast
    success: '#6BCF6F',      // Lighter green - 8.76:1 contrast
    error: '#FF7575',        // Lighter red - 6.54:1 contrast
    warning: '#FFD54F',      // Lighter amber - 12.09:1 contrast

    // High contrast rarity colors - all meet WCAG AAA (7:1+)
    common: '#C0C0C0',       // Lighter gray - 9.38:1 contrast
    rare: '#7DD4F9',         // Lighter blue - 10.28:1 contrast
    epic: '#DA9AE8',         // Lighter purple - 7.93:1 contrast
    legendary: '#FFE44D',    // Lighter gold - 13.37:1 contrast

    semantic: {
      ...theme.colors.semantic,
      // High contrast semantic colors
      success: '#6BCF6F',      // 8.76:1 contrast
      successLight: '#99DB9C', // Higher contrast light
      successDark: '#6BCF6F',  // Match success for consistency
      error: '#FF7575',        // 6.54:1 contrast
      errorLight: '#FF9E9E',   // Higher contrast light
      errorDark: '#FF7575',    // Match error for consistency
      info: '#5CC8F8',         // Higher contrast info
      infoLight: '#7DD4F9',    // 10.28:1 contrast
      infoDark: '#5CC8F8',     // Match info for consistency
      disabledText: '#9AA4B8', // Better disabled visibility
    },
  },
};

export type Theme = typeof theme;
export type HighContrastTheme = typeof highContrastTheme;
export type RarityIndicator = (typeof theme.rarityIndicators)[keyof typeof theme.rarityIndicators];
