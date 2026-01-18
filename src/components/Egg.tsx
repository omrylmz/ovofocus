import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withSpring,
    withDelay,
    Easing,
    cancelAnimation,
} from 'react-native-reanimated';
import { theme } from '../styles/theme';
import { SessionState } from '../context/GameContext';
import { Language, t } from '../i18n/translations';
import { WarningLevel } from '../hooks/useToleranceSystem';

interface EggProps {
    sessionState: SessionState;
    progress?: number; // 0 to 1
    language?: Language;
    warningLevel?: WarningLevel; // 0=none, 1=50%, 2=75%, 3=100%
}

const WARNING_COLORS = {
    0: theme.colors.accent,
    1: '#FFD93D', // Yellow
    2: '#FF8C00', // Orange
    3: '#FF4444', // Red
};

export function Egg({ sessionState, progress = 0, language = 'en', warningLevel = 0 }: EggProps) {
    // Stable initial values - prevents blank flash on Android
    const wobble = useSharedValue(0);
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);
    const crackLevel = useSharedValue(0);
    const glowOpacity = useSharedValue(0);
    const glowScale = useSharedValue(1);
    const pulseValue = useSharedValue(0);
    const sparkleRotation = useSharedValue(0);
    const colorProgress = useSharedValue(0);
    const warningPulse = useSharedValue(0);
    const anxiousShake = useSharedValue(0);

    // Idle animation - gentle wobble with breathing effect
    useEffect(() => {
        if (sessionState === 'idle') {
            wobble.value = withRepeat(
                withSequence(
                    withTiming(-3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                    withTiming(3, { duration: 1000, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );
            scale.value = withRepeat(
                withSequence(
                    withTiming(1.02, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0.98, { duration: 1500, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );
            // Reset values
            glowOpacity.value = withTiming(0, { duration: 300 });
            crackLevel.value = withTiming(0, { duration: 300 });
            colorProgress.value = withTiming(0, { duration: 300 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- Reanimated shared values are stable refs that don't need to be dependencies
    }, [sessionState]);

    // Active session - more wobble as progress increases with pulse effect
    useEffect(() => {
        if (sessionState === 'active') {
            const intensity = 2 + progress * 10;
            const speed = Math.max(200, 800 - progress * 600);

            // Wobble animation - intensifies with progress
            wobble.value = withRepeat(
                withSequence(
                    withTiming(-intensity, { duration: speed, easing: Easing.inOut(Easing.ease) }),
                    withTiming(intensity, { duration: speed, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );

            // Pulse effect - heartbeat-like pulsing
            const pulseSpeed = Math.max(400, 1000 - progress * 600);
            pulseValue.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: pulseSpeed * 0.3, easing: Easing.out(Easing.ease) }),
                    withTiming(0, { duration: pulseSpeed * 0.7, easing: Easing.in(Easing.ease) })
                ),
                -1,
                false
            );

            // Glow effect - increases with progress
            glowOpacity.value = withTiming(progress * 0.8, { duration: 500 });
            glowScale.value = withRepeat(
                withSequence(
                    withTiming(1.1, { duration: 1000 }),
                    withTiming(1, { duration: 1000 })
                ),
                -1,
                true
            );

            // Sparkle rotation
            sparkleRotation.value = withRepeat(
                withTiming(360, { duration: 3000, easing: Easing.linear }),
                -1,
                false
            );

            // Color transition (egg gets warmer/more golden as it progresses)
            colorProgress.value = withTiming(progress, { duration: 500 });

            // Crack level increases with progress
            crackLevel.value = withTiming(Math.floor(progress * 4), { duration: 300 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- Reanimated shared values are stable refs that don't need to be dependencies
    }, [sessionState, progress]);

    // Warning level animations - urgent feedback when backgrounded too long
    useEffect(() => {
        if (warningLevel > 0 && sessionState === 'active') {
            // Anxious shake intensity based on warning level
            const shakeIntensity = warningLevel * 4;
            const shakeSpeed = 150 - warningLevel * 30;

            anxiousShake.value = withRepeat(
                withSequence(
                    withTiming(shakeIntensity, { duration: shakeSpeed }),
                    withTiming(-shakeIntensity, { duration: shakeSpeed })
                ),
                -1,
                true
            );

            // Warning pulse for glow
            const pulseSpeed = 500 - warningLevel * 100;
            warningPulse.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: pulseSpeed }),
                    withTiming(0.3, { duration: pulseSpeed })
                ),
                -1,
                true
            );
        } else {
            cancelAnimation(anxiousShake);
            cancelAnimation(warningPulse);
            anxiousShake.value = withTiming(0, { duration: 200 });
            warningPulse.value = withTiming(0, { duration: 200 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- Reanimated shared values are stable refs that don't need to be dependencies
    }, [warningLevel, sessionState]);

    // Hatching animation - dramatic climax
    useEffect(() => {
        if (sessionState === 'completed') {
            cancelAnimation(wobble);
            cancelAnimation(scale);
            cancelAnimation(pulseValue);

            // Intense shaking with increasing speed
            wobble.value = withRepeat(
                withSequence(
                    withTiming(-20, { duration: 40 }),
                    withTiming(20, { duration: 40 })
                ),
                8,
                true
            );

            // Dramatic burst scale
            scale.value = withSequence(
                withTiming(1.1, { duration: 100 }),
                withTiming(1.4, { duration: 200 }),
                withSpring(0, { damping: 15 })
            );

            // Fade out with explosion effect
            opacity.value = withDelay(300, withTiming(0, { duration: 400 }));

            // Full glow burst
            glowOpacity.value = withSequence(
                withTiming(1, { duration: 150 }),
                withDelay(200, withTiming(0, { duration: 300 }))
            );
            glowScale.value = withSequence(
                withTiming(1.5, { duration: 300 }),
                withTiming(2, { duration: 200 })
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- Reanimated shared values are stable refs that don't need to be dependencies
    }, [sessionState]);

    // Breaking animation (failed session)
    useEffect(() => {
        if (sessionState === 'failed') {
            cancelAnimation(wobble);
            cancelAnimation(scale);
            cancelAnimation(pulseValue);

            // Sad shake
            wobble.value = withSequence(
                withTiming(-25, { duration: 80 }),
                withTiming(25, { duration: 80 }),
                withTiming(-15, { duration: 80 }),
                withTiming(15, { duration: 80 }),
                withTiming(-5, { duration: 80 }),
                withTiming(0, { duration: 80 })
            );

            // Shrink and drop
            scale.value = withSequence(
                withTiming(1.15, { duration: 150 }),
                withTiming(0.75, { duration: 400, easing: Easing.in(Easing.bounce) })
            );

            opacity.value = withTiming(0.3, { duration: 600 });

            // Crack fully
            crackLevel.value = withTiming(4, { duration: 150 });

            // Red tint
            colorProgress.value = withTiming(-1, { duration: 300 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- Reanimated shared values are stable refs that don't need to be dependencies
    }, [sessionState]);

    const animatedStyle = useAnimatedStyle(() => {
        // Ensure minimum opacity of 0.01 to prevent complete invisibility issues on Android
        const safeOpacity = Math.max(0.01, opacity.value);
        // Ensure scale is always positive and non-zero
        const safeScale = Math.max(0.1, scale.value * (1 + pulseValue.value * 0.05));

        return {
            transform: [
                { rotate: `${wobble.value + anxiousShake.value}deg` },
                { scale: safeScale },
            ],
            opacity: safeOpacity,
        };
    });

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
        transform: [{ scale: glowScale.value }],
    }));

    const sparkleStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${sparkleRotation.value}deg` }],
        opacity: glowOpacity.value * 0.8,
    }));

    const innerGlowStyle = useAnimatedStyle(() => ({
        opacity: pulseValue.value * 0.5 + colorProgress.value * 0.3,
    }));

    const warningGlowStyle = useAnimatedStyle(() => ({
        opacity: warningPulse.value * 0.8,
    }));

    const getCrackEmoji = () => {
        if (sessionState === 'failed') return '💔';
        const level = Math.floor(progress * 4);
        if (level >= 3) return '🐣'; // About to hatch!
        if (level >= 2) return '🥚'; // More cracks
        return '🥚'; // Egg
    };

    const getProgressEmoji = () => {
        if (progress >= 0.9) return '✨💫✨';
        if (progress >= 0.75) return '✨';
        if (progress >= 0.5) return '💫';
        if (progress >= 0.3) return '⭐';
        return '';
    };

    return (
        <View style={styles.container}>
            {/* Outer glow effect */}
            <Animated.View style={[styles.glow, glowStyle]} />

            {/* Warning glow overlay */}
            {warningLevel > 0 && (
                <Animated.View
                    style={[
                        styles.warningGlow,
                        warningGlowStyle,
                        { backgroundColor: WARNING_COLORS[warningLevel] }
                    ]}
                />
            )}

            {/* Rotating sparkles */}
            {sessionState === 'active' && progress > 0.3 && (
                <Animated.View style={[styles.sparkleContainer, sparkleStyle]}>
                    <Text style={styles.sparkle}>✦</Text>
                    <Text style={[styles.sparkle, styles.sparkle2]}>✦</Text>
                    <Text style={[styles.sparkle, styles.sparkle3]}>✦</Text>
                    <Text style={[styles.sparkle, styles.sparkle4]}>✦</Text>
                </Animated.View>
            )}

            {/* Inner glow */}
            <Animated.View style={[styles.innerGlow, innerGlowStyle]} />

            {/* Egg */}
            <Animated.View style={[styles.eggContainer, animatedStyle]}>
                <Text style={styles.egg} allowFontScaling={false}>{getCrackEmoji()}</Text>

                {/* Progress sparkle overlay */}
                {sessionState === 'active' && progress > 0.25 && (
                    <View style={styles.crackOverlay}>
                        <Text style={styles.crackText}>
                            {getProgressEmoji()}
                        </Text>
                    </View>
                )}
            </Animated.View>

            {/* Status text */}
            {sessionState === 'failed' && (
                <Animated.Text style={styles.failedText}>{t('eggBroken', language)}</Animated.Text>
            )}

            {sessionState === 'active' && (
                <Text style={styles.progressText}>
                    {progress < 0.25 && t('focus', language)}
                    {progress >= 0.25 && progress < 0.5 && t('keepGoing', language)}
                    {progress >= 0.5 && progress < 0.75 && t('doingGreat', language)}
                    {progress >= 0.75 && t('almostThere', language)}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 300,
    },
    glow: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: theme.colors.accent,
    },
    innerGlow: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: theme.colors.accent,
    },
    sparkleContainer: {
        position: 'absolute',
        width: 200,
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sparkle: {
        position: 'absolute',
        fontSize: 20,
        color: theme.colors.accent,
        top: 0,
    },
    sparkle2: {
        top: undefined,
        bottom: 0,
    },
    sparkle3: {
        top: undefined,
        left: 0,
        bottom: undefined,
    },
    sparkle4: {
        top: undefined,
        right: 0,
        left: undefined,
        bottom: undefined,
    },
    eggContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: theme.spacing.md,
    },
    egg: {
        fontSize: 70,
        color: theme.colors.accent,
    },
    crackOverlay: {
        position: 'absolute',
        top: -15,
        right: -15,
    },
    crackText: {
        fontSize: 36,
    },
    progressText: {
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        fontSize: theme.fontSize.md,
        color: theme.colors.accent,
        fontWeight: theme.fontWeight.medium,
    },
    failedText: {
        marginTop: theme.spacing.md,
        fontSize: theme.fontSize.lg,
        color: theme.colors.error,
        fontWeight: theme.fontWeight.bold,
    },
    warningGlow: {
        position: 'absolute',
        width: 250,
        height: 250,
        borderRadius: 125,
    },
});
