import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { theme } from '../styles/theme';

interface LoadingIndicatorProps {
    /** Optional loading message to display below the spinner */
    message?: string;
    /** Size variant of the spinner */
    size?: 'small' | 'medium' | 'large';
    /** If true, covers entire screen with semi-transparent overlay */
    overlay?: boolean;
    /** Custom style for the container */
    style?: ViewStyle;
}

const SIZE_CONFIG = {
    small: {
        spinnerSize: 24,
        borderWidth: 3,
        fontSize: theme.fontSize.xs,
        dotSize: 4,
    },
    medium: {
        spinnerSize: 40,
        borderWidth: 4,
        fontSize: theme.fontSize.sm,
        dotSize: 6,
    },
    large: {
        spinnerSize: 64,
        borderWidth: 5,
        fontSize: theme.fontSize.md,
        dotSize: 8,
    },
};

export function LoadingIndicator({
    message,
    size = 'medium',
    overlay = false,
    style,
}: LoadingIndicatorProps) {
    const rotation = useSharedValue(0);
    const dotPulse = useSharedValue(0);

    const config = SIZE_CONFIG[size];

    useEffect(() => {
        // Continuous rotation animation
        rotation.value = withRepeat(
            withTiming(360, {
                duration: 1000,
                easing: Easing.linear,
            }),
            -1,
            false
        );

        // Pulsing animation for pixel dots
        dotPulse.value = withRepeat(
            withTiming(1, {
                duration: 600,
                easing: Easing.inOut(Easing.ease),
            }),
            -1,
            true
        );
    }, [rotation, dotPulse]);

    const spinnerStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    const dot1Style = useAnimatedStyle(() => ({
        opacity: 0.3 + dotPulse.value * 0.7,
        transform: [{ scale: 0.8 + dotPulse.value * 0.2 }],
    }));

    const dot2Style = useAnimatedStyle(() => ({
        opacity: 0.3 + (1 - dotPulse.value) * 0.7,
        transform: [{ scale: 0.8 + (1 - dotPulse.value) * 0.2 }],
    }));

    const dot3Style = useAnimatedStyle(() => ({
        opacity: 0.3 + dotPulse.value * 0.7,
        transform: [{ scale: 0.8 + dotPulse.value * 0.2 }],
    }));

    const content = (
        <View
            style={[styles.container, style]}
            accessible={true}
            accessibilityRole="progressbar"
            accessibilityLabel={message || 'Loading'}
            accessibilityState={{ busy: true }}
        >
            {/* Pixel-art style spinner */}
            <Animated.View
                style={[
                    styles.spinner,
                    spinnerStyle,
                    {
                        width: config.spinnerSize,
                        height: config.spinnerSize,
                        borderRadius: config.spinnerSize / 2,
                        borderWidth: config.borderWidth,
                    },
                ]}
            >
                {/* Corner pixel accents */}
                <View
                    style={[
                        styles.pixelCorner,
                        styles.pixelCornerTopLeft,
                        {
                            width: config.dotSize,
                            height: config.dotSize,
                        },
                    ]}
                />
                <View
                    style={[
                        styles.pixelCorner,
                        styles.pixelCornerBottomRight,
                        {
                            width: config.dotSize,
                            height: config.dotSize,
                        },
                    ]}
                />
            </Animated.View>

            {/* Pulsing dots below spinner */}
            <View style={styles.dotsContainer}>
                <Animated.View
                    style={[
                        styles.dot,
                        dot1Style,
                        {
                            width: config.dotSize,
                            height: config.dotSize,
                        },
                    ]}
                />
                <Animated.View
                    style={[
                        styles.dot,
                        dot2Style,
                        {
                            width: config.dotSize,
                            height: config.dotSize,
                        },
                    ]}
                />
                <Animated.View
                    style={[
                        styles.dot,
                        dot3Style,
                        {
                            width: config.dotSize,
                            height: config.dotSize,
                        },
                    ]}
                />
            </View>

            {/* Optional loading message */}
            {message && (
                <Text
                    style={[
                        styles.message,
                        { fontSize: config.fontSize },
                    ]}
                >
                    {message}
                </Text>
            )}
        </View>
    );

    if (overlay) {
        return (
            <View
                style={styles.overlay}
                accessible={true}
                accessibilityRole="alert"
                accessibilityLabel={message || 'Loading overlay'}
            >
                {content}
            </View>
        );
    }

    return content;
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: theme.colors.semantic.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: theme.zIndex.overlay,
    },
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.md,
    },
    spinner: {
        borderColor: theme.colors.surface,
        borderTopColor: theme.colors.primary,
        borderRightColor: theme.colors.primary,
        position: 'relative',
    },
    pixelCorner: {
        position: 'absolute',
        backgroundColor: theme.colors.accent,
    },
    pixelCornerTopLeft: {
        top: -2,
        left: -2,
    },
    pixelCornerBottomRight: {
        bottom: -2,
        right: -2,
    },
    dotsContainer: {
        flexDirection: 'row',
        marginTop: theme.spacing.sm,
        gap: theme.spacing.xs,
    },
    dot: {
        backgroundColor: theme.colors.secondary,
        borderRadius: 2,
    },
    message: {
        marginTop: theme.spacing.sm,
        color: theme.colors.text,
        fontWeight: theme.fontWeight.medium,
        textAlign: 'center',
    },
});
