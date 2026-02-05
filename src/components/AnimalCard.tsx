import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
    interpolate,
    cancelAnimation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { theme } from '../styles/theme';
import { Animal, getRarityColor, Rarity, getRarityIndicator } from '../data/animals';
import { Language, getAnimalName, getRarityLabelI18n } from '../i18n/translations';
import { getAnimalLevel, LEVEL_THRESHOLDS } from '../utils/levelBonuses';

interface AnimalCardProps {
    animal: Animal;
    collected?: boolean;
    count?: number;
    onPress?: () => void;
    size?: 'small' | 'medium' | 'large';
    language?: Language;
    entranceDelay?: number;  // For staggered entrance animations
    customWidth?: number;    // Override width for responsive layouts
    showXPBar?: boolean;     // Show XP progress bar (default: true for medium/large)
}

// Helper to get gradient colors for rarity
function getRarityGradient(rarity: Rarity): [string, string, string] {
    const gradients: Record<Rarity, [string, string, string]> = {
        common: ['#A8A8A8', '#8A8A8A', '#A8A8A8'],
        rare: ['#4FC3F7', '#29B6F6', '#4FC3F7'],
        epic: ['#E040FB', '#C77DDB', '#E040FB'],
        legendary: ['#FFD700', '#FFA500', '#FFD700'],
    };
    return gradients[rarity];
}

// Helper to get XP progress toward next level
function getXPProgress(count: number): { current: number; max: number; percentage: number } {
    const level = getAnimalLevel(count);
    if (level >= 5) {
        return { current: count, max: count, percentage: 100 };
    }
    const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
    const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[4];
    const progress = count - currentThreshold;
    const required = nextThreshold - currentThreshold;
    return {
        current: progress,
        max: required,
        percentage: Math.min((progress / required) * 100, 100),
    };
}

// Helper to get level badge style based on level
function getLevelBadgeColors(level: number, rarityColor: string): { bg: string; text: string } {
    if (level >= 5) {
        return { bg: rarityColor, text: theme.colors.background };
    }
    if (level >= 4) {
        return { bg: theme.colors.accent, text: theme.colors.background };
    }
    if (level >= 3) {
        return { bg: theme.colors.secondary, text: theme.colors.background };
    }
    return { bg: theme.colors.surfaceLight, text: theme.colors.textSecondary };
}

function AnimalCardComponent({
    animal,
    collected = true,
    count = 1,
    onPress,
    size = 'medium',
    language = 'en',
    entranceDelay,
    customWidth,
    showXPBar,
}: AnimalCardProps) {
    const scale = useSharedValue(1);
    const rotation = useSharedValue(0);
    const idleOffset = useSharedValue(0);
    const shinePosition = useSharedValue(-50);
    const glowOpacity = useSharedValue(0);
    const breatheScale = useSharedValue(1);
    const mysteryPulse = useSharedValue(0);
    const countBounce = useSharedValue(1);
    const borderGlowIntensity = useSharedValue(0);
    const prevCountRef = useRef(count);

    // Entrance animation values
    const entranceOpacity = useSharedValue(entranceDelay !== undefined ? 0 : 1);
    const entranceTranslateY = useSharedValue(entranceDelay !== undefined ? 20 : 0);

    // Memoize computed values to prevent recalculation on every render
    const level = useMemo(() => getAnimalLevel(count), [count]);
    const isMaxLevel = useMemo(() => level >= 5, [level]);
    const rarityColor = useMemo(() => getRarityColor(animal.rarity), [animal.rarity]);
    const rarityGradient = useMemo(() => getRarityGradient(animal.rarity), [animal.rarity]);
    const rarityIndicator = useMemo(() => getRarityIndicator(animal.rarity), [animal.rarity]);
    const xpProgress = useMemo(() => getXPProgress(count), [count]);
    const levelBadgeColors = useMemo(() => getLevelBadgeColors(level, rarityColor), [level, rarityColor]);
    const sizeStyles = useMemo(() => getSizeStyles(size, customWidth), [size, customWidth]);
    const shouldShowXPBar = useMemo(
        () => showXPBar ?? (size !== 'small' && collected && !isMaxLevel),
        [showXPBar, size, collected, isMaxLevel]
    );

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
                role: 'image' as const,
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
        const xpText = !isMaxLevel && shouldShowXPBar
            ? (language === 'tr'
                ? `, ${xpProgress.current}/${xpProgress.max} sonraki seviyeye`
                : `, ${xpProgress.current}/${xpProgress.max} to next level`)
            : '';

        return {
            label: `${animalName}, ${rarityLabel}${countText}${levelText}${maxLevelText}${xpText}`,
            hint: onPress
                ? (language === 'tr' ? 'Detayları görmek için dokunun' : 'Tap to view details')
                : undefined,
            role: (collected && onPress ? 'button' : 'image') as 'button' | 'image',
        };
    }, [animal.id, animal.rarity, collected, count, level, isMaxLevel, language, onPress, shouldShowXPBar, xpProgress]);

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

    // Count bounce animation when count increases
    useEffect(() => {
        if (count > prevCountRef.current && collected) {
            countBounce.value = withSequence(
                withSpring(1.3, { damping: 8, stiffness: 400 }),
                withSpring(1, { damping: 12, stiffness: 300 })
            );
        }
        prevCountRef.current = count;
    }, [count, collected, countBounce]);

    // Idle animations for collected animals
    useEffect(() => {
        if (collected) {
            // Gentle breathing animation (subtle scale pulse)
            breatheScale.value = withRepeat(
                withSequence(
                    withTiming(1.02, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );

            // Gentle floating animation
            idleOffset.value = withRepeat(
                withSequence(
                    withTiming(-3, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
                    withTiming(3, { duration: 2500, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );

            // Border glow pulse for rare+ animals
            if (animal.rarity !== 'common') {
                borderGlowIntensity.value = withRepeat(
                    withSequence(
                        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                        withTiming(0.3, { duration: 1500, easing: Easing.inOut(Easing.ease) })
                    ),
                    -1,
                    true
                );
            }

            // Legendary/Epic shimmer effect
            if (animal.rarity === 'legendary' || animal.rarity === 'epic') {
                shinePosition.value = withRepeat(
                    withSequence(
                        withDelay(Math.random() * 2000, withTiming(150, { duration: 1000, easing: Easing.inOut(Easing.ease) })),
                        withDelay(3000, withTiming(-50, { duration: 0 }))
                    ),
                    -1,
                    false
                );
            }

            // Glow pulse for max level
            if (isMaxLevel) {
                glowOpacity.value = withRepeat(
                    withSequence(
                        withTiming(0.7, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
                        withTiming(0.2, { duration: 1200, easing: Easing.inOut(Easing.ease) })
                    ),
                    -1,
                    true
                );
            }
        } else {
            // Mystery pulse for uncollected animals
            mysteryPulse.value = withRepeat(
                withSequence(
                    withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );
        }

        return () => {
            cancelAnimation(breatheScale);
            cancelAnimation(idleOffset);
            cancelAnimation(borderGlowIntensity);
            cancelAnimation(shinePosition);
            cancelAnimation(glowOpacity);
            cancelAnimation(mysteryPulse);
        };
    }, [collected, animal.rarity, isMaxLevel, breatheScale, idleOffset, borderGlowIntensity, shinePosition, glowOpacity, mysteryPulse]);

    const handlePressIn = useCallback(() => {
        scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
        rotation.value = withSequence(
            withTiming(-2, { duration: 50 }),
            withTiming(2, { duration: 50 }),
            withTiming(0, { duration: 50 })
        );
        if (collected) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [scale, rotation, collected]);

    const handlePressOut = useCallback(() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }, [scale]);

    const handlePress = useCallback(() => {
        if (onPress) {
            onPress();
        } else if (collected) {
            // Fun interaction when tapping collected animals
            scale.value = withSequence(
                withSpring(1.08, { damping: 10, stiffness: 300 }),
                withSpring(1, { damping: 12 })
            );
            // Trigger a small bounce on the emoji
            breatheScale.value = withSequence(
                withSpring(1.15, { damping: 8 }),
                withSpring(1.02, { damping: 12 })
            );
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    }, [onPress, collected, scale, breatheScale]);

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

    // Breathing animation for emoji
    const breatheStyle = useAnimatedStyle(() => ({
        transform: [{ scale: breatheScale.value }],
    }));

    const shineStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shinePosition.value }],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    // Count badge bounce animation
    const countBounceStyle = useAnimatedStyle(() => ({
        transform: [{ scale: countBounce.value }],
    }));

    // Border glow animation for rare+ animals
    const borderGlowStyle = useAnimatedStyle(() => ({
        opacity: interpolate(borderGlowIntensity.value, [0, 1], [0.4, 1]),
    }));

    // Mystery pulse for uncollected animals
    const mysteryStyle = useAnimatedStyle(() => ({
        opacity: interpolate(mysteryPulse.value, [0, 1], [0.4, 0.7]),
        transform: [{ scale: interpolate(mysteryPulse.value, [0, 1], [0.98, 1.02]) }],
    }));

    return (
        <Animated.View style={entranceStyle}>
            <Pressable
                onPress={handlePress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={!onPress && !collected}
                accessible={true}
                accessibilityRole={a11y.role}
                accessibilityLabel={a11y.label}
                accessibilityHint={a11y.hint}
                accessibilityState={{
                    disabled: !onPress && !collected,
                    selected: collected,
                } as AccessibilityState}
            >
                <Animated.View
                    style={[
                        styles.container,
                        sizeStyles.container,
                        animatedStyle,
                    ]}
                >
                    {/* Gradient border for collected animals */}
                    {collected && (
                        <Animated.View style={[styles.gradientBorderContainer, borderGlowStyle]}>
                            <LinearGradient
                                colors={rarityGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.gradientBorder}
                            />
                        </Animated.View>
                    )}

                    {/* Inner content container */}
                    <View style={[
                        styles.innerContainer,
                        sizeStyles.innerContainer,
                        !collected && styles.uncollectedInner,
                    ]}>
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

                        {/* Shimmer effect for legendary/epic */}
                        {collected && (animal.rarity === 'legendary' || animal.rarity === 'epic') && (
                            <View style={styles.shineContainer}>
                                <Animated.View
                                    style={[
                                        styles.shine,
                                        shineStyle,
                                        animal.rarity === 'legendary' && styles.legendaryShine,
                                    ]}
                                />
                            </View>
                        )}

                        {/* Emoji with breathing animation */}
                        {collected ? (
                            <Animated.Text style={[styles.emoji, sizeStyles.emoji, breatheStyle]}>
                                {animal.emoji}
                            </Animated.Text>
                        ) : (
                            <Animated.View style={[styles.uncollectedEmojiContainer, mysteryStyle]}>
                                <Text style={[styles.emoji, sizeStyles.emoji, styles.silhouetteEmoji]}>
                                    {animal.emoji}
                                </Text>
                                <View style={styles.lockIconContainer}>
                                    <Text style={[styles.lockIcon, sizeStyles.lockIcon]}>🔒</Text>
                                </View>
                            </Animated.View>
                        )}

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

                        {/* XP Progress bar (medium/large cards only) */}
                        {shouldShowXPBar && (
                            <View style={styles.xpBarContainer}>
                                <View style={styles.xpBarBackground}>
                                    <View
                                        style={[
                                            styles.xpBarFill,
                                            {
                                                width: `${xpProgress.percentage}%`,
                                                backgroundColor: rarityColor,
                                            }
                                        ]}
                                    />
                                </View>
                                <Text style={styles.xpText}>
                                    {xpProgress.current}/{xpProgress.max}
                                </Text>
                            </View>
                        )}

                        {/* Rarity indicator with gradient badge */}
                        {collected && (
                            <View style={styles.rarityBadgeContainer}>
                                <LinearGradient
                                    colors={[rarityGradient[0], rarityGradient[1]]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.rarityBadgeGradient}
                                >
                                    <Text style={styles.rarityText}>
                                        {size === 'small' ? rarityIndicator.icon : getRarityLabelI18n(animal.rarity, language)}
                                    </Text>
                                </LinearGradient>
                            </View>
                        )}

                        {/* Uncollected rarity hint */}
                        {!collected && size !== 'small' && (
                            <View style={[styles.rarityHintBadge, { borderColor: rarityColor }]}>
                                <Text style={[styles.rarityHintText, { color: rarityColor }]}>
                                    {rarityIndicator.icon}
                                </Text>
                            </View>
                        )}

                        {/* Level badge with count */}
                        {collected && (
                            <Animated.View
                                style={[
                                    styles.levelBadge,
                                    sizeStyles.levelBadge,
                                    { backgroundColor: levelBadgeColors.bg },
                                    isMaxLevel && styles.maxLevelBadgeStyle,
                                    countBounceStyle,
                                ]}
                            >
                                {isMaxLevel ? (
                                    <Text style={[styles.levelBadgeText, { color: levelBadgeColors.text }]}>
                                        ★ MAX
                                    </Text>
                                ) : (
                                    <Text style={[styles.levelBadgeText, sizeStyles.levelBadgeText, { color: levelBadgeColors.text }]}>
                                        {size === 'small' ? `L${level}` : `Lv.${level}`}
                                    </Text>
                                )}
                            </Animated.View>
                        )}

                        {/* Count badge (separate from level) */}
                        {collected && count > 1 && (
                            <Animated.View style={[styles.countBadge, countBounceStyle]}>
                                <Text style={styles.countText}>×{count}</Text>
                            </Animated.View>
                        )}

                        {/* Level dots indicator for medium/large */}
                        {collected && size !== 'small' && (
                            <View style={styles.levelDotsContainer}>
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <View
                                        key={i}
                                        style={[
                                            styles.levelDot,
                                            {
                                                backgroundColor: i < level ? rarityColor : theme.colors.surfaceLight,
                                                opacity: i < level ? 1 : 0.3,
                                            }
                                        ]}
                                    />
                                ))}
                            </View>
                        )}
                    </View>
                </Animated.View>
            </Pressable>
        </Animated.View>
    );
}

function getSizeStyles(size: 'small' | 'medium' | 'large', customWidth?: number) {
    // Base dimensions for each size
    const baseDimensions = {
        small: {
            width: 80,
            height: 100,
            padding: theme.spacing.xs,
            borderWidth: 2,
            emoji: 28,
            name: theme.fontSize.xs,
            lockIcon: 12,
            levelBadge: { paddingHorizontal: 4, paddingVertical: 1 },
            levelBadgeText: { fontSize: 8 },
        },
        medium: {
            width: 100,
            height: 140,
            padding: theme.spacing.sm,
            borderWidth: 3,
            emoji: 40,
            name: theme.fontSize.sm,
            lockIcon: 16,
            levelBadge: { paddingHorizontal: 6, paddingVertical: 2 },
            levelBadgeText: { fontSize: 10 },
        },
        large: {
            width: 140,
            height: 190,
            padding: theme.spacing.md,
            borderWidth: 3,
            emoji: 56,
            name: theme.fontSize.md,
            lockIcon: 20,
            levelBadge: { paddingHorizontal: 8, paddingVertical: 3 },
            levelBadgeText: { fontSize: 12 },
        },
    };

    const base = baseDimensions[size];

    // If customWidth provided, scale proportionally
    if (customWidth !== undefined) {
        const scaleFactor = customWidth / base.width;
        return {
            container: {
                width: customWidth,
                height: Math.round(base.height * scaleFactor),
            },
            innerContainer: {
                padding: base.padding,
                borderRadius: theme.borderRadius.lg - base.borderWidth,
            },
            emoji: { fontSize: Math.round(base.emoji * Math.min(scaleFactor, 1.2)) },
            name: { fontSize: Math.max(10, Math.round(base.name * Math.min(scaleFactor, 1.1))) },
            lockIcon: { fontSize: Math.round(base.lockIcon * Math.min(scaleFactor, 1.2)) },
            levelBadge: base.levelBadge,
            levelBadgeText: base.levelBadgeText,
        };
    }

    return {
        container: { width: base.width, height: base.height },
        innerContainer: {
            padding: base.padding,
            borderRadius: theme.borderRadius.lg - base.borderWidth,
        },
        emoji: { fontSize: base.emoji },
        name: { fontSize: base.name },
        lockIcon: { fontSize: base.lockIcon },
        levelBadge: base.levelBadge,
        levelBadgeText: base.levelBadgeText,
    };
}

const styles = StyleSheet.create({
    container: {
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        ...theme.shadows.medium,
    },
    gradientBorderContainer: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: theme.borderRadius.lg,
    },
    gradientBorder: {
        flex: 1,
        borderRadius: theme.borderRadius.lg,
    },
    innerContainer: {
        flex: 1,
        margin: theme.spacing.xxs,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg - 2,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    uncollectedInner: {
        backgroundColor: theme.colors.surfaceLight,
    },
    maxLevelGlow: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: theme.borderRadius.lg - 2,
    },
    shineContainer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    shine: {
        position: 'absolute',
        width: 40,
        height: 180,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        transform: [{ rotate: '25deg' }],
        top: -40,
    },
    legendaryShine: {
        backgroundColor: 'rgba(255, 215, 0, 0.4)',
        width: 50,
    },
    emoji: {
        marginBottom: theme.spacing.xs,
    },
    uncollectedEmojiContainer: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    silhouetteEmoji: {
        opacity: 0.15,
        marginBottom: theme.spacing.xs,
    },
    lockIconContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    lockIcon: {
        opacity: 0.6,
    },
    name: {
        fontWeight: theme.fontWeight.semibold,
        textAlign: 'center',
        paddingHorizontal: 4,
    },
    // XP Progress bar styles
    xpBarContainer: {
        width: '80%',
        marginTop: theme.spacing.xs,
        marginBottom: theme.spacing.xs,
    },
    xpBarBackground: {
        height: 4,
        backgroundColor: theme.colors.surfaceLight,
        borderRadius: theme.borderRadius.xxs,
        overflow: 'hidden',
    },
    xpBarFill: {
        height: '100%',
        borderRadius: theme.borderRadius.xxs,
    },
    xpText: {
        fontSize: 8,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: theme.spacing.xxs,
        fontWeight: theme.fontWeight.medium,
    },
    // Rarity badge with gradient
    rarityBadgeContainer: {
        position: 'absolute',
        top: 4,
        right: 4,
        borderRadius: theme.borderRadius.sm,
        overflow: 'hidden',
    },
    rarityBadgeGradient: {
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    rarityText: {
        fontSize: 8,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.background,
        textShadowColor: 'rgba(255, 255, 255, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
    },
    // Rarity hint for uncollected
    rarityHintBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    rarityHintText: {
        fontSize: 10,
        fontWeight: theme.fontWeight.bold,
    },
    // Level badge
    levelBadge: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.sm,
        minWidth: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    maxLevelBadgeStyle: {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    levelBadgeText: {
        fontSize: 9,
        fontWeight: theme.fontWeight.bold,
    },
    // Count badge
    countBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: theme.colors.accent,
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.sm,
        minWidth: 20,
        alignItems: 'center',
    },
    countText: {
        fontSize: 9,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.background,
    },
    // Level dots indicator
    levelDotsContainer: {
        position: 'absolute',
        bottom: 22,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 3,
    },
    levelDot: {
        width: 5,
        height: 5,
        borderRadius: theme.borderRadius.xxs,
    },
});

// Export memoized component to prevent unnecessary re-renders in FlashList
AnimalCardComponent.displayName = 'AnimalCard';
export const AnimalCard = React.memo(AnimalCardComponent);
