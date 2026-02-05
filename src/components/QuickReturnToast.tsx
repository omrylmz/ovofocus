import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSequence,
    withTiming,
    withSpring,
    runOnJS,
    Easing,
} from 'react-native-reanimated';
import { theme } from '../styles/theme';
import { Language, t } from '../i18n/translations';
import { audioManager } from '../services/audioManager';

interface QuickReturnToastProps {
    visible: boolean;
    onDismiss: () => void;
    language: Language;
}

export function QuickReturnToast({ visible, onDismiss, language }: QuickReturnToastProps) {
    const translateY = useSharedValue(-100);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.8);
    const sparkleRotation = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            // Play quick return sound
            audioManager.playSound('quick_return');

            // Animate in
            translateY.value = withSpring(0, { damping: 12 });
            opacity.value = withTiming(1, { duration: 200 });
            scale.value = withSequence(
                withSpring(1.1, { damping: 8 }),
                withSpring(1, { damping: 10 })
            );

            // Sparkle animation
            sparkleRotation.value = withSequence(
                withTiming(15, { duration: 100 }),
                withTiming(-15, { duration: 100 }),
                withTiming(10, { duration: 100 }),
                withTiming(-10, { duration: 100 }),
                withTiming(0, { duration: 100 })
            );

            // Auto dismiss after 2.5 seconds
            const timeout = setTimeout(() => {
                translateY.value = withTiming(-100, { duration: 300 });
                opacity.value = withTiming(0, { duration: 300 }, (finished) => {
                    if (finished) {
                        runOnJS(onDismiss)();
                    }
                });
            }, 2500);

            return () => clearTimeout(timeout);
        }
    }, [visible]);

    const containerStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: translateY.value },
            { scale: scale.value },
        ],
        opacity: opacity.value,
    }));

    const sparkleStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${sparkleRotation.value}deg` }],
    }));

    if (!visible) return null;

    return (
        <View style={styles.wrapper}>
            <Animated.View style={[styles.container, containerStyle]}>
                <Animated.Text style={[styles.sparkle, sparkleStyle]}>✨</Animated.Text>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>{t('welcomeBack', language)}</Text>
                    <Text style={styles.subtitle}>{t('quickReturnBonus', language)}</Text>
                </View>
                <Animated.Text style={[styles.sparkle, sparkleStyle]}>✨</Animated.Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        top: 100,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: theme.zIndex.toast,
        elevation: theme.zIndex.toast, // Android elevation
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.success,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderRadius: theme.borderRadius.round,
        ...theme.shadows.large,
    },
    textContainer: {
        marginHorizontal: theme.spacing.sm,
        alignItems: 'center',
    },
    title: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    subtitle: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.text,
        marginTop: 2,
    },
    sparkle: {
        fontSize: 24,
    },
});
