import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme } from '../src/styles/theme';
import { useGame } from '../src/context/GameContext';
import { useTimer } from '../src/hooks/useTimer';
import { useToleranceSystem } from '../src/hooks/useToleranceSystem';
import { PixelButton } from '../src/components/PixelButton';
import { HatchModal } from '../src/components/HatchModal';
import { StreakCelebration } from '../src/components/StreakCelebration';
import { OnboardingFlow } from '../src/components/OnboardingFlow';
import { QuickReturnToast } from '../src/components/QuickReturnToast';
import { ShieldSelector } from '../src/components/ShieldSelector';
import { AnimatedBackground } from '../src/components/AnimatedBackground';
import { FloatingParticles } from '../src/components/FloatingParticles';
import { Animal } from '../src/data/animals';
import { sendSessionCompleteNotification } from '../src/services/notifications';
import { getShieldInventory, useShield, ShieldItem, grantShieldFromAnimal } from '../src/utils/storage';
import { calculateCollectionBonuses, calculateEffectiveDuration } from '../src/utils/levelBonuses';
import { DailyRewardModal } from '../src/components/DailyRewardModal';
import { checkDailyReward, claimDailyReward, RewardType } from '../src/utils/dailyRewards';
import { audioManager } from '../src/services/audioManager';

// Extracted session components
import {
    SessionHeader,
    SessionStatsBar,
    TimerDisplay,
    SessionControls,
    PowerUpControls,
    InteractiveEgg,
} from '../src/components/session';

export default function HomeScreen() {
    const router = useRouter();
    const { state, startSession, pauseSession, emergencyPause, resumeSession, completeSession, failSession, resetSession, setGestureHintsSeen, setOnboardingComplete, i18n } = useGame();

    // Modal states
    const [showHatchModal, setShowHatchModal] = useState(false);
    const [hatchedAnimal, setHatchedAnimal] = useState<Animal | null>(null);
    const [showGestureHints, setShowGestureHints] = useState(false);
    const [showStreakCelebration, setShowStreakCelebration] = useState(false);
    const [celebrationStreak, setCelebrationStreak] = useState(0);
    const previousBestStreakRef = useRef<number>(state.stats.bestStreak);
    const hasInitializedRef = useRef(false);
    const prevWarningLevelRef = useRef(0);

    // Update previousBestStreakRef ONLY ONCE when stats finish loading
    // This prevents the ref from being overwritten on subsequent bestStreak changes
    useEffect(() => {
        if (!state.isLoading && !hasInitializedRef.current) {
            previousBestStreakRef.current = state.stats.bestStreak;
            hasInitializedRef.current = true;
        }
    }, [state.isLoading, state.stats.bestStreak]);

    // Power-up states
    const [showQuickReturnToast, setShowQuickReturnToast] = useState(false);
    const [showShieldSelector, setShowShieldSelector] = useState(false);
    const [shieldInventory, setShieldInventory] = useState<ShieldItem[]>([]);
    const [activeShieldBonus, setActiveShieldBonus] = useState(0);
    const [emergencyPauseUsed, setEmergencyPauseUsed] = useState(false);
    const emergencyPauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Daily reward states
    const [showDailyRewardModal, setShowDailyRewardModal] = useState(false);
    const [dailyRewardData, setDailyRewardData] = useState<{
        currentDay: number;
        rewardIcon: string;
        rewardType: RewardType;
        isStreakContinued: boolean;
    } | null>(null);

    // Calculate level bonuses from collection
    const levelBonuses = useMemo(() => {
        // Group collection by animal id and sum counts
        const animalCounts = new Map<string, number>();
        for (const animal of state.collection) {
            const current = animalCounts.get(animal.id) || 0;
            animalCounts.set(animal.id, current + 1);
        }
        const collectionForBonus = Array.from(animalCounts.entries()).map(([animalId, count]) => ({
            animalId,
            count,
        }));
        return calculateCollectionBonuses(collectionForBonus);
    }, [state.collection]);

    // Debug mode: 10 seconds, Normal: 25 minutes (with focus bonus applied)
    const baseDuration = state.settings.debugMode ? 10 : state.settings.focusDuration * 60;
    const duration = calculateEffectiveDuration(baseDuration, levelBonuses.focusPercentage);

    const handleTimerComplete = useCallback(async () => {
        if (state.settings.hapticsEnabled) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        const prevBest = previousBestStreakRef.current;
        const { animal, updatedStats } = await completeSession(state.settings.focusDuration);
        setHatchedAnimal(animal);
        setShowHatchModal(true);

        if (state.settings.notificationsEnabled) {
            sendSessionCompleteNotification(animal, state.settings.language);
        }

        setTimeout(() => {
            // Use actual streak from updated stats instead of calculating client-side
            // This correctly handles same-day sessions where streak doesn't increment
            const newStreak = updatedStats.currentStreak;
            if (newStreak > prevBest && newStreak > 1) {
                setCelebrationStreak(newStreak);
                setShowStreakCelebration(true);
                previousBestStreakRef.current = newStreak;
            }
        }, 100);

        await handleGrantShield(animal);
    }, [
        completeSession,
        state.settings.hapticsEnabled,
        state.settings.focusDuration,
        state.settings.notificationsEnabled,
        state.settings.language,
    ]);

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

    const {
        warningLevel,
        effectiveTolerance,
        timeInBackground,
        isQuickReturn,
        toleranceExceeded,
        resetTolerance,
    } = useToleranceSystem({
        baseTolerance: state.settings.toleranceSeconds,
        progress,
        currentStreak: state.stats.currentStreak,
        shieldBonus: activeShieldBonus + levelBonuses.shieldSeconds,
        isSessionActive: state.sessionState === 'active',
        isPaused: state.isPaused,
    });

    // Load shield inventory on mount
    useEffect(() => {
        getShieldInventory().then(setShieldInventory);
    }, []);

    // Cleanup emergency pause timeout on unmount
    useEffect(() => {
        return () => {
            if (emergencyPauseTimeoutRef.current) {
                clearTimeout(emergencyPauseTimeoutRef.current);
            }
        };
    }, []);

    // Check for daily reward on app load (after data is loaded and onboarding is complete)
    useEffect(() => {
        async function checkForDailyReward() {
            // Only check if not loading and onboarding is complete
            if (state.isLoading || !state.settings.hasCompletedOnboarding) {
                return;
            }

            const rewardInfo = await checkDailyReward();
            if (rewardInfo) {
                setDailyRewardData({
                    currentDay: rewardInfo.currentDay,
                    rewardIcon: rewardInfo.reward.icon,
                    rewardType: rewardInfo.reward.type,
                    isStreakContinued: rewardInfo.isStreakContinued,
                });
                // Small delay to let the UI settle before showing the modal
                setTimeout(() => {
                    setShowDailyRewardModal(true);
                }, 500);
            }
        }

        checkForDailyReward();
    }, [state.isLoading, state.settings.hasCompletedOnboarding]);

    // Handle quick return toast
    useEffect(() => {
        if (isQuickReturn && state.sessionState === 'active') {
            setShowQuickReturnToast(true);
            if (state.settings.hapticsEnabled) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        }
    }, [isQuickReturn, state.sessionState, state.settings.hapticsEnabled]);

    // Handle warning level haptic feedback
    useEffect(() => {
        // Only trigger haptic when warning level INCREASES to a new higher level
        if (warningLevel > prevWarningLevelRef.current && state.sessionState === 'active' && state.settings.hapticsEnabled) {
            const hapticTypes = {
                1: Haptics.ImpactFeedbackStyle.Light,
                2: Haptics.ImpactFeedbackStyle.Medium,
                3: Haptics.ImpactFeedbackStyle.Heavy,
            };
            Haptics.impactAsync(hapticTypes[warningLevel as 1 | 2 | 3]);
        }
        prevWarningLevelRef.current = warningLevel;

        // Reset when session is not active
        if (state.sessionState !== 'active') {
            prevWarningLevelRef.current = 0;
        }
    }, [warningLevel, state.sessionState, state.settings.hapticsEnabled]);

    // Handle tolerance exceeded - fail session
    // Note: We don't require isRunning because tolerance can exceed while paused too
    useEffect(() => {
        if (toleranceExceeded && state.sessionState === 'active') {
            stopTimer();
            failSession(elapsedMinutes);
            resetTolerance();
            audioManager.playSound('session_fail');
            if (state.settings.hapticsEnabled) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
            console.log(`Failed due to exceeding tolerance: ${timeInBackground}s > ${effectiveTolerance}s`);
        }
    }, [toleranceExceeded, state.sessionState, stopTimer, failSession, elapsedMinutes, resetTolerance, state.settings.hapticsEnabled, timeInBackground, effectiveTolerance]);

    // Handler functions
    const handleActivateShield = async (shield: ShieldItem) => {
        const used = await useShield(shield.animalId);
        if (used) {
            setActiveShieldBonus(used.durationSeconds);
            setShieldInventory(prev => prev.filter(s => s.animalId !== shield.animalId));
            setShowShieldSelector(false);
            audioManager.playSound('shield_equip');
            if (state.settings.hapticsEnabled) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        }
    };

    const handleEmergencyPause = () => {
        // Emergency pause doesn't count toward the regular pause limit
        // It's a separate one-time use power-up per session
        if (!emergencyPauseUsed && state.sessionState === 'active' && !state.isPaused) {
            pauseTimer();
            emergencyPause(); // Uses EMERGENCY_PAUSE action - doesn't increment pauseCount
            setEmergencyPauseUsed(true);
            if (state.settings.hapticsEnabled) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }

            // Set up auto-resume after emergencyPauseDuration seconds
            const autoResumeDuration = state.settings.emergencyPauseDuration * 1000;
            emergencyPauseTimeoutRef.current = setTimeout(() => {
                startTimer();
                resumeSession();
                if (state.settings.hapticsEnabled) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
            }, autoResumeDuration);
        }
    };

    const handleGrantShield = async (animal: Animal) => {
        await grantShieldFromAnimal(animal.id, animal.name, animal.rarity);
        const updated = await getShieldInventory();
        setShieldInventory(updated);
    };

    const handleStart = () => {
        const durationSeconds = state.settings.focusDuration * 60;
        startSession(durationSeconds);
        startTimer();
        setEmergencyPauseUsed(false);
        setActiveShieldBonus(0);
        resetTolerance();
        audioManager.playSound('session_start');
        if (state.settings.hapticsEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
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
        // Clear emergency pause auto-resume timeout if user manually resumes
        if (emergencyPauseTimeoutRef.current) {
            clearTimeout(emergencyPauseTimeoutRef.current);
            emergencyPauseTimeoutRef.current = null;
        }
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
                { text: i18n('keepFocusing'), style: 'cancel' },
                {
                    text: i18n('giveUp'),
                    style: 'destructive',
                    onPress: () => {
                        stopTimer();
                        failSession(elapsedMinutes);
                        audioManager.playSound('session_fail');
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

    const handleClaimDailyReward = async () => {
        await claimDailyReward();
        setShowDailyRewardModal(false);
        setDailyRewardData(null);
        if (state.settings.hapticsEnabled) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    // Show loading indicator while data is being loaded
    if (state.isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Background Layer - must be first for proper Android rendering */}
            <View style={styles.backgroundLayer} pointerEvents="none">
                <AnimatedBackground sessionState={state.sessionState} progress={progress} />
                <FloatingParticles
                    count={20}
                    isActive={state.sessionState === 'active'}
                    progress={progress}
                />
            </View>

            {/* Foreground Content Layer */}
            <View style={styles.foregroundLayer}>
                {/* Header */}
                <SessionHeader
                    currentStreak={state.stats.currentStreak}
                    dailyCompletedSessions={state.dailyProgress.completedSessions}
                    dailyGoal={state.settings.dailyGoal}
                    collectionLabel={`📦 ${i18n('collection')}`}
                    onCollectionPress={() => router.push('/collection')}
                    onSettingsPress={() => router.push('/settings')}
                    language={state.settings.language}
                />

                {/* Stats bar */}
                <SessionStatsBar
                    completedSessions={state.stats.completedSessions}
                    collectionCount={state.collection.length}
                    dailyProgress={state.dailyProgress}
                    dailyGoal={state.settings.dailyGoal}
                    labels={{
                        session: i18n('session'),
                        animals: i18n('animals'),
                        dailyGoalProgress: i18n('dailyGoalProgress'),
                    }}
                />

                {/* Main content */}
                <View style={styles.content}>
                    {/* Timer */}
                    <TimerDisplay
                        formattedTime={formattedTime}
                        isRunning={isRunning}
                        progress={progress}
                        sessionState={state.sessionState}
                        language={state.settings.language}
                    />

                    {/* Interactive Egg */}
                    <InteractiveEgg
                        sessionState={state.sessionState}
                        progress={progress}
                        duration={duration}
                        warningLevel={warningLevel as 0 | 1 | 2 | 3}
                        language={state.settings.language}
                        hapticsEnabled={state.settings.hapticsEnabled}
                        hasSeenGestureHints={state.settings.hasSeenGestureHints}
                        onStart={handleStart}
                        onShowGestureHints={() => setShowGestureHints(true)}
                    />

                    {/* Session Controls */}
                    <SessionControls
                        sessionState={state.sessionState}
                        isPaused={state.isPaused}
                        pauseCount={state.pauseCount}
                        maxPauses={state.settings.maxPausesPerSession}
                        onStart={handleStart}
                        onPause={handlePause}
                        onResume={handleResume}
                        onGiveUp={handleGiveUp}
                        onReset={handleReset}
                        labels={{
                            startFocus: i18n('startFocus'),
                            pause: i18n('pause'),
                            giveUp: i18n('giveUp'),
                            paused: i18n('paused'),
                            pausesRemaining: i18n('pausesRemaining'),
                            resume: i18n('resume'),
                            tryAgain: i18n('tryAgain'),
                        }}
                        language={state.settings.language}
                    />

                    {/* Power-up Controls */}
                    <PowerUpControls
                        sessionState={state.sessionState}
                        isPaused={state.isPaused}
                        emergencyPauseUsed={emergencyPauseUsed}
                        activeShieldBonus={activeShieldBonus}
                        shieldCount={shieldInventory.length}
                        onEmergencyPause={handleEmergencyPause}
                        onOpenShieldSelector={() => setShowShieldSelector(true)}
                        labels={{
                            emergencyPause: i18n('emergencyPause'),
                            activateShield: i18n('activateShield'),
                            shieldActive: i18n('shieldActive'),
                        }}
                        language={state.settings.language}
                    />
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
                <View
                    style={styles.gestureHintsOverlay}
                    accessible={true}
                    accessibilityViewIsModal={true}
                    accessibilityRole="alert"
                >
                    <View style={styles.gestureHintsContent}>
                        <Text
                            style={styles.gestureHintsTitle}
                            accessible={true}
                            accessibilityRole="header"
                        >
                            💡 Tips
                        </Text>
                        <View style={styles.gestureHintItem} accessible={true}>
                            <Text style={styles.gestureHintIcon} importantForAccessibility="no">👆</Text>
                            <Text style={styles.gestureHintText}>{i18n('gestureHintTap')}</Text>
                        </View>
                        <View style={styles.gestureHintItem} accessible={true}>
                            <Text style={styles.gestureHintIcon} importantForAccessibility="no">👆👆</Text>
                            <Text style={styles.gestureHintText}>{i18n('gestureHintDoubleTap')}</Text>
                        </View>
                        <View style={styles.gestureHintItem} accessible={true}>
                            <Text style={styles.gestureHintIcon} importantForAccessibility="no">👇</Text>
                            <Text style={styles.gestureHintText}>{i18n('gestureHintLongPress')}</Text>
                        </View>
                        <View style={styles.gestureHintsButton}>
                            <PixelButton
                                title={i18n('gotIt')}
                                onPress={handleDismissGestureHints}
                                variant="primary"
                                size="medium"
                                accessibilityHint={state.settings.language === 'tr' ? 'İpuçlarını kapat' : 'Dismiss tips'}
                            />
                        </View>
                    </View>
                </View>
            )}

            {/* Quick Return Toast */}
            <QuickReturnToast
                visible={showQuickReturnToast}
                onDismiss={() => setShowQuickReturnToast(false)}
                language={state.settings.language}
            />

            {/* Shield Selector Modal */}
            <ShieldSelector
                visible={showShieldSelector}
                shields={shieldInventory}
                onSelect={handleActivateShield}
                onClose={() => setShowShieldSelector(false)}
                language={state.settings.language}
            />

            {/* Daily Reward Modal */}
            {dailyRewardData && (
                <DailyRewardModal
                    visible={showDailyRewardModal}
                    currentDay={dailyRewardData.currentDay}
                    rewardIcon={dailyRewardData.rewardIcon}
                    rewardType={dailyRewardData.rewardType}
                    isStreakContinued={dailyRewardData.isStreakContinued}
                    onClaim={handleClaimDailyReward}
                    language={state.settings.language}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backgroundLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
        elevation: 0,
    },
    foregroundLayer: {
        flex: 1,
        zIndex: 1,
        elevation: 1,
        // Ensure this layer is not affected by background
        backgroundColor: 'transparent',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: 80,
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
        bottom: 100,
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
