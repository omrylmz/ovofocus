import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export type WarningLevel = 0 | 1 | 2 | 3; // 0=none, 1=50%, 2=75%, 3=100%

interface ToleranceConfig {
    baseTolerance: number; // in seconds
    progress: number; // 0 to 1
    currentStreak: number;
    shieldBonus: number; // in seconds
    isSessionActive: boolean;
    isPaused: boolean;
}

interface ToleranceState {
    warningLevel: WarningLevel;
    effectiveTolerance: number;
    timeInBackground: number;
    isQuickReturn: boolean;
    toleranceExceeded: boolean;
    progressMultiplier: number;
    streakBonus: number;
}

interface UseToleranceSystemReturn extends ToleranceState {
    resetTolerance: () => void;
}

const QUICK_RETURN_THRESHOLD = 5; // 5 seconds

/**
 * Calculate the progress-based tolerance multiplier
 * 0-25%: 1x, 25-50%: 1.25x, 50-75%: 1.5x, 75-100%: 2x
 */
function getProgressMultiplier(progress: number): number {
    if (progress >= 0.75) return 2;
    if (progress >= 0.5) return 1.5;
    if (progress >= 0.25) return 1.25;
    return 1;
}

/**
 * Calculate streak-based bonus seconds
 * 3-day: +5s, 7-day: +10s, 14-day: +15s
 */
function getStreakBonus(currentStreak: number): number {
    if (currentStreak >= 14) return 15;
    if (currentStreak >= 7) return 10;
    if (currentStreak >= 3) return 5;
    return 0;
}

/**
 * Determine warning level based on time spent in background vs effective tolerance
 */
function getWarningLevel(timeInBackground: number, effectiveTolerance: number): WarningLevel {
    if (timeInBackground <= 0 || effectiveTolerance <= 0) return 0;
    
    const ratio = timeInBackground / effectiveTolerance;
    
    if (ratio >= 1) return 3;      // 100% - breaking
    if (ratio >= 0.75) return 2;   // 75%
    if (ratio >= 0.5) return 1;    // 50%
    return 0;                       // < 50%
}

export function useToleranceSystem(config: ToleranceConfig): UseToleranceSystemReturn {
    const {
        baseTolerance,
        progress,
        currentStreak,
        shieldBonus,
        isSessionActive,
        isPaused,
    } = config;

    const [timeInBackground, setTimeInBackground] = useState(0);
    const [isQuickReturn, setIsQuickReturn] = useState(false);
    const backgroundStartTimeRef = useRef<number | null>(null);
    const previousAppStateRef = useRef<AppStateStatus>(AppState.currentState);
    const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const quickReturnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const warningClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Calculate effective tolerance
    const progressMultiplier = getProgressMultiplier(progress);
    const streakBonus = getStreakBonus(currentStreak);
    const effectiveTolerance = Math.round(
        (baseTolerance * progressMultiplier) + streakBonus + shieldBonus
    );

    // Calculate warning level
    const warningLevel = getWarningLevel(timeInBackground, effectiveTolerance);
    const toleranceExceeded = timeInBackground >= effectiveTolerance;

    // Handle app state changes
    const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
        const prevState = previousAppStateRef.current;

        // Going to background
        if (prevState === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
            if (isSessionActive && !isPaused) {
                backgroundStartTimeRef.current = Date.now();
                setIsQuickReturn(false);

                // Start interval to update time in background for real-time warning
                checkIntervalRef.current = setInterval(() => {
                    if (backgroundStartTimeRef.current) {
                        const elapsed = Math.floor((Date.now() - backgroundStartTimeRef.current) / 1000);
                        setTimeInBackground(elapsed);
                    }
                }, 500);
            }
        }

        // Coming back to foreground
        if ((prevState === 'background' || prevState === 'inactive') && nextAppState === 'active') {
            // Clear the interval
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
                checkIntervalRef.current = null;
            }

            if (backgroundStartTimeRef.current && isSessionActive && !isPaused) {
                const timeDiff = Math.floor((Date.now() - backgroundStartTimeRef.current) / 1000);
                setTimeInBackground(timeDiff);

                // Check for quick return
                if (timeDiff <= QUICK_RETURN_THRESHOLD) {
                    setIsQuickReturn(true);
                    // Auto-clear quick return flag after 3 seconds
                    if (quickReturnTimeoutRef.current) clearTimeout(quickReturnTimeoutRef.current);
                    quickReturnTimeoutRef.current = setTimeout(() => setIsQuickReturn(false), 3000);
                }

                // If returned within tolerance, clear the warning after a brief display
                // This prevents the warning UI from persisting incorrectly
                const currentEffectiveTolerance = Math.round(
                    (baseTolerance * getProgressMultiplier(progress)) + getStreakBonus(currentStreak) + shieldBonus
                );
                if (timeDiff < currentEffectiveTolerance) {
                    if (warningClearTimeoutRef.current) clearTimeout(warningClearTimeoutRef.current);
                    warningClearTimeoutRef.current = setTimeout(() => setTimeInBackground(0), 1500);
                }

                backgroundStartTimeRef.current = null;
            }
        }

        previousAppStateRef.current = nextAppState;
    }, [isSessionActive, isPaused, baseTolerance, progress, currentStreak, shieldBonus]);

    // Subscribe to app state changes
    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            subscription.remove();
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
            }
            if (quickReturnTimeoutRef.current) {
                clearTimeout(quickReturnTimeoutRef.current);
            }
            if (warningClearTimeoutRef.current) {
                clearTimeout(warningClearTimeoutRef.current);
            }
        };
    }, [handleAppStateChange]);

    // Reset when session becomes inactive
    useEffect(() => {
        if (!isSessionActive) {
            setTimeInBackground(0);
            setIsQuickReturn(false);
            backgroundStartTimeRef.current = null;
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current);
                checkIntervalRef.current = null;
            }
            if (quickReturnTimeoutRef.current) {
                clearTimeout(quickReturnTimeoutRef.current);
                quickReturnTimeoutRef.current = null;
            }
            if (warningClearTimeoutRef.current) {
                clearTimeout(warningClearTimeoutRef.current);
                warningClearTimeoutRef.current = null;
            }
        }
    }, [isSessionActive]);

    // Reset tolerance state
    const resetTolerance = useCallback(() => {
        setTimeInBackground(0);
        setIsQuickReturn(false);
        backgroundStartTimeRef.current = null;
        if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
        }
        if (quickReturnTimeoutRef.current) {
            clearTimeout(quickReturnTimeoutRef.current);
            quickReturnTimeoutRef.current = null;
        }
        if (warningClearTimeoutRef.current) {
            clearTimeout(warningClearTimeoutRef.current);
            warningClearTimeoutRef.current = null;
        }
    }, []);

    return {
        warningLevel,
        effectiveTolerance,
        timeInBackground,
        isQuickReturn,
        toleranceExceeded,
        progressMultiplier,
        streakBonus,
        resetTolerance,
    };
}

/**
 * Calculate shield bonus based on animal rarity
 */
export function getShieldDuration(rarity: string): number {
    switch (rarity) {
        case 'legendary': return 60;
        case 'epic': return 30;
        case 'rare': return 20;
        case 'common':
        default: return 10;
    }
}
