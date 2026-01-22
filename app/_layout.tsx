import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import { GameProvider, useGame } from '../src/context/GameContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { theme as darkTheme } from '../src/styles/theme';
import { audioManager } from '../src/services/audioManager';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

// Inner layout component that can access theme context
function ThemedLayout({ isLoading }: { isLoading: boolean }) {
    const router = useRouter();
    const { theme, isDarkMode } = useTheme();

    // Initialize audio manager and notification listeners on app startup
    useEffect(() => {
        // Initialize audio asynchronously - playSound() also auto-initializes if needed
        void audioManager.initialize();

        // Handle notification responses (when user taps notification)
        const notificationSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
            // Navigate to collection when notification is tapped
            router.push('/collection');
        }).remove;

        // Cleanup on unmount
        return () => {
            audioManager.cleanup();
            notificationSubscription?.();
        };
    }, [router]);

    // Default to 'light' StatusBar style while loading to prevent flash
    // Once loading is complete, use theme-dependent style
    const statusBarStyle = isLoading ? 'light' : (isDarkMode ? 'light' : 'dark');

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <StatusBar style={statusBarStyle} />
            <Stack
                screenOptions={{
                    headerStyle: {
                        backgroundColor: theme.colors.background,
                    },
                    headerTintColor: theme.colors.text,
                    headerTitleStyle: {
                        fontWeight: '600',
                    },
                    contentStyle: {
                        backgroundColor: theme.colors.background,
                    },
                }}
            >
                <Stack.Screen
                    name="index"
                    options={{
                        title: 'Ovo Focus',
                        headerShown: false,
                    }}
                />
                <Stack.Screen
                    name="collection"
                    options={{
                        title: '',
                        presentation: 'formSheet',
                        animation: 'slide_from_bottom',
                        gestureEnabled: true,
                        gestureDirection: 'vertical',
                        // Sheet presentation options for natural modal feel
                        sheetAllowedDetents: 'fitToContents',
                        sheetGrabberVisible: true,
                        sheetCornerRadius: 20,
                        sheetExpandsWhenScrolledToEdge: true,
                        sheetInitialDetentIndex: 0,
                    }}
                />
                <Stack.Screen
                    name="settings"
                    options={{
                        title: '',
                        presentation: 'formSheet',
                        animation: 'slide_from_bottom',
                        gestureEnabled: true,
                        gestureDirection: 'vertical',
                        // Sheet presentation options for natural modal feel
                        sheetAllowedDetents: 'fitToContents',
                        sheetGrabberVisible: true,
                        sheetCornerRadius: 20,
                        sheetExpandsWhenScrolledToEdge: true,
                        sheetInitialDetentIndex: 0,
                    }}
                />
                <Stack.Screen
                    name="stats"
                    options={{
                        title: '',
                        presentation: 'formSheet',
                        animation: 'slide_from_bottom',
                        gestureEnabled: true,
                        gestureDirection: 'vertical',
                        // Sheet presentation options for natural modal feel
                        sheetAllowedDetents: 'fitToContents',
                        sheetGrabberVisible: true,
                        sheetCornerRadius: 20,
                        sheetExpandsWhenScrolledToEdge: true,
                        sheetInitialDetentIndex: 0,
                    }}
                />
            </Stack>
        </View>
    );
}

// Intermediate component that bridges GameContext and ThemeProvider
// This avoids circular dependency by passing themeMode as a prop
function AppContent() {
    const { state } = useGame();
    const themeMode = state.settings.themeMode;
    const isLoading = state.isLoading;
    const language = state.settings.language;

    return (
        <ErrorBoundary language={language}>
            <ThemeProvider themeMode={themeMode}>
                <ThemedLayout isLoading={isLoading} />
            </ThemeProvider>
        </ErrorBoundary>
    );
}

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={styles.container}>
            <GameProvider>
                <AppContent />
            </GameProvider>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        // Default to dark theme background for initial render
        backgroundColor: darkTheme.colors.background,
    },
});
