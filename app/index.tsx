import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withSequence,
    withSpring,
    Easing,
    runOnJS,
} from 'react-native-reanimated';
import { theme } from '../src/styles/theme';
import { useGame } from '../src/context/GameContext';
import { useTimer } from '../src/hooks/useTimer';
import { useAppState } from '../src/hooks/useAppState';
import { Egg } from '../src/components/Egg';
import { PixelButton } from '../src/components/PixelButton';
import { HatchModal } from '../src/components/HatchModal';
import { StreakCelebration } from '../src/components/StreakCelebration';
import { OnboardingFlow } from '../src/components/OnboardingFlow';
import { Animal } from '../src/data/animals';
import { sendSessionCompleteNotification } from '../src/services/notifications';

export default function HomeScreen() {
    const router = useRouter();
    const { state, startSession, pauseSession, resumeSession, completeSession, failSession, resetSession, setGestureHintsSeen, setOnboardingComplete, i18n } = useGame();
    const [showHatchModal, setShowHatchModal] = useState(false);
    const [hatchedAnimal, setHatchedAnimal] = useState<Animal | null>(null);
    const [encouragementText, setEncouragementText] = useState<string | null>(null);
    const [showGestureHints, setShowGestureHints] = useState(false);
    const [showStreakCelebration, setShowStreakCelebration] = useState(false);
    const [celebrationStreak, setCelebrationStreak] = useState(0);
    const backgroundTimeRef = useRef<number | null>(null);
    const previousBestStreakRef = useRef<number>(state.stats.bestStreak);

    // Debug mode: 10 seconds, Normal: 25 minutes
    const duration = state.settings.debugMode ? 10 : state.settings.focusDuration * 60;

    // Egg interaction animations
    const eggScale = useSharedValue(1);
    const eggRotation = useSharedValue(0);
    const sparkleOpacity = useSharedValue(0);

    const handleTimerComplete = useCallback(async () => {
        if (state.settings.hapticsEnabled) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        // Store previous best before completion
        const prevBest = previousBestStreakRef.current;

        const animal = await completeSession(state.settings.focusDuration);
        setHatchedAnimal(animal);
        setShowHatchModal(true);

        // Send notification
        if (state.settings.notificationsEnabled) {
            sendSessionCompleteNotification(animal, state.settings.language);
        }

        // Check for new best streak after state updates
        // The new streak would be currentStreak + 1 (before state update)
        // We'll use a timeout to check after state has updated
        setTimeout(() => {
            // If new streak > previous best, celebrate!
            const newStreak = state.stats.currentStreak + 1;
            if (newStreak > prevBest && newStreak > 1) {
                setCelebrationStreak(newStreak);
                setShowStreakCelebration(true);
                previousBestStreakRef.current = newStreak;
            }
        }, 100);
    }, [completeSession, state.settings, state.stats.currentStreak]);

    const {
        formattedTime,
        isRunning,
        progress,
        start: startTimer,
        pause: pauseTimer,
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

    // Egg interaction handlers
    const showEncouragement = useCallback(() => {
        const messages = state.settings.language === 'tr'
            ? ['Harika! 💪', 'Devam et! ✨', 'Başarıyorsun! 🌟', 'Odaklan! 🎯', 'Süpersin! 💫']
            : ['Great! 💪', 'Keep going! ✨', "You're doing it! 🌟", 'Stay focused! 🎯', 'Amazing! 💫'];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        setEncouragementText(randomMessage);
        setTimeout(() => setEncouragementText(null), 1500);
    }, [state.settings.language]);

    const handleEggTap = useCallback(() => {
        if (state.sessionState === 'active') {
            if (state.settings.hapticsEnabled) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            showEncouragement();
        }
    }, [state.sessionState, state.settings.hapticsEnabled, showEncouragement]);

    const handleEggDoubleTap = useCallback(() => {
        if (state.sessionState === 'active') {
            if (state.settings.hapticsEnabled) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            // Show remaining time in a nice format
            const remaining = Math.ceil((1 - progress) * duration);
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            const timeText = state.settings.language === 'tr'
                ? `${mins}dk ${secs}sn kaldı!`
                : `${mins}m ${secs}s left!`;
            setEncouragementText(timeText);
            setTimeout(() => setEncouragementText(null), 2000);
        }
    }, [state.sessionState, state.settings, progress, duration]);

    const handleEggLongPress = useCallback(() => {
        if (state.sessionState === 'idle') {
            // Long press to start on idle
            handleStart();
        } else if (state.sessionState === 'active') {
            if (state.settings.hapticsEnabled) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }
            const motivationalMessages = state.settings.language === 'tr'
                ? ['Yumurtan büyüyor! 🥚✨', 'İçeride bir şey kıpırdıyor...', 'Neredeyse çatlayacak! 🐣']
                : ['Your egg is growing! 🥚✨', 'Something is stirring inside...', 'Almost ready to hatch! 🐣'];
            const msg = motivationalMessages[Math.floor(progress * motivationalMessages.length)];
            setEncouragementText(msg);
            setTimeout(() => setEncouragementText(null), 2500);
        }
    }, [state.sessionState, state.settings, progress]);

    // Gesture configuration
    const tapGesture = Gesture.Tap()
        .onEnd(() => {
            'worklet';
            eggScale.value = withSequence(
                withSpring(1.05, { damping: 10 }),
                withSpring(1, { damping: 12 })
            );
            runOnJS(handleEggTap)();
        });

    const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            'worklet';
            eggScale.value = withSequence(
                withSpring(1.1, { damping: 8 }),
                withSpring(1, { damping: 10 })
            );
            sparkleOpacity.value = withSequence(
                withTiming(1, { duration: 200 }),
                withTiming(0, { duration: 500 })
            );
            runOnJS(handleEggDoubleTap)();
        });

    const longPressGesture = Gesture.LongPress()
        .minDuration(500)
        .onStart(() => {
            'worklet';
            eggScale.value = withSpring(0.95, { damping: 15 });
        })
        .onEnd(() => {
            'worklet';
            eggScale.value = withSequence(
                withSpring(1.15, { damping: 6 }),
                withSpring(1, { damping: 10 })
            );
            eggRotation.value = withSequence(
                withTiming(-5, { duration: 50 }),
                withTiming(5, { duration: 50 }),
                withTiming(0, { duration: 50 })
            );
            runOnJS(handleEggLongPress)();
        });

    // Combine gestures (double tap takes priority over single tap)
    const composedGesture = Gesture.Exclusive(doubleTapGesture, tapGesture, longPressGesture);

    const eggContainerStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: eggScale.value },
            { rotate: `${eggRotation.value}deg` },
        ],
    }));

    const sparkleStyle = useAnimatedStyle(() => ({
        opacity: sparkleOpacity.value,
    }));

    const handleStart = () => {
        startSession();
        startTimer();
        if (state.settings.hapticsEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        // Show gesture hints on first session
        if (!state.settings.hasSeenGestureHints) {
            setTimeout(() => setShowGestureHints(true), 1000);
        }
    };

    const handlePause = () => {
        pauseTimer();
        pauseSession();
        if (state.settings.hapticsEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const handleResume = () => {
        startTimer();
        resumeSession();
        if (state.settings.hapticsEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    };

    const handleGiveUp = () => {
        Alert.alert(
            i18n('giveUpConfirmTitle'),
            i18n('giveUpConfirmMessage'),
            [
                {
                    text: i18n('keepFocusing'),
                    style: 'cancel',
                },
                {
                    text: i18n('giveUp'),
                    style: 'destructive',
                    onPress: () => {
                        stopTimer();
                        failSession(elapsedMinutes);
                        if (state.settings.hapticsEnabled) {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        }
                    },
                },
            ]
        );
    };

    const handleDismissGestureHints = () => {
        setShowGestureHints(false);
        setGestureHintsSeen();
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
                    {state.stats.currentStreak > 0 && state.stats.currentStreak === state.stats.bestStreak && (
                        <View style={styles.bestBadge}>
                            <Text style={styles.bestBadgeText}>{i18n('best')}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.statItem}>
                    <View style={styles.dailyGoalContainer}>
                        <Text style={[
                            styles.dailyGoalValue,
                            state.dailyProgress.goalAchieved && styles.dailyGoalAchieved
                        ]}>
                            {state.dailyProgress.goalAchieved ? '✓' : `${state.dailyProgress.completedSessions}/${state.settings.dailyGoal}`}
                        </Text>
                    </View>
                    <Text style={styles.statLabel}>{i18n('dailyGoalProgress')}</Text>
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

                {/* Interactive Egg with Gestures */}
                <GestureDetector gesture={composedGesture}>
                    <Animated.View style={[styles.eggWrapper, eggContainerStyle]}>
                        {/* Sparkle overlay for double tap */}
                        <Animated.View style={[styles.sparkleOverlay, sparkleStyle]}>
                            <Text style={styles.sparkleText}>✨ 💫 ⭐ 💫 ✨</Text>
                        </Animated.View>

                        <Egg
                            sessionState={state.sessionState}
                            progress={progress}
                            language={state.settings.language}
                        />
                    </Animated.View>
                </GestureDetector>

                {/* Encouragement text */}
                {encouragementText && (
                    <Animated.View style={styles.encouragementContainer}>
                        <Text style={styles.encouragementText}>{encouragementText}</Text>
                    </Animated.View>
                )}

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

                    {state.sessionState === 'active' && !state.isPaused && (
                        <View style={styles.activeButtonsRow}>
                            <PixelButton
                                title={i18n('pause')}
                                onPress={handlePause}
                                variant="secondary"
                                size="medium"
                                icon="⏸️"
                                disabled={state.pauseCount >= state.settings.maxPausesPerSession}
                            />
                            <View style={styles.buttonSpacer} />
                            <PixelButton
                                title={i18n('giveUp')}
                                onPress={handleGiveUp}
                                variant="ghost"
                                size="medium"
                            />
                        </View>
                    )}

                    {state.sessionState === 'active' && state.isPaused && (
                        <View style={styles.pausedContainer}>
                            <Text style={styles.pausedText}>{i18n('paused')}</Text>
                            <Text style={styles.pauseCountText}>
                                {state.settings.maxPausesPerSession - state.pauseCount} {i18n('pausesRemaining')}
                            </Text>
                            <View style={styles.pausedButtonsRow}>
                                <PixelButton
                                    title={i18n('resume')}
                                    onPress={handleResume}
                                    variant="primary"
                                    size="large"
                                    icon="▶️"
                                />
                            </View>
                            <PixelButton
                                title={i18n('giveUp')}
                                onPress={handleGiveUp}
                                variant="ghost"
                                size="small"
                            />
                        </View>
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

            {/* Streak Celebration */}
            <StreakCelebration
                visible={showStreakCelebration}
                streakCount={celebrationStreak}
                onComplete={() => setShowStreakCelebration(false)}
                language={state.settings.language}
            />

            {/* Onboarding Flow */}
            <OnboardingFlow
                visible={!state.settings.hasCompletedOnboarding && !state.isLoading}
                onComplete={setOnboardingComplete}
                language={state.settings.language}
            />

            {/* Gesture Hints Overlay */}
            {showGestureHints && (
                <View style={styles.gestureHintsOverlay}>
                    <View style={styles.gestureHintsContent}>
                        <Text style={styles.gestureHintsTitle}>💡 Tips</Text>
                        <View style={styles.gestureHintItem}>
                            <Text style={styles.gestureHintIcon}>👆</Text>
                            <Text style={styles.gestureHintText}>{i18n('gestureHintTap')}</Text>
                        </View>
                        <View style={styles.gestureHintItem}>
                            <Text style={styles.gestureHintIcon}>👆👆</Text>
                            <Text style={styles.gestureHintText}>{i18n('gestureHintDoubleTap')}</Text>
                        </View>
                        <View style={styles.gestureHintItem}>
                            <Text style={styles.gestureHintIcon}>👇</Text>
                            <Text style={styles.gestureHintText}>{i18n('gestureHintLongPress')}</Text>
                        </View>
                        <View style={styles.gestureHintsButton}>
                            <PixelButton
                                title={i18n('gotIt')}
                                onPress={handleDismissGestureHints}
                                variant="primary"
                                size="medium"
                            />
                        </View>
                    </View>
                </View>
            )}
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
    bestBadge: {
        backgroundColor: theme.colors.legendary,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.sm,
        marginTop: theme.spacing.xs,
    },
    bestBadgeText: {
        fontSize: 10,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.background,
    },
    dailyGoalContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 3,
        borderColor: theme.colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
    },
    dailyGoalValue: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    dailyGoalAchieved: {
        color: theme.colors.success,
        fontSize: theme.fontSize.lg,
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
    eggWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    sparkleOverlay: {
        position: 'absolute',
        top: -30,
        zIndex: 10,
    },
    sparkleText: {
        fontSize: 24,
    },
    encouragementContainer: {
        position: 'absolute',
        bottom: 180,
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.round,
        ...theme.shadows.medium,
    },
    encouragementText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.accent,
        fontWeight: theme.fontWeight.bold,
    },
    buttonContainer: {
        marginTop: theme.spacing.xl,
        alignItems: 'center',
    },
    activeButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    buttonSpacer: {
        width: theme.spacing.md,
    },
    pausedContainer: {
        alignItems: 'center',
    },
    pausedText: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.warning,
        marginBottom: theme.spacing.xs,
    },
    pauseCountText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.lg,
    },
    pausedButtonsRow: {
        marginBottom: theme.spacing.md,
    },
    gestureHintsOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    gestureHintsContent: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.xl,
        marginHorizontal: theme.spacing.xl,
        alignItems: 'center',
    },
    gestureHintsTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.lg,
    },
    gestureHintItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        width: '100%',
    },
    gestureHintIcon: {
        fontSize: 24,
        marginRight: theme.spacing.md,
    },
    gestureHintText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
        flex: 1,
    },
    gestureHintsButton: {
        marginTop: theme.spacing.lg,
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
