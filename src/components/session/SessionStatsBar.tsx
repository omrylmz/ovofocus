import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withSpring,
    Easing,
} from 'react-native-reanimated';
// Note: Some Reanimated imports may appear unused but are needed for animation types
import { theme } from '../../styles/theme';

interface DailyProgress {
    completedSessions: number;
    goalAchieved: boolean;
}

interface SessionStatsBarProps {
    completedSessions: number;
    collectionCount: number;
    dailyProgress: DailyProgress;
    dailyGoal: number;
    currentStreak?: number;
    bestStreak?: number;
    labels: {
        session: string;
        animals: string;
        dailyGoalProgress: string;
        streak?: string;
    };
}

// Streak display component with fire animation and BEST badge
function StreakDisplay({
    currentStreak,
    bestStreak,
    label,
}: {
    currentStreak: number;
    bestStreak: number;
    label?: string;
}) {
    const flameScale = useSharedValue(1);
    const flameSway = useSharedValue(0);
    const isBest = currentStreak > 0 && currentStreak >= bestStreak;

    useEffect(() => {
        if (currentStreak > 0) {
            // Flame breathing effect
            const intensity = Math.min(currentStreak / 14, 1);
            const breatheSpeed = 1000 - intensity * 300;

            flameScale.value = withRepeat(
                withSequence(
                    withTiming(1 + intensity * 0.1, { duration: breatheSpeed, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: breatheSpeed, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );

            flameSway.value = withRepeat(
                withSequence(
                    withTiming(2, { duration: 600 }),
                    withTiming(-2, { duration: 600 })
                ),
                -1,
                true
            );
        }
    }, [currentStreak]);

    const flameStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { scale: flameScale.value },
                { rotate: `${flameSway.value}deg` },
            ] as const,
        };
    });

    // Get flame color based on streak length
    const getFlameColor = () => {
        if (currentStreak >= 30) return theme.colors.legendary;
        if (currentStreak >= 14) return theme.colors.epic;
        if (currentStreak >= 7) return '#FF6B6B';
        if (currentStreak >= 3) return theme.colors.warning;
        return theme.colors.textSecondary;
    };

    return (
        <View style={styles.streakContainer}>
            <View style={styles.streakContent}>
                <Animated.Text style={[styles.streakFlame, flameStyle]}>
                    {currentStreak > 0 ? '🔥' : '🔥'}
                </Animated.Text>
                <View style={styles.streakTextContainer}>
                    <Text style={[
                        styles.streakValue,
                        { color: currentStreak > 0 ? getFlameColor() : theme.colors.textSecondary },
                    ]}>
                        {currentStreak}
                    </Text>
                    <Text style={styles.streakLabel}>
                        {label || 'day streak'}
                    </Text>
                </View>
            </View>
            {isBest && currentStreak > 1 && (
                <View style={styles.bestBadgeInline}>
                    <Text style={styles.bestBadgeInlineText}>BEST</Text>
                </View>
            )}
        </View>
    );
}

// Compact daily progress ring with segments
function CompactDailyProgress({
    completedSessions,
    dailyGoal,
    goalAchieved,
    label,
}: {
    completedSessions: number;
    dailyGoal: number;
    goalAchieved: boolean;
    label: string;
}) {
    const celebrateScale = useSharedValue(1);

    useEffect(() => {
        if (goalAchieved) {
            celebrateScale.value = withSequence(
                withSpring(1.05, { damping: 8 }),
                withSpring(1, { damping: 10 })
            );
        }
    }, [goalAchieved]);

    const containerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: celebrateScale.value }],
    }));

    return (
        <Animated.View style={[styles.dailyProgressCompact, containerStyle]}>
            <View style={styles.dailyProgressHeader}>
                <Text style={styles.dailyProgressIcon}>
                    {goalAchieved ? '✨' : '🎯'}
                </Text>
                <Text style={styles.dailyProgressLabel}>{label}</Text>
            </View>
            <View style={styles.dailyProgressSegments}>
                {Array.from({ length: dailyGoal }, (_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.progressSegment,
                            {
                                backgroundColor: i < completedSessions
                                    ? (goalAchieved ? theme.colors.success : theme.colors.accent)
                                    : theme.colors.surfaceLight,
                            },
                        ]}
                    />
                ))}
            </View>
            <Text style={[
                styles.dailyProgressValue,
                goalAchieved && styles.dailyProgressValueComplete,
            ]}>
                {completedSessions}/{dailyGoal}
            </Text>
        </Animated.View>
    );
}

// Today's sessions counter
function TodaySessionsCount({
    count,
    label,
}: {
    count: number;
    label: string;
}) {
    const pulseScale = useSharedValue(1);
    const prevCount = useRef(count);

    useEffect(() => {
        if (prevCount.current !== count && count > 0) {
            pulseScale.value = withSequence(
                withSpring(1.1, { damping: 10 }),
                withSpring(1, { damping: 15 })
            );
            prevCount.current = count;
        }
    }, [count]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    return (
        <Animated.View style={[styles.todayCounter, animatedStyle]}>
            <Text style={styles.todayIcon}>⏱️</Text>
            <Text style={styles.todayValue}>{count}</Text>
            <Text style={styles.todayLabel}>{label}</Text>
        </Animated.View>
    );
}

export function SessionStatsBar({
    completedSessions,
    collectionCount,
    dailyProgress,
    dailyGoal,
    currentStreak = 0,
    bestStreak = 0,
    labels,
}: SessionStatsBarProps) {
    return (
        <View style={styles.container}>
            {/* Stats row with streak, today's sessions, and daily progress */}
            <View style={styles.statsRow}>
                {/* Streak display */}
                <StreakDisplay
                    currentStreak={currentStreak}
                    bestStreak={bestStreak}
                    label={labels.streak}
                />

                {/* Divider */}
                <View style={styles.divider} />

                {/* Today's sessions count */}
                <TodaySessionsCount
                    count={dailyProgress.completedSessions}
                    label={labels.dailyGoalProgress}
                />

                {/* Divider */}
                <View style={styles.divider} />

                {/* Daily goal progress */}
                <CompactDailyProgress
                    completedSessions={dailyProgress.completedSessions}
                    dailyGoal={dailyGoal}
                    goalAchieved={dailyProgress.goalAchieved}
                    label=""
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: theme.spacing.lg,
        marginTop: theme.spacing.xs,
        marginBottom: theme.spacing.md,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.surfaceLight,
        ...theme.shadows.small,
    },
    divider: {
        width: 1,
        height: 32,
        backgroundColor: theme.colors.surfaceLight,
    },
    // Streak styles
    streakContainer: {
        flex: 1,
        alignItems: 'center',
        position: 'relative',
    },
    streakContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    streakFlame: {
        fontSize: 24,
    },
    streakTextContainer: {
        alignItems: 'flex-start',
    },
    streakValue: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        lineHeight: theme.fontSize.xl * 1.1,
    },
    streakLabel: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginTop: -2,
    },
    bestBadgeInline: {
        position: 'absolute',
        top: -6,
        right: 4,
        backgroundColor: theme.colors.legendary,
        paddingHorizontal: theme.spacing.xs,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.sm,
        ...theme.shadows.small,
    },
    bestBadgeInlineText: {
        fontSize: 8,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.background,
        letterSpacing: 0.5,
    },
    // Today sessions styles
    todayCounter: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    todayIcon: {
        fontSize: 16,
    },
    todayValue: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        lineHeight: theme.fontSize.lg * 1.1,
    },
    todayLabel: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
    },
    // Daily progress compact styles
    dailyProgressCompact: {
        flex: 1,
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    dailyProgressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dailyProgressIcon: {
        fontSize: 14,
    },
    dailyProgressLabel: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
    },
    dailyProgressSegments: {
        flexDirection: 'row',
        gap: 3,
    },
    progressSegment: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    dailyProgressValue: {
        fontSize: theme.fontSize.xs,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.textSecondary,
    },
    dailyProgressValueComplete: {
        color: theme.colors.success,
    },
});
