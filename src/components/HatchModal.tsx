import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
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
import { Animal, getRarityColor } from '../data/animals';
import { PixelButton } from './PixelButton';
import { Language, t, getAnimalName, getAnimalDescription, getRarityLabelI18n } from '../i18n/translations';

interface HatchModalProps {
    visible: boolean;
    animal: Animal | null;
    onClose: () => void;
    language?: Language;
}

export function HatchModal({ visible, animal, onClose, language = 'en' }: HatchModalProps) {
    const scale = useSharedValue(0);
    const rotation = useSharedValue(0);
    const particleOpacity = useSharedValue(0);
    const backgroundOpacity = useSharedValue(0);
    const textOpacity = useSharedValue(0);

    useEffect(() => {
        if (visible && animal) {
            // Trigger haptic
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Background fade in
            backgroundOpacity.value = withTiming(1, { duration: 300 });

            // Particle burst
            particleOpacity.value = withSequence(
                withTiming(1, { duration: 200 }),
                withDelay(500, withTiming(0, { duration: 300 }))
            );

            // Animal pop in
            scale.value = withSequence(
                withDelay(200, withSpring(1.2, { damping: 8 })),
                withSpring(1, { damping: 12 })
            );

            // Rotation celebration
            rotation.value = withSequence(
                withTiming(-10, { duration: 100 }),
                withTiming(10, { duration: 100 }),
                withTiming(-5, { duration: 100 }),
                withTiming(5, { duration: 100 }),
                withTiming(0, { duration: 100 })
            );

            // Text fade in
            textOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
        } else {
            scale.value = 0;
            rotation.value = 0;
            particleOpacity.value = 0;
            backgroundOpacity.value = 0;
            textOpacity.value = 0;
        }
    }, [visible, animal]);

    const animalStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotation.value}deg` },
        ],
    }));

    const particleStyle = useAnimatedStyle(() => ({
        opacity: particleOpacity.value,
        transform: [{ scale: particleOpacity.value }],
    }));

    const backgroundStyle = useAnimatedStyle(() => ({
        opacity: backgroundOpacity.value,
    }));

    const textStyle = useAnimatedStyle(() => ({
        opacity: textOpacity.value,
    }));

    if (!animal) return null;

    const rarityColor = getRarityColor(animal.rarity);

    return (
        <Modal visible={visible} transparent animationType="none">
            <Animated.View style={[styles.overlay, backgroundStyle]}>
                <View style={styles.container}>
                    {/* Particles */}
                    <Animated.View style={[styles.particles, particleStyle]}>
                        <Text style={styles.particleText}>✨ 🎉 ⭐ 💫 ✨</Text>
                    </Animated.View>

                    {/* Animal */}
                    <Animated.View style={[styles.animalContainer, animalStyle]}>
                        <View style={[styles.animalCircle, { borderColor: rarityColor }]}>
                            <Text style={styles.animalEmoji}>{animal.emoji}</Text>
                        </View>
                    </Animated.View>

                    {/* Text */}
                    <Animated.View style={[styles.textContainer, textStyle]}>
                        <Text style={styles.congratsText}>{t('congratulations', language)}</Text>
                        <Text style={styles.animalName}>{getAnimalName(animal.id, language)}</Text>
                        <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
                            <Text style={styles.rarityText}>{getRarityLabelI18n(animal.rarity, language)}</Text>
                        </View>
                        <Text style={styles.description}>{getAnimalDescription(animal.id, language)}</Text>
                    </Animated.View>

                    {/* Close button */}
                    <View style={styles.buttonContainer}>
                        <PixelButton
                            title={t('addToCollection', language)}
                            onPress={onClose}
                            variant="primary"
                            size="large"
                            icon="📦"
                        />
                    </View>
                </View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    particles: {
        position: 'absolute',
        top: 50,
    },
    particleText: {
        fontSize: 40,
        textAlign: 'center',
    },
    animalContainer: {
        marginBottom: theme.spacing.xl,
    },
    animalCircle: {
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: theme.colors.surface,
        borderWidth: 4,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.large,
    },
    animalEmoji: {
        fontSize: 100,
    },
    textContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    congratsText: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.accent,
        marginBottom: theme.spacing.sm,
    },
    animalName: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    rarityBadge: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.round,
        marginBottom: theme.spacing.md,
    },
    rarityText: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.bold,
        color: '#000',
    },
    description: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        maxWidth: 280,
    },
    buttonContainer: {
        marginTop: theme.spacing.lg,
    },
});
