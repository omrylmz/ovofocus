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
    labels: {
        session: string;
        animals: string;
        dailyGoalProgress: string;
    };
}

// Animated BEST badge component with celebratory animations
function BestBadge({ isVisible }: { isVisible: boolean }) {
    const scale = useSharedValue(0);
    const rotation = useSharedValue(0);
    const glowOpacity = useSharedValue(0);

    useEffect(() => {
        if (isVisible) {
            // Pop-in animation with spring physics
            scale.value = withSpring(1, {
                damping: 8,
                stiffness: 200,
            });

            // Subtle rotation wiggle for attention
            rotation.value = withRepeat(
                withSequence(
                    withTiming(3, { duration: 400, easing: Easing.inOut(Easing.ease) }),
                    withTiming(-3, { duration: 400, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0, { duration: 200 })
                ),
                -1,
                true
            );

            // Pulsing glow effect
            glowOpacity.value = withRepeat(
                withSequence(
                    withTiming(0.8, { duration: 1000 }),
                    withTiming(0.3, { duration: 1000 })
                ),
                -1,
                true
            );
        } else {
            scale.value = withTiming(0, { duration: 200 });
        }
    }, [isVisible]);

    const containerStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotation.value}deg` },
        ],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    if (!isVisible) return null;

    return (
        <Animated.View style={[styles.bestBadgeContainer, containerStyle]}>
            <Animated.View style={[styles.bestBadgeGlow, glowStyle]} />
            <View style={styles.bestBadge}>
                <Text style={styles.bestBadgeIcon}>{'\u2B50'}</Text>
                <Text style={styles.bestBadgeText}>BEST</Text>
            </View>
        </Animated.View>
    );
}

// Trend indicator component with subtle bounce animation
function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'neutral' }) {
    const bounce = useSharedValue(0);

    useEffect(() => {
        if (trend !== 'neutral') {
            bounce.value = withRepeat(
                withSequence(
                    withTiming(-2, { duration: 500 }),
                    withTiming(2, { duration: 500 })
                ),
                -1,
                true
            );
        }
    }, [trend]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: trend === 'up' ? bounce.value : -bounce.value }],
    }));

    if (trend === 'neutral') return null;

    return (
        <Animated.View style={[styles.trendIndicator, animatedStyle]}>
            <Text style={[
                styles.trendArrow,
                trend === 'up' ? styles.trendUp : styles.trendDown
            ]}>
                {trend === 'up' ? '\u2191' : '\u2193'}
            </Text>
        </Animated.View>
    );
}

// Compact stat pill component with pulse animation on value change
function StatPill({
    value,
    label,
    icon,
    accent = false,
    trend = 'neutral' as 'up' | 'down' | 'neutral',
}: {
    value: string | number;
    label: string;
    icon: string;
    accent?: boolean;
    trend?: 'up' | 'down' | 'neutral';
}) {
    const pulseScale = useSharedValue(1);
    const prevValue = useRef(value);

    useEffect(() => {
        // Pulse animation when value changes
        if (prevValue.current !== value) {
            pulseScale.value = withSequence(
                withSpring(1.08, { damping: 10 }),
                withSpring(1, { damping: 15 })
            );
            prevValue.current = value;
        }
    }, [value]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    return (
        <Animated.View style={[
            styles.statPill,
            accent && styles.statPillAccent,
            animatedStyle,
        ]}>
            <View style={styles.statPillContent}>
                <Text style={styles.statIcon}>{icon}</Text>
                <View style={styles.statTextContainer}>
                    <View style={styles.valueRow}>
                        <Text style={[
                            styles.statPillValue,
                            accent && styles.statPillValueAccent,
                        ]}>
                            {value}
                        </Text>
                        <TrendIndicator trend={trend} />
                    </View>
                    <Text style={styles.statPillLabel}>{label}</Text>
                </View>
            </View>
        </Animated.View>
    );
}

// Daily goal progress pill with animated progress bar
function DailyGoalPill({
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
    const progressWidth = useSharedValue(0);
    const celebrateScale = useSharedValue(1);
    const checkmarkScale = useSharedValue(0);

    useEffect(() => {
        const progress = Math.min(completedSessions / dailyGoal, 1);
        progressWidth.value = withTiming(progress, {
            duration: 800,
            easing: Easing.out(Easing.cubic),
        });

        if (goalAchieved) {
            celebrateScale.value = withSequence(
                withSpring(1.03, { damping: 8 }),
                withSpring(1, { damping: 10 })
            );
            checkmarkScale.value = withSpring(1, {
                damping: 8,
                stiffness: 200,
            });
        } else {
            checkmarkScale.value = withTiming(0, { duration: 200 });
        }
    }, [completedSessions, dailyGoal, goalAchieved]);

    const containerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: celebrateScale.value }],
    }));

    const progressBarStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value * 100}%`,
    }));

    const checkmarkStyle = useAnimatedStyle(() => ({
        transform: [{ scale: checkmarkScale.value }],
    }));

    return (
        <Animated.View style={[
            styles.dailyGoalPill,
            goalAchieved && styles.dailyGoalPillComplete,
            containerStyle,
        ]}>
            <View style={styles.dailyGoalHeader}>
                <Text style={styles.dailyGoalIcon}>
                    {goalAchieved ? '\u2728' : '\u{1F3AF}'}
                </Text>
                <Text style={styles.dailyGoalLabel}>{label}</Text>
            </View>

            <View style={styles.dailyGoalProgressContainer}>
                <View style={styles.dailyGoalProgressBg}>
                    <Animated.View style={[
                        styles.dailyGoalProgressFill,
                        goalAchieved && styles.dailyGoalProgressFillComplete,
                        progressBarStyle,
                    ]} />
                </View>

                <View style={styles.dailyGoalValueContainer}>
                    {goalAchieved ? (
                        <Animated.View style={[styles.checkmarkContainer, checkmarkStyle]}>
                            <Text style={styles.checkmark}>{'\u2713'}</Text>
                        </Animated.View>
                    ) : (
                        <Text style={styles.dailyGoalValue}>
                            {completedSessions}/{dailyGoal}
                        </Text>
                    )}
                </View>
            </View>
        </Animated.View>
    );
}

export function SessionStatsBar({
    completedSessions,
    collectionCount,
    dailyProgress,
    dailyGoal,
    labels,
}: SessionStatsBarProps) {
    // Show BEST badge when hitting session milestones (every 10 sessions)
    const isBestSession = completedSessions > 0 && completedSessions % 10 === 0;

    // Show trend indicators based on daily activity
    const sessionTrend = dailyProgress.completedSessions > 0 ? 'up' as const : 'neutral' as const;
    const collectionTrend = collectionCount > 0 ? 'up' as const : 'neutral' as const;

    return (
        <View style={styles.container}>
            {/* Top row: Session count and Collection count pills */}
            <View style={styles.pillsRow}>
                <StatPill
                    value={completedSessions}
                    label={labels.session}
                    icon={'\u23F1\uFE0F'}
                    trend={sessionTrend}
                />
                <StatPill
                    value={collectionCount}
                    label={labels.animals}
                    icon={'\u{1F43E}'}
                    trend={collectionTrend}
                />
            </View>

            {/* Daily goal progress - takes full width */}
            <DailyGoalPill
                completedSessions={dailyProgress.completedSessions}
                dailyGoal={dailyGoal}
                goalAchieved={dailyProgress.goalAchieved}
                label={labels.dailyGoalProgress}
            />

            {/* BEST badge overlay - shows when hitting milestones */}
            <BestBadge isVisible={isBestSession} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: theme.spacing.lg,
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.md,
        gap: theme.spacing.sm,
        position: 'relative',
    },
    pillsRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    statPill: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.surfaceLight,
    },
    statPillAccent: {
        borderColor: theme.colors.accent,
        backgroundColor: 'rgba(255, 230, 109, 0.08)',
    },
    statPillContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    statIcon: {
        fontSize: 18,
    },
    statTextContainer: {
        flex: 1,
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    statPillValue: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    statPillValueAccent: {
        color: theme.colors.accent,
    },
    statPillLabel: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginTop: 1,
    },
    trendIndicator: {
        marginLeft: 2,
    },
    trendArrow: {
        fontSize: 10,
        fontWeight: theme.fontWeight.bold,
    },
    trendUp: {
        color: theme.colors.success,
    },
    trendDown: {
        color: theme.colors.error,
    },
    dailyGoalPill: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.surfaceLight,
    },
    dailyGoalPillComplete: {
        borderColor: theme.colors.success,
        backgroundColor: 'rgba(76, 175, 80, 0.08)',
    },
    dailyGoalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.sm,
    },
    dailyGoalIcon: {
        fontSize: 14,
    },
    dailyGoalLabel: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontWeight: theme.fontWeight.medium,
    },
    dailyGoalProgressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
    },
    dailyGoalProgressBg: {
        flex: 1,
        height: 8,
        backgroundColor: theme.colors.surfaceLight,
        borderRadius: theme.borderRadius.round,
        overflow: 'hidden',
    },
    dailyGoalProgressFill: {
        height: '100%',
        backgroundColor: theme.colors.accent,
        borderRadius: theme.borderRadius.round,
    },
    dailyGoalProgressFillComplete: {
        backgroundColor: theme.colors.success,
    },
    dailyGoalValueContainer: {
        minWidth: 40,
        alignItems: 'flex-end',
    },
    dailyGoalValue: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    checkmarkContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: theme.colors.success,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkmark: {
        fontSize: 14,
        color: '#fff',
        fontWeight: theme.fontWeight.bold,
    },
    bestBadgeContainer: {
        position: 'absolute',
        top: -8,
        right: theme.spacing.sm,
    },
    bestBadgeGlow: {
        position: 'absolute',
        width: 56,
        height: 26,
        borderRadius: 13,
        backgroundColor: theme.colors.legendary,
        top: -3,
        left: -5,
    },
    bestBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.legendary,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.round,
        gap: 3,
        ...theme.shadows.small,
    },
    bestBadgeIcon: {
        fontSize: 10,
    },
    bestBadgeText: {
        fontSize: theme.fontSize.xs,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.background,
        letterSpacing: 0.5,
    },
});
