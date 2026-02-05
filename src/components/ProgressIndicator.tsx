import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    withSpring,
    Easing,
} from 'react-native-reanimated';
import { theme } from '../styles/theme';

interface ProgressIndicatorProps {
    /** Progress value between 0 and 100 */
    progress: number;
    /** Color variant for the progress bar */
    variant?: 'primary' | 'success' | 'warning';
    /** Optional label to display (shows percentage if not provided) */
    label?: string;
    /** Whether to show the label */
    showLabel?: boolean;
    /** Height of the progress bar */
    height?: number;
    /** Custom style for the container */
    style?: ViewStyle;
}

const VARIANT_COLORS = {
    primary: {
        fill: theme.colors.primary,
        glow: 'rgba(255, 107, 107, 0.4)',
        accent: theme.colors.accent,
    },
    success: {
        fill: theme.colors.success,
        glow: 'rgba(76, 175, 80, 0.4)',
        accent: theme.colors.secondary,
    },
    warning: {
        fill: theme.colors.warning,
        glow: 'rgba(255, 193, 7, 0.4)',
        accent: theme.colors.legendary,
    },
};

export function ProgressIndicator({
    progress,
    variant = 'primary',
    label,
    showLabel = true,
    height = 12,
    style,
}: ProgressIndicatorProps) {
    const animatedProgress = useSharedValue(0);
    const glowOpacity = useSharedValue(0);
    const celebrateScale = useSharedValue(1);

    const clampedProgress = Math.min(Math.max(progress, 0), 100);
    const colors = VARIANT_COLORS[variant];

    useEffect(() => {
        // Animate progress bar fill
        animatedProgress.value = withTiming(clampedProgress, {
            duration: 500,
            easing: Easing.out(Easing.cubic),
        });

        // Pulse glow effect on progress change
        glowOpacity.value = withSequence(
            withTiming(0.8, { duration: 200 }),
            withTiming(0.3, { duration: 300 })
        );

        // Celebrate when reaching 100%
        if (clampedProgress >= 100) {
            celebrateScale.value = withSequence(
                withSpring(1.05, { damping: 8, stiffness: 200 }),
                withSpring(1, { damping: 10, stiffness: 300 })
            );
        }
    }, [clampedProgress, animatedProgress, glowOpacity, celebrateScale]);

    const progressStyle = useAnimatedStyle(() => ({
        width: `${animatedProgress.value}%`,
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    const containerAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: celebrateScale.value }],
    }));

    const displayLabel = label ?? `${Math.round(clampedProgress)}%`;

    return (
        <Animated.View
            style={[styles.wrapper, containerAnimatedStyle, style]}
            accessible={true}
            accessibilityRole="progressbar"
            accessibilityValue={{
                min: 0,
                max: 100,
                now: clampedProgress,
            }}
            accessibilityLabel={`Progress: ${displayLabel}`}
        >
            {/* Label */}
            {showLabel && (
                <View style={styles.labelContainer}>
                    <Text style={styles.label}>{displayLabel}</Text>
                </View>
            )}

            {/* Progress bar container */}
            <View
                style={[
                    styles.container,
                    { height },
                ]}
            >
                {/* Background track with pixel-art styling */}
                <View style={styles.track}>
                    {/* Pixel grid pattern */}
                    <View style={styles.pixelGrid}>
                        {Array.from({ length: 10 }, (_, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.gridSegment,
                                    { backgroundColor: theme.colors.surfaceLight },
                                ]}
                            />
                        ))}
                    </View>
                </View>

                {/* Animated progress fill */}
                <Animated.View
                    style={[
                        styles.fill,
                        progressStyle,
                        { backgroundColor: colors.fill },
                    ]}
                >
                    {/* Glow effect */}
                    <Animated.View
                        style={[
                            styles.glow,
                            glowStyle,
                            { backgroundColor: colors.glow },
                        ]}
                    />

                    {/* Pixel accent marks */}
                    <View style={styles.pixelAccentsContainer}>
                        <View
                            style={[
                                styles.pixelAccent,
                                { backgroundColor: colors.accent },
                            ]}
                        />
                        <View
                            style={[
                                styles.pixelAccent,
                                styles.pixelAccentMiddle,
                                { backgroundColor: colors.accent },
                            ]}
                        />
                    </View>

                    {/* Leading edge pixel */}
                    <View
                        style={[
                            styles.leadingEdge,
                            { backgroundColor: colors.accent },
                        ]}
                    />
                </Animated.View>

                {/* Border overlay for pixel-art look */}
                <View style={styles.border} />
            </View>

            {/* Completion indicator */}
            {clampedProgress >= 100 && (
                <Text style={styles.completionText}>Complete!</Text>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
    },
    labelContainer: {
        marginBottom: theme.spacing.xs,
    },
    label: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.text,
    },
    container: {
        width: '100%',
        borderRadius: theme.borderRadius.sm,
        overflow: 'hidden',
        position: 'relative',
    },
    track: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.sm,
    },
    pixelGrid: {
        flex: 1,
        flexDirection: 'row',
        gap: 2,
        padding: 2,
    },
    gridSegment: {
        flex: 1,
        borderRadius: theme.borderRadius.xxs,
    },
    fill: {
        height: '100%',
        borderRadius: theme.borderRadius.sm,
        overflow: 'hidden',
        position: 'relative',
        minWidth: 4,
    },
    glow: {
        ...StyleSheet.absoluteFillObject,
    },
    pixelAccentsContainer: {
        position: 'absolute',
        top: 2,
        left: 4,
        right: 4,
        flexDirection: 'row',
        gap: 4,
    },
    pixelAccent: {
        width: 4,
        height: 3,
        borderRadius: 1,
        opacity: 0.6,
    },
    pixelAccentMiddle: {
        opacity: 0.4,
    },
    leadingEdge: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: 3,
        opacity: 0.8,
    },
    border: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 2,
        borderColor: theme.colors.semantic.border,
        borderRadius: theme.borderRadius.sm,
        pointerEvents: 'none',
    },
    completionText: {
        marginTop: theme.spacing.xs,
        fontSize: theme.fontSize.xs,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.success,
        textAlign: 'center',
    },
});
