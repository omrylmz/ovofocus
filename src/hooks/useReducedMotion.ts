import { useState, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useGame } from '../context/GameContext';

export type ReducedMotionPreference = 'system' | 'on' | 'off';

/**
 * Hook that returns whether reduced motion should be used.
 * Respects both system preference AND user override setting.
 *
 * Priority:
 * - 'on': Always use reduced motion
 * - 'off': Never use reduced motion
 * - 'system': Follow system accessibility preference
 */
export function useReducedMotion(): boolean {
    const { state } = useGame();
    const [systemReducedMotion, setSystemReducedMotion] = useState(false);

    useEffect(() => {
        // Get initial system preference
        AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
            setSystemReducedMotion(enabled);
        });

        // Listen for changes to system preference
        const subscription = AccessibilityInfo.addEventListener(
            'reduceMotionChanged',
            (enabled) => {
                setSystemReducedMotion(enabled);
            }
        );

        return () => {
            subscription.remove();
        };
    }, []);

    // Determine final reduced motion state based on user setting
    const userPreference = state.settings.reducedMotion;

    if (userPreference === 'on') {
        return true;
    }
    if (userPreference === 'off') {
        return false;
    }
    // 'system' - follow system preference
    return systemReducedMotion;
}
