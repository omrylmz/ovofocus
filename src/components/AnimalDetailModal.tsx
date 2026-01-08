import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '../styles/theme';
import { Animal, getRarityColor } from '../data/animals';
import { PixelButton } from './PixelButton';
import { Language, getAnimalName, getAnimalDescription, getRarityLabelI18n, t } from '../i18n/translations';

interface AnimalDetailModalProps {
    visible: boolean;
    animal: Animal | null;
    count: number;
    firstCollectedDate?: string;
    onClose: () => void;
    onSetFavorite?: () => void;
    isFavorite?: boolean;
    language?: Language;
}

// Calculate level and progress
function getLevelInfo(count: number) {
    const levels = [1, 3, 6, 10, 15];
    let level = 1;
    let currentLevelStart = 0;
    let nextLevelRequired = levels[0];

    for (let i = 0; i < levels.length; i++) {
        if (count >= levels[i]) {
            level = i + 1;
            currentLevelStart = levels[i];
            nextLevelRequired = levels[i + 1] || levels[i];
        } else {
            nextLevelRequired = levels[i];
            break;
        }
    }

    const isMaxLevel = level >= 5;
    const progress = isMaxLevel ? 1 : (count - currentLevelStart) / (nextLevelRequired - currentLevelStart);

    return { level, progress, isMaxLevel, nextLevelRequired };
}

// Get bonus description based on level
function getBonusDescription(level: number, language: Language): string {
    const bonuses: Record<number, { en: string; tr: string }> = {
        1: { en: 'No bonus yet', tr: 'Henüz bonus yok' },
        2: { en: 'Enhanced animations', tr: 'Gelişmiş animasyonlar' },
        3: { en: '+2% focus time bonus', tr: '+2% odaklanma bonusu' },
        4: { en: 'Special aura effect', tr: 'Özel aura efekti' },
        5: { en: '+5% focus bonus + Master badge', tr: '+5% odaklanma bonusu + Usta rozeti' },
    };
    return bonuses[level]?.[language] || bonuses[1][language];
}

export function AnimalDetailModal({
    visible,
    animal,
    count,
    firstCollectedDate,
    onClose,
    onSetFavorite,
    isFavorite = false,
    language = 'en',
}: AnimalDetailModalProps) {
    const scale = useSharedValue(0);
    const rotation = useSharedValue(0);
    const backgroundOpacity = useSharedValue(0);
    const bounceValue = useSharedValue(0);
    const heartScale = useSharedValue(1);

    useEffect(() => {
        if (visible && animal) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            backgroundOpacity.value = withTiming(1, { duration: 200 });
            scale.value = withSpring(1, { damping: 12, stiffness: 180 });

            // Gentle bounce animation
            bounceValue.value = withRepeat(
                withSequence(
                    withTiming(-5, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                    withTiming(5, { duration: 1500, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );

            // Small rotation
            rotation.value = withRepeat(
                withSequence(
                    withTiming(-3, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                    withTiming(3, { duration: 2000, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );
        } else {
            scale.value = 0;
            backgroundOpacity.value = 0;
            bounceValue.value = 0;
            rotation.value = 0;
        }
    }, [visible, animal]);

    const handleFavoritePress = () => {
        heartScale.value = withSequence(
            withSpring(1.4, { damping: 5 }),
            withSpring(1, { damping: 8 })
        );
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onSetFavorite?.();
    };

    const animalStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { translateY: bounceValue.value },
            { rotate: `${rotation.value}deg` },
        ],
    }));

    const backgroundStyle = useAnimatedStyle(() => ({
        opacity: backgroundOpacity.value,
    }));

    const heartStyle = useAnimatedStyle(() => ({
        transform: [{ scale: heartScale.value }],
    }));

    if (!animal) return null;

    const rarityColor = getRarityColor(animal.rarity);
    const { level, progress, isMaxLevel, nextLevelRequired } = getLevelInfo(count);

    return (
        <Modal visible={visible} transparent animationType="none">
            <Animated.View style={[styles.overlay, backgroundStyle]}>
                <Pressable style={styles.backdrop} onPress={onClose} />

                <Animated.View style={[styles.container, animalStyle]}>
                    {/* Close button */}
                    <Pressable style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeText}>✕</Text>
                    </Pressable>

                    {/* Favorite button */}
                    {onSetFavorite && (
                        <Pressable style={styles.favoriteButton} onPress={handleFavoritePress}>
                            <Animated.Text style={[styles.favoriteText, heartStyle]}>
                                {isFavorite ? '❤️' : '🤍'}
                            </Animated.Text>
                        </Pressable>
                    )}

                    {/* Animal display */}
                    <View style={[styles.animalCircle, { borderColor: rarityColor }]}>
                        <Text style={styles.animalEmoji}>{animal.emoji}</Text>
                    </View>

                    {/* Name and rarity */}
                    <Text style={styles.animalName}>{getAnimalName(animal.id, language)}</Text>
                    <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
                        <Text style={styles.rarityText}>{getRarityLabelI18n(animal.rarity, language)}</Text>
                    </View>

                    {/* Description */}
                    <Text style={styles.description}>{getAnimalDescription(animal.id, language)}</Text>

                    {/* Stats */}
                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{count}</Text>
                            <Text style={styles.statLabel}>
                                {language === 'tr' ? 'Toplanan' : 'Collected'}
                            </Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, isMaxLevel && { color: rarityColor }]}>
                                {isMaxLevel ? '⭐' : level}
                            </Text>
                            <Text style={styles.statLabel}>
                                {language === 'tr' ? 'Seviye' : 'Level'}
                            </Text>
                        </View>
                    </View>

                    {/* Level progress */}
                    {!isMaxLevel && (
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBar}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${progress * 100}%`, backgroundColor: rarityColor }
                                    ]}
                                />
                            </View>
                            <Text style={styles.progressText}>
                                {count} / {nextLevelRequired}
                            </Text>
                        </View>
                    )}

                    {/* Level bonus */}
                    <View style={[styles.bonusContainer, { borderColor: rarityColor }]}>
                        <Text style={styles.bonusTitle}>
                            {language === 'tr' ? 'Seviye Bonusu' : 'Level Bonus'}
                        </Text>
                        <Text style={styles.bonusText}>
                            {getBonusDescription(level, language)}
                        </Text>
                    </View>

                    {/* First collected date */}
                    {firstCollectedDate && (
                        <Text style={styles.dateText}>
                            {language === 'tr' ? 'İlk toplanan: ' : 'First collected: '}
                            {new Date(firstCollectedDate).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US')}
                        </Text>
                    )}

                    {/* Close button */}
                    <View style={styles.buttonContainer}>
                        <PixelButton
                            title={language === 'tr' ? 'Kapat' : 'Close'}
                            onPress={onClose}
                            variant="secondary"
                            size="medium"
                        />
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        padding: theme.spacing.xl,
        alignItems: 'center',
        width: '85%',
        maxWidth: 340,
        ...theme.shadows.large,
    },
    closeButton: {
        position: 'absolute',
        top: theme.spacing.md,
        right: theme.spacing.md,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: theme.colors.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    favoriteButton: {
        position: 'absolute',
        top: theme.spacing.md,
        left: theme.spacing.md,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    favoriteText: {
        fontSize: 24,
    },
    animalCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: theme.colors.background,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    animalEmoji: {
        fontSize: 64,
    },
    animalName: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
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
        marginBottom: theme.spacing.lg,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: theme.spacing.xl,
        marginBottom: theme.spacing.md,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: theme.fontSize.xxl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    statLabel: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    progressContainer: {
        width: '100%',
        marginBottom: theme.spacing.md,
    },
    progressBar: {
        height: 8,
        backgroundColor: theme.colors.surfaceLight,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: theme.spacing.xs,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    bonusContainer: {
        width: '100%',
        padding: theme.spacing.md,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        marginBottom: theme.spacing.md,
    },
    bonusTitle: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    bonusText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    dateText: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.md,
    },
    buttonContainer: {
        marginTop: theme.spacing.sm,
    },
});
