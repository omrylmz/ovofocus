import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
} from 'react-native-reanimated';
import { theme } from '../styles/theme';
import { Animal, getRarityColor } from '../data/animals';
import { Language, getAnimalName, getRarityLabelI18n } from '../i18n/translations';

interface AnimalCardProps {
    animal: Animal;
    collected?: boolean;
    count?: number;
    onPress?: () => void;
    size?: 'small' | 'medium' | 'large';
    language?: Language;
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

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.95);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1);
    };

    const rarityColor = getRarityColor(animal.rarity);
    const sizeStyles = getSizeStyles(size);

    return (
        <Pressable
            onPress={onPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={!onPress}
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

                {/* Count badge */}
                {collected && count > 1 && (
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>x{count}</Text>
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
        ...theme.shadows.small,
    },
    uncollected: {
        opacity: 0.5,
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
    countText: {
        fontSize: 10,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.background,
    },
});
