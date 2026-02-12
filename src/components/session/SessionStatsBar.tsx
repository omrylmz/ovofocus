import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withSpring,
    Easing,
    interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '../../styles/theme';

interface DailyProgress {
    completedSessions: number;
    goalAchieved: boolean;
}

interface TrendData {
    direction: 'up' | 'down' | 'same';
    value?: number;
}

interface SessionStatsBarProps {
    completedSessions: number;
    collectionCount: number;
    dailyProgress: DailyProgress;
    dailyGoal: number;
    currentStreak?: number;
    bestStreak?: number;
    totalFocusMinutes?: number;
    labels: {
        session: string;
        animals: string;
        dailyGoalProgress: string;
        streak?: string;
        todayFocusTime?: string;
        viewDetails?: string;
        close?: string;
        totalSessions?: string;
        totalFocusTime?: string;
        averagePerDay?: string;
        bestStreakLabel?: string;
        dailyGoalLabel?: string;
    };
    hapticsEnabled?: boolean;
}

// Compact Stat Pill component
interface StatPillProps {
    icon: string;
    value: string | number;
    label?: string;
    color?: string;
    trend?: TrendData;
    showBest?: boolean;
    isBest?: boolean;
    onPress?: () => void;
    accessibilityLabel: string;
    accessibilityHint?: string;
    hapticsEnabled?: boolean;
}

function StatPill({
    icon,
    value,
    label,
    color = theme.colors.text,
    trend,
    showBest = false,
    isBest = false,
    onPress,
    accessibilityLabel,
    accessibilityHint,
    hapticsEnabled = true,
}: StatPillProps) {
    const scale = useSharedValue(1);
    const prevIsBest = useRef(isBest);

    // Best badge animation values
    const bestScale = useSharedValue(0);
    const bestRotate = useSharedValue(0);
    const bestGlow = useSharedValue(0);

    // Trigger celebration animation when isBest becomes true
    useEffect(() => {
        if (isBest && !prevIsBest.current && showBest) {
            // Entrance animation for BEST badge
            bestScale.value = withSequence(
                withSpring(1.3, { damping: 6, stiffness: 200 }),
                withSpring(1, { damping: 10, stiffness: 300 })
            );

            // Subtle rotation wiggle
            bestRotate.value = withSequence(
                withTiming(-10, { duration: 100 }),
                withTiming(10, { duration: 100 }),
                withTiming(-5, { duration: 100 }),
                withTiming(5, { duration: 100 }),
                withTiming(0, { duration: 100 })
            );

            // Glow pulse
            bestGlow.value = withSequence(
                withTiming(1, { duration: 200 }),
                withRepeat(
                    withSequence(
                        withTiming(0.5, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
                    ),
                    3,
                    true
                ),
                withTiming(0.6, { duration: 400 })
            );

            // Trigger haptic feedback
            if (hapticsEnabled) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
        } else if (isBest && showBest) {
            // Keep badge visible with subtle continuous glow
            bestScale.value = withTiming(1, { duration: 200 });
            bestGlow.value = withRepeat(
                withSequence(
                    withTiming(0.4, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0.7, { duration: 1500, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );
        } else {
            bestScale.value = withTiming(0, { duration: 150 });
            bestGlow.value = withTiming(0, { duration: 150 });
        }
        prevIsBest.current = isBest;
    }, [isBest, showBest, hapticsEnabled]);

    const handlePressIn = useCallback(() => {
        scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    }, []);

    const handlePressOut = useCallback(() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    }, []);

    const handlePress = useCallback(() => {
        if (hapticsEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.();
    }, [onPress, hapticsEnabled]);

    const animatedContainerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const bestBadgeStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: bestScale.value },
            { rotate: `${bestRotate.value}deg` },
        ] as const,
        opacity: bestScale.value,
    }));

    const bestGlowStyle = useAnimatedStyle(() => ({
        opacity: bestGlow.value,
        transform: [{ scale: interpolate(bestGlow.value, [0, 1], [1, 1.3]) }],
    }));

    // Get trend arrow and color
    const getTrendDisplay = () => {
        if (!trend) return null;

        const trendConfig = {
            up: { arrow: '\u2191', color: theme.colors.success },
            down: { arrow: '\u2193', color: theme.colors.error },
            same: { arrow: '\u2192', color: theme.colors.textSecondary },
        };

        return trendConfig[trend.direction];
    };

    const trendDisplay = getTrendDisplay();

    const content = (
        <Animated.View
            style={[styles.pillContainer, animatedContainerStyle]}
            accessible={true}
            accessibilityLabel={accessibilityLabel}
            accessibilityHint={accessibilityHint}
            accessibilityRole={onPress ? 'button' : 'text'}
        >
            {/* BEST badge glow effect */}
            {showBest && isBest && (
                <Animated.View style={[styles.bestGlow, bestGlowStyle]} />
            )}

            <View style={styles.pillContent}>
                <Text style={styles.pillIcon}>{icon}</Text>
                <View style={styles.pillTextContainer}>
                    <View style={styles.pillValueRow}>
                        <Text style={[styles.pillValue, { color }]}>{value}</Text>
                        {trendDisplay && (
                            <Text style={[styles.trendArrow, { color: trendDisplay.color }]}>
                                {trendDisplay.arrow}
                            </Text>
                        )}
                    </View>
                    {label && <Text style={styles.pillLabel} numberOfLines={1}>{label}</Text>}
                </View>
            </View>

            {/* BEST badge */}
            {showBest && isBest && (
                <Animated.View style={[styles.bestBadge, bestBadgeStyle]}>
                    <Text style={styles.bestBadgeText}>BEST</Text>
                </Animated.View>
            )}
        </Animated.View>
    );

    if (onPress) {
        return (
            <Pressable
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
            >
                {content}
            </Pressable>
        );
    }

    return content;
}

// Today's Focus Time Pill with prominent display
interface FocusTimePillProps {
    totalMinutes: number;
    label: string;
    onPress?: () => void;
    hapticsEnabled?: boolean;
}

function FocusTimePill({ totalMinutes, label, onPress, hapticsEnabled = true }: FocusTimePillProps) {
    const scale = useSharedValue(1);
    const glowOpacity = useSharedValue(0);
    const prevMinutes = useRef(totalMinutes);

    // Pulse animation when minutes increase
    useEffect(() => {
        if (totalMinutes > prevMinutes.current) {
            scale.value = withSequence(
                withSpring(1.1, { damping: 8, stiffness: 300 }),
                withSpring(1, { damping: 12, stiffness: 200 })
            );
            glowOpacity.value = withSequence(
                withTiming(0.8, { duration: 100 }),
                withTiming(0, { duration: 400 })
            );
        }
        prevMinutes.current = totalMinutes;
    }, [totalMinutes]);

    const handlePressIn = useCallback(() => {
        scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    }, []);

    const handlePressOut = useCallback(() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    }, []);

    const handlePress = useCallback(() => {
        if (hapticsEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.();
    }, [onPress, hapticsEnabled]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    // Format time display
    const formatTime = (minutes: number) => {
        if (minutes < 60) {
            return `${minutes}m`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    return (
        <Pressable
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            accessible={true}
            accessibilityLabel={`${label}: ${formatTime(totalMinutes)}`}
            accessibilityHint="Tap to view detailed stats"
            accessibilityRole="button"
        >
            <Animated.View style={[styles.focusTimePill, animatedStyle]}>
                <Animated.View style={[styles.focusTimeGlow, glowStyle]} />
                <Text style={styles.focusTimeIcon}>&#9201;</Text>
                <View style={styles.focusTimeTextContainer}>
                    <Text style={styles.focusTimeValue}>{formatTime(totalMinutes)}</Text>
                    <Text style={styles.focusTimeLabel} numberOfLines={1}>{label}</Text>
                </View>
            </Animated.View>
        </Pressable>
    );
}

// Daily Progress Indicator with segments
interface DailyProgressIndicatorProps {
    completedSessions: number;
    dailyGoal: number;
    goalAchieved: boolean;
    onPress?: () => void;
    hapticsEnabled?: boolean;
}

function DailyProgressIndicator({
    completedSessions,
    dailyGoal,
    goalAchieved,
    onPress,
    hapticsEnabled = true,
}: DailyProgressIndicatorProps) {
    const scale = useSharedValue(1);
    const celebrateScale = useSharedValue(1);

    useEffect(() => {
        if (goalAchieved) {
            celebrateScale.value = withSequence(
                withSpring(1.1, { damping: 6, stiffness: 200 }),
                withSpring(1, { damping: 10, stiffness: 300 })
            );
        }
    }, [goalAchieved]);

    const handlePressIn = useCallback(() => {
        scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    }, []);

    const handlePressOut = useCallback(() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    }, []);

    const handlePress = useCallback(() => {
        if (hapticsEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.();
    }, [onPress, hapticsEnabled]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value * celebrateScale.value },
        ],
    }));

    return (
        <Pressable
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            accessible={true}
            accessibilityLabel={`Daily progress: ${completedSessions} of ${dailyGoal} sessions${goalAchieved ? ', goal achieved' : ''}`}
            accessibilityHint="Tap to view detailed stats"
            accessibilityRole="button"
        >
            <Animated.View style={[styles.dailyProgressPill, animatedStyle]}>
                <Text style={styles.dailyProgressIcon}>
                    {goalAchieved ? '\u2728' : '\ud83c\udfaf'}
                </Text>
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
        </Pressable>
    );
}

// Expandable Stats Modal
interface StatsModalProps {
    visible: boolean;
    onClose: () => void;
    stats: {
        completedSessions: number;
        currentStreak: number;
        bestStreak: number;
        totalFocusMinutes: number;
        collectionCount: number;
        dailyProgress: DailyProgress;
        dailyGoal: number;
    };
    labels: SessionStatsBarProps['labels'];
    hapticsEnabled?: boolean;
}

function StatsModal({ visible, onClose, stats, labels, hapticsEnabled = true }: StatsModalProps) {
    const backdropOpacity = useSharedValue(0);
    const modalScale = useSharedValue(0.9);
    const modalOpacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            backdropOpacity.value = withTiming(1, { duration: 200 });
            modalScale.value = withSpring(1, { damping: 15, stiffness: 300 });
            modalOpacity.value = withTiming(1, { duration: 200 });
        } else {
            backdropOpacity.value = withTiming(0, { duration: 150 });
            modalScale.value = withTiming(0.9, { duration: 150 });
            modalOpacity.value = withTiming(0, { duration: 150 });
        }
    }, [visible]);

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value,
    }));

    const modalStyle = useAnimatedStyle(() => ({
        opacity: modalOpacity.value,
        transform: [{ scale: modalScale.value }],
    }));

    const handleClose = useCallback(() => {
        if (hapticsEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onClose();
    }, [onClose, hapticsEnabled]);

    // Format minutes to readable time
    const formatTotalTime = (minutes: number) => {
        if (minutes < 60) {
            return `${minutes} min`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours < 24) {
            return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`;
        }
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} days`;
    };

    // Calculate average sessions per day (based on streak)
    const avgPerDay = stats.currentStreak > 0
        ? (stats.completedSessions / Math.max(stats.currentStreak, 1)).toFixed(1)
        : '0';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            <Pressable style={styles.modalOverlay} onPress={handleClose}>
                <Animated.View style={[styles.modalBackdrop, backdropStyle]} />
                <Animated.View style={[styles.modalContent, modalStyle]}>
                    <Pressable onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{labels.viewDetails || 'Statistics'}</Text>
                            <Pressable
                                onPress={handleClose}
                                style={styles.modalCloseButton}
                                accessible={true}
                                accessibilityLabel={labels.close || 'Close'}
                                accessibilityRole="button"
                            >
                                <Text style={styles.modalCloseText}>\u2715</Text>
                            </Pressable>
                        </View>

                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            {/* Today's Stats Section */}
                            <View style={styles.statsSection}>
                                <Text style={styles.statsSectionTitle}>{labels.dailyGoalProgress || 'Today'}</Text>
                                <View style={styles.statsGrid}>
                                    <View style={styles.statCard}>
                                        <Text style={styles.statCardIcon}>&#9201;</Text>
                                        <Text style={styles.statCardValue}>{formatTotalTime(stats.totalFocusMinutes)}</Text>
                                        <Text style={styles.statCardLabel}>{labels.totalFocusTime || 'Focus Time'}</Text>
                                    </View>
                                    <View style={styles.statCard}>
                                        <Text style={styles.statCardIcon}>\u2705</Text>
                                        <Text style={styles.statCardValue}>{stats.dailyProgress.completedSessions}</Text>
                                        <Text style={styles.statCardLabel}>{labels.totalSessions || 'Sessions'}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Streak Section */}
                            <View style={styles.statsSection}>
                                <Text style={styles.statsSectionTitle}>{labels.streak || 'Streak'}</Text>
                                <View style={styles.statsGrid}>
                                    <View style={[styles.statCard, stats.currentStreak === stats.bestStreak && stats.currentStreak > 0 && styles.statCardHighlight]}>
                                        <Text style={styles.statCardIcon}>\ud83d\udd25</Text>
                                        <Text style={[styles.statCardValue, { color: theme.colors.warning }]}>
                                            {stats.currentStreak}
                                        </Text>
                                        <Text style={styles.statCardLabel}>{labels.streak || 'Current'}</Text>
                                        {stats.currentStreak === stats.bestStreak && stats.currentStreak > 0 && (
                                            <View style={styles.statCardBestBadge}>
                                                <Text style={styles.statCardBestText}>BEST</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.statCard}>
                                        <Text style={styles.statCardIcon}>\ud83c\udfc6</Text>
                                        <Text style={[styles.statCardValue, { color: theme.colors.legendary }]}>
                                            {stats.bestStreak}
                                        </Text>
                                        <Text style={styles.statCardLabel}>{labels.bestStreakLabel || 'Best'}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Overall Stats Section */}
                            <View style={styles.statsSection}>
                                <Text style={styles.statsSectionTitle}>{labels.totalSessions || 'Overall'}</Text>
                                <View style={styles.statsGrid}>
                                    <View style={styles.statCard}>
                                        <Text style={styles.statCardIcon}>\ud83d\udcca</Text>
                                        <Text style={styles.statCardValue}>{stats.completedSessions}</Text>
                                        <Text style={styles.statCardLabel}>{labels.session || 'Sessions'}</Text>
                                    </View>
                                    <View style={styles.statCard}>
                                        <Text style={styles.statCardIcon}>\ud83e\udd9a</Text>
                                        <Text style={styles.statCardValue}>{stats.collectionCount}</Text>
                                        <Text style={styles.statCardLabel}>{labels.animals || 'Animals'}</Text>
                                    </View>
                                </View>
                                <View style={[styles.statsGrid, { marginTop: theme.spacing.sm }]}>
                                    <View style={styles.statCard}>
                                        <Text style={styles.statCardIcon}>&#9991;</Text>
                                        <Text style={styles.statCardValue}>{avgPerDay}</Text>
                                        <Text style={styles.statCardLabel}>{labels.averagePerDay || 'Avg/Day'}</Text>
                                    </View>
                                </View>
                            </View>
                        </ScrollView>
                    </Pressable>
                </Animated.View>
            </Pressable>
        </Modal>
    );
}

// Main SessionStatsBar component
export function SessionStatsBar({
    completedSessions,
    collectionCount,
    dailyProgress,
    dailyGoal,
    currentStreak = 0,
    bestStreak = 0,
    totalFocusMinutes = 0,
    labels,
    hapticsEnabled = true,
}: SessionStatsBarProps) {
    const [showModal, setShowModal] = useState(false);

    // Use totalFocusMinutes prop if provided (from actual tracked data)
    // This is more accurate than estimating from session count
    const displayFocusMinutes = totalFocusMinutes ?? 0;

    const isBestStreak = currentStreak > 0 && currentStreak >= bestStreak;

    // Get flame color based on streak length
    const getStreakColor = () => {
        if (currentStreak >= 30) return theme.colors.legendary;
        if (currentStreak >= 14) return theme.colors.epic;
        if (currentStreak >= 7) return theme.colors.primary;
        if (currentStreak >= 3) return theme.colors.warning;
        return theme.colors.textSecondary;
    };

    const handleOpenModal = useCallback(() => {
        setShowModal(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setShowModal(false);
    }, []);

    // Memoize stats object to prevent unnecessary re-renders of StatsModal
    const statsData = useMemo(() => ({
        completedSessions,
        currentStreak,
        bestStreak,
        totalFocusMinutes: displayFocusMinutes,
        collectionCount,
        dailyProgress,
        dailyGoal,
    }), [completedSessions, currentStreak, bestStreak, displayFocusMinutes, collectionCount, dailyProgress, dailyGoal]);

    // Format time display for compact view
    const formatTimeCompact = (minutes: number) => {
        if (minutes < 60) {
            return `${minutes}m`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    return (
        <View style={styles.container}>
            <Pressable
                onPress={handleOpenModal}
                accessible={true}
                accessibilityLabel="Session statistics"
                accessibilityHint="Tap to view detailed statistics"
                accessibilityRole="button"
            >
                <View style={styles.statsRow}>
                    {/* Streak - Compact */}
                    <View style={styles.statItem}>
                        <View style={styles.statIconValueRow}>
                            <Text style={styles.statIcon}>🔥</Text>
                            <Text style={[styles.statValue, { color: getStreakColor() }]}>
                                {currentStreak}
                            </Text>
                            {isBestStreak && currentStreak > 0 && (
                                <View style={styles.bestBadgeInline}>
                                    <Text style={styles.bestBadgeInlineText}>BEST</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Today's Focus Time - Compact */}
                    <View style={styles.statItem}>
                        <View style={styles.statIconValueRow}>
                            <Text style={styles.statIcon}>⏱</Text>
                            <Text style={[styles.statValue, { color: theme.colors.accent }]}>
                                {formatTimeCompact(displayFocusMinutes)}
                            </Text>
                        </View>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Daily Goal Progress - Compact dots only */}
                    <View style={styles.statItem}>
                        <View style={styles.dailyGoalCompact}>
                            <Text style={styles.statIcon}>
                                {dailyProgress.goalAchieved ? '✨' : '🎯'}
                            </Text>
                            <View style={styles.progressDotsRow}>
                                {Array.from({ length: Math.min(dailyGoal, 5) }, (_, i) => (
                                    <View
                                        key={i}
                                        style={[
                                            styles.progressDotCompact,
                                            {
                                                backgroundColor: i < dailyProgress.completedSessions
                                                    ? (dailyProgress.goalAchieved ? theme.colors.success : theme.colors.accent)
                                                    : theme.colors.surfaceLight,
                                            },
                                        ]}
                                    />
                                ))}
                            </View>
                        </View>
                    </View>
                </View>
            </Pressable>

            {/* Stats Modal */}
            <StatsModal
                visible={showModal}
                onClose={handleCloseModal}
                stats={statsData}
                labels={labels}
                hapticsEnabled={hapticsEnabled}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: theme.spacing.lg,
        marginTop: theme.spacing.xs,
        marginBottom: theme.spacing.sm,
        zIndex: theme.zIndex.floating,
        elevation: theme.zIndex.floating,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.sm,
        borderWidth: 1,
        borderColor: theme.colors.surfaceLight,
        overflow: 'visible', // Prevent emoji clipping
        ...theme.shadows.small,
    },
    divider: {
        width: 1,
        height: 24,
        backgroundColor: theme.colors.surfaceLight,
        marginHorizontal: theme.spacing.xs,
    },

    // Compact stat item styles
    statItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 0, // Allow shrinking
    },
    statIconValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        overflow: 'visible', // Prevent emoji clipping
    },
    statIcon: {
        fontSize: theme.fontSize.md,
        lineHeight: 20, // Explicit line height to prevent clipping
        textAlign: 'center',
    },
    statValue: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },

    // Inline BEST badge (compact)
    bestBadgeInline: {
        backgroundColor: theme.colors.legendary,
        paddingHorizontal: theme.spacing.xs,
        paddingVertical: 1,
        borderRadius: theme.borderRadius.xs,
        marginLeft: theme.spacing.xxs,
    },
    bestBadgeInlineText: {
        fontSize: theme.typography.micro,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.background,
        letterSpacing: theme.typographyConfig.letterSpacing.wide,
    },

    // Daily goal compact
    dailyGoalCompact: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    progressDotsRow: {
        flexDirection: 'row',
        gap: theme.spacing.xs,
    },
    progressDotCompact: {
        width: 8,
        height: 8,
        borderRadius: theme.borderRadius.xs,
    },

    // Legacy styles kept for StatPill, FocusTimePill, DailyProgressIndicator components
    // These are still used in the detailed modal view
    pillContainer: {
        flex: 1,
        alignItems: 'center',
        position: 'relative',
        paddingVertical: theme.spacing.xs,
    },
    pillContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    pillIcon: {
        fontSize: theme.typography.h3,
    },
    pillTextContainer: {
        alignItems: 'flex-start',
        flexShrink: 1,
    },
    pillValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
    },
    pillValue: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        lineHeight: theme.fontSize.lg * 1.1,
    },
    pillLabel: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginTop: -theme.spacing.xxs,
        maxWidth: 80,
    },
    trendArrow: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.bold,
    },

    // Best badge styles (for detailed view)
    bestBadge: {
        position: 'absolute',
        top: -theme.spacing.xs,
        right: theme.spacing.xs,
        backgroundColor: theme.colors.legendary,
        paddingHorizontal: theme.spacing.xs,
        paddingVertical: theme.spacing.xxs,
        borderRadius: theme.borderRadius.sm,
        ...theme.shadows.small,
    },
    bestBadgeText: {
        fontSize: theme.typography.micro,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.background,
        letterSpacing: theme.typographyConfig.letterSpacing.wide,
    },
    bestGlow: {
        position: 'absolute',
        top: -8,
        right: 0,
        left: 0,
        bottom: -8,
        backgroundColor: theme.colors.legendary,
        borderRadius: theme.borderRadius.lg,
        opacity: 0.2,
    },

    // Focus Time Pill styles (for detailed view)
    focusTimePill: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.xs,
        position: 'relative',
    },
    focusTimeGlow: {
        position: 'absolute',
        top: -4,
        right: -4,
        left: -4,
        bottom: -4,
        backgroundColor: theme.colors.accent,
        borderRadius: theme.borderRadius.md,
        opacity: 0,
    },
    focusTimeIcon: {
        fontSize: theme.typography.h3,
    },
    focusTimeTextContainer: {
        alignItems: 'flex-start',
        flexShrink: 1,
    },
    focusTimeValue: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.accent,
        lineHeight: theme.fontSize.lg * 1.1,
    },
    focusTimeLabel: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginTop: -theme.spacing.xxs,
        maxWidth: 80,
    },

    // Daily Progress styles (for detailed view)
    dailyProgressPill: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.xs,
    },
    dailyProgressIcon: {
        fontSize: theme.typography.caption,
    },
    dailyProgressSegments: {
        flexDirection: 'row',
        gap: theme.spacing.xxs,
    },
    progressSegment: {
        width: 12,
        height: 12,
        borderRadius: theme.borderRadius.sm,
    },
    dailyProgressValue: {
        fontSize: theme.fontSize.xs,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.textSecondary,
    },
    dailyProgressValueComplete: {
        color: theme.colors.success,
    },

    // Modal styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: theme.colors.semantic.overlay,
    },
    modalContent: {
        width: '85%',
        maxHeight: '70%',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        ...theme.shadows.large,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceLight,
    },
    modalTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    modalCloseButton: {
        width: 32,
        height: 32,
        borderRadius: theme.borderRadius.lg,
        backgroundColor: theme.colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCloseText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
    },
    modalBody: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
    },

    // Stats Section styles
    statsSection: {
        marginBottom: theme.spacing.lg,
    },
    statsSectionTitle: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: theme.typographyConfig.letterSpacing.wide,
        marginBottom: theme.spacing.sm,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    statCard: {
        flex: 1,
        backgroundColor: theme.colors.surfaceLight,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
        position: 'relative',
    },
    statCardHighlight: {
        borderWidth: 2,
        borderColor: theme.colors.legendary,
    },
    statCardIcon: {
        fontSize: theme.typography.h2,
        marginBottom: theme.spacing.xs,
    },
    statCardValue: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    statCardLabel: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xxs,
    },
    statCardBestBadge: {
        position: 'absolute',
        top: theme.spacing.xs,
        right: theme.spacing.xs,
        backgroundColor: theme.colors.legendary,
        paddingHorizontal: theme.spacing.xs,
        paddingVertical: theme.spacing.xxs,
        borderRadius: theme.borderRadius.sm,
    },
    statCardBestText: {
        fontSize: theme.typography.micro,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.background,
        letterSpacing: theme.typographyConfig.letterSpacing.wide,
    },
});
