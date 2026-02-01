import React, { useEffect, useMemo } from 'react';
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
import { EggStyle, getDefaultEggStyle, getEggStyleById } from '../data/eggStyles';
import { StyledEgg } from './StyledEgg';
import { useAppStateAnimation } from '../hooks/useAppStateAnimation';
import { useResponsive } from '../hooks/useResponsive';

interface EggProps {
    sessionState: SessionState;
    progress?: number; // 0 to 1
    language?: Language;
    warningLevel?: WarningLevel; // 0=none, 1=50%, 2=75%, 3=100%
    eggStyleId?: string; // ID of the selected egg style
}

const WARNING_COLORS = {
    0: theme.colors.accent,
    1: '#FFD93D', // Yellow
    2: '#FF8C00', // Orange
    3: '#FF4444', // Red
};

export function Egg({ sessionState, progress = 0, language = 'en', warningLevel = 0, eggStyleId }: EggProps) {
    // Track app state for animation pausing (battery optimization)
    const isAppActive = useAppStateAnimation();

    // Get responsive sizing
    const { eggSize } = useResponsive();

    // Calculate derived sizes proportionally
    // The egg should be prominent, glow should be subtle backdrop
    const styledEggSize = Math.round(eggSize * 0.85); // Egg is the main element
    const glowSize = Math.round(styledEggSize * 1.3); // Glow slightly larger than egg
    const innerGlowSize = Math.round(styledEggSize * 0.9);
    const sparkleContainerSize = Math.round(styledEggSize * 1.1);
    const warningGlowSize = Math.round(styledEggSize * 1.4);
    // Container just fits the egg - text is handled by parent (InteractiveEgg)
    const containerHeight = Math.round(styledEggSize * 1.25);

    // Get the current egg style
    const currentEggStyle = useMemo(() => {
        if (eggStyleId) {
            const foundStyle = getEggStyleById(eggStyleId);
            if (!foundStyle) {
                console.warn(`[Egg] Invalid egg style ID: "${eggStyleId}". Falling back to default style.`);
                return getDefaultEggStyle();
            }
            return foundStyle;
        }
        return getDefaultEggStyle();
    }, [eggStyleId]);

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
    // Pauses when app is backgrounded to save battery
    useEffect(() => {
        if (sessionState === 'idle') {
            if (isAppActive) {
                // Start/resume idle animations
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
            } else {
                // Pause idle animations when backgrounded
                cancelAnimation(wobble);
                cancelAnimation(scale);
            }
            // Reset values
            glowOpacity.value = withTiming(0, { duration: 300 });
            crackLevel.value = withTiming(0, { duration: 300 });
            colorProgress.value = withTiming(0, { duration: 300 });

            // Cleanup: cancel infinite animations when unmounting or state changes
            return () => {
                cancelAnimation(wobble);
                cancelAnimation(scale);
            };
        }
    }, [sessionState, isAppActive, wobble, scale, glowOpacity, crackLevel, colorProgress]);

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

            // Cleanup: cancel all infinite animations when unmounting or state changes
            return () => {
                cancelAnimation(wobble);
                cancelAnimation(pulseValue);
                cancelAnimation(glowScale);
                cancelAnimation(sparkleRotation);
            };
        }
    }, [sessionState, progress, wobble, pulseValue, glowOpacity, glowScale, sparkleRotation, colorProgress, crackLevel]);

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
    }, [warningLevel, sessionState, anxiousShake, warningPulse]);

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
    }, [sessionState, wobble, scale, pulseValue, opacity, glowOpacity, glowScale]);

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
    }, [sessionState, wobble, scale, pulseValue, opacity, crackLevel, colorProgress]);

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

    // Accessibility: Get status text for screen readers
    const getStatusText = () => {
        if (sessionState === 'failed') return t('eggBroken', language);
        if (sessionState === 'active') {
            if (progress < 0.25) return t('focus', language);
            if (progress < 0.5) return t('keepGoing', language);
            if (progress < 0.75) return t('doingGreat', language);
            return t('almostThere', language);
        }
        return '';
    };

    return (
        <View
            style={[styles.container, { height: containerHeight }]}
            accessible={true}
            accessibilityRole="image"
            accessibilityLabel={
                sessionState === 'failed'
                    ? (language === 'tr' ? 'Kırık yumurta' : 'Broken egg')
                    : sessionState === 'completed'
                    ? (language === 'tr' ? 'Çatlayan yumurta' : 'Hatching egg')
                    : (language === 'tr' ? 'Odaklanma yumurtası' : 'Focus egg')
            }
            accessibilityState={{
                busy: sessionState === 'active',
            }}
        >
            {/* Outer glow effect - only visible during active session with progress */}
            {sessionState === 'active' && progress > 0.1 && (
                <Animated.View
                    style={[
                        styles.glow,
                        glowStyle,
                        {
                            width: glowSize,
                            height: glowSize,
                            borderRadius: glowSize / 2,
                            backgroundColor: currentEggStyle.primaryColor
                        }
                    ]}
                    importantForAccessibility="no"
                    pointerEvents="none"
                />
            )}

            {/* Warning glow overlay */}
            {warningLevel > 0 && (
                <Animated.View
                    style={[
                        styles.warningGlow,
                        warningGlowStyle,
                        {
                            width: warningGlowSize,
                            height: warningGlowSize,
                            borderRadius: warningGlowSize / 2,
                            backgroundColor: WARNING_COLORS[warningLevel]
                        }
                    ]}
                    importantForAccessibility="no"
                    pointerEvents="none"
                />
            )}

            {/* Rotating sparkles */}
            {sessionState === 'active' && progress > 0.3 && (
                <Animated.View
                    style={[
                        styles.sparkleContainer,
                        sparkleStyle,
                        { width: sparkleContainerSize, height: sparkleContainerSize }
                    ]}
                    importantForAccessibility="no"
                    pointerEvents="none"
                >
                    <Text style={[styles.sparkle, { color: currentEggStyle.primaryColor }]}>✦</Text>
                    <Text style={[styles.sparkle, styles.sparkle2, { color: currentEggStyle.primaryColor }]}>✦</Text>
                    <Text style={[styles.sparkle, styles.sparkle3, { color: currentEggStyle.primaryColor }]}>✦</Text>
                    <Text style={[styles.sparkle, styles.sparkle4, { color: currentEggStyle.primaryColor }]}>✦</Text>
                </Animated.View>
            )}

            {/* Inner glow - only during active session */}
            {sessionState === 'active' && (
                <Animated.View
                    style={[
                        styles.innerGlow,
                        innerGlowStyle,
                        {
                            width: innerGlowSize,
                            height: innerGlowSize,
                            borderRadius: innerGlowSize / 2,
                            backgroundColor: currentEggStyle.primaryColor
                        }
                    ]}
                    importantForAccessibility="no"
                    pointerEvents="none"
                />
            )}

            {/* Egg */}
            <Animated.View style={[styles.eggContainer, animatedStyle]} importantForAccessibility="no">
                {/* Styled SVG Egg - only show when not broken or hatching */}
                {sessionState !== 'failed' && sessionState !== 'completed' && (
                    <StyledEgg
                        eggStyle={currentEggStyle}
                        size={styledEggSize}
                        showPattern={true}
                        glowColor={currentEggStyle.primaryColor}
                        glowIntensity={progress * 0.5}
                    />
                )}
                {/* Show emoji for special states */}
                {(sessionState === 'failed' || sessionState === 'completed') && (
                    <Text style={styles.egg} allowFontScaling={false}>{getCrackEmoji()}</Text>
                )}

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
                <Animated.Text
                    style={styles.failedText}
                    accessible={true}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="assertive"
                >
                    {t('eggBroken', language)}
                </Animated.Text>
            )}

            {/* Progress text removed - InteractiveEgg handles encouragement messages */}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        // Note: overflow is NOT set to 'hidden' to allow glow effects to extend naturally
        // The parent container (eggSection in index.tsx) handles clipping if needed
        // height is now dynamic
    },
    glow: {
        position: 'absolute',
        // width, height, borderRadius are now dynamic
    },
    innerGlow: {
        position: 'absolute',
        // width, height, borderRadius are now dynamic
    },
    sparkleContainer: {
        position: 'absolute',
        // width, height are now dynamic
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
        // No margin - egg should be centered with the glow circle behind it
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
    failedText: {
        marginTop: theme.spacing.sm,
        fontSize: theme.fontSize.lg,
        color: theme.colors.error,
        fontWeight: theme.fontWeight.bold,
    },
    warningGlow: {
        position: 'absolute',
        // width, height, borderRadius are now dynamic
    },
});
