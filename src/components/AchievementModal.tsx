import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, Share } from 'react-native';
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
import ViewShot, { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { theme } from '../styles/theme';
import {
    Achievement,
    getTierColor,
    getAchievementConfettiColors,
    getAchievementParticleCount,
} from '../data/achievements';
import { PixelButton } from './PixelButton';
import { Language, t } from '../i18n/translations';
import { audioManager } from '../services/audioManager';

interface AchievementModalProps {
    visible: boolean;
    achievement: Achievement | null;
    onClose: () => void;
    language?: Language;
}

// Confetti particle component
function ConfettiParticle({ delay, startX, color }: { delay: number; startX: number; color: string }) {
    const translateY = useSharedValue(-50);
    const translateX = useSharedValue(startX);
    const rotate = useSharedValue(0);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(1);

     
    useEffect(() => {
        opacity.value = withDelay(delay, withSequence(
            withTiming(1, { duration: 100 }),
            withDelay(1500, withTiming(0, { duration: 500 }))
        ));
        translateY.value = withDelay(delay, withTiming(300, { duration: 2000, easing: Easing.out(Easing.quad) }));
        translateX.value = withDelay(delay, withSequence(
            withTiming(startX + (Math.random() - 0.5) * 100, { duration: 1000 }),
            withTiming(startX + (Math.random() - 0.5) * 150, { duration: 1000 })
        ));
        rotate.value = withDelay(delay, withRepeat(
            withTiming(360, { duration: 1000, easing: Easing.linear }),
            3,
            false
        ));
        scale.value = withDelay(delay, withSequence(
            withSpring(1.2),
            withDelay(1000, withSpring(0.5))
        ));
    }, [delay, startX, opacity, translateY, translateX, rotate, scale]);

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
        <Animated.View style={[styles.confettiParticle, { backgroundColor: color }, style]} />
    );
}

// Star burst particle for extra celebration
function StarParticle({ delay, angle, distance }: { delay: number; angle: number; distance: number }) {
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.5);

     
    useEffect(() => {
        const radians = (angle * Math.PI) / 180;
        const targetX = Math.cos(radians) * distance;
        const targetY = Math.sin(radians) * distance;

        opacity.value = withDelay(delay, withSequence(
            withTiming(1, { duration: 150 }),
            withDelay(600, withTiming(0, { duration: 300 }))
        ));
        translateX.value = withDelay(delay, withTiming(targetX, { duration: 800, easing: Easing.out(Easing.quad) }));
        translateY.value = withDelay(delay, withTiming(targetY, { duration: 800, easing: Easing.out(Easing.quad) }));
        scale.value = withDelay(delay, withSequence(
            withSpring(1.5, { damping: 6 }),
            withDelay(400, withTiming(0.3, { duration: 300 }))
        ));
    }, [delay, angle, distance, opacity, translateX, translateY, scale]);

    const style = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
        opacity: opacity.value,
    }));

    return (
        <Animated.Text style={[styles.starParticle, style]}>
            {'\u2728'}
        </Animated.Text>
    );
}

export function AchievementModal({
    visible,
    achievement,
    onClose,
    language = 'en',
}: AchievementModalProps) {
    const viewShotRef = useRef<ViewShot>(null);

    // Animation values
    const backgroundOpacity = useSharedValue(0);
    const badgeScale = useSharedValue(0);
    const badgeRotation = useSharedValue(-15);
    const iconScale = useSharedValue(0);
    const textOpacity = useSharedValue(0);
    const textTranslateY = useSharedValue(30);
    const glowPulse = useSharedValue(0);
    const buttonOpacity = useSharedValue(0);
    const buttonTranslateY = useSharedValue(20);

    useEffect(() => {
        if (visible && achievement) {
            // Play celebration sound
            audioManager.playSound('celebration');

            // Haptic feedback based on tier
            if (achievement.tier === 'platinum' || achievement.tier === 'gold') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
            } else {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }

            // Background fade
            backgroundOpacity.value = withTiming(1, { duration: 300 });

            // Badge entrance with bounce
            badgeScale.value = withDelay(150, withSequence(
                withSpring(1.3, { damping: 6, stiffness: 200 }),
                withSpring(1, { damping: 10 })
            ));
            badgeRotation.value = withDelay(150, withSequence(
                withTiming(10, { duration: 100 }),
                withTiming(-10, { duration: 100 }),
                withTiming(5, { duration: 80 }),
                withTiming(-5, { duration: 80 }),
                withSpring(0, { damping: 12 })
            ));

            // Icon pop
            iconScale.value = withDelay(300, withSequence(
                withSpring(1.4, { damping: 5, stiffness: 200 }),
                withSpring(1, { damping: 8 })
            ));

            // Glow pulse
            glowPulse.value = withDelay(400, withRepeat(
                withSequence(
                    withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            ));

            // Text entrance
            textOpacity.value = withDelay(500, withTiming(1, { duration: 300 }));
            textTranslateY.value = withDelay(500, withSpring(0, { damping: 12 }));

            // Button entrance
            buttonOpacity.value = withDelay(800, withTiming(1, { duration: 300 }));
            buttonTranslateY.value = withDelay(800, withSpring(0, { damping: 12 }));

        } else {
            // Reset animations
            cancelAnimation(glowPulse);
            backgroundOpacity.value = 0;
            badgeScale.value = 0;
            badgeRotation.value = -15;
            iconScale.value = 0;
            textOpacity.value = 0;
            textTranslateY.value = 30;
            glowPulse.value = 0;
            buttonOpacity.value = 0;
            buttonTranslateY.value = 20;
        }

        // Cleanup on unmount to prevent memory leaks
        return () => {
            cancelAnimation(glowPulse);
        };
    }, [visible, achievement, backgroundOpacity, badgeScale, badgeRotation, iconScale, textOpacity, textTranslateY, glowPulse, buttonOpacity, buttonTranslateY]);

    const handleShare = useCallback(async () => {
        if (!viewShotRef.current || !achievement) return;

        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Capture the achievement card
            const uri = await captureRef(viewShotRef, {
                format: 'png',
                quality: 1,
            });

            // Check if sharing is available
            const isAvailable = await Sharing.isAvailableAsync();

            if (isAvailable) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'image/png',
                    dialogTitle: t('shareAchievement' as keyof typeof import('../i18n/translations').translations.en, language),
                });
            } else {
                // Fallback to Share API
                await Share.share({
                    message: `${t('achievementUnlocked' as keyof typeof import('../i18n/translations').translations.en, language)}: ${t(`achievement_${achievement.id}` as keyof typeof import('../i18n/translations').translations.en, language)} - Ovo Focus`,
                });
            }
        } catch (error) {
            console.warn('Failed to share achievement:', error);
        }
    }, [achievement, language]);

    const backgroundStyle = useAnimatedStyle(() => ({
        opacity: backgroundOpacity.value,
    }));

    const badgeStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: badgeScale.value },
            { rotate: `${badgeRotation.value}deg` },
        ],
    }));

    const iconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: iconScale.value }],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowPulse.value * 0.6,
        transform: [{ scale: 1 + glowPulse.value * 0.15 }],
    }));

    const textStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
        transform: [{ translateY: textTranslateY.value }],
    }));

    const buttonStyle = useAnimatedStyle(() => ({
        opacity: buttonOpacity.value,
        transform: [{ translateY: buttonTranslateY.value }],
    }));

    if (!achievement) return null;

    const tierColor = getTierColor(achievement.tier);
    const confettiColors = getAchievementConfettiColors(achievement.tier);
    const particleCount = getAchievementParticleCount(achievement.tier);

    // Generate star particles for burst effect
    const starParticles = Array.from({ length: 8 }, (_, i) => ({
        angle: i * 45,
        distance: 80 + Math.random() * 40,
        delay: 200 + i * 50,
    }));

    const achievementLabel = `${t('achievementUnlocked' as keyof typeof import('../i18n/translations').translations.en, language)}: ${t(`achievement_${achievement.id}` as keyof typeof import('../i18n/translations').translations.en, language)}`;

    return (
        <Modal visible={visible} transparent animationType="none">
            <Animated.View style={[styles.overlay, backgroundStyle]}>
                <View
                    style={styles.container}
                    accessible={true}
                    accessibilityViewIsModal={true}
                    accessibilityRole="alert"
                    accessibilityLabel={achievementLabel}
                >
                    {/* Confetti particles */}
                    <View style={styles.confettiContainer}>
                        {confettiColors.slice(0, particleCount).map((color: string, i: number) => (
                            <ConfettiParticle
                                key={i}
                                delay={i * 50}
                                startX={(i % 5 - 2) * 40}
                                color={color}
                            />
                        ))}
                    </View>

                    {/* Shareable card - this gets captured for sharing */}
                    <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
                        <View style={styles.shareableCard}>
                            {/* Star burst particles */}
                            <View style={styles.starBurstContainer}>
                                {starParticles.map((particle, i) => (
                                    <StarParticle
                                        key={i}
                                        delay={particle.delay}
                                        angle={particle.angle}
                                        distance={particle.distance}
                                    />
                                ))}
                            </View>

                            {/* Glow effect */}
                            <Animated.View
                                style={[
                                    styles.glow,
                                    { backgroundColor: tierColor },
                                    glowStyle,
                                ]}
                            />

                            {/* Badge container */}
                            <Animated.View style={[styles.badgeContainer, badgeStyle]}>
                                <View style={[styles.badge, { borderColor: tierColor }]}>
                                    <Animated.Text style={[styles.icon, iconStyle]}>
                                        {achievement.icon}
                                    </Animated.Text>
                                </View>
                            </Animated.View>

                            {/* Achievement text */}
                            <Animated.View style={[styles.textContainer, textStyle]}>
                                <Text style={styles.unlockedText}>
                                    {t('achievementUnlocked' as keyof typeof import('../i18n/translations').translations.en, language)}
                                </Text>
                                <Text style={styles.achievementName}>
                                    {t(`achievement_${achievement.id}` as keyof typeof import('../i18n/translations').translations.en, language)}
                                </Text>
                                <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
                                    <Text style={styles.tierText}>
                                        {t(`tier_${achievement.tier}` as keyof typeof import('../i18n/translations').translations.en, language)}
                                    </Text>
                                </View>
                                <Text style={styles.description}>
                                    {t(`achievement_${achievement.id}_desc` as keyof typeof import('../i18n/translations').translations.en, language)}
                                </Text>
                            </Animated.View>

                            {/* Ovo Focus branding for shared image */}
                            <Text style={styles.branding}>Ovo Focus</Text>
                        </View>
                    </ViewShot>

                    {/* Action buttons */}
                    <Animated.View style={[styles.buttonsContainer, buttonStyle]}>
                        <PixelButton
                            title={t('share' as keyof typeof import('../i18n/translations').translations.en, language)}
                            onPress={handleShare}
                            variant="secondary"
                            size="medium"
                            icon="\uD83D\uDCE4"
                        />
                        <View style={styles.buttonSpacer} />
                        <PixelButton
                            title={t('awesome' as keyof typeof import('../i18n/translations').translations.en, language)}
                            onPress={onClose}
                            variant="primary"
                            size="medium"
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
        zIndex: 1, // Confetti above card
        pointerEvents: 'none',
    },
    confettiParticle: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 2,
    },
    shareableCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.xl,
        alignItems: 'center',
        minWidth: 280,
        overflow: 'hidden', // Clip internal decorative elements
        ...theme.shadows.large,
    },
    starBurstContainer: {
        position: 'absolute',
        top: '35%',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1, // Stars above glow
        pointerEvents: 'none',
    },
    starParticle: {
        position: 'absolute',
        fontSize: 20,
    },
    glow: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        top: 20,
        zIndex: 0, // Glow behind everything
    },
    badgeContainer: {
        marginBottom: theme.spacing.lg,
        zIndex: 2, // Badge above decorative elements
    },
    badge: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: theme.colors.background,
        borderWidth: 4,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.large,
    },
    icon: {
        fontSize: 56,
    },
    textContainer: {
        alignItems: 'center',
        zIndex: 3, // Text above badge
    },
    unlockedText: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.medium,
        color: theme.colors.accent,
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: theme.spacing.xs,
    },
    achievementName: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: theme.spacing.sm,
    },
    tierBadge: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.round,
        marginBottom: theme.spacing.md,
    },
    tierText: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.bold,
        color: '#000',
    },
    description: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        maxWidth: 240,
    },
    branding: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.lg,
        opacity: 0.6,
    },
    buttonsContainer: {
        flexDirection: 'row',
        marginTop: theme.spacing.xl,
        gap: theme.spacing.md,
        zIndex: 4, // Buttons always on top
    },
    buttonSpacer: {
        width: theme.spacing.md,
    },
});
