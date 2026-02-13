import React, { useState, useCallback, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { theme as darkTheme, Theme } from '../src/styles/theme';
import { TimerProgressBar } from '../src/components/TimerProgressBar';
import { useGame } from '../src/context/GameContext';
import { useTheme } from '../src/context/ThemeContext';
import { useTimer } from '../src/hooks/useTimer';
import { useResponsive } from '../src/hooks/useResponsive';
import { usePomodoroTimer, PomodoroPhase } from '../src/hooks/usePomodoroTimer';
import { useToleranceSystem } from '../src/hooks/useToleranceSystem';
import { PixelButton } from '../src/components/PixelButton';
import { LoadingIndicator } from '../src/components/LoadingIndicator';
import { StreakCelebration } from '../src/components/StreakCelebration';
import { MilestoneCelebration, MilestoneData } from '../src/components/MilestoneCelebration';
import { getMilestoneCategory } from '../src/data/achievements';
import { QuickReturnToast } from '../src/components/QuickReturnToast';
import { ShieldSelector } from '../src/components/ShieldSelector';
import { AnimatedBackground } from '../src/components/AnimatedBackground';
import { FloatingParticles } from '../src/components/FloatingParticles';
import { Animal } from '../src/data/animals';
import { sendSessionCompleteNotification } from '../src/services/notifications';
import { getShieldInventory, consumeShield, ShieldItem, grantShieldFromAnimal, updateLastAnimalNotes } from '../src/utils/storage';
import { calculateCollectionBonuses, calculateEffectiveDuration } from '../src/utils/levelBonuses';
import { DailyRewardModal } from '../src/components/DailyRewardModal';
import { checkDailyReward, claimDailyReward, RewardType } from '../src/utils/dailyRewards';
import { audioManager } from '../src/services/audioManager';
import { ambientSoundService, AmbientSoundType } from '../src/services/ambientSoundService';
import { announceTimerWarning } from '../src/utils/accessibility';

// Extracted session components
import {
    SessionHeader,
    SessionStatsBar,
    SessionControls,
    InteractiveEgg,
} from '../src/components/session';
import { GestureHint } from '../src/components/GestureHint';

// Lazy load heavy modal components that are not visible on initial render
// These components have significant bundle size due to animations and UI complexity
const HatchModal = lazy(() =>
    import('../src/components/HatchModal').then(module => ({ default: module.HatchModal }))
);
const AchievementModal = lazy(() =>
    import('../src/components/AchievementModal').then(module => ({ default: module.AchievementModal }))
);
const OnboardingFlow = lazy(() =>
    import('../src/components/OnboardingFlow').then(module => ({ default: module.OnboardingFlow }))
);

// Create dynamic styles based on current theme
// Responsive type for createStyles
interface ResponsiveStyleProps {
    horizontalPadding: number;
    timerSectionHeight: number;
    eggSectionHeight: number;
    controlsSectionHeight: number;
    safeAreaBottom: number;
}

const createStyles = (theme: Theme, responsive: ResponsiveStyleProps) => StyleSheet.create({
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
        zIndex: theme.zIndex.background,
        elevation: theme.zIndex.background,
    },
    foregroundLayer: {
        flex: 1,
        zIndex: theme.zIndex.base,
        elevation: theme.zIndex.base,
        backgroundColor: 'transparent',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        // NO justifyContent - sections have explicit heights
        paddingHorizontal: responsive.horizontalPadding,
    },
    // ==========================================================================
    // PROPORTIONAL SECTION HEIGHTS
    // Each section gets a percentage of available screen height.
    // This eliminates gaps and ensures consistent layout across all devices.
    // ==========================================================================
    timerSection: {
        height: responsive.timerSectionHeight,  // 16% of available
        width: '100%',
        alignItems: 'center',
        justifyContent: 'flex-end',  // Push timer DOWN toward egg
        overflow: 'visible',  // Allow Pomodoro indicator to extend below
        zIndex: 10,
        elevation: 10,
    },
    eggSection: {
        height: responsive.eggSectionHeight,    // 58% of available
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
        elevation: 5,
    },
    controlsSection: {
        height: responsive.controlsSectionHeight, // 23% of available
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: responsive.safeAreaBottom, // Safe area accounts for virtual nav bar
        zIndex: 10,
        elevation: 10,
    },
    debugBadge: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
        backgroundColor: theme.colors.warning,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.round,
        zIndex: theme.zIndex.debug,
        elevation: theme.zIndex.debug, // Android elevation
    },
    debugText: {
        fontSize: theme.fontSize.xs,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.background,
    },
    // Pomodoro indicator styles
    pomodoroIndicator: {
        position: 'absolute',
        bottom: -28,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.round,
        gap: theme.spacing.sm,
        zIndex: theme.zIndex.floating,
        elevation: theme.zIndex.floating,
    },
    pomodoroPhaseContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    pomodoroPhaseIcon: {
        fontSize: 16,
    },
    pomodoroPhaseText: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    pomodoroPhaseTextWork: {
        color: theme.colors.primary,
    },
    pomodoroPhaseTextBreak: {
        color: theme.colors.accent,
    },
    pomodoroDivider: {
        width: 1,
        height: 16,
        backgroundColor: theme.colors.textSecondary,
        opacity: 0.3,
    },
    pomodoroSessionCounter: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    pomodoroSkipButton: {
        backgroundColor: theme.colors.surfaceLight,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.md,
    },
    pomodoroSkipText: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.accent,
        fontWeight: theme.fontWeight.medium,
    },
});

export default function HomeScreen() {
    const router = useRouter();
    const { state, startSession, pauseSession, emergencyPause, resumeSession, completeSession, failSession, resetSession, updateUserSettings, setGestureHintsSeen, setOnboardingComplete, dismissAchievement, dismissMilestone, i18n } = useGame();
    const { theme } = useTheme();
    const responsive = useResponsive();

    // Create dynamic styles based on current theme and proportional layout
    const styles = useMemo(() => createStyles(theme, {
        horizontalPadding: responsive.horizontalPadding,
        timerSectionHeight: responsive.timerSectionHeight,
        eggSectionHeight: responsive.eggSectionHeight,
        controlsSectionHeight: responsive.controlsSectionHeight,
        safeAreaBottom: responsive.safeAreaBottom,
    }), [
        theme,
        responsive.horizontalPadding,
        responsive.timerSectionHeight,
        responsive.eggSectionHeight,
        responsive.controlsSectionHeight,
        responsive.safeAreaBottom,
    ]);

    // Modal states
    const [showHatchModal, setShowHatchModal] = useState(false);
    const [hatchedAnimal, setHatchedAnimal] = useState<Animal | null>(null);
    const [showGestureHints, setShowGestureHints] = useState(false);
    const [showStreakCelebration, setShowStreakCelebration] = useState(false);
    const [celebrationStreak, setCelebrationStreak] = useState(0);
    const previousBestStreakRef = useRef<number>(state.stats.bestStreak);
    const hasInitializedRef = useRef(false);
    const prevWarningLevelRef = useRef(0);
    // Track which timer warnings have been announced to avoid duplicates
    const announcedWarningsRef = useRef<Set<number>>(new Set());

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
    // Refs to store latest function references and state for emergency pause auto-resume callback
    // This prevents stale closures in setTimeout
    const startTimerRef = useRef<() => void>(() => {});
    const resumeSessionRef = useRef<() => void>(() => {});
    const hapticsEnabledRef = useRef(state.settings.hapticsEnabled);
    const sessionStateRef = useRef(state.sessionState);

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
    }, [state.collection.length]);

    // Pomodoro state
    const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>('work');
    const [pomodoroWorkSessions, setPomodoroWorkSessions] = useState(0);

    // Compute milestone data when there's a pending milestone
    const milestoneData = useMemo<MilestoneData | null>(() => {
        if (!state.pendingMilestone) return null;

        const achievement = state.pendingMilestone;
        const category = getMilestoneCategory(achievement);
        const lang = state.settings.language;

        // Get localized title and subtitle based on category
        switch (category) {
            case 'first_animal':
                return {
                    type: 'first_animal',
                    title: i18n('milestone_first_animal' as any) || 'Welcome to Ovo Focus!',
                    subtitle: i18n('milestone_first_animal_subtitle' as any) || 'Your focus journey begins!',
                    icon: achievement.icon,
                    color: theme.colors.legendary, // Gold for first animal
                };
            case 'collection_count':
                return {
                    type: 'collection_milestone',
                    title: i18n('milestoneCollectionTitle' as any) || 'Collection Milestone!',
                    subtitle: `${achievement.threshold} ${i18n('milestoneCollectionSubtitle' as any) || 'animals hatched!'}`,
                    icon: achievement.icon,
                    value: achievement.threshold,
                    color: theme.colors.rare, // Light blue
                };
            case 'streak':
                return {
                    type: 'streak_milestone',
                    title: i18n('milestoneStreakTitle' as any) || 'Streak Milestone!',
                    subtitle: `${achievement.threshold} ${i18n('milestoneStreakSubtitle' as any) || 'days in a row!'}`,
                    icon: achievement.icon,
                    value: achievement.threshold,
                    color: theme.colors.primary, // Orange-red for fire
                };
            case 'rarity':
                return {
                    type: 'rarity_discovery',
                    title: i18n('milestoneRarityTitle' as any) || 'New Discovery!',
                    subtitle: i18n(`achievement_${achievement.id}_desc` as any) || `First ${achievement.rarityRequired} animal!`,
                    icon: achievement.icon,
                    color: achievement.rarityRequired === 'legendary' ? theme.colors.legendary :
                           achievement.rarityRequired === 'epic' ? theme.colors.epic :
                           achievement.rarityRequired === 'rare' ? theme.colors.rare : theme.colors.semantic.successLight,
                };
            default:
                return null;
        }
    // Using state.settings.language instead of i18n for stable dependency -
    // i18n function reference may change on re-renders but only produces different
    // results when language changes
    }, [state.pendingMilestone, state.settings.language]);

    // Debug mode: 10 seconds, Normal: 25 minutes (with focus bonus applied)
    const baseDuration = state.settings.debugMode ? 10 : state.settings.focusDuration * 60;
    const duration = calculateEffectiveDuration(baseDuration, levelBonuses.focusPercentage);

    // Pomodoro durations (debug mode uses shorter durations)
    const pomodoroWorkDuration = state.settings.debugMode ? 10 : state.settings.pomodoroWorkDuration * 60;
    const pomodoroBreakDuration = state.settings.debugMode ? 5 : state.settings.pomodoroBreakDuration * 60;
    const pomodoroLongBreakDuration = state.settings.debugMode ? 8 : state.settings.pomodoroLongBreakDuration * 60;

    // Handler for completing a work session (hatching animal)
    const handleWorkSessionComplete = useCallback(async () => {
        if (state.settings.hapticsEnabled) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        const prevBest = previousBestStreakRef.current;
        const focusMinutes = state.settings.pomodoroEnabled
            ? state.settings.pomodoroWorkDuration
            : state.settings.focusDuration;
        const { animal, updatedStats } = await completeSession(focusMinutes);
        setHatchedAnimal(animal);
        setShowHatchModal(true);

        if (state.settings.notificationsEnabled) {
            sendSessionCompleteNotification(animal, state.settings.language);
        }

        setTimeout(() => {
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
        state.settings.pomodoroWorkDuration,
        state.settings.pomodoroEnabled,
        state.settings.notificationsEnabled,
        state.settings.language,
    ]);

    // Handler for regular timer complete (non-Pomodoro mode)
    const handleTimerComplete = useCallback(async () => {
        await handleWorkSessionComplete();
    }, [handleWorkSessionComplete]);

    // Pomodoro work session complete - hatch animal and transition to break
    const handlePomodoroWorkComplete = useCallback(async () => {
        await handleWorkSessionComplete();
        // Note: The modal close will reset the session, so we don't auto-start break here
        // The user needs to dismiss the modal, then they can continue with the next phase
    }, [handleWorkSessionComplete]);

    // Pomodoro break complete - just play a sound, no animal hatching
    const handlePomodoroBreakComplete = useCallback(() => {
        if (state.settings.hapticsEnabled) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        audioManager.playSound('session_start'); // Use a positive sound for break end
    }, [state.settings.hapticsEnabled]);

    // Regular timer (used when Pomodoro is disabled)
    const regularTimer = useTimer({
        duration,
        onComplete: handleTimerComplete,
    });

    // Pomodoro timer (used when Pomodoro is enabled)
    const pomodoroTimer = usePomodoroTimer({
        workDuration: state.settings.pomodoroWorkDuration,
        shortBreakDuration: state.settings.pomodoroBreakDuration,
        longBreakDuration: state.settings.pomodoroLongBreakDuration,
        sessionsBeforeLongBreak: state.settings.sessionsBeforeLongBreak,
        debugMode: state.settings.debugMode,
        onWorkComplete: handlePomodoroWorkComplete,
        onBreakComplete: handlePomodoroBreakComplete,
    });

    // Unified timer interface - use Pomodoro timer when enabled, regular timer otherwise
    const isPomodoroMode = state.settings.pomodoroEnabled;
    const {
        formattedTime,
        isRunning,
        progress,
        elapsedMinutes,
        timeRemaining,
    } = isPomodoroMode ? {
        formattedTime: pomodoroTimer.formattedTime,
        isRunning: pomodoroTimer.isRunning,
        progress: pomodoroTimer.progress,
        elapsedMinutes: pomodoroTimer.elapsedMinutes,
        timeRemaining: pomodoroTimer.timeRemaining,
    } : {
        formattedTime: regularTimer.formattedTime,
        isRunning: regularTimer.isRunning,
        progress: regularTimer.progress,
        elapsedMinutes: regularTimer.elapsedMinutes,
        timeRemaining: regularTimer.timeRemaining,
    };

    // Timer control functions that work with both modes
    const startTimer = useCallback(() => {
        if (isPomodoroMode) {
            pomodoroTimer.start();
        } else {
            regularTimer.start();
        }
    }, [isPomodoroMode, pomodoroTimer, regularTimer]);

    const pauseTimer = useCallback(() => {
        if (isPomodoroMode) {
            pomodoroTimer.pause();
        } else {
            regularTimer.pause();
        }
    }, [isPomodoroMode, pomodoroTimer, regularTimer]);

    const stopTimer = useCallback(() => {
        if (isPomodoroMode) {
            pomodoroTimer.stop();
        } else {
            regularTimer.stop();
        }
    }, [isPomodoroMode, pomodoroTimer, regularTimer]);

    const resetTimer = useCallback(() => {
        if (isPomodoroMode) {
            pomodoroTimer.reset();
        } else {
            regularTimer.reset();
        }
    }, [isPomodoroMode, pomodoroTimer, regularTimer]);

    // Keep refs updated with latest function references and state for emergency pause callback
    // This prevents stale closure issues in setTimeout
    useEffect(() => {
        startTimerRef.current = startTimer;
        resumeSessionRef.current = resumeSession;
        hapticsEnabledRef.current = state.settings.hapticsEnabled;
        sessionStateRef.current = state.sessionState;
    }, [startTimer, resumeSession, state.settings.hapticsEnabled, state.sessionState]);

    // Sync Pomodoro phase state for UI
    useEffect(() => {
        if (isPomodoroMode) {
            setPomodoroPhase(pomodoroTimer.currentPhase);
            setPomodoroWorkSessions(pomodoroTimer.workSessionsCompleted);
        }
    }, [isPomodoroMode, pomodoroTimer.currentPhase, pomodoroTimer.workSessionsCompleted]);

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

    // Handle ambient sound volume changes separately to avoid infinite loops
    useEffect(() => {
        const updateVolume = async () => {
            await ambientSoundService.setVolume(state.settings.ambientSoundVolume);
        };
        updateVolume();
    }, [state.settings.ambientSoundVolume]);

    // Manage ambient sound playback based on session state and sound selection
    useEffect(() => {
        const manageAmbientSound = async () => {
            const { ambientSoundEnabled, selectedAmbientSound } = state.settings;

            // Only play ambient sounds if enabled
            if (!ambientSoundEnabled) {
                await ambientSoundService.stop();
                return;
            }

            // Start/stop/pause based on session state
            if (state.sessionState === 'active') {
                if (state.isPaused) {
                    // Pause ambient sound when session is paused
                    await ambientSoundService.pause();
                } else {
                    // Play or resume ambient sound when session is active
                    const currentSound = ambientSoundService.getCurrentSoundType();
                    if (currentSound !== selectedAmbientSound) {
                        // Sound type changed, play the new one
                        await ambientSoundService.play(selectedAmbientSound as AmbientSoundType);
                    } else if (!ambientSoundService.getIsPlaying()) {
                        // Same sound but not playing, resume
                        await ambientSoundService.resume();
                    }
                }
            } else {
                // Session is idle, completed, or failed - stop ambient sound
                await ambientSoundService.stop();
            }
        };

        manageAmbientSound();
    }, [
        state.sessionState,
        state.isPaused,
        state.settings.ambientSoundEnabled,
        state.settings.selectedAmbientSound,
    ]);

    // Cleanup ambient sound on unmount
    useEffect(() => {
        return () => {
            ambientSoundService.stop();
        };
    }, []);

    // Cleanup emergency pause timeout on unmount
    useEffect(() => {
        return () => {
            if (emergencyPauseTimeoutRef.current) {
                clearTimeout(emergencyPauseTimeoutRef.current);
            }
        };
    }, []);

    // Clear emergency pause timeout when session ends (give up, fail, or complete)
    // This prevents the auto-resume from firing after the session is no longer active
    useEffect(() => {
        if (state.sessionState !== 'active' && emergencyPauseTimeoutRef.current) {
            clearTimeout(emergencyPauseTimeoutRef.current);
            emergencyPauseTimeoutRef.current = null;
        }
    }, [state.sessionState]);

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
    // Only show if the session has been running for at least 5 seconds to avoid
    // false positives when the app briefly backgrounds at session start
    useEffect(() => {
        const elapsedSeconds = progress * duration;
        if (isQuickReturn && state.sessionState === 'active' && elapsedSeconds >= 5) {
            setShowQuickReturnToast(true);
            if (state.settings.hapticsEnabled) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        }
    }, [isQuickReturn, state.sessionState, state.settings.hapticsEnabled, progress, duration]);

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

    // Announce timer warnings to screen readers (1, 5, 10 minutes remaining)
    // Only announce during work phases in Pomodoro mode, and only announce each warning once per session
    useEffect(() => {
        // Only announce during active, non-paused sessions
        if (state.sessionState !== 'active' || state.isPaused || !isRunning) {
            return;
        }

        // In Pomodoro mode, only announce during work phase
        if (isPomodoroMode && pomodoroPhase !== 'work') {
            return;
        }

        // Check for specific warning thresholds (check at exact minute boundaries)
        // We check if we're at exactly the warning minute (within the first second)
        const warningMinutes = [10, 5, 1];

        for (const warningMinute of warningMinutes) {
            const warningSeconds = warningMinute * 60;
            // Announce when crossing the threshold (within 1 second window)
            if (timeRemaining <= warningSeconds && timeRemaining > warningSeconds - 1) {
                if (!announcedWarningsRef.current.has(warningMinute)) {
                    announcedWarningsRef.current.add(warningMinute);
                    announceTimerWarning(warningMinute, state.settings.language);
                }
                break;
            }
        }
    }, [timeRemaining, state.sessionState, state.isPaused, isRunning, isPomodoroMode, pomodoroPhase, state.settings.language]);

    // Reset announced warnings when session resets, pauses, or completes
    // Clearing on pause ensures warnings re-announce if the timer passes the same threshold again after resume
    // Clearing on completed ensures a fresh set for the next session
    useEffect(() => {
        if (state.sessionState === 'idle' || state.isPaused || state.sessionState === 'completed') {
            announcedWarningsRef.current.clear();
        }
    }, [state.sessionState, state.isPaused]);

    // Handler functions
    const handleActivateShield = async (shield: ShieldItem) => {
        const result = await consumeShield(shield.animalId);
        if (result.status === 'used') {
            setActiveShieldBonus(result.shield.durationSeconds);
            setShieldInventory(prev => prev.filter(s => s.animalId !== shield.animalId));
            setShowShieldSelector(false);
            audioManager.playSound('shield_equip');
            if (state.settings.hapticsEnabled) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } else if (result.status === 'error') {
            console.error('[handleActivateShield] Failed to use shield:', result.error);
            // Could show an error toast to user here
        }
        // status === 'not_found' is unexpected here since we're using a shield from inventory
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
            // Use refs to get latest function references to avoid stale closures
            const autoResumeDuration = state.settings.emergencyPauseDuration * 1000;
            emergencyPauseTimeoutRef.current = setTimeout(() => {
                // Guard: only auto-resume if session is still active (not failed/completed/idle)
                if (sessionStateRef.current !== 'active') {
                    console.warn('[emergencyPause] Auto-resume skipped: session is', sessionStateRef.current);
                    return;
                }
                startTimerRef.current();
                resumeSessionRef.current();
                if (hapticsEnabledRef.current) {
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

        // GestureHint is now only triggered manually via egg interaction
        // Removed auto-showing to avoid interrupting the main flow
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
                        // Stop ambient sound immediately so it doesn't continue
                        // playing during the fail animation/state
                        ambientSoundService.stop();
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
        // Track when hints were last shown for periodic reminder feature
        updateUserSettings({ lastGestureHintSession: state.stats.completedSessions });
    };

    const handleReset = () => {
        resetTimer();
        resetSession();
    };

    const handleModalClose = async (notes?: string) => {
        // Save session notes if provided
        if (notes && notes.trim()) {
            await updateLastAnimalNotes(notes);
        }

        setShowHatchModal(false);
        setHatchedAnimal(null);

        // In Pomodoro mode, reset the timer for the next phase so auto-resume works correctly
        // The pomodoroTimer.reset() resets phase to 'work' and clears counters,
        // ensuring the timer is properly prepared for the next session start
        if (!isPomodoroMode) {
            resetTimer();
        } else {
            // Reset the Pomodoro timer fully so the next start begins a fresh work phase
            pomodoroTimer.reset();
            // Sync local phase state to 'work' so the indicator reflects the reset
            setPomodoroPhase('work');
        }
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
                    <ActivityIndicator size="large" color={darkTheme.colors.primary} />
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
                    onStatsPress={() => router.push('/stats')}
                    language={state.settings.language}
                />

                {/* Stats bar */}
                <SessionStatsBar
                    completedSessions={state.stats.completedSessions}
                    collectionCount={state.collection.length}
                    dailyProgress={state.dailyProgress}
                    dailyGoal={state.settings.dailyGoal}
                    currentStreak={state.stats.currentStreak}
                    bestStreak={state.stats.bestStreak}
                    totalFocusMinutes={state.stats.totalFocusMinutes}
                    hapticsEnabled={state.settings.hapticsEnabled}
                    labels={{
                        session: i18n('session'),
                        animals: i18n('animals'),
                        dailyGoalProgress: i18n('dailyGoalProgress'),
                        streak: i18n('dayStreak'),
                        todayFocusTime: i18n('todayFocusTime'),
                        viewDetails: i18n('statsTitle'),
                        close: i18n('close'),
                        totalSessions: i18n('totalSessions'),
                        totalFocusTime: i18n('totalFocusTime'),
                        averagePerDay: i18n('averagePerDay'),
                        bestStreakLabel: i18n('best'),
                        dailyGoalLabel: i18n('dailyGoal'),
                    }}
                />

                {/* Main content */}
                <View style={styles.content}>
                    {/* Timer Section - horizontal progress bar */}
                    <View style={styles.timerSection}>
                        <TimerProgressBar
                            formattedTime={formattedTime}
                            isRunning={isRunning}
                            progress={progress}
                            sessionState={state.sessionState}
                            isPaused={state.isPaused}
                            language={state.settings.language}
                            theme={theme}
                            barWidth={responsive.timerBarWidth}
                            barHeight={responsive.timerBarHeight}
                            timerFontSize={responsive.timerFontSize}
                        />

                        {/* Pomodoro Phase Indicator */}
                        {isPomodoroMode && state.sessionState === 'active' && (
                            <View style={styles.pomodoroIndicator}>
                                <View style={styles.pomodoroPhaseContainer}>
                                    <Text style={styles.pomodoroPhaseIcon}>
                                        {pomodoroPhase === 'work' ? '🍅' : pomodoroPhase === 'longBreak' ? '☕' : '🧘'}
                                    </Text>
                                    <Text style={[
                                        styles.pomodoroPhaseText,
                                        pomodoroPhase === 'work' ? styles.pomodoroPhaseTextWork : styles.pomodoroPhaseTextBreak
                                    ]}>
                                        {pomodoroPhase === 'work'
                                            ? i18n('pomodoroWork')
                                            : pomodoroPhase === 'shortBreak'
                                            ? i18n('pomodoroShortBreak')
                                            : i18n('pomodoroLongBreak')}
                                    </Text>
                                </View>
                                <View style={styles.pomodoroDivider} />
                                <Text style={styles.pomodoroSessionCounter}>
                                    {i18n('pomodoroSessionCount')} {pomodoroWorkSessions + (pomodoroPhase === 'work' ? 1 : 0)}/{state.settings.sessionsBeforeLongBreak}
                                </Text>
                                {pomodoroPhase !== 'work' && (
                                    <Pressable
                                        style={styles.pomodoroSkipButton}
                                        onPress={() => {
                                            pomodoroTimer.skipBreak();
                                            if (state.settings.hapticsEnabled) {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }
                                        }}
                                    >
                                        <Text style={styles.pomodoroSkipText}>{i18n('pomodoroSkipBreak')}</Text>
                                    </Pressable>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Egg Section - separate from timer */}
                    <View style={styles.eggSection}>
                        <InteractiveEgg
                            sessionState={state.sessionState}
                            progress={progress}
                            duration={duration}
                            warningLevel={warningLevel as 0 | 1 | 2 | 3}
                            language={state.settings.language}
                            hapticsEnabled={state.settings.hapticsEnabled}
                            hasSeenGestureHints={state.settings.hasSeenGestureHints}
                            eggStyleId={state.settings.selectedEggStyle}
                            onStart={handleStart}
                            onShowGestureHints={() => setShowGestureHints(true)}
                        />
                    </View>

                    {/* Controls Section - 22% of available height + safe area padding */}
                    <View style={styles.controlsSection}>
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
                            // Power-up props (consolidated)
                            emergencyPauseUsed={emergencyPauseUsed}
                            activeShieldBonus={activeShieldBonus}
                            shieldCount={shieldInventory.length}
                            onEmergencyPause={handleEmergencyPause}
                            onOpenShieldSelector={() => setShowShieldSelector(true)}
                            labels={{
                                startFocus: i18n('startFocus'),
                                pause: i18n('pause'),
                                giveUp: i18n('giveUp'),
                                paused: i18n('paused'),
                                pausesRemaining: i18n('pausesRemaining'),
                                resume: i18n('resume'),
                                tryAgain: i18n('tryAgain'),
                                // Power-up labels
                                emergencyPause: i18n('emergencyPause'),
                                activateShield: i18n('activateShield'),
                                shieldActive: i18n('shieldActive'),
                            }}
                            language={state.settings.language}
                        />
                    </View>
                </View>
            </View>

            {/* Debug mode indicator */}
            {state.settings.debugMode && (
                <View style={styles.debugBadge}>
                    <Text style={styles.debugText}>🛠 Debug Mode (10s)</Text>
                </View>
            )}

            {/* Hatch Modal - Lazy loaded */}
            <Suspense fallback={<LoadingIndicator overlay />}>
                <HatchModal
                    visible={showHatchModal}
                    animal={hatchedAnimal}
                    onClose={handleModalClose}
                    language={state.settings.language}
                />
            </Suspense>

            {/* Streak Celebration */}
            <StreakCelebration
                visible={showStreakCelebration}
                streakCount={celebrationStreak}
                onComplete={() => setShowStreakCelebration(false)}
                language={state.settings.language}
            />

            {/* Achievement Modal (for regular achievements) - Lazy loaded */}
            <Suspense fallback={<LoadingIndicator overlay />}>
                <AchievementModal
                    visible={!!state.pendingAchievement}
                    achievement={state.pendingAchievement}
                    onClose={dismissAchievement}
                    language={state.settings.language}
                />
            </Suspense>

            {/* Milestone Celebration (for special milestones with enhanced celebrations) */}
            <MilestoneCelebration
                visible={!!state.pendingMilestone && !!milestoneData}
                milestone={milestoneData}
                onDismiss={dismissMilestone}
                language={state.settings.language}
            />

            {/* Onboarding Flow - Lazy loaded */}
            <Suspense fallback={<LoadingIndicator overlay />}>
                <OnboardingFlow
                    visible={!state.settings.hasCompletedOnboarding && !state.isLoading}
                    onComplete={setOnboardingComplete}
                    language={state.settings.language}
                />
            </Suspense>

            {/* Animated Gesture Hints Overlay */}
            <GestureHint
                visible={showGestureHints}
                onDismiss={handleDismissGestureHints}
                language={state.settings.language}
            />

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

