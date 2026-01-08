import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
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

interface AnimalCardProps {
    animal: Animal;
    collected?: boolean;
    count?: number;
    onPress?: () => void;
    size?: 'small' | 'medium' | 'large';
    language?: Language;
}

// Calculate level based on count
function getLevel(count: number): number {
    if (count >= 15) return 5;
    if (count >= 10) return 4;
    if (count >= 6) return 3;
    if (count >= 3) return 2;
    return 1;
}

// Get level badge text
function getLevelBadge(level: number): string {
    if (level >= 5) return '⭐ MAX';
    return `Lv.${level}`;
}

export function AnimalCard({
    animal,
    collected = true,
    count = 1,
    onPress,
    size = 'medium',
    language = 'en',
}: AnimalCardProps) {
    const scale = useSharedValue(1);
    const rotation = useSharedValue(0);
    const idleOffset = useSharedValue(0);
    const shinePosition = useSharedValue(-50);
    const glowOpacity = useSharedValue(0);

    const level = getLevel(count);
    const isMaxLevel = level >= 5;
    const rarityColor = getRarityColor(animal.rarity);
    const sizeStyles = getSizeStyles(size);

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
    }, [collected, animal.rarity, isMaxLevel]);

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
                withSpring(1.1, { damping: 8 }),
                withSpring(1, { damping: 10 })
            );
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotation.value}deg` },
            { translateY: idleOffset.value },
        ],
    }));

    const shineStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shinePosition.value }],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    return (
        <Pressable
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={!onPress && !collected}
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

                {/* Level indicator for leveled animals */}
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
            </Animated.View>
        </Pressable>
    );
}

function getSizeStyles(size: 'small' | 'medium' | 'large') {
    switch (size) {
        case 'small':
            return {
                container: { width: 80, height: 100, padding: theme.spacing.xs },
                emoji: { fontSize: 32 },
                name: { fontSize: theme.fontSize.xs },
            };
        case 'medium':
            return {
                container: { width: 100, height: 130, padding: theme.spacing.sm },
                emoji: { fontSize: 48 },
                name: { fontSize: theme.fontSize.sm },
            };
        case 'large':
            return {
                container: { width: 140, height: 180, padding: theme.spacing.md },
                emoji: { fontSize: 64 },
                name: { fontSize: theme.fontSize.md },
            };
    }
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
});
