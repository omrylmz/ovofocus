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

    // Use refs to store callbacks - prevents re-subscription on callback changes
    const onBackgroundRef = useRef(options.onBackground);
    const onForegroundRef = useRef(options.onForeground);
    const onInactiveRef = useRef(options.onInactive);

    // Keep refs updated with latest callbacks
    useEffect(() => {
        onBackgroundRef.current = options.onBackground;
        onForegroundRef.current = options.onForeground;
        onInactiveRef.current = options.onInactive;
    });

    const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
        const prevState = previousState.current;

        // Going to background
        if (prevState === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
            setWasInBackground(true);
            if (nextAppState === 'background') {
                onBackgroundRef.current?.();
            } else {
                onInactiveRef.current?.();
            }
        }

        // Coming back to foreground
        if ((prevState === 'background' || prevState === 'inactive') && nextAppState === 'active') {
            onForegroundRef.current?.();
        }

        previousState.current = nextAppState;
        setAppState(nextAppState);
    }, []); // Empty deps - callbacks accessed via refs

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
