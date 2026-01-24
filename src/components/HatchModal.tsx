import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withDelay,
    withTiming,
    withRepeat,
    Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '../styles/theme';
import { Animal, getRarityColor, Rarity } from '../data/animals';
import { PixelButton } from './PixelButton';
import { Language, t, getAnimalName, getAnimalDescription, getRarityLabelI18n } from '../i18n/translations';
import { audioManager } from '../services/audioManager';
import { useResponsive } from '../hooks/useResponsive';

interface HatchModalProps {
    visible: boolean;
    animal: Animal | null;
    onClose: (notes?: string) => void;
    language?: Language;
}

const NOTES_MAX_LENGTH = 200;

// Confetti particle component - memoized to prevent re-renders
const ConfettiParticle = React.memo(function ConfettiParticle({ delay, startX, color }: { delay: number; startX: number; color: string }) {
    const translateY = useSharedValue(-50);
    const translateX = useSharedValue(startX);
    const rotate = useSharedValue(0);
    const opacity = useSharedValue(0);
    const scale = useSharedValue(1);

    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally mount-only animation; shared values are stable refs
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
    }, []);

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
});

function HatchModalComponent({ visible, animal, onClose, language = 'en' }: HatchModalProps) {
    const { modalMaxWidth } = useResponsive();
    const scale = useSharedValue(0);
    const rotation = useSharedValue(0);
    const particleOpacity = useSharedValue(0);
    const backgroundOpacity = useSharedValue(0);
    const shinePosition = useSharedValue(-100);
    const auraPulse = useSharedValue(0);
    const bounceValue = useSharedValue(0);

    // Notes state
    const [notes, setNotes] = useState('');

    // Staggered text animations
    const congratsOpacity = useSharedValue(0);
    const congratsTranslateY = useSharedValue(20);
    const nameOpacity = useSharedValue(0);
    const nameTranslateY = useSharedValue(20);
    const rarityOpacity = useSharedValue(0);
    const rarityScale = useSharedValue(0.8);
    const descOpacity = useSharedValue(0);
    const descTranslateY = useSharedValue(15);
    const notesOpacity = useSharedValue(0);
    const notesTranslateY = useSharedValue(15);
    const buttonOpacity = useSharedValue(0);
    const buttonTranslateY = useSharedValue(20);

    // eslint-disable-next-line react-hooks/exhaustive-deps -- Mount-only animation; shared values are stable refs
    useEffect(() => {
        if (visible && animal) {
            // Play celebration sound based on rarity
            if (animal.rarity === 'legendary' || animal.rarity === 'epic') {
                audioManager.playSound('celebration');
            } else {
                audioManager.playSound('session_complete');
            }
            // Play egg crack sound after a short delay
            setTimeout(() => audioManager.playSound('egg_crack'), 150);

            // Trigger haptic based on rarity
            if (animal.rarity === 'legendary') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {}), 200);
            } else if (animal.rarity === 'epic') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            } else {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            }

            // Background fade in
            backgroundOpacity.value = withTiming(1, { duration: 300 });

            // Particle burst
            particleOpacity.value = withSequence(
                withTiming(1, { duration: 200 }),
                withDelay(800, withTiming(0, { duration: 300 }))
            );

            // Animal pop in with bounce
            scale.value = withSequence(
                withDelay(150, withSpring(1.3, { damping: 6, stiffness: 200 })),
                withSpring(1, { damping: 10 })
            );

            // Bounce animation for legendary/epic
            if (animal.rarity === 'legendary' || animal.rarity === 'epic') {
                bounceValue.value = withRepeat(
                    withSequence(
                        withTiming(-10, { duration: 300, easing: Easing.out(Easing.ease) }),
                        withTiming(0, { duration: 300, easing: Easing.in(Easing.ease) })
                    ),
                    3,
                    true
                );
            }

            // Rotation celebration - more dramatic for rare animals
            const rotationIntensity = animal.rarity === 'legendary' ? 15 : animal.rarity === 'epic' ? 10 : 5;
            rotation.value = withSequence(
                withTiming(-rotationIntensity, { duration: 100 }),
                withTiming(rotationIntensity, { duration: 100 }),
                withTiming(-rotationIntensity * 0.5, { duration: 100 }),
                withTiming(rotationIntensity * 0.5, { duration: 100 }),
                withTiming(0, { duration: 100 })
            );

            // Staggered text entrance
            const textBaseDelay = 400;
            congratsOpacity.value = withDelay(textBaseDelay, withTiming(1, { duration: 250 }));
            congratsTranslateY.value = withDelay(textBaseDelay, withSpring(0, { damping: 12 }));

            nameOpacity.value = withDelay(textBaseDelay + 100, withTiming(1, { duration: 250 }));
            nameTranslateY.value = withDelay(textBaseDelay + 100, withSpring(0, { damping: 12 }));

            rarityOpacity.value = withDelay(textBaseDelay + 200, withTiming(1, { duration: 250 }));
            rarityScale.value = withDelay(textBaseDelay + 200, withSpring(1, { damping: 8, stiffness: 200 }));

            descOpacity.value = withDelay(textBaseDelay + 300, withTiming(1, { duration: 250 }));
            descTranslateY.value = withDelay(textBaseDelay + 300, withSpring(0, { damping: 12 }));

            notesOpacity.value = withDelay(textBaseDelay + 400, withTiming(1, { duration: 250 }));
            notesTranslateY.value = withDelay(textBaseDelay + 400, withSpring(0, { damping: 12 }));

            buttonOpacity.value = withDelay(textBaseDelay + 550, withTiming(1, { duration: 300 }));
            buttonTranslateY.value = withDelay(textBaseDelay + 550, withSpring(0, { damping: 12 }));

            // Shine effect - sweeps across the animal
            shinePosition.value = withDelay(500, withRepeat(
                withSequence(
                    withTiming(200, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                    withDelay(2000, withTiming(-100, { duration: 0 }))
                ),
                -1,
                false
            ));

            // Aura pulse for rare animals
            if (animal.rarity === 'legendary' || animal.rarity === 'epic') {
                auraPulse.value = withRepeat(
                    withSequence(
                        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                        withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) })
                    ),
                    -1,
                    true
                );
            }
        } else {
            scale.value = 0;
            rotation.value = 0;
            particleOpacity.value = 0;
            backgroundOpacity.value = 0;
            shinePosition.value = -100;
            auraPulse.value = 0;
            bounceValue.value = 0;
            // Reset staggered text
            congratsOpacity.value = 0;
            congratsTranslateY.value = 20;
            nameOpacity.value = 0;
            nameTranslateY.value = 20;
            rarityOpacity.value = 0;
            rarityScale.value = 0.8;
            descOpacity.value = 0;
            descTranslateY.value = 15;
            notesOpacity.value = 0;
            notesTranslateY.value = 15;
            buttonOpacity.value = 0;
            buttonTranslateY.value = 20;
            // Reset notes state
            setNotes('');
        }
    }, [visible, animal]);

    const animalStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotation.value}deg` },
            { translateY: bounceValue.value },
        ],
    }));

    const particleStyle = useAnimatedStyle(() => ({
        opacity: particleOpacity.value,
        transform: [{ scale: particleOpacity.value }],
    }));

    const backgroundStyle = useAnimatedStyle(() => ({
        opacity: backgroundOpacity.value,
    }));

    const congratsStyle = useAnimatedStyle(() => ({
        opacity: congratsOpacity.value,
        transform: [{ translateY: congratsTranslateY.value }],
    }));

    const nameStyle = useAnimatedStyle(() => ({
        opacity: nameOpacity.value,
        transform: [{ translateY: nameTranslateY.value }],
    }));

    const rarityStyle = useAnimatedStyle(() => ({
        opacity: rarityOpacity.value,
        transform: [{ scale: rarityScale.value }],
    }));

    const descStyle = useAnimatedStyle(() => ({
        opacity: descOpacity.value,
        transform: [{ translateY: descTranslateY.value }],
    }));

    const notesStyle = useAnimatedStyle(() => ({
        opacity: notesOpacity.value,
        transform: [{ translateY: notesTranslateY.value }],
    }));

    const buttonStyle = useAnimatedStyle(() => ({
        opacity: buttonOpacity.value,
        transform: [{ translateY: buttonTranslateY.value }],
    }));

    const shineStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shinePosition.value }],
    }));

    const auraStyle = useAnimatedStyle(() => ({
        opacity: auraPulse.value * 0.6,
        transform: [{ scale: 1 + auraPulse.value * 0.1 }],
    }));

    const handleClose = useCallback(() => {
        onClose(notes.trim() || undefined);
    }, [onClose, notes]);

    // Memoize computed values
    const rarityColor = useMemo(() => animal ? getRarityColor(animal.rarity) : '', [animal]);
    const isRare = useMemo(() => animal ? (animal.rarity === 'legendary' || animal.rarity === 'epic') : false, [animal]);
    const confettiColors = useMemo(() => animal ? getConfettiColors(animal.rarity) : [], [animal]);

    if (!animal) return null;

    return (
        <Modal visible={visible} transparent animationType="none">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoid}
            >
                <Animated.View style={[styles.overlay, backgroundStyle]}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        bounces={true}
                    >
                        <View style={[styles.container, { maxWidth: modalMaxWidth }]}>
                            {/* Confetti particles */}
                            <View style={styles.confettiContainer}>
                                {confettiColors.map((color, i) => (
                                    <ConfettiParticle
                                        key={i}
                                        delay={i * 50}
                                        startX={(i % 5 - 2) * 40}
                                        color={color}
                                    />
                                ))}
                            </View>

                            {/* Emoji particles */}
                            <Animated.View style={[styles.particles, particleStyle]}>
                                <Text style={styles.particleText}>✨ 🎉 ⭐ 💫 ✨</Text>
                            </Animated.View>

                            {/* Aura for rare animals */}
                            {isRare && (
                                <Animated.View
                                    style={[
                                        styles.aura,
                                        { backgroundColor: rarityColor },
                                        auraStyle
                                    ]}
                                />
                            )}

                            {/* Animal */}
                            <Animated.View style={[styles.animalContainer, animalStyle]}>
                                <View style={[styles.animalCircle, { borderColor: rarityColor }]}>
                                    {/* Shine overlay */}
                                    <View style={styles.shineContainer}>
                                        <Animated.View style={[styles.shine, shineStyle]} />
                                    </View>
                                    <Text style={styles.animalEmoji}>{animal.emoji}</Text>
                                </View>
                            </Animated.View>

                            {/* Text with staggered animation */}
                            <View style={styles.textContainer}>
                                <Animated.Text style={[styles.congratsText, congratsStyle]}>
                                    {t('congratulations', language)}
                                </Animated.Text>
                                <Animated.Text style={[styles.animalName, nameStyle]}>
                                    {getAnimalName(animal.id, language)}
                                </Animated.Text>
                                <Animated.View style={[styles.rarityBadge, { backgroundColor: rarityColor }, rarityStyle]}>
                                    <Text style={styles.rarityText}>{getRarityLabelI18n(animal.rarity, language)}</Text>
                                </Animated.View>
                                <Animated.Text style={[styles.description, descStyle]}>
                                    {getAnimalDescription(animal.id, language)}
                                </Animated.Text>
                            </View>

                            {/* Session Notes Input */}
                            <Animated.View style={[styles.notesContainer, notesStyle]}>
                                <View style={styles.notesHeader}>
                                    <Text style={styles.notesLabel}>{t('sessionNotes', language)}</Text>
                                    <Text style={styles.notesOptional}>({t('optional', language)})</Text>
                                </View>
                                <TextInput
                                    style={styles.notesInput}
                                    placeholder={t('sessionNotesPlaceholder', language)}
                                    placeholderTextColor={theme.colors.textSecondary}
                                    value={notes}
                                    onChangeText={(text) => setNotes(text.slice(0, NOTES_MAX_LENGTH))}
                                    multiline
                                    maxLength={NOTES_MAX_LENGTH}
                                    textAlignVertical="top"
                                />
                                <Text style={styles.notesCharCount}>{notes.length}/{NOTES_MAX_LENGTH}</Text>
                            </Animated.View>

                            {/* Close button with animation */}
                            <Animated.View style={[styles.buttonContainer, buttonStyle]}>
                                <PixelButton
                                    title={t('addToCollection', language)}
                                    onPress={handleClose}
                                    variant="primary"
                                    size="large"
                                    icon="📦"
                                />
                            </Animated.View>
                        </View>
                    </ScrollView>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

function getConfettiColors(rarity: Rarity): string[] {
    const baseColors = ['#FFE66D', '#FF6B6B', '#4ECDC4', '#BA68C8', '#4FC3F7'];

    switch (rarity) {
        case 'legendary':
            return ['#FFD700', '#FFA500', '#FFE66D', '#FFFF00', '#FFD700', '#FFA500', '#FFE66D', '#FFFF00', '#FFD700', '#FFA500', '#FFE66D', '#FFFF00', '#FFD700', '#FFA500', '#FFE66D'];
        case 'epic':
            return ['#BA68C8', '#9C27B0', '#E1BEE7', '#7B1FA2', '#BA68C8', '#9C27B0', '#E1BEE7', '#7B1FA2', '#BA68C8', '#9C27B0', '#E1BEE7', '#7B1FA2'];
        case 'rare':
            return ['#4FC3F7', '#03A9F4', '#81D4FA', '#0288D1', '#4FC3F7', '#03A9F4', '#81D4FA', '#0288D1'];
        default:
            return baseColors;
    }
}

const styles = StyleSheet.create({
    keyboardAvoid: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
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
    confettiParticle: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 2,
    },
    particles: {
        position: 'absolute',
        top: 50,
    },
    particleText: {
        fontSize: 40,
        textAlign: 'center',
    },
    aura: {
        position: 'absolute',
        width: 240,
        height: 240,
        borderRadius: 120,
    },
    animalContainer: {
        marginBottom: theme.spacing.lg,
    },
    animalCircle: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: theme.colors.surface,
        borderWidth: 4,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        ...theme.shadows.large,
    },
    shineContainer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    shine: {
        position: 'absolute',
        width: 60,
        height: 200,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        transform: [{ rotate: '20deg' }],
        top: -20,
    },
    animalEmoji: {
        fontSize: 80,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    congratsText: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.accent,
        marginBottom: theme.spacing.xs,
    },
    animalName: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    rarityBadge: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.round,
        marginBottom: theme.spacing.sm,
    },
    rarityText: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.bold,
        color: '#000',
    },
    description: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        maxWidth: 280,
    },
    notesContainer: {
        width: '100%',
        maxWidth: 300,
        marginBottom: theme.spacing.md,
    },
    notesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.xs,
    },
    notesLabel: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.medium,
        color: theme.colors.text,
    },
    notesOptional: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginLeft: theme.spacing.xs,
    },
    notesInput: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.surfaceLight,
        padding: theme.spacing.sm,
        color: theme.colors.text,
        fontSize: theme.fontSize.sm,
        minHeight: 60,
        maxHeight: 100,
    },
    notesCharCount: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        textAlign: 'right',
        marginTop: theme.spacing.xs,
    },
    buttonContainer: {
        marginTop: theme.spacing.sm,
    },
});

// Export memoized component to prevent unnecessary re-renders
HatchModalComponent.displayName = 'HatchModal';
export const HatchModal = React.memo(HatchModalComponent);
