import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Notifications from 'expo-notifications';
import { GameProvider } from '../src/context/GameContext';
import { theme } from '../src/styles/theme';
import { audioManager } from '../src/services/audioManager';
import { initializeAppStateListener } from '../src/services/notifications';

export default function RootLayout() {
    const router = useRouter();

    // Initialize audio manager and notification listeners on app startup
    useEffect(() => {
        // Initialize audio asynchronously - playSound() also auto-initializes if needed
        void audioManager.initialize();
        const appStateSubscription = initializeAppStateListener();

        // Handle notification responses (when user taps notification)
        const notificationSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
            // Navigate to collection when notification is tapped
            router.push('/collection');
        }).remove;

        // Cleanup on unmount
        return () => {
            audioManager.cleanup();
            appStateSubscription?.remove();
            notificationSubscription?.();
        };
    }, [router]);

    return (
        <GestureHandlerRootView style={styles.container}>
            <GameProvider>
                <StatusBar style="light" />
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
                            presentation: 'modal',
                        }}
                    />
                    <Stack.Screen
                        name="settings"
                        options={{
                            title: '',
                            presentation: 'modal',
                        }}
                    />
                </Stack>
            </GameProvider>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
});
