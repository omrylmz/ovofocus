import React, { useCallback } from 'react';
import {
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    Pressable,
    View,
    AccessibilityRole,
    AccessibilityState,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '../styles/theme';
import { audioManager } from '../services/audioManager';

interface PixelButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    icon?: string;
    hapticEnabled?: boolean;
    hapticStyle?: Haptics.ImpactFeedbackStyle;
    accessibilityLabel?: string;
    accessibilityHint?: string;
    accessibilityRole?: AccessibilityRole;
    accessibilityState?: AccessibilityState;
    /** When true, button has more prominent press feedback (deeper scale, stronger haptic) */
    prominent?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PixelButton({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    style,
    textStyle,
    icon,
    hapticEnabled = true,
    hapticStyle = Haptics.ImpactFeedbackStyle.Light,
    accessibilityLabel,
    accessibilityHint,
    accessibilityRole,
    accessibilityState,
    prominent = false,
}: PixelButtonProps) {
    const scale = useSharedValue(1);
    const translateY = useSharedValue(0);
    const glowOpacity = useSharedValue(0);
    const pressOpacity = useSharedValue(1);

    // Spring config for snappy feel
    const springConfig = { damping: 15, stiffness: 400 };
    const releaseSpringConfig = { damping: 12, stiffness: 300 };

    // Prominent buttons have deeper scale and translateY for more impactful feedback
    const pressScale = prominent ? 0.92 : 0.95;
    const pressTranslateY = prominent ? 3 : 2;
    const pressOpacityValue = prominent ? 0.75 : 0.85;

    const handlePressIn = useCallback(() => {
        // Skip animations for disabled buttons
        if (disabled) return;

        scale.value = withSpring(pressScale, springConfig);
        translateY.value = withSpring(pressTranslateY, springConfig);
        pressOpacity.value = withTiming(pressOpacityValue, { duration: 50 });
    }, [scale, translateY, pressOpacity, disabled, pressScale, pressTranslateY, pressOpacityValue]);

    const handlePressOut = useCallback(() => {
        // Skip animations for disabled buttons
        if (disabled) return;

        scale.value = withSpring(1, releaseSpringConfig);
        translateY.value = withSpring(0, releaseSpringConfig);
        pressOpacity.value = withTiming(1, { duration: 100 });
    }, [scale, translateY, pressOpacity, disabled]);

    const handlePress = useCallback(() => {
        if (disabled) return;

        if (hapticEnabled) {
            // Prominent buttons use medium haptic for stronger feedback
            const effectiveHapticStyle = prominent
                ? Haptics.ImpactFeedbackStyle.Medium
                : hapticStyle;
            Haptics.impactAsync(effectiveHapticStyle);
        }

        // Play button sound
        audioManager.playSound('button_press');

        // Burst effect - more prominent for prominent buttons
        const glowIntensity = prominent ? 0.8 : 0.6;
        glowOpacity.value = withSequence(
            withTiming(glowIntensity, { duration: 100 }),
            withTiming(0, { duration: 200 })
        );

        onPress();
    }, [hapticEnabled, hapticStyle, disabled, onPress, glowOpacity, prominent]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { translateY: translateY.value },
        ],
        opacity: pressOpacity.value,
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    const getVariantStyles = () => {
        switch (variant) {
            case 'primary':
                return {
                    container: styles.primaryContainer,
                    text: styles.primaryText,
                    glow: theme.colors.primary,
                };
            case 'secondary':
                return {
                    container: styles.secondaryContainer,
                    text: styles.secondaryText,
                    glow: theme.colors.secondary,
                };
            case 'danger':
                return {
                    container: styles.dangerContainer,
                    text: styles.dangerText,
                    glow: theme.colors.error,
                };
            case 'ghost':
                return {
                    container: styles.ghostContainer,
                    text: styles.ghostText,
                    glow: theme.colors.textSecondary,
                };
        }
    };

    const getSizeStyles = () => {
        switch (size) {
            case 'small':
                return {
                    container: styles.smallContainer,
                    text: styles.smallText,
                };
            case 'medium':
                return {
                    container: styles.mediumContainer,
                    text: styles.mediumText,
                };
            case 'large':
                return {
                    container: styles.largeContainer,
                    text: styles.largeText,
                };
        }
    };

    const variantStyles = getVariantStyles();
    const sizeStyles = getSizeStyles();

    return (
        <View style={styles.wrapper}>
            {/* Glow effect */}
            <Animated.View
                style={[
                    styles.glow,
                    glowStyle,
                    { backgroundColor: variantStyles.glow }
                ]}
            />
            <AnimatedPressable
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled}
                accessible={true}
                accessibilityRole={accessibilityRole || "button"}
                accessibilityLabel={accessibilityLabel || title}
                accessibilityHint={accessibilityHint}
                accessibilityState={accessibilityState ? { ...accessibilityState, disabled } : { disabled }}
                style={[
                    styles.container,
                    variantStyles.container,
                    sizeStyles.container,
                    disabled && styles.disabled,
                    animatedStyle,
                    style,
                ]}
            >
                <Text style={[styles.text, variantStyles.text, sizeStyles.text, disabled && styles.disabledText, textStyle]}>
                    {icon ? `${icon} ${title}` : title}
                </Text>
            </AnimatedPressable>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.small,
    },
    glow: {
        position: 'absolute',
        top: -2,
        left: -2,
        right: -2,
        bottom: -2,
        borderRadius: theme.borderRadius.lg,
        zIndex: -1,
    },
    text: {
        fontWeight: theme.fontWeight.bold,
    },

    // Variants
    primaryContainer: {
        backgroundColor: theme.colors.primary,
    },
    primaryText: {
        color: '#FFFFFF',
    },
    secondaryContainer: {
        backgroundColor: theme.colors.secondary,
    },
    secondaryText: {
        color: '#FFFFFF',
    },
    dangerContainer: {
        backgroundColor: theme.colors.error,
    },
    dangerText: {
        color: '#FFFFFF',
    },
    ghostContainer: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: theme.colors.textSecondary,
    },
    ghostText: {
        color: theme.colors.textSecondary,
    },

    // Sizes
    smallContainer: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
    smallText: {
        fontSize: theme.fontSize.sm,
    },
    mediumContainer: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
    },
    mediumText: {
        fontSize: theme.fontSize.md,
    },
    largeContainer: {
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.lg,
    },
    largeText: {
        fontSize: theme.fontSize.lg,
    },

    // States
    disabled: {
        opacity: 0.5,
    },
    disabledText: {
        opacity: 0.8,
    },
});
