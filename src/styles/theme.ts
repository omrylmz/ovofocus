// Ovo Focus Theme - Pixel Art Aesthetic
export const theme = {
  colors: {
    primary: '#FF6B6B',      // Coral red
    secondary: '#4ECDC4',    // Teal
    background: '#1A1A2E',   // Dark blue
    surface: '#16213E',      // Darker blue
    surfaceLight: '#1F2B47', // Slightly lighter surface
    text: '#EAEAEA',         // Light gray
    textSecondary: '#8892A8', // Muted text
    accent: '#FFE66D',       // Yellow/Gold
    success: '#4CAF50',      // Green
    error: '#FF5252',        // Red
    warning: '#FFC107',      // Amber
    
    // Rarity colors
    common: '#A8A8A8',
    rare: '#4FC3F7',
    epic: '#BA68C8',
    legendary: '#FFD700',

    // Semantic colors
    semantic: {
      // Success states (green tones)
      success: '#4CAF50',
      successLight: '#81C784',
      successDark: '#388E3C',

      // Warning states (amber/orange tones)
      warning: '#FFC107',
      warningLight: '#FFD54F',
      warningDark: '#FFA000',

      // Error states (red tones)
      error: '#FF5252',
      errorLight: '#FF8A80',
      errorDark: '#D32F2F',

      // Info states (blue tones that complement the dark theme)
      info: '#29B6F6',
      infoLight: '#4FC3F7',
      infoDark: '#0288D1',

      // Disabled states
      disabled: '#3A4255',
      disabledText: '#5C6478',

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
};

export type Theme = typeof theme;
