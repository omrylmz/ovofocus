import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { theme } from '../styles/theme';
import { PixelButton } from './PixelButton';

export type EmptyStateType = 'empty' | 'error' | 'loading';

interface EmptyStateProps {
    type: EmptyStateType;
    title: string;
    message: string;
    onRetry?: () => void;
    retryButtonText?: string;
    actionButton?: {
        title: string;
        onPress: () => void;
        icon?: string;
    };
}

// Illustration configurations for each type
const illustrations = {
    empty: {
        emoji: '🥚',
        secondaryEmoji: '✨',
        color: theme.colors.accent,
    },
    error: {
        emoji: '💔',
        secondaryEmoji: '🔧',
        color: theme.colors.error,
    },
    loading: {
        emoji: '🥚',
        secondaryEmoji: '⏳',
        color: theme.colors.secondary,
    },
};

export function EmptyState({
    type,
    title,
    message,
    onRetry,
    retryButtonText = 'Try Again',
    actionButton,
}: EmptyStateProps) {
    const illustration = illustrations[type];

    // Entrance animation values
    const containerOpacity = useSharedValue(0);
    const containerTranslateY = useSharedValue(30);
    const illustrationScale = useSharedValue(0);
    const titleOpacity = useSharedValue(0);
    const titleTranslateY = useSharedValue(20);
    const messageOpacity = useSharedValue(0);
    const messageTranslateY = useSharedValue(20);
    const buttonOpacity = useSharedValue(0);
    const buttonTranslateY = useSharedValue(20);

    // Continuous animation values
    const floatOffset = useSharedValue(0);
    const secondaryRotation = useSharedValue(0);
    const pulseScale = useSharedValue(1);
    const glowOpacity = useSharedValue(0.3);

    // Loading spinner rotation
    const loadingRotation = useSharedValue(0);

    useEffect(() => {
        // Entrance animations with stagger
        containerOpacity.value = withDelay(0, withSpring(1, { damping: 15, stiffness: 200 }));
        containerTranslateY.value = withDelay(0, withSpring(0, { damping: 15, stiffness: 200 }));

        illustrationScale.value = withDelay(
            100,
            withSpring(1, { damping: 10, stiffness: 150 })
        );

        titleOpacity.value = withDelay(
            200,
            withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) })
        );
        titleTranslateY.value = withDelay(
            200,
            withSpring(0, { damping: 12, stiffness: 200 })
        );

        messageOpacity.value = withDelay(
            300,
            withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) })
        );
        messageTranslateY.value = withDelay(
            300,
            withSpring(0, { damping: 12, stiffness: 200 })
        );

        buttonOpacity.value = withDelay(
            400,
            withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) })
        );
        buttonTranslateY.value = withDelay(
            400,
            withSpring(0, { damping: 12, stiffness: 200 })
        );

        // Continuous floating animation
        floatOffset.value = withRepeat(
            withSequence(
                withTiming(-8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                withTiming(8, { duration: 1500, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );

        // Secondary emoji rotation
        secondaryRotation.value = withRepeat(
            withSequence(
                withTiming(15, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                withTiming(-15, { duration: 2000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );

        // Pulse animation for the glow
        pulseScale.value = withRepeat(
            withSequence(
                withTiming(1.1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );

        // Glow opacity pulse
        glowOpacity.value = withRepeat(
            withSequence(
                withTiming(0.5, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.2, { duration: 1500, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );

        // Loading rotation (only for loading type)
        if (type === 'loading') {
            loadingRotation.value = withRepeat(
                withTiming(360, { duration: 2000, easing: Easing.linear }),
                -1,
                false
            );
        }
    }, [
        type,
        containerOpacity,
        containerTranslateY,
        illustrationScale,
        titleOpacity,
        titleTranslateY,
        messageOpacity,
        messageTranslateY,
        buttonOpacity,
        buttonTranslateY,
        floatOffset,
        secondaryRotation,
        pulseScale,
        glowOpacity,
        loadingRotation,
    ]);

    // Animated styles
    const containerStyle = useAnimatedStyle(() => ({
        opacity: containerOpacity.value,
        transform: [{ translateY: containerTranslateY.value }],
    }));

    const illustrationContainerStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { scale: illustrationScale.value },
                { translateY: floatOffset.value },
            ],
        };
    });

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
        transform: [{ scale: pulseScale.value }],
    }));

    const secondaryEmojiStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { rotate: `${secondaryRotation.value}deg` },
                { translateY: -floatOffset.value * 0.5 },
            ],
        };
    });

    const loadingEmojiStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${loadingRotation.value}deg` }],
    }));

    const titleStyle = useAnimatedStyle(() => ({
        opacity: titleOpacity.value,
        transform: [{ translateY: titleTranslateY.value }],
    }));

    const messageStyle = useAnimatedStyle(() => ({
        opacity: messageOpacity.value,
        transform: [{ translateY: messageTranslateY.value }],
    }));

    const buttonStyle = useAnimatedStyle(() => ({
        opacity: buttonOpacity.value,
        transform: [{ translateY: buttonTranslateY.value }],
    }));

    return (
        <Animated.View style={[styles.container, containerStyle]}>
            {/* Illustration container with glow */}
            <Animated.View style={[styles.illustrationContainer, illustrationContainerStyle]}>
                {/* Background glow */}
                <Animated.View
                    style={[
                        styles.glow,
                        { backgroundColor: illustration.color },
                        glowStyle,
                    ]}
                />

                {/* Main emoji container */}
                <View style={[styles.emojiContainer, { borderColor: illustration.color }]}>
                    <Text style={styles.mainEmoji}>{illustration.emoji}</Text>

                    {/* Secondary emoji orbiting */}
                    <Animated.View style={[styles.secondaryEmojiContainer, secondaryEmojiStyle]}>
                        {type === 'loading' ? (
                            <Animated.Text style={[styles.secondaryEmoji, loadingEmojiStyle]}>
                                {illustration.secondaryEmoji}
                            </Animated.Text>
                        ) : (
                            <Text style={styles.secondaryEmoji}>{illustration.secondaryEmoji}</Text>
                        )}
                    </Animated.View>
                </View>

                {/* Decorative dots */}
                <View style={styles.dotsContainer}>
                    <View style={[styles.dot, styles.dotTopLeft, { backgroundColor: illustration.color }]} />
                    <View style={[styles.dot, styles.dotTopRight, { backgroundColor: illustration.color }]} />
                    <View style={[styles.dot, styles.dotBottomLeft, { backgroundColor: illustration.color }]} />
                    <View style={[styles.dot, styles.dotBottomRight, { backgroundColor: illustration.color }]} />
                </View>
            </Animated.View>

            {/* Title */}
            <Animated.Text style={[styles.title, titleStyle]}>{title}</Animated.Text>

            {/* Message */}
            <Animated.Text style={[styles.message, messageStyle]}>{message}</Animated.Text>

            {/* Buttons */}
            <Animated.View style={[styles.buttonContainer, buttonStyle]}>
                {type === 'error' && onRetry && (
                    <PixelButton
                        title={retryButtonText}
                        onPress={onRetry}
                        variant="secondary"
                        icon="🔄"
                    />
                )}
                {actionButton && (
                    <PixelButton
                        title={actionButton.title}
                        onPress={actionButton.onPress}
                        variant="primary"
                        icon={actionButton.icon}
                    />
                )}
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xxl,
        paddingHorizontal: theme.spacing.lg,
    },
    illustrationContainer: {
        position: 'relative',
        width: 160,
        height: 160,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.xl,
    },
    glow: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        opacity: 0.3,
    },
    emojiContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: theme.colors.surface,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.medium,
    },
    mainEmoji: {
        fontSize: 56,
    },
    secondaryEmojiContainer: {
        position: 'absolute',
        top: -10,
        right: -10,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.small,
    },
    secondaryEmoji: {
        fontSize: 24,
    },
    dotsContainer: {
        position: 'absolute',
        width: '100%',
        height: '100%',
    },
    dot: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        opacity: 0.5,
    },
    dotTopLeft: {
        top: 20,
        left: 10,
    },
    dotTopRight: {
        top: 10,
        right: 20,
    },
    dotBottomLeft: {
        bottom: 10,
        left: 20,
    },
    dotBottomRight: {
        bottom: 20,
        right: 10,
    },
    title: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    message: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.lg,
        maxWidth: 280,
        lineHeight: 22,
    },
    buttonContainer: {
        gap: theme.spacing.md,
        alignItems: 'center',
    },
});
