import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { GameProvider } from '../src/context/GameContext';
import { theme } from '../src/styles/theme';
import { audioManager } from '../src/services/audioManager';

export default function RootLayout() {
    // Initialize audio manager on app startup
    useEffect(() => {
        audioManager.initialize();

        // Cleanup on unmount
        return () => {
            audioManager.cleanup();
        };
    }, []);

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
                            title: 'Koleksiyonum',
                            presentation: 'modal',
                        }}
                    />
                    <Stack.Screen
                        name="settings"
                        options={{
                            title: 'Ayarlar',
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
