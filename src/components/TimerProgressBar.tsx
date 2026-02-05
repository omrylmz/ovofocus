import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withSequence,
    withSpring,
    Easing,
    interpolate,
} from 'react-native-reanimated';
import { theme as defaultTheme, Theme } from '../styles/theme';

interface TimerProgressBarProps {
    /** Formatted time string (e.g., "25:00") */
    formattedTime: string;
    /** Whether the timer is currently running */
    isRunning: boolean;
    /** Progress value between 0 and 1 */
    progress: number;
    /** Current session state */
    sessionState: 'idle' | 'active' | 'completed' | 'failed';
    /** Whether the session is paused */
    isPaused: boolean;
    /** Language for labels */
    language?: 'en' | 'tr' | 'es';
    /** Theme object */
    theme: Theme;
    /** Width of the progress bar */
    barWidth: number;
    /** Height of the progress bar */
    barHeight?: number;
    /** Timer font size */
    timerFontSize: number;
}

// Number of pixel segments in the bar
const SEGMENT_COUNT = 20;

export function TimerProgressBar({
    formattedTime,
    isRunning,
    progress,
    sessionState,
    isPaused,
    language = 'en',
    theme,
    barWidth,
    barHeight = 24,
    timerFontSize,
}: TimerProgressBarProps) {
    // Accessibility labels
    const timerLabel = language === 'tr' ? 'Odaklanma zamanlayıcısı' :
                       language === 'es' ? 'Temporizador de enfoque' : 'Focus timer';
    const progressLabel = language === 'tr'
        ? `Seans ilerlemesi: yüzde ${Math.round(progress * 100)} tamamlandı`
        : language === 'es'
        ? `Progreso de la sesion: ${Math.round(progress * 100)} por ciento completado`
        : `Session progress: ${Math.round(progress * 100)} percent complete`;

    // Animated values
    const progressAnim = useSharedValue(0);
    const glowIntensity = useSharedValue(0);
    const pulseScale = useSharedValue(1);
    const pausePulse = useSharedValue(1);
    const completionBurst = useSharedValue(0);
    const shimmerPosition = useSharedValue(0);
    const scanlinePos = useSharedValue(0);

    // Smooth progress animation
    useEffect(() => {
        progressAnim.value = withTiming(progress, {
            duration: 400,
            easing: Easing.out(Easing.cubic),
        });
    }, [progress]);

    // Glow pulsing when running
    useEffect(() => {
        if (isRunning && !isPaused) {
            glowIntensity.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );
            // Shimmer effect moving across the bar
            shimmerPosition.value = withRepeat(
                withTiming(1, { duration: 2000, easing: Easing.linear }),
                -1,
                false
            );
            // Scanline effect
            scanlinePos.value = withRepeat(
                withTiming(1, { duration: 3000, easing: Easing.linear }),
                -1,
                false
            );
        } else {
            glowIntensity.value = withTiming(0.2, { duration: 300 });
            shimmerPosition.value = 0;
        }
    }, [isRunning, isPaused]);

    // Subtle pulse for active state
    useEffect(() => {
        if (isRunning && !isPaused) {
            pulseScale.value = withRepeat(
                withSequence(
                    withTiming(1.01, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );
        } else {
            pulseScale.value = withTiming(1, { duration: 300 });
        }
    }, [isRunning, isPaused]);

    // Pause pulsing animation
    useEffect(() => {
        if (isPaused) {
            pausePulse.value = withRepeat(
                withSequence(
                    withTiming(0.6, { duration: 700, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );
        } else {
            pausePulse.value = withTiming(1, { duration: 200 });
        }
    }, [isPaused]);

    // Completion burst animation
    useEffect(() => {
        if (sessionState === 'completed') {
            completionBurst.value = 0;
            completionBurst.value = withSequence(
                withSpring(1.08, { damping: 8, stiffness: 200 }),
                withSpring(1, { damping: 15, stiffness: 300 })
            );
        } else {
            completionBurst.value = withTiming(0, { duration: 300 });
        }
    }, [sessionState]);

    // Get colors based on state
    const getBarColor = () => {
        if (sessionState === 'completed') return theme.colors.success;
        if (sessionState === 'failed') return theme.colors.error;
        if (isPaused) return theme.colors.warning;
        return theme.colors.accent;
    };

    const getTimerColor = () => {
        if (sessionState === 'completed') return theme.colors.success;
        if (sessionState === 'failed') return theme.colors.error;
        if (isPaused) return theme.colors.warning;
        return theme.colors.text;
    };

    const barColor = getBarColor();
    const timerColor = getTimerColor();

    // Animated styles
    const containerStyle = useAnimatedStyle(() => {
        const scale = sessionState === 'completed'
            ? completionBurst.value || 1
            : pulseScale.value;
        return {
            opacity: isPaused ? pausePulse.value : 1,
            transform: [{ scale }],
        };
    });

    const progressFillStyle = useAnimatedStyle(() => {
        return {
            width: `${progressAnim.value * 100}%`,
        };
    });

    const glowStyle = useAnimatedStyle(() => {
        const opacity = glowIntensity.value * 0.6;
        return {
            opacity,
            shadowOpacity: opacity,
        };
    });

    const shimmerStyle = useAnimatedStyle(() => {
        const translateX = interpolate(
            shimmerPosition.value,
            [0, 1],
            [-barWidth * 0.3, barWidth * 1.3]
        );
        return {
            transform: [{ translateX }],
        };
    });

    const scanlineStyle = useAnimatedStyle(() => {
        const translateY = interpolate(
            scanlinePos.value,
            [0, 1],
            [-2, barHeight + 2]
        );
        return {
            transform: [{ translateY }],
        };
    });

    const timerGlowStyle = useAnimatedStyle(() => {
        const glowRadius = isPaused ? 0 : glowIntensity.value * 12;
        return {
            textShadowColor: isPaused ? theme.colors.warning : theme.colors.accent,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: glowRadius,
        };
    });

    // Paused indicator animated style
    const pausedIndicatorStyle = useAnimatedStyle(() => {
        return {
            opacity: pausePulse.value,
        };
    });

    // Calculate segment fill for pixel effect
    const filledSegments = Math.floor(progress * SEGMENT_COUNT);

    return (
        <Animated.View
            style={[
                styles.container,
                containerStyle,
                { width: barWidth }
            ]}
            accessible={true}
            accessibilityRole="timer"
            accessibilityLabel={`${timerLabel}: ${formattedTime}. ${progressLabel}`}
            accessibilityLiveRegion={isRunning ? 'polite' : 'none'}
        >
            {/* Timer Text - Above the bar */}
            <View style={styles.timerRow}>
                <Animated.Text
                    style={[
                        styles.timer,
                        {
                            color: timerColor,
                            fontSize: timerFontSize,
                        },
                        timerGlowStyle,
                    ]}
                >
                    {formattedTime}
                </Animated.Text>

                {/* Progress percentage */}
                {sessionState === 'active' && (
                    <View style={styles.progressInfoRow}>
                        <Text style={[styles.progressText, { color: barColor }]}>
                            {Math.round(progress * 100)}%
                        </Text>
                        {isPaused && (
                            <Animated.Text
                                style={[
                                    styles.pausedIndicator,
                                    { backgroundColor: `${theme.colors.warning}33` },
                                    pausedIndicatorStyle
                                ]}
                            >
                                {language === 'tr' ? 'DURAKLATILDI' :
                                 language === 'es' ? 'PAUSADO' : 'PAUSED'}
                            </Animated.Text>
                        )}
                    </View>
                )}

                {/* Completion text */}
                {sessionState === 'completed' && (
                    <Text style={[styles.completionText, { color: theme.colors.success }]}>
                        {language === 'tr' ? 'TAMAMLANDI!' :
                         language === 'es' ? 'COMPLETADO!' : 'COMPLETED!'}
                    </Text>
                )}
            </View>

            {/* Progress Bar Container */}
            {sessionState === 'active' && (
                <View style={[styles.barContainer, { height: barHeight }]}>
                    {/* Outer glow layer */}
                    <Animated.View
                        style={[
                            styles.outerGlow,
                            glowStyle,
                            {
                                height: barHeight + 8,
                                backgroundColor: barColor,
                                shadowColor: barColor,
                            }
                        ]}
                    />

                    {/* Track background with pixel segments */}
                    <View style={[styles.track, {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.semantic.border,
                    }]}>
                        {/* Pixel grid segments */}
                        <View style={styles.segmentContainer}>
                            {Array.from({ length: SEGMENT_COUNT }, (_, i) => {
                                const isFilled = i < filledSegments;
                                const isPartial = i === filledSegments;

                                return (
                                    <View
                                        key={i}
                                        style={[
                                            styles.segment,
                                            {
                                                backgroundColor: isFilled || isPartial
                                                    ? barColor
                                                    : theme.colors.surfaceLight,
                                                opacity: isFilled ? 1 : isPartial ? 0.6 : 0.3,
                                            }
                                        ]}
                                    />
                                );
                            })}
                        </View>

                        {/* Animated fill overlay */}
                        <Animated.View
                            style={[
                                styles.fillOverlay,
                                progressFillStyle,
                                { backgroundColor: barColor }
                            ]}
                        >
                            {/* Shimmer effect */}
                            <Animated.View
                                style={[
                                    styles.shimmer,
                                    shimmerStyle,
                                ]}
                            />

                            {/* Inner highlight (top) */}
                            <View style={styles.innerHighlight} />

                            {/* Leading edge accent */}
                            <View style={[
                                styles.leadingEdge,
                                { backgroundColor: theme.colors.text }
                            ]} />
                        </Animated.View>

                        {/* Scanline effect */}
                        <Animated.View
                            style={[
                                styles.scanline,
                                scanlineStyle,
                            ]}
                        />

                        {/* Pixel border overlay */}
                        <View style={[styles.pixelBorder, { borderColor: theme.colors.semantic.borderDark }]} />
                    </View>

                    {/* Corner accents for pixel-art feel */}
                    <View style={[styles.cornerAccent, styles.cornerTL, { backgroundColor: theme.colors.surface }]} />
                    <View style={[styles.cornerAccent, styles.cornerTR, { backgroundColor: theme.colors.surface }]} />
                    <View style={[styles.cornerAccent, styles.cornerBL, { backgroundColor: theme.colors.surface }]} />
                    <View style={[styles.cornerAccent, styles.cornerBR, { backgroundColor: theme.colors.surface }]} />
                </View>
            )}

            {/* Completed state - full bar */}
            {sessionState === 'completed' && (
                <View style={[styles.barContainer, { height: barHeight }]}>
                    <View style={[styles.track, {
                        backgroundColor: theme.colors.success,
                        borderColor: theme.colors.success,
                    }]}>
                        <View style={styles.innerHighlight} />
                    </View>
                </View>
            )}

            {/* Idle state - subtle empty track */}
            {sessionState === 'idle' && (
                <View style={[styles.barContainer, { height: barHeight }]}>
                    <View style={[styles.track, {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.semantic.border,
                    }]}>
                        {/* Pixel grid segments - all empty */}
                        <View style={styles.segmentContainer}>
                            {Array.from({ length: SEGMENT_COUNT }, (_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.segment,
                                        {
                                            backgroundColor: theme.colors.surfaceLight,
                                            opacity: 0.3,
                                        }
                                    ]}
                                />
                            ))}
                        </View>

                        {/* Pixel border overlay */}
                        <View style={[styles.pixelBorder, { borderColor: theme.colors.semantic.borderDark }]} />
                    </View>

                    {/* Corner accents */}
                    <View style={[styles.cornerAccent, styles.cornerTL, { backgroundColor: theme.colors.surface }]} />
                    <View style={[styles.cornerAccent, styles.cornerTR, { backgroundColor: theme.colors.surface }]} />
                    <View style={[styles.cornerAccent, styles.cornerBL, { backgroundColor: theme.colors.surface }]} />
                    <View style={[styles.cornerAccent, styles.cornerBR, { backgroundColor: theme.colors.surface }]} />
                </View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
    },
    timerRow: {
        alignItems: 'center',
        marginBottom: 12,
    },
    timer: {
        fontWeight: defaultTheme.fontWeight.bold,
        fontVariant: ['tabular-nums'],
        letterSpacing: defaultTheme.typographyConfig.letterSpacing.extraWide,
    },
    progressInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 12,
    },
    progressText: {
        fontSize: 14,
        fontWeight: defaultTheme.fontWeight.semibold,
    },
    pausedIndicator: {
        fontSize: 11,
        fontWeight: defaultTheme.fontWeight.bold,
        color: defaultTheme.colors.warning,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: defaultTheme.borderRadius.round,
        overflow: 'hidden',
    },
    completionText: {
        fontSize: 14,
        fontWeight: defaultTheme.fontWeight.bold,
        marginTop: 4,
        letterSpacing: defaultTheme.typographyConfig.letterSpacing.extraWide,
    },
    barContainer: {
        width: '100%',
        position: 'relative',
    },
    outerGlow: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        borderRadius: defaultTheme.borderRadius.sm,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 16,
        elevation: 8,
    },
    track: {
        flex: 1,
        borderRadius: defaultTheme.borderRadius.sm,
        borderWidth: 2,
        overflow: 'hidden',
        position: 'relative',
    },
    segmentContainer: {
        flex: 1,
        flexDirection: 'row',
        paddingHorizontal: 3,
        paddingVertical: 3,
        gap: 2,
    },
    segment: {
        flex: 1,
        borderRadius: defaultTheme.borderRadius.xxs,
    },
    fillOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        borderRadius: defaultTheme.borderRadius.xs,
        overflow: 'hidden',
    },
    shimmer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        transform: [{ skewX: '-20deg' }],
    },
    innerHighlight: {
        position: 'absolute',
        top: 2,
        left: 4,
        right: 4,
        height: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        borderRadius: defaultTheme.borderRadius.xxs,
    },
    leadingEdge: {
        position: 'absolute',
        right: 0,
        top: 2,
        bottom: 2,
        width: 3,
        borderRadius: 1,
        opacity: 0.5,
    },
    scanline: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    pixelBorder: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderRadius: defaultTheme.borderRadius.sm,
        pointerEvents: 'none',
    },
    cornerAccent: {
        position: 'absolute',
        width: 4,
        height: 4,
    },
    cornerTL: {
        top: -1,
        left: -1,
    },
    cornerTR: {
        top: -1,
        right: -1,
    },
    cornerBL: {
        bottom: -1,
        left: -1,
    },
    cornerBR: {
        bottom: -1,
        right: -1,
    },
});
