import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    withSpring,
    Easing,
    cancelAnimation,
    runOnJS,
} from 'react-native-reanimated';
import { theme } from '../styles/theme';
import { SessionState } from '../context/GameContext';
import { Language, t } from '../i18n/translations';

interface EggProps {
    sessionState: SessionState;
    progress?: number; // 0 to 1
    onHatchComplete?: () => void;
    language?: Language;
}

export function Egg({ sessionState, progress = 0, onHatchComplete, language = 'en' }: EggProps) {
    const wobble = useSharedValue(0);
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);
    const crackLevel = useSharedValue(0);
    const glowOpacity = useSharedValue(0);

    // Idle animation - gentle wobble
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
        }
    }, [sessionState]);

    // Active session - more wobble as progress increases
    useEffect(() => {
        if (sessionState === 'active') {
            const intensity = 2 + progress * 8;
            const speed = 800 - progress * 400;

            wobble.value = withRepeat(
                withSequence(
                    withTiming(-intensity, { duration: speed, easing: Easing.inOut(Easing.ease) }),
                    withTiming(intensity, { duration: speed, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );

            // Glow effect increases with progress
            glowOpacity.value = withTiming(progress * 0.6, { duration: 500 });

            // Crack level increases with progress
            crackLevel.value = withTiming(Math.floor(progress * 3), { duration: 300 });
        }
    }, [sessionState, progress]);

    // Hatching animation
    useEffect(() => {
        if (sessionState === 'completed') {
            cancelAnimation(wobble);
            cancelAnimation(scale);

            // Intense shaking
            wobble.value = withRepeat(
                withSequence(
                    withTiming(-15, { duration: 50 }),
                    withTiming(15, { duration: 50 })
                ),
                6,
                true
            );

            // Burst scale
            scale.value = withSequence(
                withTiming(1.3, { duration: 300 }),
                withSpring(0, { damping: 15 })
            );

            // Fade out
            opacity.value = withTiming(0, { duration: 500 }, (finished) => {
                if (finished && onHatchComplete) {
                    runOnJS(onHatchComplete)();
                }
            });

            // Full glow
            glowOpacity.value = withSequence(
                withTiming(1, { duration: 200 }),
                withTiming(0, { duration: 300 })
            );
        }
    }, [sessionState]);

    // Breaking animation (failed session)
    useEffect(() => {
        if (sessionState === 'failed') {
            cancelAnimation(wobble);
            cancelAnimation(scale);

            // Sad shake
            wobble.value = withSequence(
                withTiming(-20, { duration: 100 }),
                withTiming(20, { duration: 100 }),
                withTiming(-10, { duration: 100 }),
                withTiming(10, { duration: 100 }),
                withTiming(0, { duration: 100 })
            );

            // Shrink and fade
            scale.value = withSequence(
                withTiming(1.1, { duration: 200 }),
                withTiming(0.8, { duration: 300 })
            );

            opacity.value = withTiming(0.3, { duration: 500 });

            // Crack fully
            crackLevel.value = withTiming(3, { duration: 200 });
        }
    }, [sessionState]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { rotate: `${wobble.value}deg` },
            { scale: scale.value },
        ],
        opacity: opacity.value,
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    const getCrackEmoji = () => {
        if (sessionState === 'failed') return '💔';
        if (crackLevel.value >= 2) return '🥚';
        return '🥚';
    };

    return (
        <View style={styles.container}>
            {/* Glow effect */}
            <Animated.View style={[styles.glow, glowStyle]} />

            {/* Egg */}
            <Animated.View style={[styles.eggContainer, animatedStyle]}>
                <Text style={styles.egg}>{getCrackEmoji()}</Text>

                {/* Crack overlay for progress */}
                {sessionState === 'active' && progress > 0.3 && (
                    <View style={styles.crackOverlay}>
                        <Text style={styles.crackText}>
                            {progress > 0.8 ? '✨' : progress > 0.5 ? '💫' : ''}
                        </Text>
                    </View>
                )}
            </Animated.View>

            {/* Status text */}
            {sessionState === 'failed' && (
                <Text style={styles.failedText}>{t('eggBroken', language)}</Text>
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
        height: 250,
    },
    glow: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: theme.colors.accent,
    },
    eggContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    egg: {
        fontSize: 120,
    },
    crackOverlay: {
        position: 'absolute',
        top: -10,
        right: -10,
    },
    crackText: {
        fontSize: 32,
    },
    progressText: {
        marginTop: theme.spacing.md,
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
});
