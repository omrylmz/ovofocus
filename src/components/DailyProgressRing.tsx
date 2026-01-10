import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSpring,
    withSequence,
    Easing,
} from 'react-native-reanimated';
import { theme } from '../styles/theme';

interface DailyProgressRingProps {
    current: number;
    goal: number;
    size?: number;
}

export function DailyProgressRing({
    current,
    goal,
    size = 44,
}: DailyProgressRingProps) {
    const progress = Math.min(current / goal, 1);
    const celebrateScale = useSharedValue(1);
    const progressWidth = useSharedValue(0);

    useEffect(() => {
        progressWidth.value = withTiming(progress, {
            duration: 800,
            easing: Easing.out(Easing.cubic)
        });

        // Celebrate when goal is reached
        if (current >= goal && current > 0) {
            celebrateScale.value = withSequence(
                withSpring(1.15, { damping: 8 }),
                withSpring(1, { damping: 10 })
            );
        }
    }, [progress, current, goal]);

    const containerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: celebrateScale.value }],
    }));

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value * 100}%`,
    }));

    const isComplete = current >= goal;

    return (
        <Animated.View style={[styles.container, containerStyle, { width: size, height: size }]}>
            {/* Background */}
            <View style={[styles.background, { borderRadius: size / 2 }]}>
                {/* Progress segments */}
                {Array.from({ length: goal }, (_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.segment,
                            {
                                backgroundColor: i < current
                                    ? (isComplete ? theme.colors.success : theme.colors.accent)
                                    : theme.colors.surfaceLight,
                            }
                        ]}
                    />
                ))}
            </View>

            {/* Center text */}
            <View style={styles.centerText}>
                <Text style={[styles.emoji, isComplete && styles.completeEmoji]}>
                    {isComplete ? '✨' : '🎯'}
                </Text>
            </View>

            {/* Count badge */}
            <View style={[styles.badge, isComplete && styles.badgeComplete]}>
                <Text style={[styles.badgeText, isComplete && styles.badgeTextComplete]}>
                    {current}/{goal}
                </Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    background: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        padding: 3,
        gap: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segment: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    centerText: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emoji: {
        fontSize: 14,
    },
    completeEmoji: {
        fontSize: 16,
    },
    badge: {
        position: 'absolute',
        bottom: -4,
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 8,
    },
    badgeComplete: {
        backgroundColor: theme.colors.success,
    },
    badgeText: {
        fontSize: 8,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textSecondary,
    },
    badgeTextComplete: {
        color: '#fff',
    },
});
