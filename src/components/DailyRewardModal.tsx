import React, { useEffect, useRef } from 'react';
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
    cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '../styles/theme';
import { PixelButton } from './PixelButton';
import { Language, t, TranslationKey } from '../i18n/translations';
import { RewardType } from '../utils/dailyRewards';

interface DailyRewardModalProps {
    visible: boolean;
    currentDay: number; // 1-7
    rewardIcon: string;
    rewardType: RewardType;
    isStreakContinued: boolean;
    onClaim: () => void;
    language?: Language;
}

// Sparkle particle component
function SparkleParticle({ delay, startX, color }: { delay: number; startX: number; color: string }) {
    const translateY = useSharedValue(0);
    const translateX = useSharedValue(startX);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.5);
    const rotation = useSharedValue(0);

     
    useEffect(() => {
        opacity.value = withDelay(delay, withSequence(
            withTiming(1, { duration: 200 }),
            withDelay(1000, withTiming(0, { duration: 500 }))
        ));
        translateY.value = withDelay(delay, withTiming(-150 - Math.random() * 100, {
            duration: 1500,
            easing: Easing.out(Easing.quad)
        }));
        translateX.value = withDelay(delay, withSequence(
            withTiming(startX + (Math.random() - 0.5) * 80, { duration: 750 }),
            withTiming(startX + (Math.random() - 0.5) * 120, { duration: 750 })
        ));
        scale.value = withDelay(delay, withSequence(
            withSpring(1.2),
            withDelay(800, withTiming(0.3, { duration: 500 }))
        ));
        rotation.value = withDelay(delay, withRepeat(
            withTiming(360, { duration: 1000, easing: Easing.linear }),
            2,
            false
        ));
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [
            { translateY: translateY.value },
            { translateX: translateX.value },
            { scale: scale.value },
            { rotate: `${rotation.value}deg` },
        ],
        opacity: opacity.value,
    }));

    return (
        <Animated.Text style={[styles.sparkleParticle, { color }, style]}>
            {Math.random() > 0.5 ? '✨' : '⭐'}
        </Animated.Text>
    );
}

// Day indicator dot
function DayDot({ day, currentDay, isActive }: { day: number; currentDay: number; isActive: boolean }) {
    const completed = day < currentDay;
    const isCurrent = day === currentDay;

    return (
        <View style={[
            styles.dayDot,
            completed && styles.dayDotCompleted,
            isCurrent && styles.dayDotCurrent,
        ]}>
            {completed && <Text style={styles.dayDotCheck}>✓</Text>}
            {isCurrent && <Text style={styles.dayDotNumber}>{day}</Text>}
            {!completed && !isCurrent && <Text style={styles.dayDotNumber}>{day}</Text>}
        </View>
    );
}

export function DailyRewardModal({
    visible,
    currentDay,
    rewardIcon,
    rewardType,
    isStreakContinued,
    onClaim,
    language = 'en',
}: DailyRewardModalProps) {
    const onClaimRef = useRef(onClaim);
    useEffect(() => {
        onClaimRef.current = onClaim;
    });

    const backgroundOpacity = useSharedValue(0);
    const iconScale = useSharedValue(0);
    const iconRotation = useSharedValue(0);
    const contentOpacity = useSharedValue(0);
    const contentTranslateY = useSharedValue(30);
    const dayBarOpacity = useSharedValue(0);
    const buttonOpacity = useSharedValue(0);
    const pulseScale = useSharedValue(1);
    const glowOpacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            // Haptic feedback
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

            // Background fade
            backgroundOpacity.value = withTiming(1, { duration: 300 });

            // Icon entrance with bounce
            iconScale.value = withSequence(
                withDelay(200, withSpring(1.3, { damping: 6, stiffness: 180 })),
                withSpring(1, { damping: 10 })
            );

            // Icon wiggle
            iconRotation.value = withDelay(200, withSequence(
                withTiming(-15, { duration: 100 }),
                withTiming(15, { duration: 100 }),
                withTiming(-10, { duration: 80 }),
                withTiming(10, { duration: 80 }),
                withTiming(0, { duration: 80 })
            ));

            // Pulse animation for special days
            if (rewardType === 'special_celebration' || rewardType === 'streak_freeze') {
                pulseScale.value = withDelay(600, withRepeat(
                    withSequence(
                        withTiming(1.1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
                        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
                    ),
                    -1,
                    true
                ));
                glowOpacity.value = withDelay(400, withRepeat(
                    withSequence(
                        withTiming(0.6, { duration: 800 }),
                        withTiming(0.2, { duration: 800 })
                    ),
                    -1,
                    true
                ));
            }

            // Content entrance
            contentOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
            contentTranslateY.value = withDelay(400, withSpring(0, { damping: 12 }));

            // Day bar entrance
            dayBarOpacity.value = withDelay(500, withTiming(1, { duration: 300 }));

            // Button entrance
            buttonOpacity.value = withDelay(700, withTiming(1, { duration: 300 }));
        } else {
            // Cancel any infinite/repeat animations to prevent memory leaks
            cancelAnimation(pulseScale);
            cancelAnimation(glowOpacity);

            // Reset values
            backgroundOpacity.value = 0;
            iconScale.value = 0;
            iconRotation.value = 0;
            contentOpacity.value = 0;
            contentTranslateY.value = 30;
            dayBarOpacity.value = 0;
            buttonOpacity.value = 0;
            pulseScale.value = 1;
            glowOpacity.value = 0;
        }

        // Cleanup on unmount
        return () => {
            cancelAnimation(pulseScale);
            cancelAnimation(glowOpacity);
        };
    }, [visible, rewardType]);

    const backgroundStyle = useAnimatedStyle(() => ({
        opacity: backgroundOpacity.value,
    }));

    const iconStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: iconScale.value * pulseScale.value },
            { rotate: `${iconRotation.value}deg` },
        ],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    const contentStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
        transform: [{ translateY: contentTranslateY.value }],
    }));

    const dayBarStyle = useAnimatedStyle(() => ({
        opacity: dayBarOpacity.value,
    }));

    const buttonStyle = useAnimatedStyle(() => ({
        opacity: buttonOpacity.value,
    }));

    // Get message based on day
    const getDayMessage = (): string => {
        const messageKey = `day${currentDay}Message` as TranslationKey;
        return t(messageKey, language);
    };

    // Get subtitle based on streak status
    const getSubtitle = (): string => {
        return isStreakContinued ? t('streakContinues', language) : t('streakBroken', language);
    };

    // Get reward-specific bonus text
    const getBonusText = (): string | null => {
        if (rewardType === 'streak_freeze') {
            return t('streakFreezeEarned', language);
        }
        if (rewardType === 'special_celebration') {
            return t('specialBadgeEarned', language);
        }
        return null;
    };

    // Generate sparkle particles
    const sparkleColors = rewardType === 'special_celebration'
        ? ['#FFD700', '#FFA500', '#FFE66D']
        : rewardType === 'streak_freeze'
        ? ['#4FC3F7', '#03A9F4', '#81D4FA']
        : ['#FFE66D', '#4ECDC4', '#FF6B6B'];

    const sparkleParticles = Array.from({ length: 10 }, (_, i) => ({
        delay: i * 100,
        startX: (i % 5 - 2) * 35,
        color: sparkleColors[i % sparkleColors.length],
    }));

    // Determine glow color based on reward type
    const glowColor = rewardType === 'special_celebration'
        ? theme.colors.legendary
        : rewardType === 'streak_freeze'
        ? theme.colors.rare
        : theme.colors.accent;

    const bonusText = getBonusText();

    return (
        <Modal visible={visible} transparent animationType="none">
            <Animated.View style={[styles.overlay, backgroundStyle]}>
                <View style={styles.container}>
                    {/* Sparkle particles */}
                    <View style={styles.particlesContainer}>
                        {sparkleParticles.map((particle, i) => (
                            <SparkleParticle
                                key={i}
                                delay={particle.delay}
                                startX={particle.startX}
                                color={particle.color}
                            />
                        ))}
                    </View>

                    {/* Glow effect for special rewards */}
                    {(rewardType === 'special_celebration' || rewardType === 'streak_freeze') && (
                        <Animated.View
                            style={[
                                styles.glow,
                                { backgroundColor: glowColor },
                                glowStyle,
                            ]}
                        />
                    )}

                    {/* Main reward icon */}
                    <Animated.View style={[styles.iconContainer, iconStyle]}>
                        <Text style={styles.rewardIcon}>{rewardIcon}</Text>
                    </Animated.View>

                    {/* Content */}
                    <Animated.View style={[styles.textContainer, contentStyle]}>
                        <Text style={styles.title}>{t('dailyRewardTitle', language)}</Text>
                        <Text style={[styles.subtitle, isStreakContinued ? styles.subtitleSuccess : styles.subtitleWarning]}>
                            {getSubtitle()}
                        </Text>
                        <Text style={styles.message}>{getDayMessage()}</Text>
                        {bonusText && (
                            <View style={[styles.bonusBadge, { backgroundColor: glowColor }]}>
                                <Text style={styles.bonusText}>{bonusText}</Text>
                            </View>
                        )}
                    </Animated.View>

                    {/* Day progress bar */}
                    <Animated.View style={[styles.dayBar, dayBarStyle]}>
                        <Text style={styles.dayBarLabel}>
                            {t('dayOf7', language)} {currentDay} / 7
                        </Text>
                        <View style={styles.dayDots}>
                            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                                <DayDot
                                    key={day}
                                    day={day}
                                    currentDay={currentDay}
                                    isActive={day <= currentDay}
                                />
                            ))}
                        </View>
                    </Animated.View>

                    {/* Claim button */}
                    <Animated.View style={[styles.buttonContainer, buttonStyle]}>
                        <PixelButton
                            title={t('claimReward', language)}
                            onPress={() => onClaimRef.current()}
                            variant="primary"
                            size="large"
                            icon="🎁"
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
        backgroundColor: theme.colors.semantic.overlayUltra,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        alignItems: 'center',
        padding: theme.spacing.xl,
        width: '100%',
    },
    particlesContainer: {
        position: 'absolute',
        top: '30%',
        alignItems: 'center',
        zIndex: 1, // Particles above glow
        elevation: 1,
        pointerEvents: 'none',
    },
    sparkleParticle: {
        position: 'absolute',
        fontSize: theme.fontSize.xl,
    },
    glow: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: theme.borderRadius.round,
        top: '20%',
        zIndex: 0, // Glow behind everything
        elevation: 0,
    },
    iconContainer: {
        marginBottom: theme.spacing.lg,
        zIndex: 2, // Icon above decorative elements
        elevation: 2,
    },
    rewardIcon: {
        fontSize: 100, // Intentionally oversized reward emoji
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        zIndex: 3, // Text above icon
        elevation: 3,
    },
    title: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.accent,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: theme.fontSize.md,
        fontWeight: theme.fontWeight.semibold,
        marginBottom: theme.spacing.md,
    },
    subtitleSuccess: {
        color: theme.colors.success,
    },
    subtitleWarning: {
        color: theme.colors.warning,
    },
    message: {
        fontSize: theme.fontSize.lg,
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: theme.spacing.md,
        maxWidth: 280,
    },
    bonusBadge: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.round,
        marginTop: theme.spacing.sm,
    },
    bonusText: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.background,
    },
    dayBar: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
        zIndex: 4, // Day bar above text
        elevation: 4,
    },
    dayBarLabel: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    dayDots: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    dayDot: {
        width: 32,
        height: 32,
        borderRadius: theme.borderRadius.lg,
        backgroundColor: theme.colors.surface,
        borderWidth: 2,
        borderColor: theme.colors.textSecondary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayDotCompleted: {
        backgroundColor: theme.colors.success,
        borderColor: theme.colors.success,
    },
    dayDotCurrent: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
        transform: [{ scale: 1.1 }],
    },
    dayDotCheck: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.text,
    },
    dayDotNumber: {
        fontSize: theme.fontSize.xs,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    buttonContainer: {
        marginTop: theme.spacing.md,
        zIndex: 5, // Button always on top
        elevation: 5,
    },
});
