import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withDelay,
    withTiming,
    withRepeat,
    Easing,
    runOnJS,
    cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '../styles/theme';
import { Language, t } from '../i18n/translations';
import { audioManager } from '../services/audioManager';

interface StreakCelebrationProps {
    visible: boolean;
    streakCount: number;
    onComplete: () => void;
    language?: Language;
}

// Fire particle component
function FireParticle({ delay, startX, size }: { delay: number; startX: number; size: number }) {
    const translateY = useSharedValue(0);
    const translateX = useSharedValue(startX);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(1);

     
    useEffect(() => {
        opacity.value = withDelay(delay, withSequence(
            withTiming(1, { duration: 150 }),
            withDelay(800, withTiming(0, { duration: 400 }))
        ));
        translateY.value = withDelay(delay, withTiming(-200 - Math.random() * 100, {
            duration: 1200,
            easing: Easing.out(Easing.quad)
        }));
        translateX.value = withDelay(delay, withSequence(
            withTiming(startX + (Math.random() - 0.5) * 60, { duration: 600 }),
            withTiming(startX + (Math.random() - 0.5) * 80, { duration: 600 })
        ));
        scale.value = withDelay(delay, withSequence(
            withSpring(1.3),
            withDelay(600, withTiming(0.3, { duration: 400 }))
        ));
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [
            { translateY: translateY.value },
            { translateX: translateX.value },
            { scale: scale.value },
        ],
        opacity: opacity.value,
    }));

    return (
        <Animated.Text style={[styles.fireParticle, { fontSize: size }, style]}>
            🔥
        </Animated.Text>
    );
}

export function StreakCelebration({
    visible,
    streakCount,
    onComplete,
    language = 'en'
}: StreakCelebrationProps) {
    const backgroundOpacity = useSharedValue(0);
    const iconScale = useSharedValue(0);
    const iconRotation = useSharedValue(0);
    const textOpacity = useSharedValue(0);
    const textTranslateY = useSharedValue(30);
    const numberScale = useSharedValue(0);
    const numberRotation = useSharedValue(-10);
    const pulseScale = useSharedValue(1);

    useEffect(() => {
        if (visible) {
            // Play streak celebration sound
            audioManager.playSound('streak_increase');

            // Haptic celebration
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 150);
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 300);

            // Background fade
            backgroundOpacity.value = withTiming(1, { duration: 300 });

            // Trophy/fire icon entrance
            iconScale.value = withSequence(
                withDelay(200, withSpring(1.4, { damping: 6, stiffness: 180 })),
                withSpring(1, { damping: 10 })
            );
            iconRotation.value = withSequence(
                withDelay(200, withTiming(-15, { duration: 100 })),
                withTiming(15, { duration: 100 }),
                withTiming(-10, { duration: 80 }),
                withTiming(10, { duration: 80 }),
                withTiming(0, { duration: 80 })
            );

            // Pulse animation
            pulseScale.value = withDelay(500, withRepeat(
                withSequence(
                    withTiming(1.1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            ));

            // Text entrance
            textOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
            textTranslateY.value = withDelay(400, withSpring(0, { damping: 12 }));

            // Number pop
            numberScale.value = withDelay(600, withSpring(1, { damping: 5, stiffness: 200 }));
            numberRotation.value = withDelay(600, withSpring(0, { damping: 8 }));

            // Auto-dismiss after 3 seconds
            const timer = setTimeout(() => {
                backgroundOpacity.value = withTiming(0, { duration: 300 }, () => {
                    runOnJS(onComplete)();
                });
            }, 3000);

            return () => {
                clearTimeout(timer);
                cancelAnimation(pulseScale);
            };
        } else {
            // Cancel infinite animations to prevent memory leaks
            cancelAnimation(pulseScale);

            // Reset values
            backgroundOpacity.value = 0;
            iconScale.value = 0;
            iconRotation.value = 0;
            textOpacity.value = 0;
            textTranslateY.value = 30;
            numberScale.value = 0;
            numberRotation.value = -10;
            pulseScale.value = 1;
        }
    }, [visible]);

    const backgroundStyle = useAnimatedStyle(() => ({
        opacity: backgroundOpacity.value,
    }));

    const iconStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: iconScale.value * pulseScale.value },
            { rotate: `${iconRotation.value}deg` },
        ],
    }));

    const textStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
        transform: [{ translateY: textTranslateY.value }],
    }));

    const numberStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: numberScale.value },
            { rotate: `${numberRotation.value}deg` },
        ],
    }));

    // Generate fire particles
    const fireParticles = Array.from({ length: 12 }, (_, i) => ({
        delay: i * 80,
        startX: (i % 6 - 2.5) * 30,
        size: 24 + Math.random() * 16,
    }));

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none">
            <Animated.View style={[styles.overlay, backgroundStyle]}>
                <View style={styles.container}>
                    {/* Fire particles */}
                    <View style={styles.particlesContainer}>
                        {fireParticles.map((particle, i) => (
                            <FireParticle
                                key={i}
                                delay={particle.delay}
                                startX={particle.startX}
                                size={particle.size}
                            />
                        ))}
                    </View>

                    {/* Main icon */}
                    <Animated.Text style={[styles.icon, iconStyle]}>
                        🏆
                    </Animated.Text>

                    {/* "New Best Streak!" text */}
                    <Animated.Text style={[styles.title, textStyle]}>
                        {t('newBestStreak', language)}
                    </Animated.Text>

                    {/* Streak number */}
                    <Animated.View style={[styles.numberContainer, numberStyle]}>
                        <Text style={styles.number}>{streakCount}</Text>
                        <Text style={styles.numberLabel}>{t('sessions', language)}</Text>
                    </Animated.View>

                    {/* Subtitle */}
                    <Animated.Text style={[styles.subtitle, textStyle]}>
                        {t('keepItUp', language)}
                    </Animated.Text>
                </View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: theme.colors.semantic.overlayUltra,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    particlesContainer: {
        position: 'absolute',
        top: '40%',
        alignItems: 'center',
        zIndex: 0, // Particles behind content
        elevation: 0,
        pointerEvents: 'none',
    },
    fireParticle: {
        position: 'absolute',
    },
    icon: {
        fontSize: 80,
        marginBottom: theme.spacing.lg,
        zIndex: 1, // Icon above particles
        elevation: 1,
    },
    title: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.accent,
        marginBottom: theme.spacing.md,
        textAlign: 'center',
        zIndex: 2, // Title above icon
        elevation: 2,
    },
    numberContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        zIndex: 3, // Number above title
        elevation: 3,
    },
    number: {
        fontSize: 72,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.primary,
        textShadowColor: 'rgba(255, 107, 107, 0.5)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
    },
    numberLabel: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.textSecondary,
        marginTop: -theme.spacing.sm,
    },
    subtitle: {
        fontSize: theme.fontSize.lg,
        color: theme.colors.text,
        textAlign: 'center',
        zIndex: 4, // Subtitle above all
        elevation: 4,
    },
});
