import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { theme as darkTheme, getTheme, Theme, ThemeMode } from '../styles/theme';

interface ThemeContextType {
    theme: Theme;
    isDarkMode: boolean;
    themeMode: ThemeMode;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
    themeMode: ThemeMode;
}

export function ThemeProvider({ children, themeMode }: ThemeProviderProps) {
    const systemColorScheme = useColorScheme();

    const contextValue = useMemo(() => {
        // Convert ColorSchemeName (which can be undefined) to 'light' | 'dark' | null
        const colorScheme: 'light' | 'dark' | null = systemColorScheme === 'light' || systemColorScheme === 'dark'
            ? systemColorScheme
            : null;

        let resolvedTheme: Theme;
        try {
            resolvedTheme = getTheme(themeMode, colorScheme);
        } catch (error) {
            console.error('[ThemeContext] Failed to resolve theme, using default:', error);
            resolvedTheme = darkTheme;
        }

        const isDarkMode = themeMode === 'dark' ||
            (themeMode === 'system' && colorScheme !== 'light');

        return {
            theme: resolvedTheme,
            isDarkMode,
            themeMode,
        };
    }, [themeMode, systemColorScheme]);

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextType {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}

// Export a hook that provides both theme and safe defaults
// This can be used in components that might render before GameProvider is ready
export function useThemeSafe(): ThemeContextType {
    const context = useContext(ThemeContext);
    if (!context) {
        // Return dark theme as default fallback
        return {
            theme: darkTheme,
            isDarkMode: true,
            themeMode: 'system',
        };
    }
    return context;
}
