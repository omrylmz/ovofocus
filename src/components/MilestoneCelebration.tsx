import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, Dimensions } from 'react-native';
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
import { PixelButton } from './PixelButton';
import { audioManager } from '../services/audioManager';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Milestone types for different celebration styles
export type MilestoneType =
    | 'first_animal'
    | 'collection_milestone'
    | 'streak_milestone'
    | 'rarity_discovery'
    | 'daily_goal';

export interface MilestoneData {
    type: MilestoneType;
    title: string;
    subtitle: string;
    icon: string;
    value?: number;
    color?: string;
}

interface MilestoneCelebrationProps {
    visible: boolean;
    milestone: MilestoneData | null;
    onDismiss: () => void;
    language?: Language;
}

// Sparkle particle component
function SparkleParticle({
    delay,
    angle,
    distance,
    color,
}: {
    delay: number;
    angle: number;
    distance: number;
    color: string;
}) {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.5);
    const rotate = useSharedValue(0);

    useEffect(() => {
        const radians = (angle * Math.PI) / 180;
        const targetX = Math.cos(radians) * distance;
        const targetY = Math.sin(radians) * distance;

        opacity.value = withDelay(
            delay,
            withSequence(
                withTiming(1, { duration: 200 }),
                withDelay(800, withTiming(0, { duration: 400 }))
            )
        );
        translateX.value = withDelay(
            delay,
            withTiming(targetX, { duration: 1200, easing: Easing.out(Easing.quad) })
        );
        translateY.value = withDelay(
            delay,
            withTiming(targetY, { duration: 1200, easing: Easing.out(Easing.quad) })
        );
        scale.value = withDelay(
            delay,
            withSequence(
                withSpring(1.5, { damping: 6 }),
                withDelay(500, withTiming(0.3, { duration: 400 }))
            )
        );
        rotate.value = withDelay(
            delay,
            withTiming(360, { duration: 1000, easing: Easing.out(Easing.quad) })
        );
    }, [delay, angle, distance]);

    const style = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
            { rotate: `${rotate.value}deg` },
        ],
        opacity: opacity.value,
    }));

    return (
        <Animated.Text style={[styles.sparkleParticle, { color }, style]}>
            {'\u2728'}
        </Animated.Text>
    );
}

// Confetti ribbon component
function ConfettiRibbon({
    delay,
    startX,
    color,
}: {
    delay: number;
    startX: number;
    color: string;
}) {
    const translateY = useSharedValue(-50);
    const translateX = useSharedValue(startX);
    const rotate = useSharedValue(0);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(1);

    useEffect(() => {
        opacity.value = withDelay(
            delay,
            withSequence(
                withTiming(1, { duration: 100 }),
                withDelay(1800, withTiming(0, { duration: 400 }))
            )
        );
        translateY.value = withDelay(
            delay,
            withTiming(400, { duration: 2500, easing: Easing.out(Easing.quad) })
        );
        translateX.value = withDelay(
            delay,
            withSequence(
                withTiming(startX + (Math.random() - 0.5) * 120, { duration: 1200 }),
                withTiming(startX + (Math.random() - 0.5) * 180, { duration: 1300 })
            )
        );
        rotate.value = withDelay(
            delay,
            withRepeat(withTiming(360, { duration: 800, easing: Easing.linear }), 4, false)
        );
        scale.value = withDelay(
            delay,
            withSequence(withSpring(1.3), withDelay(1200, withSpring(0.6)))
        );
    }, [delay, startX]);

    const style = useAnimatedStyle(() => ({
        transform: [
            { translateY: translateY.value },
            { translateX: translateX.value },
            { rotate: `${rotate.value}deg` },
            { scale: scale.value },
        ],
        opacity: opacity.value,
    }));

    return (
        <Animated.View
            style={[
                styles.confettiRibbon,
                { backgroundColor: color },
                style,
            ]}
        />
    );
}

// Floating emoji component
function FloatingEmoji({
    emoji,
    delay,
    startX,
}: {
    emoji: string;
    delay: number;
    startX: number;
}) {
    const translateY = useSharedValue(0);
    const translateX = useSharedValue(startX);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.5);

    useEffect(() => {
        opacity.value = withDelay(
            delay,
            withSequence(
                withTiming(1, { duration: 200 }),
                withDelay(1200, withTiming(0, { duration: 400 }))
            )
        );
        translateY.value = withDelay(
            delay,
            withTiming(-150 - Math.random() * 100, {
                duration: 1800,
                easing: Easing.out(Easing.quad),
            })
        );
        translateX.value = withDelay(
            delay,
            withSequence(
                withTiming(startX + (Math.random() - 0.5) * 80, { duration: 900 }),
                withTiming(startX + (Math.random() - 0.5) * 100, { duration: 900 })
            )
        );
        scale.value = withDelay(
            delay,
            withSequence(
                withSpring(1.2, { damping: 6 }),
                withDelay(800, withTiming(0.6, { duration: 400 }))
            )
        );
    }, [delay, startX]);

    const style = useAnimatedStyle(() => ({
        transform: [
            { translateY: translateY.value },
            { translateX: translateX.value },
            { scale: scale.value },
        ],
        opacity: opacity.value,
    }));

    return (
        <Animated.Text style={[styles.floatingEmoji, style]}>{emoji}</Animated.Text>
    );
}

export function MilestoneCelebration({
    visible,
    milestone,
    onDismiss,
    language = 'en',
}: MilestoneCelebrationProps) {
    // Animation values
    const backgroundOpacity = useSharedValue(0);
    const iconScale = useSharedValue(0);
    const iconRotation = useSharedValue(-15);
    const titleOpacity = useSharedValue(0);
    const titleTranslateY = useSharedValue(30);
    const subtitleOpacity = useSharedValue(0);
    const subtitleTranslateY = useSharedValue(20);
    const valueScale = useSharedValue(0);
    const valueRotation = useSharedValue(-10);
    const glowPulse = useSharedValue(0);
    const buttonOpacity = useSharedValue(0);
    const buttonTranslateY = useSharedValue(20);

    const handleDismiss = useCallback(() => {
        backgroundOpacity.value = withTiming(0, { duration: 300 }, () => {
            runOnJS(onDismiss)();
        });
    }, [onDismiss, backgroundOpacity]);

    useEffect(() => {
        if (visible && milestone) {
            // Play celebration sound
            audioManager.playSound('celebration');

            // Haptic celebration
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(
                () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
                200
            );
            setTimeout(
                () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
                400
            );

            // Background fade
            backgroundOpacity.value = withTiming(1, { duration: 300 });

            // Icon entrance with dramatic bounce
            iconScale.value = withDelay(
                200,
                withSequence(
                    withSpring(1.5, { damping: 5, stiffness: 180 }),
                    withSpring(1, { damping: 10 })
                )
            );
            iconRotation.value = withSequence(
                withDelay(200, withTiming(-20, { duration: 100 })),
                withTiming(20, { duration: 100 }),
                withTiming(-15, { duration: 80 }),
                withTiming(15, { duration: 80 }),
                withTiming(-5, { duration: 60 }),
                withSpring(0, { damping: 12 })
            );

            // Glow pulse animation
            glowPulse.value = withDelay(
                500,
                withRepeat(
                    withSequence(
                        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
                        withTiming(0.4, { duration: 600, easing: Easing.inOut(Easing.ease) })
                    ),
                    -1,
                    true
                )
            );

            // Title entrance
            titleOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
            titleTranslateY.value = withDelay(400, withSpring(0, { damping: 12 }));

            // Subtitle entrance
            subtitleOpacity.value = withDelay(550, withTiming(1, { duration: 300 }));
            subtitleTranslateY.value = withDelay(550, withSpring(0, { damping: 12 }));

            // Value pop (if present)
            if (milestone.value !== undefined) {
                valueScale.value = withDelay(
                    700,
                    withSequence(
                        withSpring(1.2, { damping: 5, stiffness: 200 }),
                        withSpring(1, { damping: 8 })
                    )
                );
                valueRotation.value = withDelay(700, withSpring(0, { damping: 8 }));
            }

            // Button entrance
            buttonOpacity.value = withDelay(900, withTiming(1, { duration: 300 }));
            buttonTranslateY.value = withDelay(900, withSpring(0, { damping: 12 }));
        } else {
            // Cancel infinite animations to prevent memory leaks
            cancelAnimation(glowPulse);

            // Reset values
            backgroundOpacity.value = 0;
            iconScale.value = 0;
            iconRotation.value = -15;
            titleOpacity.value = 0;
            titleTranslateY.value = 30;
            subtitleOpacity.value = 0;
            subtitleTranslateY.value = 20;
            valueScale.value = 0;
            valueRotation.value = -10;
            glowPulse.value = 0;
            buttonOpacity.value = 0;
            buttonTranslateY.value = 20;
        }

        return () => {
            cancelAnimation(glowPulse);
        };
    }, [visible, milestone]);

    const backgroundStyle = useAnimatedStyle(() => ({
        opacity: backgroundOpacity.value,
    }));

    const iconStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: iconScale.value },
            { rotate: `${iconRotation.value}deg` },
        ],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowPulse.value * 0.6,
        transform: [{ scale: 1 + glowPulse.value * 0.2 }],
    }));

    const titleStyle = useAnimatedStyle(() => ({
        opacity: titleOpacity.value,
        transform: [{ translateY: titleTranslateY.value }],
    }));

    const subtitleStyle = useAnimatedStyle(() => ({
        opacity: subtitleOpacity.value,
        transform: [{ translateY: subtitleTranslateY.value }],
    }));

    const valueStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: valueScale.value },
            { rotate: `${valueRotation.value}deg` },
        ],
    }));

    const buttonStyle = useAnimatedStyle(() => ({
        opacity: buttonOpacity.value,
        transform: [{ translateY: buttonTranslateY.value }],
    }));

    if (!visible || !milestone) return null;

    const milestoneColor = milestone.color || theme.colors.accent;

    // Get celebration content based on type
    const getCelebrationEmojis = (): string[] => {
        switch (milestone.type) {
            case 'first_animal':
                return ['\uD83C\uDF89', '\uD83C\uDF8A', '\u2728', '\uD83D\uDC23', '\uD83C\uDF1F'];
            case 'collection_milestone':
                return ['\uD83D\uDCDA', '\uD83C\uDFC6', '\u2728', '\uD83D\uDC8E', '\uD83C\uDF1F'];
            case 'streak_milestone':
                return ['\uD83D\uDD25', '\u26A1', '\uD83D\uDCAB', '\uD83C\uDF1F', '\uD83C\uDFC6'];
            case 'rarity_discovery':
                return ['\u2728', '\uD83D\uDC8E', '\uD83C\uDF1F', '\uD83C\uDF08', '\uD83D\uDCAB'];
            case 'daily_goal':
                return ['\u2705', '\uD83C\uDFC6', '\uD83C\uDF1F', '\uD83D\uDCAA', '\u2728'];
            default:
                return ['\u2728', '\uD83C\uDF1F', '\uD83C\uDF89'];
        }
    };

    // Get confetti colors based on milestone type
    const getConfettiColors = (): string[] => {
        switch (milestone.type) {
            case 'first_animal':
                return ['#FFD700', '#FF6B6B', '#4ECDC4', '#FFE66D', '#FF9F43', '#00D2D3'];
            case 'collection_milestone':
                return ['#4FC3F7', '#81D4FA', '#29B6F6', '#03A9F4', '#00BCD4', '#26C6DA'];
            case 'streak_milestone':
                return ['#FF6B6B', '#FF9F43', '#FFD700', '#FF5722', '#FF7043', '#FFAB91'];
            case 'rarity_discovery':
                return ['#BA68C8', '#CE93D8', '#E1BEE7', '#9C27B0', '#AB47BC', '#7B1FA2'];
            case 'daily_goal':
                return ['#4CAF50', '#81C784', '#A5D6A7', '#66BB6A', '#43A047', '#2E7D32'];
            default:
                return ['#FFE66D', '#FF6B6B', '#4ECDC4', '#BA68C8', '#4FC3F7'];
        }
    };

    const emojis = getCelebrationEmojis();
    const confettiColors = getConfettiColors();

    // Generate sparkle particles
    const sparkleParticles = Array.from({ length: 12 }, (_, i) => ({
        angle: i * 30,
        distance: 100 + Math.random() * 40,
        delay: 300 + i * 50,
        color: confettiColors[i % confettiColors.length],
    }));

    // Generate confetti ribbons
    const confettiRibbons = Array.from({ length: 15 }, (_, i) => ({
        delay: i * 60,
        startX: (i % 7 - 3) * 35,
        color: confettiColors[i % confettiColors.length],
    }));

    // Generate floating emojis
    const floatingEmojis = emojis.map((emoji, i) => ({
        emoji,
        delay: 200 + i * 120,
        startX: (i - 2) * 50,
    }));

    return (
        <Modal visible={visible} transparent animationType="none">
            <Animated.View
                style={[styles.overlay, backgroundStyle]}
                accessible
                accessibilityViewIsModal
                accessibilityRole="alert"
                accessibilityLabel={`${milestone.title}. ${milestone.subtitle}`}
            >
                {/* Confetti ribbons */}
                <View style={styles.confettiContainer}>
                    {confettiRibbons.map((ribbon, i) => (
                        <ConfettiRibbon
                            key={`ribbon-${i}`}
                            delay={ribbon.delay}
                            startX={ribbon.startX}
                            color={ribbon.color}
                        />
                    ))}
                </View>

                <View style={styles.container}>
                    {/* Sparkle burst */}
                    <View style={styles.sparkleContainer}>
                        {sparkleParticles.map((particle, i) => (
                            <SparkleParticle
                                key={`sparkle-${i}`}
                                delay={particle.delay}
                                angle={particle.angle}
                                distance={particle.distance}
                                color={particle.color}
                            />
                        ))}
                    </View>

                    {/* Floating emojis */}
                    <View style={styles.floatingEmojiContainer}>
                        {floatingEmojis.map((item, i) => (
                            <FloatingEmoji
                                key={`emoji-${i}`}
                                emoji={item.emoji}
                                delay={item.delay}
                                startX={item.startX}
                            />
                        ))}
                    </View>

                    {/* Glow effect */}
                    <Animated.View
                        style={[
                            styles.glow,
                            { backgroundColor: milestoneColor },
                            glowStyle,
                        ]}
                    />

                    {/* Main icon */}
                    <Animated.View style={[styles.iconContainer, iconStyle]}>
                        <View style={[styles.iconCircle, { borderColor: milestoneColor }]}>
                            <Text style={styles.icon}>{milestone.icon}</Text>
                        </View>
                    </Animated.View>

                    {/* Title */}
                    <Animated.Text style={[styles.title, { color: milestoneColor }, titleStyle]}>
                        {milestone.title}
                    </Animated.Text>

                    {/* Value (if present) */}
                    {milestone.value !== undefined && (
                        <Animated.View style={[styles.valueContainer, valueStyle]}>
                            <Text style={[styles.value, { color: milestoneColor }]}>
                                {milestone.value}
                            </Text>
                        </Animated.View>
                    )}

                    {/* Subtitle */}
                    <Animated.Text style={[styles.subtitle, subtitleStyle]}>
                        {milestone.subtitle}
                    </Animated.Text>

                    {/* Dismiss button */}
                    <Animated.View style={[styles.buttonContainer, buttonStyle]}>
                        <PixelButton
                            title={t('awesome', language)}
                            onPress={handleDismiss}
                            variant="primary"
                            size="large"
                        />
                    </Animated.View>
                </View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    confettiContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 100,
        alignItems: 'center',
        overflow: 'visible',
    },
    confettiRibbon: {
        position: 'absolute',
        width: 12,
        height: 24,
        borderRadius: 4,
    },
    sparkleContainer: {
        position: 'absolute',
        top: '30%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sparkleParticle: {
        position: 'absolute',
        fontSize: 24,
    },
    floatingEmojiContainer: {
        position: 'absolute',
        top: '45%',
        alignItems: 'center',
    },
    floatingEmoji: {
        position: 'absolute',
        fontSize: 32,
    },
    glow: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
        top: 40,
    },
    iconContainer: {
        marginBottom: theme.spacing.lg,
    },
    iconCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: theme.colors.surface,
        borderWidth: 5,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.large,
    },
    icon: {
        fontSize: 72,
    },
    title: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.bold,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    valueContainer: {
        marginBottom: theme.spacing.md,
    },
    value: {
        fontSize: 64,
        fontWeight: theme.fontWeight.bold,
        textShadowColor: 'rgba(255, 230, 109, 0.5)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 12,
    },
    subtitle: {
        fontSize: theme.fontSize.lg,
        color: theme.colors.text,
        textAlign: 'center',
        maxWidth: 280,
        marginBottom: theme.spacing.xl,
    },
    buttonContainer: {
        marginTop: theme.spacing.md,
    },
});
