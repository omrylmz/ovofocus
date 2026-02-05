import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
    interpolate,
    cancelAnimation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { theme, Theme } from '../styles/theme';

interface SkeletonCardProps {
    /** Size variant matching AnimalCard sizes */
    size?: 'small' | 'medium' | 'large';
    /** Custom width for responsive layouts */
    customWidth?: number;
    /** Delay before animation starts (for staggered effect) */
    animationDelay?: number;
    /** Custom style for the container */
    style?: ViewStyle;
    /** Optional theme override (for themed context) */
    themeOverride?: Theme;
}

// Base dimensions matching AnimalCard getSizeStyles
const SKELETON_DIMENSIONS = {
    small: {
        width: 80,
        height: 100,
        padding: theme.spacing.xs,
        emojiSize: 28,
        nameHeight: 10,
        badgeWidth: 24,
        badgeHeight: 12,
    },
    medium: {
        width: 100,
        height: 140,
        padding: theme.spacing.sm,
        emojiSize: 40,
        nameHeight: 12,
        badgeWidth: 32,
        badgeHeight: 14,
    },
    large: {
        width: 140,
        height: 190,
        padding: theme.spacing.md,
        emojiSize: 56,
        nameHeight: 14,
        badgeWidth: 40,
        badgeHeight: 16,
    },
};

// Animation constants for smooth shimmer
const SHIMMER_DURATION = 1200; // ms for one full shimmer cycle
const SHIMMER_DELAY_INCREMENT = 50; // ms between each card's animation

/**
 * SkeletonCard - A placeholder component with shimmer animation
 * Used during loading states to improve perceived performance.
 * Matches AnimalCard dimensions for seamless transitions.
 */
export const SkeletonCard = React.memo(function SkeletonCard({
    size = 'medium',
    customWidth,
    animationDelay = 0,
    style,
    themeOverride,
}: SkeletonCardProps) {
    const activeTheme = themeOverride || theme;
    const shimmerPosition = useSharedValue(0);

    // Calculate dimensions based on size and customWidth
    const dimensions = useMemo(() => {
        const base = SKELETON_DIMENSIONS[size];

        if (customWidth !== undefined) {
            const scaleFactor = customWidth / base.width;
            return {
                width: customWidth,
                height: Math.round(base.height * scaleFactor),
                padding: base.padding,
                emojiSize: Math.round(base.emojiSize * Math.min(scaleFactor, 1.2)),
                nameHeight: Math.round(base.nameHeight * Math.min(scaleFactor, 1.1)),
                badgeWidth: Math.round(base.badgeWidth * scaleFactor),
                badgeHeight: Math.round(base.badgeHeight * scaleFactor),
            };
        }

        return base;
    }, [size, customWidth]);

    // Start shimmer animation with optional delay
    useEffect(() => {
        const timeout = setTimeout(() => {
            shimmerPosition.value = withRepeat(
                withTiming(1, {
                    duration: SHIMMER_DURATION,
                    easing: Easing.inOut(Easing.ease),
                }),
                -1,
                true
            );
        }, animationDelay);

        return () => {
            clearTimeout(timeout);
            cancelAnimation(shimmerPosition);
        };
    }, [animationDelay, shimmerPosition]);

    // Animated shimmer overlay style
    const shimmerStyle = useAnimatedStyle(() => {
        const translateX = interpolate(
            shimmerPosition.value,
            [0, 1],
            [-dimensions.width, dimensions.width]
        );
        return {
            transform: [{ translateX }],
        };
    });

    // Subtle pulse for base skeleton elements
    const pulseStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            shimmerPosition.value,
            [0, 0.5, 1],
            [0.4, 0.6, 0.4]
        );
        return { opacity };
    });

    return (
        <View
            style={[
                styles.container,
                {
                    width: dimensions.width,
                    height: dimensions.height,
                    borderRadius: activeTheme.borderRadius.lg,
                },
                style,
            ]}
            accessible={true}
            accessibilityRole="progressbar"
            accessibilityLabel="Loading animal card"
            accessibilityState={{ busy: true }}
        >
            {/* Gradient border placeholder */}
            <View
                style={[
                    styles.borderPlaceholder,
                    {
                        borderRadius: activeTheme.borderRadius.lg,
                        backgroundColor: activeTheme.colors.surfaceLight,
                    },
                ]}
            />

            {/* Inner content container */}
            <Animated.View
                style={[
                    styles.innerContainer,
                    {
                        margin: 2,
                        padding: dimensions.padding,
                        borderRadius: activeTheme.borderRadius.lg - 2,
                        backgroundColor: activeTheme.colors.surface,
                    },
                    pulseStyle,
                ]}
            >
                {/* Emoji placeholder (circle) */}
                <View
                    style={[
                        styles.emojiPlaceholder,
                        {
                            width: dimensions.emojiSize,
                            height: dimensions.emojiSize,
                            borderRadius: dimensions.emojiSize / 2,
                            backgroundColor: activeTheme.colors.surfaceLight,
                        },
                    ]}
                />

                {/* Name placeholder */}
                <View
                    style={[
                        styles.namePlaceholder,
                        {
                            width: dimensions.width * 0.6,
                            height: dimensions.nameHeight,
                            borderRadius: dimensions.nameHeight / 2,
                            backgroundColor: activeTheme.colors.surfaceLight,
                        },
                    ]}
                />

                {/* Rarity badge placeholder (top right) */}
                <View
                    style={[
                        styles.rarityBadgePlaceholder,
                        {
                            width: dimensions.badgeWidth,
                            height: dimensions.badgeHeight,
                            borderRadius: activeTheme.borderRadius.sm,
                            backgroundColor: activeTheme.colors.surfaceLight,
                        },
                    ]}
                />

                {/* Level badge placeholder (bottom left) */}
                <View
                    style={[
                        styles.levelBadgePlaceholder,
                        {
                            width: dimensions.badgeWidth,
                            height: dimensions.badgeHeight,
                            borderRadius: activeTheme.borderRadius.sm,
                            backgroundColor: activeTheme.colors.surfaceLight,
                        },
                    ]}
                />

                {/* Shimmer overlay effect */}
                <View style={styles.shimmerContainer}>
                    <Animated.View style={[styles.shimmerEffect, shimmerStyle]}>
                        <LinearGradient
                            colors={[
                                'transparent',
                                'rgba(255, 255, 255, 0.08)',
                                'rgba(255, 255, 255, 0.15)',
                                'rgba(255, 255, 255, 0.08)',
                                'transparent',
                            ]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.shimmerGradient}
                        />
                    </Animated.View>
                </View>
            </Animated.View>
        </View>
    );
});

SkeletonCard.displayName = 'SkeletonCard';

/**
 * SkeletonGrid - Renders multiple skeleton cards in a grid layout
 * Useful for showing loading state for entire sections
 */
interface SkeletonGridProps {
    /** Number of skeleton cards to display */
    count?: number;
    /** Size variant for all cards */
    size?: 'small' | 'medium' | 'large';
    /** Custom width for responsive layouts */
    customWidth?: number;
    /** Number of columns in the grid */
    numColumns?: number;
    /** Gap between cards */
    gap?: number;
    /** Optional theme override */
    themeOverride?: Theme;
}

export const SkeletonGrid = React.memo(function SkeletonGrid({
    count = 8,
    size = 'small',
    customWidth,
    numColumns = 4,
    gap = 12,
    themeOverride,
}: SkeletonGridProps) {
    const skeletons = useMemo(() => {
        return Array.from({ length: count }, (_, index) => ({
            id: `skeleton-${index}`,
            delay: index * SHIMMER_DELAY_INCREMENT,
        }));
    }, [count]);

    return (
        <View
            style={[
                styles.gridContainer,
                { gap },
            ]}
        >
            {skeletons.map((skeleton) => (
                <SkeletonCard
                    key={skeleton.id}
                    size={size}
                    customWidth={customWidth}
                    animationDelay={skeleton.delay}
                    themeOverride={themeOverride}
                />
            ))}
        </View>
    );
});

SkeletonGrid.displayName = 'SkeletonGrid';

/**
 * SkeletonProgressCard - Skeleton for the collection progress card
 */
export const SkeletonProgressCard = React.memo(function SkeletonProgressCard({
    themeOverride,
}: { themeOverride?: Theme }) {
    const activeTheme = themeOverride || theme;
    const shimmerPosition = useSharedValue(0);

    useEffect(() => {
        shimmerPosition.value = withRepeat(
            withTiming(1, {
                duration: SHIMMER_DURATION,
                easing: Easing.inOut(Easing.ease),
            }),
            -1,
            true
        );

        return () => {
            cancelAnimation(shimmerPosition);
        };
    }, [shimmerPosition]);

    const pulseStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            shimmerPosition.value,
            [0, 0.5, 1],
            [0.4, 0.6, 0.4]
        );
        return { opacity };
    });

    return (
        <Animated.View
            style={[
                styles.progressCardSkeleton,
                {
                    backgroundColor: activeTheme.colors.surface,
                    borderRadius: activeTheme.borderRadius.lg,
                },
                pulseStyle,
            ]}
            accessible={true}
            accessibilityRole="progressbar"
            accessibilityLabel="Loading progress"
            accessibilityState={{ busy: true }}
        >
            {/* Title placeholder */}
            <View
                style={[
                    styles.progressTitlePlaceholder,
                    {
                        backgroundColor: activeTheme.colors.surfaceLight,
                        borderRadius: activeTheme.borderRadius.sm,
                    },
                ]}
            />
            {/* Progress bar placeholder */}
            <View
                style={[
                    styles.progressBarPlaceholder,
                    {
                        backgroundColor: activeTheme.colors.surfaceLight,
                        borderRadius: activeTheme.borderRadius.sm,
                    },
                ]}
            />
            {/* Progress text placeholder */}
            <View
                style={[
                    styles.progressTextPlaceholder,
                    {
                        backgroundColor: activeTheme.colors.surfaceLight,
                        borderRadius: activeTheme.borderRadius.xs,
                    },
                ]}
            />
        </Animated.View>
    );
});

SkeletonProgressCard.displayName = 'SkeletonProgressCard';

/**
 * SkeletonStatsGrid - Skeleton for the stats grid section
 */
export const SkeletonStatsGrid = React.memo(function SkeletonStatsGrid({
    themeOverride,
}: { themeOverride?: Theme }) {
    const activeTheme = themeOverride || theme;
    const shimmerPosition = useSharedValue(0);

    useEffect(() => {
        shimmerPosition.value = withRepeat(
            withTiming(1, {
                duration: SHIMMER_DURATION,
                easing: Easing.inOut(Easing.ease),
            }),
            -1,
            true
        );

        return () => {
            cancelAnimation(shimmerPosition);
        };
    }, [shimmerPosition]);

    const pulseStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            shimmerPosition.value,
            [0, 0.5, 1],
            [0.4, 0.6, 0.4]
        );
        return { opacity };
    });

    return (
        <View style={styles.statsGridSkeleton}>
            {[0, 1, 2].map((index) => (
                <Animated.View
                    key={`stat-skeleton-${index}`}
                    style={[
                        styles.statCardSkeleton,
                        {
                            backgroundColor: activeTheme.colors.surface,
                            borderRadius: activeTheme.borderRadius.md,
                        },
                        pulseStyle,
                    ]}
                    accessible={true}
                    accessibilityRole="progressbar"
                    accessibilityLabel="Loading stat"
                    accessibilityState={{ busy: true }}
                >
                    {/* Emoji placeholder */}
                    <View
                        style={[
                            styles.statEmojiPlaceholder,
                            {
                                backgroundColor: activeTheme.colors.surfaceLight,
                            },
                        ]}
                    />
                    {/* Value placeholder */}
                    <View
                        style={[
                            styles.statValuePlaceholder,
                            {
                                backgroundColor: activeTheme.colors.surfaceLight,
                                borderRadius: activeTheme.borderRadius.xs,
                            },
                        ]}
                    />
                    {/* Label placeholder */}
                    <View
                        style={[
                            styles.statLabelPlaceholder,
                            {
                                backgroundColor: activeTheme.colors.surfaceLight,
                                borderRadius: activeTheme.borderRadius.xxs,
                            },
                        ]}
                    />
                </Animated.View>
            ))}
        </View>
    );
});

SkeletonStatsGrid.displayName = 'SkeletonStatsGrid';

const styles = StyleSheet.create({
    // SkeletonCard styles
    container: {
        overflow: 'hidden',
        ...theme.shadows.medium,
    },
    borderPlaceholder: {
        ...StyleSheet.absoluteFillObject,
    },
    innerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    emojiPlaceholder: {
        marginBottom: theme.spacing.sm,
    },
    namePlaceholder: {
        marginBottom: theme.spacing.xs,
    },
    rarityBadgePlaceholder: {
        position: 'absolute',
        top: 4,
        right: 4,
    },
    levelBadgePlaceholder: {
        position: 'absolute',
        bottom: 4,
        left: 4,
    },
    shimmerContainer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    shimmerEffect: {
        width: '100%',
        height: '100%',
    },
    shimmerGradient: {
        flex: 1,
        width: '50%',
    },

    // SkeletonGrid styles
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },

    // SkeletonProgressCard styles
    progressCardSkeleton: {
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
    },
    progressTitlePlaceholder: {
        width: 140,
        height: 20,
        marginBottom: theme.spacing.md,
    },
    progressBarPlaceholder: {
        width: '100%',
        height: 12,
        marginBottom: theme.spacing.sm,
    },
    progressTextPlaceholder: {
        width: 100,
        height: 14,
        alignSelf: 'center',
    },

    // SkeletonStatsGrid styles
    statsGridSkeleton: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.xl,
    },
    statCardSkeleton: {
        flex: 1,
        padding: theme.spacing.md,
        alignItems: 'center',
    },
    statEmojiPlaceholder: {
        width: 24,
        height: 24,
        borderRadius: theme.borderRadius.md,
        marginBottom: theme.spacing.xs,
    },
    statValuePlaceholder: {
        width: 32,
        height: 24,
        marginBottom: theme.spacing.xs,
    },
    statLabelPlaceholder: {
        width: 48,
        height: 10,
    },
});
