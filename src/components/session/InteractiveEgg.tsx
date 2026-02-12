import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    withSpring,
    withRepeat,
    withDelay,
    runOnJS,
    Easing,
    FadeIn,
    FadeOut,
    ZoomIn,
} from 'react-native-reanimated';
import { theme } from '../../styles/theme';
import { Egg } from '../Egg';
import { audioManager } from '../../services/audioManager';
import { useResponsive } from '../../hooks/useResponsive';

type SessionState = 'idle' | 'active' | 'completed' | 'failed';
type Language = 'en' | 'tr' | 'es';
type WarningLevel = 0 | 1 | 2 | 3;

interface InteractiveEggProps {
    sessionState: SessionState;
    progress: number;
    duration: number;
    warningLevel: WarningLevel;
    language: Language;
    hapticsEnabled: boolean;
    hasSeenGestureHints: boolean;
    eggStyleId?: string;
    onStart: () => void;
    onShowGestureHints: () => void;
}

// Enhanced encouragement messages with more variety and fun
const ENCOURAGEMENT_MESSAGES = {
    en: {
        tap: [
            'You got this! 💪',
            'Keep going! ✨',
            'Awesome! 🌟',
            'Stay focused! 🎯',
            'Amazing! 💫',
            'Rock star! 🎸',
            'Brilliant! 🧠',
            'Champion! 🏆',
            'You\'re on fire! 🔥',
            'Unstoppable! 🚀',
        ],
        doubleTap: [
            'Time check!',
            'Countdown!',
            'Progress report!',
            'Status update!',
        ],
        longPress: {
            early: [
                'Your egg is warming up! 🥚',
                'New life is forming... 🌱',
                'The journey has begun! 🚀',
                'Something magical is happening... ✨',
            ],
            mid: [
                'Your egg is growing! 🥚💫',
                'Something is stirring inside...',
                'Keep going, it\'s working! 🌟',
                'The egg feels warmer! 🔥',
            ],
            late: [
                'Almost ready to hatch! 🐣',
                'So close! Keep it up! ✨',
                'The egg is cracking! 🥚💥',
                'Magic is about to happen! 🌈',
            ],
        },
    },
    tr: {
        tap: [
            'Yapabilirsin! 💪',
            'Devam et! ✨',
            'Harika! 🌟',
            'Odaklan! 🎯',
            'Muhteşem! 💫',
            'Yıldızsın! 🎸',
            'Parlak! 🧠',
            'Şampiyon! 🏆',
            'Ateşlisin! 🔥',
            'Durdurulamazsın! 🚀',
        ],
        doubleTap: [
            'Süre kontrolü!',
            'Geri sayım!',
            'İlerleme raporu!',
            'Durum güncellemesi!',
        ],
        longPress: {
            early: [
                'Yumurtan ısınıyor! 🥚',
                'Yeni bir hayat oluşuyor... 🌱',
                'Yolculuk başladı! 🚀',
                'Büyülü bir şey oluyor... ✨',
            ],
            mid: [
                'Yumurtan büyüyor! 🥚💫',
                'İçeride bir şey kıpırdıyor...',
                'Devam et, işe yarıyor! 🌟',
                'Yumurta ısınıyor! 🔥',
            ],
            late: [
                'Neredeyse çatlayacak! 🐣',
                'Çok yakın! Devam et! ✨',
                'Yumurta çatlıyor! 🥚💥',
                'Sihir gerçekleşmek üzere! 🌈',
            ],
        },
    },
    es: {
        tap: [
            '¡Tú puedes! 💪',
            '¡Sigue así! ✨',
            '¡Increíble! 🌟',
            '¡Enfócate! 🎯',
            '¡Asombroso! 💫',
            '¡Eres una estrella! 🎸',
            '¡Brillante! 🧠',
            '¡Campeón! 🏆',
            '¡Estás en fuego! 🔥',
            '¡Imparable! 🚀',
        ],
        doubleTap: [
            '¡Revisión de tiempo!',
            '¡Cuenta regresiva!',
            '¡Reporte de progreso!',
            '¡Actualización de estado!',
        ],
        longPress: {
            early: [
                '¡Tu huevo se está calentando! 🥚',
                'Una nueva vida se está formando... 🌱',
                '¡El viaje ha comenzado! 🚀',
                'Algo mágico está pasando... ✨',
            ],
            mid: [
                '¡Tu huevo está creciendo! 🥚💫',
                'Algo se está moviendo adentro...',
                '¡Sigue, está funcionando! 🌟',
                '¡El huevo se siente más cálido! 🔥',
            ],
            late: [
                '¡Casi listo para eclosionar! 🐣',
                '¡Tan cerca! ¡Sigue así! ✨',
                '¡El huevo se está rompiendo! 🥚💥',
                '¡La magia está por suceder! 🌈',
            ],
        },
    },
};

export function InteractiveEgg({
    sessionState,
    progress,
    duration,
    warningLevel,
    language,
    hapticsEnabled,
    hasSeenGestureHints,
    eggStyleId,
    onStart,
    onShowGestureHints,
}: InteractiveEggProps) {
    const { eggSize } = useResponsive();
    const [encouragementText, setEncouragementText] = useState<string | null>(null);
    const [feedbackType, setFeedbackType] = useState<'tap' | 'doubleTap' | 'longPress' | null>(null);
    const lastMessageIndex = useRef<number>(-1);

    // Dynamic sizes based on actual egg
    const feedbackSize = Math.round(eggSize * 0.65);

    // Egg interaction animations
    const eggScale = useSharedValue(1);
    const eggRotation = useSharedValue(0);
    // Visual feedback animations
    const glowOpacity = useSharedValue(0);
    const glowScale = useSharedValue(1);
    const rippleOpacity = useSharedValue(0);
    const rippleScale = useSharedValue(1);
    const pulseRingOpacity = useSharedValue(0);
    const pulseRingScale = useSharedValue(1);

    // Star burst particles (6 stars that radiate outward on double-tap)
    const starBurstProgress = useSharedValue(0);
    const starBurstOpacity = useSharedValue(0);

    // Get random message avoiding repetition
    const getRandomMessage = useCallback((messages: string[]): string => {
        if (messages.length === 1) return messages[0];

        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * messages.length);
        } while (newIndex === lastMessageIndex.current && messages.length > 1);

        lastMessageIndex.current = newIndex;
        return messages[newIndex];
    }, []);

    // Visual feedback for tap gesture
    const triggerTapFeedback = useCallback(() => {
        'worklet';
        // Ripple effect
        rippleOpacity.value = 0.6;
        rippleScale.value = 1;
        rippleOpacity.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) });
        rippleScale.value = withTiming(1.5, { duration: 400, easing: Easing.out(Easing.ease) });

        // Subtle glow
        glowOpacity.value = withSequence(
            withTiming(0.3, { duration: 100 }),
            withTiming(0, { duration: 300 })
        );
    }, []);

    // Visual feedback for double tap gesture
    const triggerDoubleTapFeedback = useCallback(() => {
        'worklet';
        // Double ripple effect
        rippleOpacity.value = 0.8;
        rippleScale.value = 1;
        rippleOpacity.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) });
        rippleScale.value = withTiming(1.8, { duration: 500, easing: Easing.out(Easing.ease) });

        // Stronger glow
        glowOpacity.value = withSequence(
            withTiming(0.5, { duration: 100 }),
            withTiming(0, { duration: 400 })
        );
        glowScale.value = withSequence(
            withSpring(1.2, { damping: 10 }),
            withSpring(1, { damping: 15 })
        );

        // Star burst — particles radiate outward
        starBurstProgress.value = 0;
        starBurstOpacity.value = 1;
        starBurstProgress.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) });
        starBurstOpacity.value = withDelay(200, withTiming(0, { duration: 400 }));
    }, []);

    // Visual feedback for long press gesture
    const triggerLongPressFeedback = useCallback(() => {
        'worklet';
        // Pulsing ring effect
        pulseRingOpacity.value = 0.7;
        pulseRingScale.value = 1;
        pulseRingOpacity.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.ease) });
        pulseRingScale.value = withTiming(2, { duration: 800, easing: Easing.out(Easing.ease) });

        // Strong sustained glow
        glowOpacity.value = withSequence(
            withTiming(0.6, { duration: 200 }),
            withTiming(0.3, { duration: 300 }),
            withTiming(0, { duration: 300 })
        );
        glowScale.value = withSequence(
            withSpring(1.3, { damping: 8 }),
            withSpring(1, { damping: 12 })
        );
    }, []);

    // Egg interaction handlers with enhanced messages
    const showEncouragement = useCallback(() => {
        const messages = ENCOURAGEMENT_MESSAGES[language].tap;
        const randomMessage = getRandomMessage(messages);
        setEncouragementText(randomMessage);
        setFeedbackType('tap');
        setTimeout(() => {
            setEncouragementText(null);
            setFeedbackType(null);
        }, 1500);
    }, [language, getRandomMessage]);

    const handleEggTap = useCallback(() => {
        if (sessionState === 'active') {
            if (hapticsEnabled) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            audioManager.playSound('egg_tap');
            showEncouragement();
        }
    }, [sessionState, hapticsEnabled, showEncouragement]);

    const handleEggDoubleTap = useCallback(() => {
        if (sessionState === 'active') {
            if (hapticsEnabled) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            audioManager.playSound('egg_double_tap');

            // Show remaining time with fun prefix
            const remaining = Math.ceil((1 - progress) * duration);
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;

            const prefixes = ENCOURAGEMENT_MESSAGES[language].doubleTap;
            const prefix = getRandomMessage(prefixes);

            const timeText = language === 'tr'
                ? `${prefix} ${mins}dk ${secs}sn kaldı!`
                : language === 'es'
                ? `${prefix} ¡${mins}m ${secs}s restantes!`
                : `${prefix} ${mins}m ${secs}s left!`;

            setEncouragementText(timeText);
            setFeedbackType('doubleTap');
            setTimeout(() => {
                setEncouragementText(null);
                setFeedbackType(null);
            }, 2000);
        }
    }, [sessionState, hapticsEnabled, progress, duration, language, getRandomMessage]);

    const handleEggLongPress = useCallback(() => {
        if (sessionState === 'idle') {
            // Long press to start on idle
            onStart();
            // Show gesture hints on first session
            if (!hasSeenGestureHints) {
                setTimeout(() => onShowGestureHints(), 1000);
            }
        } else if (sessionState === 'active') {
            if (hapticsEnabled) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }
            audioManager.playSound('egg_long_press');

            // Get progress-appropriate message
            const longPressMessages = ENCOURAGEMENT_MESSAGES[language].longPress;
            let messagePool;
            if (progress < 0.33) {
                messagePool = longPressMessages.early;
            } else if (progress < 0.66) {
                messagePool = longPressMessages.mid;
            } else {
                messagePool = longPressMessages.late;
            }

            const msg = getRandomMessage(messagePool);
            setEncouragementText(msg);
            setFeedbackType('longPress');
            setTimeout(() => {
                setEncouragementText(null);
                setFeedbackType(null);
            }, 2500);
        }
    }, [sessionState, hapticsEnabled, progress, language, onStart, hasSeenGestureHints, onShowGestureHints, getRandomMessage]);

    // Gesture configuration with improved long press handling
    // Using shouldCancelWhenOutside and maxPointers to avoid scroll conflicts
    const tapGesture = Gesture.Tap()
        .maxDuration(250)
        .onEnd(() => {
            'worklet';
            eggScale.value = withSequence(
                withSpring(1.05, { damping: 10 }),
                withSpring(1, { damping: 12 })
            );
            triggerTapFeedback();
            runOnJS(handleEggTap)();
        });

    const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .maxDuration(300)
        .onEnd(() => {
            'worklet';
            eggScale.value = withSequence(
                withSpring(1.1, { damping: 8 }),
                withSpring(1, { damping: 10 })
            );
            triggerDoubleTapFeedback();
            runOnJS(handleEggDoubleTap)();
        });

    // Improved long press with better scroll conflict handling
    const longPressGesture = Gesture.LongPress()
        .minDuration(500)
        .maxDistance(50) // Allow slight movement during press without canceling
        .shouldCancelWhenOutside(true) // Cancel if finger moves outside
        .onStart(() => {
            'worklet';
            eggScale.value = withSpring(0.95, { damping: 15 });
            // Start building glow during press
            glowOpacity.value = withTiming(0.4, { duration: 400 });
        })
        .onEnd((event, success) => {
            'worklet';
            if (success) {
                eggScale.value = withSequence(
                    withSpring(1.15, { damping: 6 }),
                    withSpring(1, { damping: 10 })
                );
                eggRotation.value = withSequence(
                    withTiming(-5, { duration: 50 }),
                    withTiming(5, { duration: 50 }),
                    withTiming(0, { duration: 50 })
                );
                triggerLongPressFeedback();
                runOnJS(handleEggLongPress)();
            } else {
                // Cancelled - reset scale smoothly
                eggScale.value = withSpring(1, { damping: 12 });
                glowOpacity.value = withTiming(0, { duration: 200 });
            }
        })
        .onFinalize(() => {
            'worklet';
            // Ensure glow fades if gesture was cancelled
            if (glowOpacity.value > 0) {
                glowOpacity.value = withTiming(0, { duration: 200 });
            }
        });

    // Combine gestures (double tap takes priority over single tap)
    const composedGesture = Gesture.Exclusive(doubleTapGesture, tapGesture, longPressGesture);

    const eggContainerStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: eggScale.value },
            { rotate: `${eggRotation.value}deg` },
        ],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
        transform: [{ scale: glowScale.value }],
    }));

    const rippleStyle = useAnimatedStyle(() => ({
        opacity: rippleOpacity.value,
        transform: [{ scale: rippleScale.value }],
    }));

    const pulseRingStyle = useAnimatedStyle(() => ({
        opacity: pulseRingOpacity.value,
        transform: [{ scale: pulseRingScale.value }],
    }));

    // Create 6 star burst animated styles, evenly spaced at 60-degree intervals
    const STAR_ANGLES = [0, 60, 120, 180, 240, 300];
    const starRadius = feedbackSize * 0.7;
    const starStyles = STAR_ANGLES.map((angleDeg) => {
        const angleRad = (angleDeg * Math.PI) / 180;
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return useAnimatedStyle(() => {
            const dist = starBurstProgress.value * starRadius;
            return {
                transform: [
                    { translateX: Math.cos(angleRad) * dist },
                    { translateY: Math.sin(angleRad) * dist },
                    { scale: 1 - starBurstProgress.value * 0.5 },
                    { rotate: `${starBurstProgress.value * 180}deg` },
                ],
                opacity: starBurstOpacity.value,
            };
        });
    });

    // Get feedback container color based on type
    const getFeedbackColor = () => {
        switch (feedbackType) {
            case 'tap':
                return theme.colors.accent;
            case 'doubleTap':
                return theme.colors.secondary;
            case 'longPress':
                return theme.colors.primary;
            default:
                return theme.colors.accent;
        }
    };

    // Accessibility labels and hints based on session state
    const getAccessibilityLabel = () => {
        const eggLabel = language === 'tr' ? 'Odaklanma yumurtası' :
                        language === 'es' ? 'Huevo de enfoque' : 'Focus egg';
        if (sessionState === 'completed') {
            return language === 'tr' ? 'Çatlayan yumurta' :
                   language === 'es' ? 'Huevo eclosionando' : 'Hatching egg';
        }
        if (sessionState === 'failed') {
            return language === 'tr' ? 'Kırık yumurta' :
                   language === 'es' ? 'Huevo roto' : 'Broken egg';
        }
        if (sessionState === 'active') {
            const progressPercent = Math.round(progress * 100);
            return language === 'tr'
                ? `${eggLabel}, yüzde ${progressPercent} tamamlandı`
                : language === 'es'
                ? `${eggLabel}, ${progressPercent} por ciento completado`
                : `${eggLabel}, ${progressPercent} percent complete`;
        }
        return eggLabel;
    };

    const getAccessibilityHint = () => {
        if (sessionState === 'idle') {
            return language === 'tr'
                ? 'Odaklanma seansı başlatmak için dokunun veya hızlı başlat için uzun basın'
                : language === 'es'
                ? 'Toca para iniciar sesión de enfoque, o mantén presionado para inicio rápido'
                : 'Tap to start focus session, or long press for quick start';
        }
        if (sessionState === 'active') {
            return language === 'tr'
                ? 'Cesaretlendirme için tek dokunun, kalan süre için çift dokunun, motivasyon için uzun basın'
                : language === 'es'
                ? 'Toca una vez para ánimo, dos veces para tiempo restante, mantén presionado para motivación'
                : 'Single tap for encouragement, double tap for time remaining, long press for motivation';
        }
        return undefined;
    };

    return (
        <View style={styles.container}>
            {/* Encouragement text - ABOVE egg, positioned absolutely */}
            {encouragementText && (
                <Animated.View
                    entering={ZoomIn.duration(200).springify()}
                    exiting={FadeOut.duration(150)}
                    style={[
                        styles.encouragementContainer,
                        { borderColor: getFeedbackColor() }
                    ]}
                    pointerEvents="none"
                >
                    <Text
                        style={[styles.encouragementText, { color: getFeedbackColor() }]}
                        accessible={true}
                        accessibilityRole="alert"
                        accessibilityLiveRegion="polite"
                    >
                        {encouragementText}
                    </Text>
                </Animated.View>
            )}

            {/* Interactive Egg with Gestures */}
            <GestureDetector gesture={composedGesture}>
                <Animated.View
                    style={[styles.eggWrapper, eggContainerStyle]}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={getAccessibilityLabel()}
                    accessibilityHint={getAccessibilityHint()}
                    accessibilityState={{
                        disabled: sessionState === 'completed' || sessionState === 'failed',
                    }}
                >
                    {/* Gesture feedback glow (behind egg) — scales with egg */}
                    <Animated.View
                        style={[
                            styles.feedbackGlow,
                            {
                                width: feedbackSize,
                                height: feedbackSize,
                                borderRadius: feedbackSize / 2,
                            },
                            glowStyle,
                        ]}
                        importantForAccessibility="no"
                        pointerEvents="none"
                    />

                    {/* Ripple effect (behind egg) — scales with egg */}
                    <Animated.View
                        style={[
                            styles.rippleEffect,
                            {
                                width: feedbackSize * 0.9,
                                height: feedbackSize * 0.9,
                                borderRadius: feedbackSize / 2,
                            },
                            rippleStyle,
                        ]}
                        importantForAccessibility="no"
                        pointerEvents="none"
                    />

                    {/* Pulse ring effect for long press — scales with egg */}
                    <Animated.View
                        style={[
                            styles.pulseRing,
                            {
                                width: feedbackSize * 0.85,
                                height: feedbackSize * 0.85,
                                borderRadius: feedbackSize / 2,
                            },
                            pulseRingStyle,
                        ]}
                        importantForAccessibility="no"
                        pointerEvents="none"
                    />

                    {/* Star burst particles for double-tap */}
                    <View style={styles.starBurstContainer} pointerEvents="none">
                        {starStyles.map((style, i) => (
                            <Animated.View
                                key={i}
                                style={[styles.starParticle, style]}
                                importantForAccessibility="no"
                            >
                                <View style={[
                                    styles.starDot,
                                    { backgroundColor: theme.colors.accent },
                                ]} />
                                <View style={[
                                    styles.starHalo,
                                    { backgroundColor: theme.colors.accent },
                                ]} />
                            </Animated.View>
                        ))}
                    </View>

                    <Egg
                        sessionState={sessionState}
                        progress={progress}
                        language={language}
                        warningLevel={warningLevel}
                        eggStyleId={eggStyleId}
                    />
                </Animated.View>
            </GestureDetector>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        // Don't use flex: 1 - let parent control sizing
    },
    eggWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 140,
        minHeight: 160,
    },
    feedbackGlow: {
        position: 'absolute',
        backgroundColor: theme.colors.accent,
    },
    rippleEffect: {
        position: 'absolute',
        borderWidth: 3,
        borderColor: theme.colors.accent,
        backgroundColor: 'transparent',
    },
    pulseRing: {
        position: 'absolute',
        borderWidth: 4,
        borderColor: theme.colors.primary,
        backgroundColor: 'transparent',
    },
    starBurstContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        width: 0,
        height: 0,
    },
    starParticle: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        width: 12,
        height: 12,
    },
    starDot: {
        position: 'absolute',
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    starHalo: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: theme.borderRadius.sm,
        opacity: 0.25,
    },
    encouragementContainer: {
        position: 'absolute',
        top: -50,  // Position above the egg
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.round,
        borderWidth: 2,
        ...theme.shadows.medium,
        zIndex: theme.zIndex.floating,
        elevation: theme.zIndex.floating,
    },
    encouragementText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.accent,
        fontWeight: theme.fontWeight.bold,
    },
});
