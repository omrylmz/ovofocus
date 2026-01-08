import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../src/styles/theme';
import { useGame } from '../src/context/GameContext';
import { animals, Rarity, getRarityColor } from '../src/data/animals';
import { AnimalCard } from '../src/components/AnimalCard';
import { PixelButton } from '../src/components/PixelButton';
import { getRarityLabelI18n, getAnimalName } from '../src/i18n/translations';

export default function CollectionScreen() {
    const router = useRouter();
    const { state, i18n } = useGame();

    // Group collected animals by ID with counts
    const collectionMap = useMemo(() => {
        const map = new Map<string, number>();
        state.collection.forEach(animal => {
            map.set(animal.id, (map.get(animal.id) || 0) + 1);
        });
        return map;
    }, [state.collection]);

    // Calculate collection stats
    const stats = useMemo(() => {
        const collected = new Set(state.collection.map(a => a.id));
        const byRarity: Record<Rarity, { collected: number; total: number }> = {
            common: { collected: 0, total: 0 },
            rare: { collected: 0, total: 0 },
            epic: { collected: 0, total: 0 },
            legendary: { collected: 0, total: 0 },
        };

        animals.forEach(animal => {
            byRarity[animal.rarity].total++;
            if (collected.has(animal.id)) {
                byRarity[animal.rarity].collected++;
            }
        });

        return {
            total: collected.size,
            max: animals.length,
            byRarity,
        };
    }, [state.collection]);

    // Group animals by rarity for display
    const animalsByRarity = useMemo(() => {
        const grouped: Record<Rarity, typeof animals> = {
            legendary: [],
            epic: [],
            rare: [],
            common: [],
        };
        animals.forEach(animal => {
            grouped[animal.rarity].push(animal);
        });
        return grouped;
    }, []);

    const renderRaritySection = (rarity: Rarity) => {
        const animalsInRarity = animalsByRarity[rarity];
        const rarityStats = stats.byRarity[rarity];
        const rarityColor = getRarityColor(rarity);

        return (
            <View key={rarity} style={styles.raritySection}>
                <View style={styles.rarityHeader}>
                    <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
                    <Text style={[styles.rarityTitle, { color: rarityColor }]}>
                        {getRarityLabelI18n(rarity, state.settings.language)}
                    </Text>
                    <Text style={styles.rarityCount}>
                        {rarityStats.collected} / {rarityStats.total}
                    </Text>
                </View>
                <View style={styles.animalGrid}>
                    {animalsInRarity.map(animal => (
                        <AnimalCard
                            key={animal.id}
                            animal={animal}
                            collected={collectionMap.has(animal.id)}
                            count={collectionMap.get(animal.id) || 0}
                            size="small"
                            language={state.settings.language}
                        />
                    ))}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Overall Progress */}
                <View style={styles.progressCard}>
                    <Text style={styles.progressTitle}>{i18n('collectionProgress')}</Text>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${(stats.total / stats.max) * 100}%` }
                            ]}
                        />
                    </View>
                    <Text style={styles.progressText}>
                        {stats.total} / {stats.max} {i18n('animalsCollected')} ({Math.round((stats.total / stats.max) * 100)}%)
                    </Text>
                </View>

                {/* Stats Summary */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statEmoji}>⏱️</Text>
                        <Text style={styles.statValue}>{state.stats.totalFocusMinutes}</Text>
                        <Text style={styles.statLabel}>{i18n('minutes')}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statEmoji}>✅</Text>
                        <Text style={styles.statValue}>{state.stats.completedSessions}</Text>
                        <Text style={styles.statLabel}>{i18n('completed')}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statEmoji}>🔥</Text>
                        <Text style={styles.statValue}>{state.stats.bestStreak}</Text>
                        <Text style={styles.statLabel}>{i18n('bestStreak')}</Text>
                    </View>
                </View>

                {/* Collection by Rarity */}
                {(['legendary', 'epic', 'rare', 'common'] as Rarity[]).map(renderRaritySection)}

                {/* Empty state */}
                {state.collection.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>🥚</Text>
                        <Text style={styles.emptyTitle}>{i18n('noAnimalsYet')}</Text>
                        <Text style={styles.emptyText}>
                            {i18n('completeSessionsToHatch')}
                        </Text>
                        <PixelButton
                            title={i18n('startFocus')}
                            onPress={() => router.back()}
                            variant="primary"
                            icon="🥚"
                        />
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollContent: {
        padding: theme.spacing.lg,
    },
    progressCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
    },
    progressTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.md,
    },
    progressBar: {
        height: 12,
        backgroundColor: theme.colors.surfaceLight,
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: theme.spacing.sm,
    },
    progressFill: {
        height: '100%',
        backgroundColor: theme.colors.accent,
        borderRadius: 6,
    },
    progressText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.xl,
    },
    statCard: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        alignItems: 'center',
    },
    statEmoji: {
        fontSize: 24,
        marginBottom: theme.spacing.xs,
    },
    statValue: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
    },
    statLabel: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
    },
    raritySection: {
        marginBottom: theme.spacing.xl,
    },
    rarityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    rarityDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: theme.spacing.sm,
    },
    rarityTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        flex: 1,
    },
    rarityCount: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    animalGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xxl,
    },
    emptyEmoji: {
        fontSize: 64,
        marginBottom: theme.spacing.md,
    },
    emptyTitle: {
        fontSize: theme.fontSize.xl,
        fontWeight: theme.fontWeight.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    emptyText: {
        fontSize: theme.fontSize.md,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginBottom: theme.spacing.lg,
        maxWidth: 280,
    },
});
