import { useState, useCallback, useRef, useEffect } from 'react';
import { useTimer } from './useTimer';

// Pomodoro phase types
export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

export interface UsePomodoroTimerOptions {
    // Duration settings (in minutes)
    workDuration: number;
    shortBreakDuration: number;
    longBreakDuration: number;
    sessionsBeforeLongBreak: number;
    // Debug mode (uses seconds instead of minutes)
    debugMode?: boolean;
    // Callbacks
    onWorkComplete?: () => void;
    onBreakComplete?: () => void;
    onCycleComplete?: () => void; // Called when all sessions in a cycle are done
    onTick?: (remaining: number) => void;
}

export interface UsePomodoroTimerReturn {
    // Timer state
    timeRemaining: number;
    isRunning: boolean;
    progress: number;
    formattedTime: string;
    elapsedMinutes: number;
    // Pomodoro-specific state
    currentPhase: PomodoroPhase;
    workSessionsCompleted: number; // Sessions completed in current cycle (0 to sessionsBeforeLongBreak)
    totalWorkSessionsCompleted: number; // Total work sessions completed overall
    isWorkPhase: boolean;
    isBreakPhase: boolean;
    // Controls
    start: () => void;
    pause: () => void;
    resume: () => void;
    reset: () => void;
    stop: () => void;
    skipBreak: () => void; // Skip the current break and start next work session
    // Phase info
    getPhaseLabel: () => string;
    getPhaseDuration: () => number; // Returns duration of current phase in seconds
}

export function usePomodoroTimer({
    workDuration,
    shortBreakDuration,
    longBreakDuration,
    sessionsBeforeLongBreak,
    debugMode = false,
    onWorkComplete,
    onBreakComplete,
    onCycleComplete,
    onTick,
}: UsePomodoroTimerOptions): UsePomodoroTimerReturn {
    // Pomodoro state
    const [currentPhase, setCurrentPhase] = useState<PomodoroPhase>('work');
    const [workSessionsCompleted, setWorkSessionsCompleted] = useState(0);
    const [totalWorkSessionsCompleted, setTotalWorkSessionsCompleted] = useState(0);

    // Convert minutes to seconds (or use as-is in debug mode)
    const toSeconds = useCallback((minutes: number) => {
        return debugMode ? Math.min(minutes, 10) : minutes * 60;
    }, [debugMode]);

    // Get duration for current phase
    const getPhaseDuration = useCallback(() => {
        switch (currentPhase) {
            case 'work':
                return toSeconds(workDuration);
            case 'shortBreak':
                return toSeconds(shortBreakDuration);
            case 'longBreak':
                return toSeconds(longBreakDuration);
            default:
                return toSeconds(workDuration);
        }
    }, [currentPhase, workDuration, shortBreakDuration, longBreakDuration, toSeconds]);

    // Refs to track if we should auto-advance
    const shouldAutoAdvanceRef = useRef(false);
    // M2: Ref for auto-advance timeout cleanup
    const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Use state instead of ref for duration so useTimer can detect changes
    const [currentDuration, setCurrentDuration] = useState(getPhaseDuration());

    // Update duration when phase changes
    useEffect(() => {
        setCurrentDuration(getPhaseDuration());
    }, [getPhaseDuration]);

    // Handle phase completion
    const handlePhaseComplete = useCallback(() => {
        if (currentPhase === 'work') {
            // Work session completed
            const newSessionsCompleted = workSessionsCompleted + 1;
            setWorkSessionsCompleted(newSessionsCompleted);
            setTotalWorkSessionsCompleted(prev => prev + 1);

            // Notify work completion
            onWorkComplete?.();

            // Determine next phase
            if (newSessionsCompleted >= sessionsBeforeLongBreak) {
                // Time for long break
                setCurrentPhase('longBreak');
                setWorkSessionsCompleted(0); // Reset cycle counter
                onCycleComplete?.();
            } else {
                // Time for short break
                setCurrentPhase('shortBreak');
            }

            shouldAutoAdvanceRef.current = true;
        } else {
            // Break completed
            onBreakComplete?.();
            setCurrentPhase('work');
            shouldAutoAdvanceRef.current = true;
        }
    }, [
        currentPhase,
        workSessionsCompleted,
        sessionsBeforeLongBreak,
        onWorkComplete,
        onBreakComplete,
        onCycleComplete,
    ]);

    // Use the base timer hook with state-based duration (not ref)
    // This ensures useTimer detects duration changes when phase changes
    const timer = useTimer({
        duration: currentDuration,
        onComplete: handlePhaseComplete,
        onTick,
    });

    // Auto-start next phase after completion
    useEffect(() => {
        if (shouldAutoAdvanceRef.current && !timer.isRunning) {
            shouldAutoAdvanceRef.current = false;
            // M2: Clear any existing timeout before creating a new one
            if (autoAdvanceTimeoutRef.current) {
                clearTimeout(autoAdvanceTimeoutRef.current);
            }
            // Small delay before auto-starting next phase
            autoAdvanceTimeoutRef.current = setTimeout(() => {
                autoAdvanceTimeoutRef.current = null;
                timer.reset();
                timer.start();
            }, 100);
            return () => {
                if (autoAdvanceTimeoutRef.current) {
                    clearTimeout(autoAdvanceTimeoutRef.current);
                    autoAdvanceTimeoutRef.current = null;
                }
            };
        }
    }, [currentPhase, timer.isRunning, timer]);

    // M3: Reset duration when settings change (but not during active session)
    // Removed getPhaseDuration from deps to avoid re-fires on phase change
    useEffect(() => {
        if (!timer.isRunning) {
            setCurrentDuration(getPhaseDuration());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workDuration, shortBreakDuration, longBreakDuration, timer.isRunning]);

    // Start the pomodoro timer
    const start = useCallback(() => {
        setCurrentDuration(getPhaseDuration());
        timer.reset();
        timer.start();
    }, [timer, getPhaseDuration]);

    // Pause the timer
    const pause = useCallback(() => {
        timer.pause();
    }, [timer]);

    // Resume the timer
    // Note: Calling timer.start() after pause() works correctly because:
    // 1. pause() stores the current timeRemaining in pausedTimeRef and sets isRunning to false
    // 2. start() captures the current timeRemaining (which equals pausedTimeRef) and starts from there
    // 3. The timer calculates remaining time as: pausedTimeRef - elapsed since start
    // This means resume correctly continues from where it was paused
    const resume = useCallback(() => {
        timer.start();
    }, [timer]);

    // Full reset - go back to work phase, reset counters
    const reset = useCallback(() => {
        setCurrentPhase('work');
        setWorkSessionsCompleted(0);
        shouldAutoAdvanceRef.current = false;
        setCurrentDuration(toSeconds(workDuration));
        timer.reset();
    }, [timer, workDuration, toSeconds]);

    // Stop the timer
    const stop = useCallback(() => {
        shouldAutoAdvanceRef.current = false;
        timer.stop();
    }, [timer]);

    // Skip current break and start next work session
    const skipBreak = useCallback(() => {
        if (currentPhase !== 'work') {
            shouldAutoAdvanceRef.current = false;
            setCurrentPhase('work');
            setCurrentDuration(toSeconds(workDuration));
            timer.reset();
            timer.start();
        }
    }, [currentPhase, timer, workDuration, toSeconds]);

    // Get human-readable phase label
    const getPhaseLabel = useCallback(() => {
        switch (currentPhase) {
            case 'work':
                return 'work';
            case 'shortBreak':
                return 'shortBreak';
            case 'longBreak':
                return 'longBreak';
            default:
                return 'work';
        }
    }, [currentPhase]);

    return {
        // Timer state
        timeRemaining: timer.timeRemaining,
        isRunning: timer.isRunning,
        progress: timer.progress,
        formattedTime: timer.formattedTime,
        elapsedMinutes: timer.elapsedMinutes,
        // Pomodoro-specific state
        currentPhase,
        workSessionsCompleted,
        totalWorkSessionsCompleted,
        isWorkPhase: currentPhase === 'work',
        isBreakPhase: currentPhase !== 'work',
        // Controls
        start,
        pause,
        resume,
        reset,
        stop,
        skipBreak,
        // Phase info
        getPhaseLabel,
        getPhaseDuration,
    };
}
