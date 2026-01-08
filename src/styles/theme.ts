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
};

export type Theme = typeof theme;
