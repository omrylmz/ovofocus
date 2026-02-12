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
import { Language, t } from '../i18n/translations';

interface ErrorFallbackProps {
    error: Error;
    onReset: () => void;
    language?: Language;
}

/**
 * ErrorFallback - Fallback UI displayed when an error is caught by ErrorBoundary
 *
 * Features:
 * - Animated entrance and continuous floating animations (matching app's visual style)
 * - User-friendly error message with retry option
 * - Supports internationalization (Turkish/English)
 * - Logs error for debugging purposes
 */
export function ErrorFallback({
    error,
    onReset,
    language = 'en',
}: ErrorFallbackProps) {
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
    const pulseScale = useSharedValue(1);
    const glowOpacity = useSharedValue(0.3);
    const crackRotation = useSharedValue(0);

    useEffect(() => {
        // Log error for debugging
        console.error('[ErrorFallback] Caught error:', error.message);
        console.error('[ErrorFallback] Stack:', error.stack);

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

        // Subtle crack/wobble animation
        crackRotation.value = withRepeat(
            withSequence(
                withTiming(3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                withTiming(-3, { duration: 800, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    }, [
        error,
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
        pulseScale,
        glowOpacity,
        crackRotation,
    ]);

    // Animated styles
    const containerStyle = useAnimatedStyle(() => ({
        opacity: containerOpacity.value,
        transform: [{ translateY: containerTranslateY.value }],
    }));

    const illustrationContainerStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: illustrationScale.value },
            { translateY: floatOffset.value },
        ],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
        transform: [{ scale: pulseScale.value }],
    }));

    const crackStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${crackRotation.value}deg` }],
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
        <View style={styles.wrapper}>
            <Animated.View style={[styles.container, containerStyle]}>
                {/* Illustration container with glow */}
                <Animated.View style={[styles.illustrationContainer, illustrationContainerStyle]}>
                    {/* Background glow */}
                    <Animated.View
                        style={[
                            styles.glow,
                            { backgroundColor: theme.colors.error },
                            glowStyle,
                        ]}
                    />

                    {/* Main emoji container - broken egg */}
                    <View style={[styles.emojiContainer, { borderColor: theme.colors.error }]}>
                        <Animated.Text style={[styles.mainEmoji, crackStyle]}>
                            🥚
                        </Animated.Text>
                        {/* Crack overlay */}
                        <View style={styles.crackOverlay}>
                            <Text style={styles.crackEmoji}>💔</Text>
                        </View>
                    </View>

                    {/* Secondary emoji - wrench for "fixing" */}
                    <View style={styles.secondaryEmojiContainer}>
                        <Text style={styles.secondaryEmoji}>🔧</Text>
                    </View>

                    {/* Decorative dots */}
                    <View style={styles.dotsContainer}>
                        <View style={[styles.dot, styles.dotTopLeft, { backgroundColor: theme.colors.error }]} />
                        <View style={[styles.dot, styles.dotTopRight, { backgroundColor: theme.colors.error }]} />
                        <View style={[styles.dot, styles.dotBottomLeft, { backgroundColor: theme.colors.error }]} />
                        <View style={[styles.dot, styles.dotBottomRight, { backgroundColor: theme.colors.error }]} />
                    </View>
                </Animated.View>

                {/* Title */}
                <Animated.Text style={[styles.title, titleStyle]}>
                    {t('errorBoundaryTitle', language)}
                </Animated.Text>

                {/* Message */}
                <Animated.Text style={[styles.message, messageStyle]}>
                    {t('errorBoundaryMessage', language)}
                </Animated.Text>

                {/* Buttons */}
                <Animated.View style={[styles.buttonContainer, buttonStyle]}>
                    <PixelButton
                        title={t('tryAgain', language)}
                        onPress={onReset}
                        variant="primary"
                        icon="🔄"
                        accessibilityLabel={t('tryAgain', language)}
                        accessibilityHint={t('errorBoundaryRetryHint', language)}
                    />
                </Animated.View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
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
        borderRadius: theme.borderRadius.round,
        opacity: theme.opacity.medium,
    },
    emojiContainer: {
        width: 120,
        height: 120,
        borderRadius: theme.borderRadius.round,
        backgroundColor: theme.colors.surface,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.medium,
    },
    mainEmoji: {
        fontSize: 56,
    },
    crackOverlay: {
        position: 'absolute',
        bottom: 10,
        right: 10,
    },
    crackEmoji: {
        fontSize: 24,
    },
    secondaryEmojiContainer: {
        position: 'absolute',
        top: -10,
        right: -10,
        width: 44,
        height: 44,
        borderRadius: theme.borderRadius.xl,
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
        borderRadius: theme.borderRadius.xs,
        opacity: theme.opacity.disabled,
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
