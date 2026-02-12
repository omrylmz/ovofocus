import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
    cancelAnimation,
} from 'react-native-reanimated';
import { theme } from '../styles/theme';

interface StreakBadgeProps {
    streak: number;
    size?: 'small' | 'medium' | 'large';
}

export function StreakBadge({ streak, size = 'medium' }: StreakBadgeProps) {
    const flameScale = useSharedValue(1);
    const flameSway = useSharedValue(0);
    const flameOpacity = useSharedValue(1);

    // Determine flame intensity based on streak length
    const getFlameEmoji = () => {
        if (streak >= 30) return '🔥🔥🔥';
        if (streak >= 14) return '🔥🔥';
        if (streak >= 7) return '🔥';
        if (streak >= 3) return '🔥';
        return '🔥';
    };

    const getFlameColor = () => {
        if (streak >= 30) return theme.colors.legendary;
        if (streak >= 14) return theme.colors.epic;
        if (streak >= 7) return theme.colors.primary;
        if (streak >= 3) return theme.colors.warning;
        return theme.colors.textSecondary;
    };

    useEffect(() => {
        if (streak > 0) {
            // Flame breathing effect
            const intensity = Math.min(streak / 14, 1);
            const breatheSpeed = 1000 - intensity * 300;

            flameScale.value = withRepeat(
                withSequence(
                    withTiming(1 + intensity * 0.15, { duration: breatheSpeed, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: breatheSpeed, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );

            // Gentle flame sway
            flameSway.value = withRepeat(
                withSequence(
                    withTiming(3, { duration: 800 }),
                    withTiming(-3, { duration: 800 })
                ),
                -1,
                true
            );

            // Pulsing glow
            flameOpacity.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 600 }),
                    withTiming(0.7, { duration: 600 })
                ),
                -1,
                true
            );
        }

        return () => {
            cancelAnimation(flameScale);
            cancelAnimation(flameSway);
            cancelAnimation(flameOpacity);
        };
    }, [streak]);

    const flameStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: flameScale.value },
            { rotate: `${flameSway.value}deg` },
        ],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: flameOpacity.value * 0.5,
    }));

    const sizes = {
        small: { container: 32, emoji: theme.fontSize.md, text: theme.typography.micro },
        medium: { container: 48, emoji: theme.fontSize.xl, text: theme.fontSize.sm },
        large: { container: 64, emoji: theme.fontSize.xxl, text: theme.fontSize.lg },
    };

    const currentSize = sizes[size];

    if (streak <= 0) {
        return (
            <View style={[styles.container, { width: currentSize.container, height: currentSize.container }]}>
                <Text style={[styles.flame, { fontSize: currentSize.emoji, opacity: 0.3 }]}>🔥</Text>
                <View style={styles.badge}>
                    <Text style={[styles.text, { fontSize: currentSize.text, color: theme.colors.textSecondary }]}>0</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { width: currentSize.container, height: currentSize.container }]}>
            {/* Glow effect behind flame */}
            <Animated.View
                style={[
                    styles.glow,
                    glowStyle,
                    { backgroundColor: getFlameColor(), width: currentSize.container, height: currentSize.container }
                ]}
            />

            <Animated.Text
                style={[
                    styles.flame,
                    flameStyle,
                    { fontSize: currentSize.emoji }
                ]}
            >
                {getFlameEmoji()}
            </Animated.Text>

            <View style={styles.badge}>
                <Text style={[styles.text, { fontSize: currentSize.text, color: getFlameColor() }]}>
                    {streak}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    glow: {
        position: 'absolute',
        borderRadius: theme.borderRadius.round,
    },
    flame: {
        textAlign: 'center',
    },
    badge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.sm,
        paddingHorizontal: 4,
        paddingVertical: 1,
    },
    text: {
        fontWeight: theme.fontWeight.bold,
    },
});
