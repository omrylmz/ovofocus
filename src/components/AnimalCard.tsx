import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, AccessibilityState } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withSequence,
    withTiming,
    withDelay,
    useSharedValue,
    Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { theme } from '../styles/theme';
import { Animal, getRarityColor, Rarity } from '../data/animals';
import { Language, getAnimalName, getRarityLabelI18n } from '../i18n/translations';
import { getAnimalLevel } from '../utils/levelBonuses';

interface AnimalCardProps {
    animal: Animal;
    collected?: boolean;
    count?: number;
    onPress?: () => void;
    size?: 'small' | 'medium' | 'large';
    language?: Language;
    entranceDelay?: number;  // For staggered entrance animations
    customWidth?: number;    // Override width for responsive layouts
}

export function AnimalCard({
    animal,
    collected = true,
    count = 1,
    onPress,
    size = 'medium',
    language = 'en',
    entranceDelay,
    customWidth,
}: AnimalCardProps) {
    const scale = useSharedValue(1);
    const rotation = useSharedValue(0);
    const idleOffset = useSharedValue(0);
    const shinePosition = useSharedValue(-50);
    const glowOpacity = useSharedValue(0);

    // Entrance animation values
    const entranceOpacity = useSharedValue(entranceDelay !== undefined ? 0 : 1);
    const entranceTranslateY = useSharedValue(entranceDelay !== undefined ? 20 : 0);

    const level = getAnimalLevel(count);
    const isMaxLevel = level >= 5;
    const rarityColor = getRarityColor(animal.rarity);
    const sizeStyles = getSizeStyles(size, customWidth);

    // Accessibility labels and hints
    const a11y = useMemo(() => {
        const animalName = getAnimalName(animal.id, language);
        const rarityLabel = getRarityLabelI18n(animal.rarity, language);

        if (!collected) {
            return {
                label: language === 'tr' ? 'Bilinmeyen hayvan' : 'Unknown animal',
                hint: language === 'tr'
                    ? 'Bu hayvanı keşfetmek için odaklanma seanslarını tamamlayın'
                    : 'Complete focus sessions to discover this animal',
            };
        }

        const countText = count > 1
            ? (language === 'tr' ? `, ${count} adet` : `, ${count} collected`)
            : '';
        const levelText = level > 1
            ? (language === 'tr' ? `, seviye ${level}` : `, level ${level}`)
            : '';
        const maxLevelText = isMaxLevel
            ? (language === 'tr' ? ', maksimum seviye' : ', max level')
            : '';

        return {
            label: `${animalName}, ${rarityLabel}${countText}${levelText}${maxLevelText}`,
            hint: onPress
                ? (language === 'tr' ? 'Detayları görmek için dokunun' : 'Tap to view details')
                : undefined,
        };
    }, [animal.id, animal.rarity, collected, count, level, isMaxLevel, language, onPress]);

    // Entrance animation for staggered card appearance
    useEffect(() => {
        if (entranceDelay !== undefined) {
            entranceOpacity.value = withDelay(
                entranceDelay,
                withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) })
            );
            entranceTranslateY.value = withDelay(
                entranceDelay,
                withSpring(0, { damping: 12, stiffness: 200 })
            );
        }
    }, [entranceDelay, entranceOpacity, entranceTranslateY]);

    // Idle animation for collected animals
    useEffect(() => {
        if (collected) {
            // Gentle floating animation
            idleOffset.value = withRepeat(
                withSequence(
                    withTiming(-3, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                    withTiming(3, { duration: 2000, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );

            // Legendary/Epic shine effect
            if (animal.rarity === 'legendary' || animal.rarity === 'epic') {
                shinePosition.value = withRepeat(
                    withSequence(
                        withDelay(Math.random() * 3000, withTiming(100, { duration: 800, easing: Easing.inOut(Easing.ease) })),
                        withDelay(4000, withTiming(-50, { duration: 0 }))
                    ),
                    -1,
                    false
                );
            }

            // Glow pulse for max level
            if (isMaxLevel) {
                glowOpacity.value = withRepeat(
                    withSequence(
                        withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                        withTiming(0.2, { duration: 1500, easing: Easing.inOut(Easing.ease) })
                    ),
                    -1,
                    true
                );
            }
        }
    }, [collected, animal.rarity, isMaxLevel, idleOffset, shinePosition, glowOpacity]);

    const handlePressIn = () => {
        scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
        rotation.value = withSequence(
            withTiming(-2, { duration: 50 }),
            withTiming(2, { duration: 50 }),
            withTiming(0, { duration: 50 })
        );
        if (collected) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    };

    const handlePress = () => {
        if (onPress) {
            onPress();
        } else if (collected) {
            // Fun interaction when tapping collected animals
            scale.value = withSequence(
                withSpring(1.05, { damping: 10 }),
                withSpring(1, { damping: 12 })
            );
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    };

    // Note: Removed zIndex animation to prevent overlap issues on Android
    // Android's zIndex handling with flexWrap is unreliable and causes cards to overlap
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotation.value}deg` },
            { translateY: idleOffset.value },
        ],
    }));

    // Entrance animation style
    const entranceStyle = useAnimatedStyle(() => ({
        opacity: entranceOpacity.value,
        transform: [
            { translateY: entranceTranslateY.value },
        ],
    }));

    const shineStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shinePosition.value }],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    return (
        <Animated.View style={entranceStyle}>
            <Pressable
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={!onPress && !collected}
                accessible={true}
                accessibilityRole={collected && onPress ? 'button' : 'image'}
                accessibilityLabel={a11y.label}
                accessibilityHint={a11y.hint}
                accessibilityState={{
                    disabled: !onPress && !collected,
                } as AccessibilityState}
            >
                <Animated.View
                    style={[
                        styles.container,
                        sizeStyles.container,
                        { borderColor: collected ? rarityColor : theme.colors.surfaceLight },
                        !collected && styles.uncollected,
                        animatedStyle,
                    ]}
                >
                    {/* Max level glow */}
                    {collected && isMaxLevel && (
                        <Animated.View
                            style={[
                                styles.maxLevelGlow,
                                { backgroundColor: rarityColor },
                                glowStyle
                            ]}
                        />
                    )}

                    {/* Shine effect for rare animals */}
                    {collected && (animal.rarity === 'legendary' || animal.rarity === 'epic') && (
                        <View style={styles.shineContainer}>
                            <Animated.View style={[styles.shine, shineStyle]} />
                        </View>
                    )}

                    {/* Emoji */}
                    <Text style={[styles.emoji, sizeStyles.emoji]}>
                        {collected ? animal.emoji : '❓'}
                    </Text>

                    {/* Name */}
                    <Text
                        style={[
                            styles.name,
                            sizeStyles.name,
                            { color: collected ? theme.colors.text : theme.colors.textSecondary },
                        ]}
                        numberOfLines={1}
                    >
                        {collected ? getAnimalName(animal.id, language) : '???'}
                    </Text>

                    {/* Rarity badge */}
                    {collected && (
                        <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
                            <Text style={styles.rarityText}>{getRarityLabelI18n(animal.rarity, language)}</Text>
                        </View>
                    )}

                    {/* Count/Level badge */}
                    {collected && count > 1 && (
                        <View style={[
                            styles.countBadge,
                            isMaxLevel && styles.maxLevelBadge,
                            isMaxLevel && { backgroundColor: rarityColor }
                        ]}>
                            <Text style={[
                                styles.countText,
                                isMaxLevel && styles.maxLevelText
                            ]}>
                                {isMaxLevel ? '⭐' : `x${count}`}
                            </Text>
                        </View>
                    )}

                    {/* Level indicator for medium/large cards */}
                    {collected && level > 1 && size !== 'small' && (
                        <View style={styles.levelContainer}>
                            {Array.from({ length: level }).map((_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.levelDot,
                                        { backgroundColor: i < level ? rarityColor : theme.colors.surfaceLight }
                                    ]}
                                />
                            ))}
                        </View>
                    )}

                    {/* Compact level badge for small cards */}
                    {collected && size === 'small' && (
                        <View style={[
                            styles.smallLevelBadge,
                            isMaxLevel && { backgroundColor: rarityColor }
                        ]}>
                            <Text style={[
                                styles.smallLevelText,
                                isMaxLevel && styles.maxLevelSmallText
                            ]}>
                                {isMaxLevel ? '★' : `L${level}`}
                            </Text>
                        </View>
                    )}
                </Animated.View>
            </Pressable>
        </Animated.View>
    );
}

function getSizeStyles(size: 'small' | 'medium' | 'large', customWidth?: number) {
    // Base dimensions for each size
    const baseDimensions = {
        small: { width: 80, height: 100, padding: theme.spacing.xs, emoji: 32, name: theme.fontSize.xs },
        medium: { width: 100, height: 130, padding: theme.spacing.sm, emoji: 48, name: theme.fontSize.sm },
        large: { width: 140, height: 180, padding: theme.spacing.md, emoji: 64, name: theme.fontSize.md },
    };

    const base = baseDimensions[size];

    // If customWidth provided, scale proportionally
    if (customWidth !== undefined) {
        const scale = customWidth / base.width;
        return {
            container: {
                width: customWidth,
                height: Math.round(base.height * scale),
                padding: base.padding,
            },
            emoji: { fontSize: Math.round(base.emoji * Math.min(scale, 1.2)) }, // Cap emoji scaling
            name: { fontSize: Math.max(10, Math.round(base.name * Math.min(scale, 1.1))) }, // Min 10px, cap scaling
        };
    }

    return {
        container: { width: base.width, height: base.height, padding: base.padding },
        emoji: { fontSize: base.emoji },
        name: { fontSize: base.name },
    };
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        ...theme.shadows.small,
    },
    uncollected: {
        opacity: 0.5,
    },
    maxLevelGlow: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: theme.borderRadius.lg,
    },
    shineContainer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    shine: {
        position: 'absolute',
        width: 30,
        height: 150,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        transform: [{ rotate: '20deg' }],
        top: -30,
    },
    emoji: {
        marginBottom: theme.spacing.xs,
    },
    name: {
        fontWeight: theme.fontWeight.semibold,
        textAlign: 'center',
    },
    rarityBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.sm,
    },
    rarityText: {
        fontSize: 8,
        fontWeight: theme.fontWeight.bold,
        color: '#000',
    },
    countBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: theme.colors.accent,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.sm,
    },
    maxLevelBadge: {
        paddingHorizontal: 4,
    },
    countText: {
        fontSize: 10,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.background,
    },
    maxLevelText: {
        fontSize: 12,
    },
    levelContainer: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        flexDirection: 'row',
        gap: 2,
    },
    levelDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    smallLevelBadge: {
        position: 'absolute',
        bottom: 2,
        left: 2,
        backgroundColor: theme.colors.surfaceLight,
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: theme.borderRadius.sm,
        minWidth: 20,
        alignItems: 'center',
    },
    smallLevelText: {
        fontSize: 8,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.textSecondary,
    },
    maxLevelSmallText: {
        fontSize: 10,
        color: '#000',
    },
});
