import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseAppStateOptions {
    onBackground?: () => void;
    onForeground?: () => void;
    onInactive?: () => void;
}

export function useAppState(options: UseAppStateOptions = {}) {
    const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
    const [wasInBackground, setWasInBackground] = useState(false);
    const previousState = useRef<AppStateStatus>(AppState.currentState);

    const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
        const prevState = previousState.current;

        // Going to background
        if (prevState === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
            setWasInBackground(true);
            if (nextAppState === 'background') {
                options.onBackground?.();
            } else {
                options.onInactive?.();
            }
        }

        // Coming back to foreground
        if ((prevState === 'background' || prevState === 'inactive') && nextAppState === 'active') {
            options.onForeground?.();
        }

        previousState.current = nextAppState;
        setAppState(nextAppState);
    }, [options]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, [handleAppStateChange]);

    return {
        appState,
        wasInBackground,
        isActive: appState === 'active',
        isBackground: appState === 'background',
        isInactive: appState === 'inactive',
        resetBackgroundFlag: () => setWasInBackground(false),
    };
}
