import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Pressable, Text } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
    withTiming,
    useSharedValue,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Theme } from '../styles/theme';
import { useTheme } from '../context/ThemeContext';

interface ScrollToTopButtonProps {
    visible: boolean;
    onPress: () => void;
    hapticsEnabled?: boolean;
    accessibilityLabel?: string;
    accessibilityHint?: string;
}

const createStyles = (theme: Theme) => StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: theme.spacing.xl,
        right: theme.spacing.lg,
        zIndex: theme.zIndex.floating,
        elevation: theme.zIndex.floating,
    },
    button: {
        width: 48,
        height: 48,
        borderRadius: theme.borderRadius.xl,
        backgroundColor: theme.colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.medium,
    },
    icon: {
        fontSize: 20,
        color: theme.colors.background,
    },
});

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ScrollToTopButton({
    visible,
    onPress,
    hapticsEnabled = true,
    accessibilityLabel = 'Scroll to top',
    accessibilityHint = 'Double tap to scroll to the top of the list',
}: ScrollToTopButtonProps) {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    const animatedVisible = useSharedValue(visible ? 1 : 0);
    const scale = useSharedValue(1);

    useEffect(() => {
        animatedVisible.value = withSpring(visible ? 1 : 0, {
            damping: 15,
            stiffness: 200,
        });
    }, [visible, animatedVisible]);

    const containerStyle = useAnimatedStyle(() => {
        const visibilityScale = interpolate(
            animatedVisible.value,
            [0, 1],
            [0.5, 1],
            Extrapolation.CLAMP
        );
        const translateY = interpolate(
            animatedVisible.value,
            [0, 1],
            [20, 0],
            Extrapolation.CLAMP
        );

        return {
            opacity: animatedVisible.value,
            transform: [
                { scale: visibilityScale * scale.value },
                { translateY },
            ],
        };
    });

    const handlePressIn = () => {
        scale.value = withTiming(0.9, { duration: 100 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    };

    const handlePress = () => {
        if (hapticsEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        onPress();
    };

    if (!visible) {
        return null;
    }

    return (
        <Animated.View style={[styles.container, containerStyle]}>
            <AnimatedPressable
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.button}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                accessibilityHint={accessibilityHint}
            >
                <Text style={styles.icon}>↑</Text>
            </AnimatedPressable>
        </Animated.View>
    );
}

export default ScrollToTopButton;
