import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withSequence,
    Easing,
} from 'react-native-reanimated';
import { theme } from '../src/styles/theme';
import { useGame } from '../src/context/GameContext';
import { useTimer } from '../src/hooks/useTimer';
import { useAppState } from '../src/hooks/useAppState';
import { Egg } from '../src/components/Egg';
import { PixelButton } from '../src/components/PixelButton';
import { HatchModal } from '../src/components/HatchModal';
import { Animal } from '../src/data/animals';
import { sendSessionCompleteNotification } from '../src/services/notifications';

export default function HomeScreen() {
    const router = useRouter();
    const { state, startSession, completeSession, failSession, resetSession, i18n } = useGame();
    const [showHatchModal, setShowHatchModal] = useState(false);
    const [hatchedAnimal, setHatchedAnimal] = useState<Animal | null>(null);
    const backgroundTimeRef = useRef<number | null>(null);

    // Debug mode: 10 seconds, Normal: 25 minutes
    const duration = state.settings.debugMode ? 10 : state.settings.focusDuration * 60;


    const handleTimerComplete = useCallback(async () => {
        if (state.settings.hapticsEnabled) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        const animal = await completeSession(state.settings.focusDuration);
        setHatchedAnimal(animal);
        setShowHatchModal(true);

        // Send notification
        if (state.settings.notificationsEnabled) {
            sendSessionCompleteNotification(animal, state.settings.language);
        }
    }, [completeSession, state.settings]);

    const {
        formattedTime,
        isRunning,
        progress,
        start: startTimer,
        stop: stopTimer,
        reset: resetTimer,
        elapsedMinutes,
    } = useTimer({
        duration,
        onComplete: handleTimerComplete,
    });

    // Handle app going to background
    useAppState({
        onBackground: () => {
            if (state.sessionState === 'active' && isRunning) {
                backgroundTimeRef.current = Date.now();
                console.log('App went to background, tolerance timer started');
            }
        },
        onForeground: () => {
            if (state.sessionState === 'active' && isRunning && backgroundTimeRef.current) {
                const timeDiff = Date.now() - backgroundTimeRef.current;
                backgroundTimeRef.current = null;

                if (timeDiff > state.settings.toleranceSeconds * 1000) {
                    // Too late!
                    stopTimer();
                    failSession(elapsedMinutes);
                    if (state.settings.hapticsEnabled) {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    }
                    console.log(`Failed due to long backgrounding: ${Math.round(timeDiff / 1000)}s`);
                } else {
                    console.log(`Returned within tolerance: ${Math.round(timeDiff / 1000)}s`);
                }
            }
        },
    });

    // Glow animation for timer
    const timerGlow = useSharedValue(0);

    useEffect(() => {
        if (isRunning) {
            timerGlow.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );
        } else {
            timerGlow.value = withTiming(0, { duration: 300 });
        }
    }, [isRunning]);

    const timerGlowStyle = useAnimatedStyle(() => ({
        textShadowColor: theme.colors.accent,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: timerGlow.value * 20,
    }));

    const handleStart = () => {
        startSession();
        startTimer();
        if (state.settings.hapticsEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    };

    const handleGiveUp = () => {
        stopTimer();
        failSession(elapsedMinutes);
        if (state.settings.hapticsEnabled) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
    };

    const handleReset = () => {
        resetTimer();
        resetSession();
    };

    const handleModalClose = () => {
        setShowHatchModal(false);
        setHatchedAnimal(null);
        resetTimer();
        resetSession();
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.push('/collection')} style={styles.headerButton}>
                    <Text style={styles.headerButtonText}>📦 {i18n('collection')}</Text>
                </Pressable>
                <Pressable onPress={() => router.push('/settings')} style={styles.headerButton}>
                    <Text style={styles.headerButtonText}>⚙️</Text>
                </Pressable>
            </View>

            {/* Stats bar */}
            <View style={styles.statsBar}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{state.stats.completedSessions}</Text>
                    <Text style={styles.statLabel}>{i18n('session')}</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{state.collection.length}</Text>
                    <Text style={styles.statLabel}>{i18n('animals')}</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>🔥 {state.stats.currentStreak}</Text>
                    <Text style={styles.statLabel}>{i18n('streak')}</Text>
                </View>
            </View>

            {/* Main content */}
            <View style={styles.content}>
                {/* Timer */}
                <Animated.Text style={[styles.timer, timerGlowStyle]}>
                    {formattedTime}
                </Animated.Text>

                {/* Progress bar */}
                {state.sessionState === 'active' && (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${progress * 100}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.progressText}>
                            {Math.round(progress * 100)}%
                        </Text>
                    </View>
                )}

                {/* Egg */}
                <Egg
                    sessionState={state.sessionState}
                    progress={progress}
                    language={state.settings.language}
                />

                {/* Buttons */}
                <View style={styles.buttonContainer}>
                    {state.sessionState === 'idle' && (
                        <PixelButton
                            title={i18n('startFocus')}
                            onPress={handleStart}
                            variant="primary"
                            size="large"
                            icon="🥚"
                        />
                    )}

                    {state.sessionState === 'active' && (
                        <PixelButton
                            title={i18n('giveUp')}
                            onPress={handleGiveUp}
                            variant="danger"
                            size="medium"
                        />
                    )}

                    {(state.sessionState === 'failed' || state.sessionState === 'completed') && (
                        <PixelButton
                            title={i18n('tryAgain')}
                            onPress={handleReset}
                            variant="secondary"
                            size="large"
                            icon="🔄"
                        />
                    )}
                </View>
            </View>

            {/* Debug mode indicator */}
            {state.settings.debugMode && (
                <View style={styles.debugBadge}>
                    <Text style={styles.debugText}>🛠 Debug Mode (10s)</Text>
                </View>
            )}

            {/* Hatch Modal */}
            <HatchModal
                visible={showHatchModal}
                animal={hatchedAnimal}
                onClose={handleModalClose}
                language={state.settings.language}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
    },
    headerButton: {
        padding: theme.spacing.sm,
    },
    headerButtonText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        fontWeight: theme.fontWeight.medium,
    },
    statsBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: theme.spacing.lg,
        marginHorizontal: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        marginTop: theme.spacing.md,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    statLabel: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.lg,
    },
    timer: {
        fontSize: theme.fontSize.timer,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        fontVariant: ['tabular-nums'],
        marginBottom: theme.spacing.md,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '80%',
        marginBottom: theme.spacing.lg,
    },
    progressBar: {
        flex: 1,
        height: 8,
        backgroundColor: theme.colors.surface,
        borderRadius: 4,
        overflow: 'hidden',
        marginRight: theme.spacing.sm,
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.colors.accent,
        borderRadius: 4,
    },
    progressText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.accent,
        fontWeight: theme.fontWeight.semibold,
        width: 40,
        textAlign: 'right',
    },
    buttonContainer: {
        marginTop: theme.spacing.xl,
    },
    debugBadge: {
        position: 'absolute',
        bottom: theme.spacing.xl,
        alignSelf: 'center',
        backgroundColor: theme.colors.warning,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.round,
    },
    debugText: {
        fontSize: theme.fontSize.xs,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.background,
    },
});
