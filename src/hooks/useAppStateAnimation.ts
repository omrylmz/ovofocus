import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

/**
 * Hook to track whether animations should run based on app state.
 * Animations should pause when the app goes to background to save battery.
 *
 * @returns {boolean} isAnimationActive - true when app is in foreground and animations should run
 */
export function useAppStateAnimation(): boolean {
    const [isAnimationActive, setIsAnimationActive] = useState<boolean>(
        AppState.currentState === 'active'
    );
    const previousState = useRef<AppStateStatus>(AppState.currentState);

    const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
        const prevState = previousState.current;

        // Going to background or inactive - pause animations
        if (prevState === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
            setIsAnimationActive(false);
        }

        // Coming back to foreground - resume animations
        if ((prevState === 'background' || prevState === 'inactive') && nextAppState === 'active') {
            setIsAnimationActive(true);
        }

        previousState.current = nextAppState;
    }, []);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, [handleAppStateChange]);

    return isAnimationActive;
}
