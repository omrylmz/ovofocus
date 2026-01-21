import React, { useMemo, useState, useCallback, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TextInput, Pressable, useWindowDimensions, Platform } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Theme } from '../src/styles/theme';
import { useGame } from '../src/context/GameContext';
import { useTheme } from '../src/context/ThemeContext';
import { animals, Animal, Rarity, getRarityColor } from '../src/data/animals';
import { AnimalCard } from '../src/components/AnimalCard';
import { AnimalDetailModal } from '../src/components/AnimalDetailModal';
import { AnimatedBackground } from '../src/components/AnimatedBackground';
import { FloatingParticles } from '../src/components/FloatingParticles';
import { EmptyState } from '../src/components/EmptyState';
import { getRarityLabelI18n, getAnimalName } from '../src/i18n/translations';

type FilterOption = 'all' | 'collected' | 'uncollected' | 'favorites';
type SortOption = 'rarity' | 'recent' | 'name';

// Create dynamic styles based on current theme
const createStyles = (theme: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    backgroundLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: theme.zIndex.background,
        elevation: theme.zIndex.background,
    },
    foregroundLayer: {
        flex: 1,
        zIndex: theme.zIndex.base,
        elevation: theme.zIndex.base,
        backgroundColor: 'transparent',
    },
    scrollContent: {
        padding: theme.spacing.lg,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        paddingHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.md,
    },
    searchIcon: {
        fontSize: 16,
        marginRight: theme.spacing.sm,
    },
    searchInput: {
        flex: 1,
        height: 44,
        fontSize: theme.fontSize.md,
        color: theme.colors.text,
    },
    searchClear: {
        padding: theme.spacing.sm,
    },
    searchClearText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
    },
    filterRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
    },
    filterChip: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.round,
        backgroundColor: theme.colors.surface,
    },
    filterChipActive: {
        backgroundColor: theme.colors.accent,
    },
    filterChipText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.medium,
    },
    filterChipTextActive: {
        color: theme.colors.background,
        fontWeight: theme.fontWeight.bold,
    },
    sortRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.lg,
    },
    sortLabel: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
    },
    sortChip: {
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.sm,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.surface,
    },
    sortChipActive: {
        borderColor: theme.colors.secondary,
        backgroundColor: theme.colors.surface,
    },
    sortChipText: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.textSecondary,
    },
    sortChipTextActive: {
        color: theme.colors.secondary,
        fontWeight: theme.fontWeight.medium,
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
        // Use consistent gap that works with our card sizing
        gap: 12,
        // Prevent overflow during scale animations
        overflow: 'visible',
    },
    // Container for individual cards to prevent animation overflow issues
    animalCardWrapper: {
        // Padding creates visual space for scale-down animations without affecting layout
        padding: 2,
    },
});

// Filter chip component - memoized to prevent unnecessary re-renders
interface FilterChipProps {
    label: string;
    value: FilterOption;
    active: boolean;
    onPress: (value: FilterOption) => void;
    styles: ReturnType<typeof createStyles>;
}

const FilterChip = React.memo(function FilterChip({ label, value, active, onPress, styles }: FilterChipProps) {
    return (
        <Pressable
            style={[styles.filterChip, active && styles.filterChipActive]}
            onPress={() => onPress(value)}
        >
            <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
        </Pressable>
    );
});

// Sort chip component - memoized to prevent unnecessary re-renders
interface SortChipProps {
    label: string;
    value: SortOption;
    active: boolean;
    onPress: (value: SortOption) => void;
    styles: ReturnType<typeof createStyles>;
}

const SortChip = React.memo(function SortChip({ label, value, active, onPress, styles }: SortChipProps) {
    return (
        <Pressable
            style={[styles.sortChip, active && styles.sortChipActive]}
            onPress={() => onPress(value)}
        >
            <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>{label}</Text>
        </Pressable>
    );
});

// Constants for grid layout calculations
const GRID_GAP = 12;
const CARD_BASE_WIDTH = 80; // Base width for small cards
const CONTENT_PADDING = 24; // theme.spacing.lg

export default function CollectionScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const { state, toggleFavorite, i18n } = useGame();
    const { theme } = useTheme();
    const { width: screenWidth } = useWindowDimensions();

    // Calculate responsive card width based on screen size
    // This ensures cards fit evenly in the grid without overlap
    const { cardWidth, numColumns } = useMemo(() => {
        const availableWidth = screenWidth - (CONTENT_PADDING * 2);
        // Calculate how many cards can fit
        const cols = Math.floor((availableWidth + GRID_GAP) / (CARD_BASE_WIDTH + GRID_GAP));
        // Clamp between 3 and 5 columns for reasonable display
        const clampedCols = Math.max(3, Math.min(5, cols));
        // Calculate the actual width each card should have
        const totalGapWidth = (clampedCols - 1) * GRID_GAP;
        const calculatedWidth = Math.floor((availableWidth - totalGapWidth) / clampedCols);
        return { cardWidth: calculatedWidth, numColumns: clampedCols };
    }, [screenWidth]);

    // Create dynamic styles based on current theme
    const styles = useMemo(() => createStyles(theme), [theme]);

    // Set dynamic navigation title based on current language
    useLayoutEffect(() => {
        navigation.setOptions({
            title: i18n('myCollection'),
        });
    }, [navigation, i18n]);

    // State for animal detail modal
    const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Filter and search state
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
    const [activeSort, setActiveSort] = useState<SortOption>('rarity');

    // Group collected animals by ID with counts and first collected date
    const collectionData = useMemo(() => {
        const map = new Map<string, { count: number; firstCollected: string | null }>();
        state.collection.forEach(animal => {
            const existing = map.get(animal.id);
            if (existing) {
                existing.count++;
            } else {
                map.set(animal.id, {
                    count: 1,
                    firstCollected: animal.collectedAt || null
                });
            }
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

    // Filtered and sorted animals
    const filteredAnimals = useMemo(() => {
        let result = [...animals];

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(animal => {
                const name = getAnimalName(animal.id, state.settings.language).toLowerCase();
                return name.includes(query) || animal.emoji.includes(query);
            });
        }

        // Apply collection filter
        if (activeFilter === 'collected') {
            result = result.filter(a => collectionData.has(a.id));
        } else if (activeFilter === 'uncollected') {
            result = result.filter(a => !collectionData.has(a.id));
        } else if (activeFilter === 'favorites') {
            result = result.filter(a => state.favorites.includes(a.id));
        }

        // Apply sorting
        if (activeSort === 'name') {
            result.sort((a, b) => {
                const nameA = getAnimalName(a.id, state.settings.language);
                const nameB = getAnimalName(b.id, state.settings.language);
                return nameA.localeCompare(nameB);
            });
        } else if (activeSort === 'recent') {
            result.sort((a, b) => {
                const dateA = collectionData.get(a.id)?.firstCollected;
                const dateB = collectionData.get(b.id)?.firstCollected;
                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            });
        }
        // 'rarity' sort maintains original order (legendary -> common)

        return result;
    }, [searchQuery, activeFilter, activeSort, collectionData, state.favorites, state.settings.language]);

    // Check if we're in filtered mode (not default view)
    const isFilteredView = searchQuery.trim() || activeFilter !== 'all' || activeSort !== 'rarity';

    // Handle tap on animal card
    const handleAnimalPress = useCallback((animal: Animal) => {
        const data = collectionData.get(animal.id);
        if (data && data.count > 0) {
            // For collected animals, show detail on tap
            setSelectedAnimal(animal);
            setShowDetailModal(true);
        }
    }, [collectionData]);

    const closeDetailModal = useCallback(() => {
        setShowDetailModal(false);
        setSelectedAnimal(null);
    }, []);

    const handleToggleFavorite = useCallback(() => {
        if (selectedAnimal) {
            toggleFavorite(selectedAnimal.id);
        }
    }, [selectedAnimal, toggleFavorite]);

    // Memoized handlers for filter and sort chips
    const handleFilterPress = useCallback((value: FilterOption) => {
        setActiveFilter(value);
        if (state.settings.hapticsEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [state.settings.hapticsEnabled]);

    const handleSortPress = useCallback((value: SortOption) => {
        setActiveSort(value);
        if (state.settings.hapticsEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [state.settings.hapticsEnabled]);

    // Render filtered grid (flat list, no rarity sections)
    const renderFilteredGrid = () => {
        if (filteredAnimals.length === 0) {
            return (
                <EmptyState
                    type="empty"
                    title={i18n('noResults')}
                    message={activeFilter === 'favorites'
                        ? i18n('noFavoritesYet')
                        : i18n('tryDifferentSearch')}
                />
            );
        }

        return (
            <View style={styles.animalGrid}>
                {filteredAnimals.map((animal, index) => {
                    const data = collectionData.get(animal.id);
                    const isCollected = data && data.count > 0;

                    return (
                        <View key={animal.id} style={styles.animalCardWrapper}>
                            <AnimalCard
                                animal={animal}
                                collected={isCollected || false}
                                count={data?.count || 0}
                                size="small"
                                customWidth={cardWidth}
                                language={state.settings.language}
                                onPress={isCollected ? () => handleAnimalPress(animal) : undefined}
                                entranceDelay={index * 50}
                            />
                        </View>
                    );
                })}
            </View>
        );
    };

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
                    {animalsInRarity.map((animal, index) => {
                        const data = collectionData.get(animal.id);
                        const isCollected = data && data.count > 0;

                        return (
                            <View key={animal.id} style={styles.animalCardWrapper}>
                                <AnimalCard
                                    animal={animal}
                                    collected={isCollected || false}
                                    count={data?.count || 0}
                                    size="small"
                                    customWidth={cardWidth}
                                    language={state.settings.language}
                                    onPress={isCollected ? () => handleAnimalPress(animal) : undefined}
                                    entranceDelay={index * 50}
                                />
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    // Get selected animal data for modal
    const selectedAnimalData = selectedAnimal
        ? collectionData.get(selectedAnimal.id)
        : null;

    return (
        <SafeAreaView style={styles.container}>
            {/* Background Layer - must be first for proper Android rendering */}
            <View style={styles.backgroundLayer} pointerEvents="none">
                <AnimatedBackground sessionState="idle" variant="collection" />
                <FloatingParticles count={12} isActive={false} variant="collection" />
            </View>

            {/* Foreground Content Layer */}
            <ScrollView style={styles.foregroundLayer} contentContainerStyle={styles.scrollContent}>
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder={i18n('searchPlaceholder')}
                        placeholderTextColor={theme.colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={() => setSearchQuery('')} style={styles.searchClear}>
                            <Text style={styles.searchClearText}>✕</Text>
                        </Pressable>
                    )}
                </View>

                {/* Filter Chips */}
                <View style={styles.filterRow}>
                    <FilterChip label={i18n('filterAll')} value="all" active={activeFilter === 'all'} onPress={handleFilterPress} styles={styles} />
                    <FilterChip label={i18n('filterCollected')} value="collected" active={activeFilter === 'collected'} onPress={handleFilterPress} styles={styles} />
                    <FilterChip label={i18n('filterUncollected')} value="uncollected" active={activeFilter === 'uncollected'} onPress={handleFilterPress} styles={styles} />
                    <FilterChip label="❤️" value="favorites" active={activeFilter === 'favorites'} onPress={handleFilterPress} styles={styles} />
                </View>

                {/* Sort Chips */}
                <View style={styles.sortRow}>
                    <Text style={styles.sortLabel}>{i18n('sort')}:</Text>
                    <SortChip label={i18n('sortByRarity')} value="rarity" active={activeSort === 'rarity'} onPress={handleSortPress} styles={styles} />
                    <SortChip label={i18n('sortByRecent')} value="recent" active={activeSort === 'recent'} onPress={handleSortPress} styles={styles} />
                    <SortChip label={i18n('sortByName')} value="name" active={activeSort === 'name'} onPress={handleSortPress} styles={styles} />
                </View>

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

                {/* Collection Display */}
                {isFilteredView ? (
                    renderFilteredGrid()
                ) : (
                    (['legendary', 'epic', 'rare', 'common'] as Rarity[]).map(renderRaritySection)
                )}

                {/* Empty state */}
                {state.collection.length === 0 && (
                    <EmptyState
                        type="empty"
                        title={i18n('noAnimalsYet')}
                        message={i18n('completeSessionsToHatch')}
                        actionButton={{
                            title: i18n('startFocus'),
                            onPress: () => router.back(),
                            icon: '🥚',
                        }}
                    />
                )}
            </ScrollView>

            {/* Animal Detail Modal */}
            <AnimalDetailModal
                visible={showDetailModal}
                animal={selectedAnimal}
                count={selectedAnimalData?.count || 0}
                firstCollectedDate={selectedAnimalData?.firstCollected || undefined}
                onClose={closeDetailModal}
                onSetFavorite={handleToggleFavorite}
                isFavorite={selectedAnimal ? state.favorites.includes(selectedAnimal.id) : false}
                language={state.settings.language}
            />
        </SafeAreaView>
    );
}
