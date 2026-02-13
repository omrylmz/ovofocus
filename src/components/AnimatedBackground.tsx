import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    interpolateColor,
    Easing,
    cancelAnimation,
} from 'react-native-reanimated';
import { SessionState } from '../context/GameContext';
import { useAppStateAnimation } from '../hooks/useAppStateAnimation';
import { theme } from '../styles/theme';

const { width, height } = Dimensions.get('window');

type BackgroundVariant = 'session' | 'collection';

interface AnimatedBackgroundProps {
    sessionState: SessionState;
    progress?: number;
    variant?: BackgroundVariant;
}

// Color palettes for different states
const COLORS = {
    idle: {
        start: theme.colors.background,
        mid: theme.colors.surface,
        end: '#0F0F1A',
    },
    active: {
        start: theme.colors.background,
        mid: '#2A1A3E',
        end: '#1A2A3E',
    },
    completed: {
        start: '#1A2E1A',
        mid: '#163E2A',
        end: '#1A3E16',
    },
    failed: {
        start: '#2E1A1A',
        mid: '#3E1616',
        end: '#2E1A2A',
    },
};

// Collection screen palette - calm blue-teal
const COLLECTION_COLORS = {
    start: theme.colors.background,
    mid: '#1E2A40',
    end: '#162038',
};

export function AnimatedBackground({ sessionState, progress = 0, variant = 'session' }: AnimatedBackgroundProps) {
    // Track app state for animation pausing (battery optimization)
    const isAppActive = useAppStateAnimation();

    const colorProgress = useSharedValue(0);
    const pulseValue = useSharedValue(0);

    useEffect(() => {
        if (!isAppActive) {
            // Pause background animations when app is backgrounded to save battery
            cancelAnimation(colorProgress);
            cancelAnimation(pulseValue);
            return;
        }

        // Gentle color cycling
        colorProgress.value = withRepeat(
            withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );

        // Subtle pulse effect
        pulseValue.value = withRepeat(
            withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );

        return () => {
            cancelAnimation(colorProgress);
            cancelAnimation(pulseValue);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- Reanimated shared values are stable refs that don't need to be dependencies
    }, [isAppActive]);

    const getColors = () => {
        // Use collection colors for collection variant
        if (variant === 'collection') {
            return COLLECTION_COLORS;
        }

        switch (sessionState) {
            case 'active':
                return COLORS.active;
            case 'completed':
                return COLORS.completed;
            case 'failed':
                return COLORS.failed;
            default:
                return COLORS.idle;
        }
    };

    const colors = getColors();

    const animatedStyle = useAnimatedStyle(() => {
        const backgroundColor = interpolateColor(
            colorProgress.value,
            [0, 0.5, 1],
            [colors.start, colors.mid, colors.end]
        );

        return {
            backgroundColor,
            opacity: 0.95 + pulseValue.value * 0.05,
        };
    });

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            {/* Gradient overlay for depth */}
            <View style={styles.gradientTop} />
            <View style={styles.gradientBottom} />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
    },
    gradientTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: height * 0.3,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
    },
    gradientBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: height * 0.4,
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
    },
});
