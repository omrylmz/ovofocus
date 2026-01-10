import React, { useCallback } from 'react';
import {
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    Pressable,
    View,
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
}: PixelButtonProps) {
    const scale = useSharedValue(1);
    const translateY = useSharedValue(0);
    const glowOpacity = useSharedValue(0);

    const handlePressIn = useCallback(() => {
        scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
        translateY.value = withSpring(2, { damping: 15, stiffness: 400 });
    }, []);

    const handlePressOut = useCallback(() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 300 });
        translateY.value = withSpring(0, { damping: 12, stiffness: 300 });
    }, []);

    const handlePress = useCallback(() => {
        if (hapticEnabled && !disabled) {
            Haptics.impactAsync(hapticStyle);
        }

        // Play button sound
        audioManager.playSound('button_press');

        // Burst effect
        glowOpacity.value = withSequence(
            withTiming(0.6, { duration: 100 }),
            withTiming(0, { duration: 200 })
        );

        onPress();
    }, [hapticEnabled, hapticStyle, disabled, onPress]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { translateY: translateY.value },
        ],
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
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        borderRadius: theme.borderRadius.lg,
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
