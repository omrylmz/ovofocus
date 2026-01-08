import React, { useCallback } from 'react';
import {
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../styles/theme';

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
    const handlePress = useCallback(() => {
        if (hapticEnabled && !disabled) {
            Haptics.impactAsync(hapticStyle);
        }
        onPress();
    }, [hapticEnabled, hapticStyle, disabled, onPress]);
    const getVariantStyles = () => {
        switch (variant) {
            case 'primary':
                return {
                    container: styles.primaryContainer,
                    text: styles.primaryText,
                };
            case 'secondary':
                return {
                    container: styles.secondaryContainer,
                    text: styles.secondaryText,
                };
            case 'danger':
                return {
                    container: styles.dangerContainer,
                    text: styles.dangerText,
                };
            case 'ghost':
                return {
                    container: styles.ghostContainer,
                    text: styles.ghostText,
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
        <Pressable
            onPress={handlePress}
            disabled={disabled}
            style={({ pressed }) => [
                styles.container,
                variantStyles.container,
                sizeStyles.container,
                disabled && styles.disabled,
                pressed && styles.pressed,
                style,
            ]}
        >
            <Text style={[styles.text, variantStyles.text, sizeStyles.text, disabled && styles.disabledText, textStyle]}>
                {icon ? `${icon} ${title}` : title}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.small,
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
    pressed: {
        opacity: 0.9,
        transform: [{ scale: 0.95 }, { translateY: 2 }],
    },
});
