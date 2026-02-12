import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTimerOptions {
    duration: number; // in seconds
    onComplete?: () => void;
    onTick?: (remaining: number) => void;
}

export interface UseTimerReturn {
    timeRemaining: number;
    isRunning: boolean;
    progress: number; // 0 to 1
    formattedTime: string;
    start: () => void;
    pause: () => void;
    reset: () => void;
    stop: () => void;
    elapsedMinutes: number;
}

export function useTimer({ duration, onComplete, onTick }: UseTimerOptions): UseTimerReturn {
    const [timeRemaining, setTimeRemaining] = useState(duration);
    const [isRunning, setIsRunning] = useState(false);
    const startTimeRef = useRef<number | null>(null);
    const pausedTimeRef = useRef<number>(duration);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const elapsedMinutes = Math.ceil((duration - timeRemaining) / 60);
    const progress = duration > 0
        ? Math.max(0, Math.min(1, 1 - timeRemaining / duration))
        : 0;

    const formatTime = useCallback((seconds: number): string => {
        const totalSeconds = Math.max(0, Math.floor(seconds));
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

    const clearTimerInterval = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const start = useCallback(() => {
        if (isRunning) return;

        startTimeRef.current = Date.now();
        pausedTimeRef.current = timeRemaining;
        setIsRunning(true);
    }, [isRunning, timeRemaining]);

    const pause = useCallback(() => {
        if (!isRunning) return;

        clearTimerInterval();
        pausedTimeRef.current = timeRemaining;
        startTimeRef.current = null;
        setIsRunning(false);
    }, [isRunning, timeRemaining, clearTimerInterval]);

    const reset = useCallback(() => {
        clearTimerInterval();
        setTimeRemaining(duration);
        setIsRunning(false);
        startTimeRef.current = null;
        pausedTimeRef.current = duration;
    }, [duration, clearTimerInterval]);

    const stop = useCallback(() => {
        clearTimerInterval();
        setIsRunning(false);
        startTimeRef.current = null;
    }, [clearTimerInterval]);

    // Timer effect
    useEffect(() => {
        if (!isRunning) return;

        intervalRef.current = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - (startTimeRef.current || now)) / 1000);
            const remaining = Math.max(0, pausedTimeRef.current - elapsed);

            setTimeRemaining(remaining);
            onTick?.(remaining);

            if (remaining <= 0) {
                clearTimerInterval();
                setIsRunning(false);
                onComplete?.();
            }
        }, 100); // Update every 100ms for smoother display

        return () => clearTimerInterval();
    }, [isRunning, onComplete, onTick, clearTimerInterval]);

    // Reset when duration changes
    useEffect(() => {
        if (!isRunning) {
            setTimeRemaining(duration);
            pausedTimeRef.current = duration;
        }
    }, [duration, isRunning]);

    return {
        timeRemaining,
        isRunning,
        progress,
        formattedTime: formatTime(timeRemaining),
        start,
        pause,
        reset,
        stop,
        elapsedMinutes,
    };
}
