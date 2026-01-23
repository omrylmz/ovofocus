import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withSequence,
    withTiming,
    withDelay,
    Easing,
    interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '../styles/theme';
import { Animal, getRarityColor } from '../data/animals';
import { PixelButton } from './PixelButton';
import { Language, getAnimalName, getAnimalDescription, getRarityLabelI18n } from '../i18n/translations';
import { useGame } from '../context/GameContext';
import { AnimalInteraction } from '../utils/storage';
import { getLevelBonusDescription, getAnimalLevel, LEVEL_THRESHOLDS } from '../utils/levelBonuses';

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

// Calculate level progress using canonical level calculation
function getLevelProgress(count: number) {
    const level = getAnimalLevel(count);
    const isMaxLevel = level >= 5;
    const currentLevelStart = LEVEL_THRESHOLDS[level - 1];
    const nextLevelRequired = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[4];
    const progress = isMaxLevel ? 1 : (count - currentLevelStart) / (nextLevelRequired - currentLevelStart);
    return { level, progress, isMaxLevel, nextLevelRequired };
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
    if (ms <= 0) return language === 'tr' ? 'Hazir!' : language === 'es' ? 'Listo!' : 'Ready!';

    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
        if (language === 'tr') return `${hours}sa ${minutes}dk`;
        if (language === 'es') return `${hours}h ${minutes}m`;
        return `${hours}h ${minutes}m`;
    }
    if (language === 'tr') return `${minutes}dk`;
    if (language === 'es') return `${minutes}m`;
    return `${minutes}m`;
}

// Get happiness emoji based on level
function getHappinessEmoji(level: 'sad' | 'neutral' | 'happy' | 'ecstatic'): string {
    switch (level) {
        case 'sad': return '\u{1F622}';
        case 'neutral': return '\u{1F610}';
        case 'happy': return '\u{1F60A}';
        case 'ecstatic': return '\u{1F929}';
    }
}

// Format date for display
function formatDate(dateString: string, language: Language): string {
    const date = new Date(dateString);
    const locale = language === 'tr' ? 'tr-TR' : language === 'es' ? 'es-ES' : 'en-US';
    return date.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
}

// Get relative time string
function getRelativeTime(dateString: string, language: Language): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return language === 'tr' ? 'Bugun' : language === 'es' ? 'Hoy' : 'Today';
    } else if (diffDays === 1) {
        return language === 'tr' ? 'Dun' : language === 'es' ? 'Ayer' : 'Yesterday';
    } else if (diffDays < 7) {
        return language === 'tr' ? `${diffDays} gun once` : language === 'es' ? `Hace ${diffDays} dias` : `${diffDays} days ago`;
    } else {
        return formatDate(dateString, language);
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
    const { getInteraction, petAnimal, feedAnimal, getPetCooldown, getFeedCooldown, getHappinessLevel, state } = useGame();

    // Interaction state
    const [interaction, setInteraction] = useState<AnimalInteraction | null>(null);
    const [petCooldown, setPetCooldown] = useState(0);
    const [feedCooldown, setFeedCooldown] = useState(0);

    // Get collection history from state
    const collectionHistory = useMemo(() => {
        if (!animal) return [];
        return state.collection
            .filter(a => a.id === animal.id)
            .map(a => a.collectedAt)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
            .slice(0, 5); // Show last 5 collections
    }, [animal, state.collection]);

    // Modal entrance/exit animation values
    const modalScale = useSharedValue(0);
    const modalOpacity = useSharedValue(0);
    const backdropOpacity = useSharedValue(0);
    const contentTranslateY = useSharedValue(50);

    // Animal animation values
    const bounceValue = useSharedValue(0);
    const rotation = useSharedValue(0);

    // Favorite button animation values
    const heartScale = useSharedValue(1);
    const heartRotation = useSharedValue(0);
    const heartGlow = useSharedValue(0);
    const heartBounce = useSharedValue(0);

    // Staggered content animation values
    const headerOpacity = useSharedValue(0);
    const statsOpacity = useSharedValue(0);
    const historyOpacity = useSharedValue(0);
    const happinessOpacity = useSharedValue(0);
    const progressOpacity = useSharedValue(0);
    const bonusOpacity = useSharedValue(0);
    const buttonOpacity = useSharedValue(0);

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
        const interval = setInterval(updateCooldowns, 60000);

        return () => clearInterval(interval);
    }, [visible, interaction]);

    const loadInteraction = async () => {
        if (!animal) return;
        const data = await getInteraction(animal.id);
        setInteraction(data);
        setPetCooldown(getPetCooldown(data));
        setFeedCooldown(getFeedCooldown(data));
    };

    // Entrance animations
    useEffect(() => {
        if (visible && animal) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

            // Backdrop fade in
            backdropOpacity.value = withTiming(1, { duration: 250 });

            // Modal scale and opacity with spring
            modalScale.value = withSpring(1, {
                damping: 12,
                stiffness: 180,
                mass: 0.8,
            });
            modalOpacity.value = withTiming(1, { duration: 200 });
            contentTranslateY.value = withSpring(0, { damping: 15, stiffness: 200 });

            // Gentle bounce animation for the animal
            bounceValue.value = withDelay(200, withRepeat(
                withSequence(
                    withTiming(-5, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                    withTiming(5, { duration: 1500, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            ));

            // Small rotation
            rotation.value = withDelay(200, withRepeat(
                withSequence(
                    withTiming(-3, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                    withTiming(3, { duration: 2000, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            ));

            // Staggered content entrance
            const baseDelay = 150;
            headerOpacity.value = withDelay(baseDelay, withSpring(1, { damping: 15 }));
            statsOpacity.value = withDelay(baseDelay + 50, withSpring(1, { damping: 15 }));
            historyOpacity.value = withDelay(baseDelay + 100, withSpring(1, { damping: 15 }));
            happinessOpacity.value = withDelay(baseDelay + 150, withSpring(1, { damping: 15 }));
            progressOpacity.value = withDelay(baseDelay + 200, withSpring(1, { damping: 15 }));
            bonusOpacity.value = withDelay(baseDelay + 250, withSpring(1, { damping: 15 }));
            buttonOpacity.value = withDelay(baseDelay + 300, withSpring(1, { damping: 15 }));

            // Favorite heart pulse if already favorited
            if (isFavorite) {
                heartGlow.value = withRepeat(
                    withSequence(
                        withTiming(1, { duration: 1500 }),
                        withTiming(0.3, { duration: 1500 })
                    ),
                    -1,
                    true
                );
            }
        }
    }, [visible, animal, isFavorite]);

    // Handle close with exit animation
    const handleClose = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Exit animations
        backdropOpacity.value = withTiming(0, { duration: 200 });
        modalScale.value = withSpring(0.9, { damping: 20, stiffness: 300 });
        modalOpacity.value = withTiming(0, { duration: 200 });
        contentTranslateY.value = withTiming(30, { duration: 200 });

        // Reset all staggered animations
        headerOpacity.value = withTiming(0, { duration: 150 });
        statsOpacity.value = withTiming(0, { duration: 150 });
        historyOpacity.value = withTiming(0, { duration: 150 });
        happinessOpacity.value = withTiming(0, { duration: 150 });
        progressOpacity.value = withTiming(0, { duration: 150 });
        bonusOpacity.value = withTiming(0, { duration: 150 });
        buttonOpacity.value = withTiming(0, { duration: 150 });

        // Delay actual close to let animation complete
        setTimeout(() => {
            onClose();
        }, 250);
    }, [onClose]);

    // Reset animations when modal becomes not visible
    useEffect(() => {
        if (!visible) {
            modalScale.value = 0;
            modalOpacity.value = 0;
            backdropOpacity.value = 0;
            contentTranslateY.value = 50;
            bounceValue.value = 0;
            rotation.value = 0;
            headerOpacity.value = 0;
            statsOpacity.value = 0;
            historyOpacity.value = 0;
            happinessOpacity.value = 0;
            progressOpacity.value = 0;
            bonusOpacity.value = 0;
            buttonOpacity.value = 0;
            heartGlow.value = 0;
        }
    }, [visible]);

    const handleFavoritePress = () => {
        // Dramatic heart animation
        heartScale.value = withSequence(
            withSpring(0.7, { damping: 3, stiffness: 400 }),
            withSpring(1.5, { damping: 4, stiffness: 200 }),
            withSpring(1, { damping: 8, stiffness: 300 })
        );

        // Rotation wiggle
        heartRotation.value = withSequence(
            withTiming(-15, { duration: 50 }),
            withTiming(15, { duration: 100 }),
            withTiming(-10, { duration: 100 }),
            withTiming(10, { duration: 100 }),
            withTiming(0, { duration: 100 })
        );

        // Bounce effect
        heartBounce.value = withSequence(
            withSpring(-10, { damping: 5, stiffness: 400 }),
            withSpring(0, { damping: 10, stiffness: 300 })
        );

        // Toggle glow based on new state
        if (!isFavorite) {
            heartGlow.value = withSequence(
                withTiming(1, { duration: 200 }),
                withRepeat(
                    withSequence(
                        withTiming(1, { duration: 1500 }),
                        withTiming(0.3, { duration: 1500 })
                    ),
                    -1,
                    true
                )
            );
        } else {
            heartGlow.value = withTiming(0, { duration: 300 });
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSetFavorite?.();
    };

    const handlePet = async () => {
        if (!animal || petCooldown > 0) return;

        petButtonScale.value = withSequence(
            withSpring(0.85, { damping: 15 }),
            withSpring(1, { damping: 10 })
        );

        const result = await petAnimal(animal.id);
        if (result.success) {
            setInteraction(result.interaction);
            setPetCooldown(0);

            floatingHeartOpacity.value = withSequence(
                withTiming(1, { duration: 100 }),
                withTiming(0, { duration: 800 })
            );
            floatingHeart.value = withSequence(
                withTiming(0, { duration: 0 }),
                withTiming(-40, { duration: 900, easing: Easing.out(Easing.ease) })
            );

            happinessGlow.value = withSequence(
                withTiming(1, { duration: 200 }),
                withTiming(0, { duration: 400 })
            );

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

        feedButtonScale.value = withSequence(
            withSpring(0.85, { damping: 15 }),
            withSpring(1, { damping: 10 })
        );

        const result = await feedAnimal(animal.id);
        if (result.success) {
            setInteraction(result.interaction);
            setFeedCooldown(0);

            modalScale.value = withSequence(
                withSpring(1.03, { damping: 8 }),
                withSpring(0.97, { damping: 10 }),
                withSpring(1, { damping: 12 })
            );

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

    // Animated styles
    const backdropStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value,
    }));

    const modalStyle = useAnimatedStyle(() => ({
        opacity: modalOpacity.value,
        transform: [
            { scale: modalScale.value },
            { translateY: contentTranslateY.value },
        ],
    }));

    const animalStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: bounceValue.value },
            { rotate: `${rotation.value}deg` },
        ],
    }));

    const heartStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: heartScale.value },
            { rotate: `${heartRotation.value}deg` },
            { translateY: heartBounce.value },
        ],
    }));

    const heartGlowStyle = useAnimatedStyle(() => ({
        opacity: heartGlow.value * 0.6,
        transform: [{ scale: 1 + heartGlow.value * 0.3 }],
    }));

    const headerStyle = useAnimatedStyle(() => ({
        opacity: headerOpacity.value,
        transform: [{ translateY: interpolate(headerOpacity.value, [0, 1], [10, 0]) }],
    }));

    const statsStyle = useAnimatedStyle(() => ({
        opacity: statsOpacity.value,
        transform: [{ translateY: interpolate(statsOpacity.value, [0, 1], [10, 0]) }],
    }));

    const historyStyle = useAnimatedStyle(() => ({
        opacity: historyOpacity.value,
        transform: [{ translateY: interpolate(historyOpacity.value, [0, 1], [10, 0]) }],
    }));

    const happinessStyle = useAnimatedStyle(() => ({
        opacity: happinessOpacity.value,
        transform: [{ translateY: interpolate(happinessOpacity.value, [0, 1], [10, 0]) }],
    }));

    const progressStyle = useAnimatedStyle(() => ({
        opacity: progressOpacity.value,
        transform: [{ translateY: interpolate(progressOpacity.value, [0, 1], [10, 0]) }],
    }));

    const bonusStyle = useAnimatedStyle(() => ({
        opacity: bonusOpacity.value,
        transform: [{ translateY: interpolate(bonusOpacity.value, [0, 1], [10, 0]) }],
    }));

    const buttonContainerStyle = useAnimatedStyle(() => ({
        opacity: buttonOpacity.value,
        transform: [{ translateY: interpolate(buttonOpacity.value, [0, 1], [10, 0]) }],
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

    const happinessGlowAnimStyle = useAnimatedStyle(() => ({
        opacity: happinessGlow.value * 0.5,
    }));

    if (!animal) return null;

    const happinessLevel = interaction ? getHappinessLevel(interaction.happiness) : 'neutral';
    const happinessColor = getHappinessColor(happinessLevel);
    const happinessPercent = interaction ? interaction.happiness : 50;

    const rarityColor = getRarityColor(animal.rarity);
    const { level, progress, isMaxLevel, nextLevelRequired } = getLevelProgress(count);

    // Collection history text
    const collectionHistoryLabel = language === 'tr' ? 'Son Toplanmalar' : language === 'es' ? 'Historial de Coleccion' : 'Collection History';
    const timesCollectedLabel = language === 'tr' ? 'kez toplandi' : language === 'es' ? 'veces coleccionado' : 'times collected';

    return (
        <Modal visible={visible} transparent animationType="none">
            <View style={styles.modalContainer}>
                {/* Animated backdrop */}
                <Animated.View style={[styles.backdrop, backdropStyle]}>
                    <Pressable style={styles.backdropPressable} onPress={handleClose} />
                </Animated.View>

                {/* Animated modal content */}
                <Animated.View style={[styles.container, modalStyle]}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        {/* Close button */}
                        <Pressable style={styles.closeButton} onPress={handleClose}>
                            <Text style={styles.closeText}>{'\u2715'}</Text>
                        </Pressable>

                        {/* Prominent Favorite button */}
                        {onSetFavorite && (
                            <Pressable style={styles.favoriteButton} onPress={handleFavoritePress}>
                                {/* Glow effect behind heart */}
                                <Animated.View
                                    style={[
                                        styles.heartGlow,
                                        { backgroundColor: theme.colors.primary },
                                        heartGlowStyle
                                    ]}
                                />
                                <Animated.View style={heartStyle}>
                                    <Text style={styles.favoriteText}>
                                        {isFavorite ? '\u2764\uFE0F' : '\u{1F90D}'}
                                    </Text>
                                </Animated.View>
                            </Pressable>
                        )}

                        {/* Animal display with animations */}
                        <Animated.View style={[styles.animalWrapper, headerStyle]}>
                            <Animated.View style={[styles.animalCircle, { borderColor: rarityColor }, animalStyle]}>
                                <Text style={styles.animalEmoji}>{animal.emoji}</Text>
                            </Animated.View>
                        </Animated.View>

                        {/* Name and rarity */}
                        <Animated.View style={[styles.nameContainer, headerStyle]}>
                            <Text style={styles.animalName}>{getAnimalName(animal.id, language)}</Text>
                            <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
                                <Text style={styles.rarityText}>{getRarityLabelI18n(animal.rarity, language)}</Text>
                            </View>
                        </Animated.View>

                        {/* Description */}
                        <Animated.Text style={[styles.description, headerStyle]}>
                            {getAnimalDescription(animal.id, language)}
                        </Animated.Text>

                        {/* Stats */}
                        <Animated.View style={[styles.statsContainer, statsStyle]}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{count}</Text>
                                <Text style={styles.statLabel}>
                                    {language === 'tr' ? 'Toplanan' : language === 'es' ? 'Coleccionado' : 'Collected'}
                                </Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, isMaxLevel && { color: rarityColor }]}>
                                    {isMaxLevel ? '\u2B50' : level}
                                </Text>
                                <Text style={styles.statLabel}>
                                    {language === 'tr' ? 'Seviye' : language === 'es' ? 'Nivel' : 'Level'}
                                </Text>
                            </View>
                        </Animated.View>

                        {/* Collection History Section */}
                        {collectionHistory.length > 0 && (
                            <Animated.View style={[styles.historySection, historyStyle]}>
                                <Text style={styles.historySectionTitle}>{collectionHistoryLabel}</Text>
                                <Text style={styles.historySubtitle}>
                                    {count} {timesCollectedLabel}
                                </Text>
                                <View style={styles.historyList}>
                                    {collectionHistory.map((dateStr, index) => (
                                        <View key={`${dateStr}-${index}`} style={styles.historyItem}>
                                            <View style={[styles.historyDot, { backgroundColor: rarityColor }]} />
                                            <Text style={styles.historyDate}>
                                                {getRelativeTime(dateStr, language)}
                                            </Text>
                                            {index === 0 && (
                                                <View style={[styles.latestBadge, { backgroundColor: rarityColor }]}>
                                                    <Text style={styles.latestBadgeText}>
                                                        {language === 'tr' ? 'Son' : language === 'es' ? 'Ultimo' : 'Latest'}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    ))}
                                    {count > 5 && (
                                        <Text style={styles.historyMore}>
                                            +{count - 5} {language === 'tr' ? 'daha' : language === 'es' ? 'mas' : 'more'}
                                        </Text>
                                    )}
                                </View>
                            </Animated.View>
                        )}

                        {/* Happiness Section */}
                        {interaction && (
                            <Animated.View style={[styles.happinessSection, happinessStyle]}>
                                <Text style={styles.happinessTitle}>
                                    {language === 'tr' ? 'Mutluluk' : language === 'es' ? 'Felicidad' : 'Happiness'}
                                </Text>

                                <View style={styles.happinessMeterContainer}>
                                    <Animated.View
                                        style={[
                                            styles.happinessGlow,
                                            { backgroundColor: happinessColor },
                                            happinessGlowAnimStyle,
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

                                <View style={styles.interactionButtons}>
                                    <Animated.View style={[styles.interactionButtonWrapper, petButtonStyle]}>
                                        <Pressable
                                            style={[
                                                styles.interactionButton,
                                                petCooldown > 0 && styles.interactionButtonDisabled,
                                            ]}
                                            onPress={handlePet}
                                            disabled={petCooldown > 0}
                                        >
                                            <Text style={styles.interactionIcon}>{'\u{1F43E}'}</Text>
                                            <Text style={styles.interactionLabel}>
                                                {language === 'tr' ? 'Sevdir' : language === 'es' ? 'Acariciar' : 'Pet'}
                                            </Text>
                                            {petCooldown > 0 && (
                                                <Text style={styles.cooldownText}>
                                                    {formatCooldown(petCooldown, language)}
                                                </Text>
                                            )}
                                        </Pressable>

                                        <Animated.Text style={[styles.floatingHeart, floatingHeartStyle]}>
                                            {'\u2764\uFE0F'}
                                        </Animated.Text>
                                    </Animated.View>

                                    <Animated.View style={[styles.interactionButtonWrapper, feedButtonStyle]}>
                                        <Pressable
                                            style={[
                                                styles.interactionButton,
                                                feedCooldown > 0 && styles.interactionButtonDisabled,
                                            ]}
                                            onPress={handleFeed}
                                            disabled={feedCooldown > 0}
                                        >
                                            <Text style={styles.interactionIcon}>{'\u{1F34E}'}</Text>
                                            <Text style={styles.interactionLabel}>
                                                {language === 'tr' ? 'Besle' : language === 'es' ? 'Alimentar' : 'Feed'}
                                            </Text>
                                            {feedCooldown > 0 && (
                                                <Text style={styles.cooldownText}>
                                                    {formatCooldown(feedCooldown, language)}
                                                </Text>
                                            )}
                                        </Pressable>
                                    </Animated.View>
                                </View>

                                <View style={styles.interactionStats}>
                                    <Text style={styles.interactionStatText}>
                                        {language === 'tr'
                                            ? `${interaction.petCount} kez oksandi, ${interaction.feedCount} kez beslendi`
                                            : language === 'es'
                                            ? `Acariciado ${interaction.petCount}x, Alimentado ${interaction.feedCount}x`
                                            : `Petted ${interaction.petCount}x, Fed ${interaction.feedCount}x`
                                        }
                                    </Text>
                                </View>
                            </Animated.View>
                        )}

                        {/* Level progress */}
                        {!isMaxLevel && (
                            <Animated.View style={[styles.progressContainer, progressStyle]}>
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
                            </Animated.View>
                        )}

                        {/* Level bonus */}
                        <Animated.View style={[styles.bonusContainer, { borderColor: rarityColor }, bonusStyle]}>
                            <Text style={styles.bonusTitle}>
                                {language === 'tr' ? 'Seviye Bonusu' : language === 'es' ? 'Bono de Nivel' : 'Level Bonus'}
                            </Text>
                            <Text style={styles.bonusText}>
                                {getLevelBonusDescription(level, language)}
                            </Text>
                        </Animated.View>

                        {/* First collected date */}
                        {firstCollectedDate && (
                            <Animated.Text style={[styles.dateText, bonusStyle]}>
                                {language === 'tr' ? 'Ilk toplanan: ' : language === 'es' ? 'Primera coleccion: ' : 'First collected: '}
                                {new Date(firstCollectedDate).toLocaleDateString(
                                    language === 'tr' ? 'tr-TR' : language === 'es' ? 'es-ES' : 'en-US'
                                )}
                            </Animated.Text>
                        )}

                        {/* Close button */}
                        <Animated.View style={[styles.buttonContainer, buttonContainerStyle]}>
                            <PixelButton
                                title={language === 'tr' ? 'Kapat' : language === 'es' ? 'Cerrar' : 'Close'}
                                onPress={handleClose}
                                variant="secondary"
                                size="medium"
                            />
                        </Animated.View>
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
    },
    backdropPressable: {
        flex: 1,
    },
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.xl,
        width: '85%',
        maxWidth: 340,
        maxHeight: '85%',
        ...theme.shadows.large,
    },
    scrollContent: {
        padding: theme.spacing.xl,
        alignItems: 'center',
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
        zIndex: 10,
    },
    closeText: {
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    favoriteButton: {
        position: 'absolute',
        top: theme.spacing.md,
        left: theme.spacing.md,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    heartGlow: {
        position: 'absolute',
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    favoriteText: {
        fontSize: 28,
    },
    animalWrapper: {
        marginBottom: theme.spacing.md,
    },
    animalCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: theme.colors.background,
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
    },
    animalEmoji: {
        fontSize: 64,
    },
    nameContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.md,
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
    // Collection History styles
    historySection: {
        width: '100%',
        marginBottom: theme.spacing.md,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
    },
    historySectionTitle: {
        fontSize: theme.fontSize.sm,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
    },
    historySubtitle: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.sm,
    },
    historyList: {
        gap: theme.spacing.xs,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
    },
    historyDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    historyDate: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.text,
        flex: 1,
    },
    latestBadge: {
        paddingHorizontal: theme.spacing.xs,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.sm,
    },
    latestBadgeText: {
        fontSize: 10,
        fontWeight: theme.fontWeight.bold,
        color: '#000',
    },
    historyMore: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
        marginLeft: theme.spacing.md + 8,
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
