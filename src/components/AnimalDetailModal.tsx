import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
    interpolateColor,
    runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '../styles/theme';
import { Animal, getRarityColor } from '../data/animals';
import { PixelButton } from './PixelButton';
import { Language, getAnimalName, getAnimalDescription, getRarityLabelI18n, t } from '../i18n/translations';
import { useGame } from '../context/GameContext';
import { AnimalInteraction } from '../utils/storage';

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

// Get happiness level color
function getHappinessColor(level: 'sad' | 'neutral' | 'happy' | 'ecstatic'): string {
    switch (level) {
        case 'sad': return '#FF6B6B';      // Red
        case 'neutral': return '#FFD93D';   // Yellow
        case 'happy': return '#6BCB77';     // Green
        case 'ecstatic': return '#4ECDC4';  // Teal/rainbow
    }
}

// Format cooldown time
function formatCooldown(ms: number, language: Language): string {
    if (ms <= 0) return language === 'tr' ? 'Hazır!' : 'Ready!';

    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
        return language === 'tr' ? `${hours}s ${minutes}d` : `${hours}h ${minutes}m`;
    }
    return language === 'tr' ? `${minutes}d` : `${minutes}m`;
}

// Get happiness emoji based on level
function getHappinessEmoji(level: 'sad' | 'neutral' | 'happy' | 'ecstatic'): string {
    switch (level) {
        case 'sad': return '😢';
        case 'neutral': return '😐';
        case 'happy': return '😊';
        case 'ecstatic': return '🤩';
    }
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
    const { getInteraction, petAnimal, feedAnimal, getPetCooldown, getFeedCooldown, getHappinessLevel } = useGame();

    // Interaction state
    const [interaction, setInteraction] = useState<AnimalInteraction | null>(null);
    const [petCooldown, setPetCooldown] = useState(0);
    const [feedCooldown, setFeedCooldown] = useState(0);

    // Animation values
    const scale = useSharedValue(0);
    const rotation = useSharedValue(0);
    const backgroundOpacity = useSharedValue(0);
    const bounceValue = useSharedValue(0);
    const heartScale = useSharedValue(1);

    // Interaction animation values
    const petButtonScale = useSharedValue(1);
    const feedButtonScale = useSharedValue(1);
    const happinessGlow = useSharedValue(0);
    const floatingHeart = useSharedValue(0);
    const floatingHeartOpacity = useSharedValue(0);

    // Load interaction data when modal opens
    useEffect(() => {
        if (visible && animal) {
            loadInteraction();
        }
    }, [visible, animal]);

    // Update cooldowns every minute
    useEffect(() => {
        if (!visible || !interaction) return;

        const updateCooldowns = () => {
            setPetCooldown(getPetCooldown(interaction));
            setFeedCooldown(getFeedCooldown(interaction));
        };

        updateCooldowns();
        const interval = setInterval(updateCooldowns, 60000); // Update every minute

        return () => clearInterval(interval);
    }, [visible, interaction]);

    const loadInteraction = async () => {
        if (!animal) return;
        const data = await getInteraction(animal.id);
        setInteraction(data);
        setPetCooldown(getPetCooldown(data));
        setFeedCooldown(getFeedCooldown(data));
    };

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

    const handlePet = async () => {
        if (!animal || petCooldown > 0) return;

        // Button press animation
        petButtonScale.value = withSequence(
            withSpring(0.85, { damping: 15 }),
            withSpring(1, { damping: 10 })
        );

        const result = await petAnimal(animal.id);
        if (result.success) {
            setInteraction(result.interaction);
            setPetCooldown(0);

            // Floating hearts animation
            floatingHeartOpacity.value = withSequence(
                withTiming(1, { duration: 100 }),
                withTiming(0, { duration: 800 })
            );
            floatingHeart.value = withSequence(
                withTiming(0, { duration: 0 }),
                withTiming(-40, { duration: 900, easing: Easing.out(Easing.ease) })
            );

            // Happiness glow pulse
            happinessGlow.value = withSequence(
                withTiming(1, { duration: 200 }),
                withTiming(0, { duration: 400 })
            );

            // Bounce the animal
            bounceValue.value = withSequence(
                withSpring(-15, { damping: 8, stiffness: 400 }),
                withSpring(0, { damping: 10 })
            );

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
            setPetCooldown(result.cooldownRemaining);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
    };

    const handleFeed = async () => {
        if (!animal || feedCooldown > 0) return;

        // Button press animation
        feedButtonScale.value = withSequence(
            withSpring(0.85, { damping: 15 }),
            withSpring(1, { damping: 10 })
        );

        const result = await feedAnimal(animal.id);
        if (result.success) {
            setInteraction(result.interaction);
            setFeedCooldown(0);

            // Scale wobble for satisfaction
            scale.value = withSequence(
                withSpring(1.05, { damping: 8 }),
                withSpring(0.95, { damping: 10 }),
                withSpring(1, { damping: 12 })
            );

            // Happiness glow pulse
            happinessGlow.value = withSequence(
                withTiming(1, { duration: 200 }),
                withTiming(0, { duration: 400 })
            );

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
            setFeedCooldown(result.cooldownRemaining);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
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

    const petButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: petButtonScale.value }],
    }));

    const feedButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: feedButtonScale.value }],
    }));

    const floatingHeartStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: floatingHeart.value }],
        opacity: floatingHeartOpacity.value,
    }));

    const happinessGlowStyle = useAnimatedStyle(() => ({
        opacity: happinessGlow.value * 0.5,
    }));

    if (!animal) return null;

    const happinessLevel = interaction ? getHappinessLevel(interaction.happiness) : 'neutral';
    const happinessColor = getHappinessColor(happinessLevel);
    const happinessPercent = interaction ? interaction.happiness : 50;

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

                    {/* Happiness Section */}
                    {interaction && (
                        <View style={styles.happinessSection}>
                            {/* Happiness label */}
                            <Text style={styles.happinessTitle}>
                                {language === 'tr' ? 'Mutluluk' : 'Happiness'}
                            </Text>

                            {/* Happiness meter */}
                            <View style={styles.happinessMeterContainer}>
                                {/* Glow effect */}
                                <Animated.View
                                    style={[
                                        styles.happinessGlow,
                                        { backgroundColor: happinessColor },
                                        happinessGlowStyle,
                                    ]}
                                />

                                <View style={styles.happinessMeter}>
                                    <View
                                        style={[
                                            styles.happinessFill,
                                            {
                                                width: `${happinessPercent}%`,
                                                backgroundColor: happinessColor,
                                            },
                                        ]}
                                    />
                                </View>

                                <View style={styles.happinessInfo}>
                                    <Text style={styles.happinessEmoji}>
                                        {getHappinessEmoji(happinessLevel)}
                                    </Text>
                                    <Text style={[styles.happinessValue, { color: happinessColor }]}>
                                        {happinessPercent}%
                                    </Text>
                                </View>
                            </View>

                            {/* Pet/Feed buttons */}
                            <View style={styles.interactionButtons}>
                                {/* Pet button */}
                                <Animated.View style={[styles.interactionButtonWrapper, petButtonStyle]}>
                                    <Pressable
                                        style={[
                                            styles.interactionButton,
                                            petCooldown > 0 && styles.interactionButtonDisabled,
                                        ]}
                                        onPress={handlePet}
                                        disabled={petCooldown > 0}
                                    >
                                        <Text style={styles.interactionIcon}>🐾</Text>
                                        <Text style={styles.interactionLabel}>
                                            {language === 'tr' ? 'Sevdir' : 'Pet'}
                                        </Text>
                                        {petCooldown > 0 && (
                                            <Text style={styles.cooldownText}>
                                                {formatCooldown(petCooldown, language)}
                                            </Text>
                                        )}
                                    </Pressable>

                                    {/* Floating heart */}
                                    <Animated.Text style={[styles.floatingHeart, floatingHeartStyle]}>
                                        ❤️
                                    </Animated.Text>
                                </Animated.View>

                                {/* Feed button */}
                                <Animated.View style={[styles.interactionButtonWrapper, feedButtonStyle]}>
                                    <Pressable
                                        style={[
                                            styles.interactionButton,
                                            feedCooldown > 0 && styles.interactionButtonDisabled,
                                        ]}
                                        onPress={handleFeed}
                                        disabled={feedCooldown > 0}
                                    >
                                        <Text style={styles.interactionIcon}>🍎</Text>
                                        <Text style={styles.interactionLabel}>
                                            {language === 'tr' ? 'Besle' : 'Feed'}
                                        </Text>
                                        {feedCooldown > 0 && (
                                            <Text style={styles.cooldownText}>
                                                {formatCooldown(feedCooldown, language)}
                                            </Text>
                                        )}
                                    </Pressable>
                                </Animated.View>
                            </View>

                            {/* Interaction stats */}
                            <View style={styles.interactionStats}>
                                <Text style={styles.interactionStatText}>
                                    {language === 'tr'
                                        ? `${interaction.petCount} kez okşandı, ${interaction.feedCount} kez beslendi`
                                        : `Petted ${interaction.petCount}x, Fed ${interaction.feedCount}x`
                                    }
                                </Text>
                            </View>
                        </View>
                    )}

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
    // Happiness section styles
    happinessSection: {
        width: '100%',
        marginBottom: theme.spacing.md,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
    },
    happinessTitle: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
        textAlign: 'center',
    },
    happinessMeterContainer: {
        width: '100%',
        marginBottom: theme.spacing.md,
        position: 'relative',
    },
    happinessGlow: {
        position: 'absolute',
        top: -4,
        left: 0,
        right: 0,
        height: 24,
        borderRadius: theme.borderRadius.md,
    },
    happinessMeter: {
        height: 16,
        backgroundColor: theme.colors.surfaceLight,
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
    },
    happinessFill: {
        height: '100%',
        borderRadius: theme.borderRadius.md,
    },
    happinessInfo: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: theme.spacing.xs,
        gap: theme.spacing.xs,
    },
    happinessEmoji: {
        fontSize: 16,
    },
    happinessValue: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.bold,
    },
    interactionButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: theme.spacing.md,
    },
    interactionButtonWrapper: {
        position: 'relative',
    },
    interactionButton: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        borderWidth: 1,
        borderColor: theme.colors.surfaceLight,
        minWidth: 80,
    },
    interactionButtonDisabled: {
        opacity: 0.5,
    },
    interactionIcon: {
        fontSize: 24,
        marginBottom: 2,
    },
    interactionLabel: {
        fontSize: theme.fontSize.xs,
        fontWeight: theme.fontWeight.semibold,
        color: theme.colors.text,
    },
    cooldownText: {
        fontSize: 9,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    floatingHeart: {
        position: 'absolute',
        top: 0,
        left: '50%',
        marginLeft: -8,
        fontSize: 16,
    },
    interactionStats: {
        marginTop: theme.spacing.sm,
    },
    interactionStatText: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
});
