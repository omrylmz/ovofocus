import React, { useMemo, useState, useCallback, useLayoutEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, Pressable, useWindowDimensions } from 'react-native';
import { FlashList, FlashListProps } from '@shopify/flash-list';
import type { FlashListRef } from '@shopify/flash-list/dist/FlashListRef';
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
import { ScrollToTopButton } from '../src/components/ScrollToTopButton';
import { getRarityLabelI18n, getAnimalName } from '../src/i18n/translations';

// Types for FlashList items
type SectionHeaderItem = {
    type: 'section-header';
    rarity: Rarity;
    isExpanded: boolean;
};

type AnimalItem = {
    type: 'animal';
    animal: Animal;
    rarity: Rarity;
};

type ProgressCardItem = {
    type: 'progress-card';
};

type StatsGridItem = {
    type: 'stats-grid';
};

type FilterHeaderItem = {
    type: 'filter-header';
};

type ListItem = SectionHeaderItem | AnimalItem | ProgressCardItem | StatsGridItem | FilterHeaderItem;

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
    listContent: {
        paddingHorizontal: theme.spacing.lg,
        paddingBottom: theme.spacing.xxl,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        paddingHorizontal: theme.spacing.md,
        marginBottom: theme.spacing.md,
        marginTop: theme.spacing.lg,
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
    // Collapsible section styles
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.xs,
    },
    sectionHeaderPressed: {
        opacity: 0.7,
    },
    sectionDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: theme.spacing.sm,
    },
    sectionTitle: {
        fontSize: theme.fontSize.lg,
        fontWeight: theme.fontWeight.bold,
        flex: 1,
    },
    sectionCount: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        marginRight: theme.spacing.sm,
    },
    chevronContainer: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chevron: {
        fontSize: 16,
        color: theme.colors.textSecondary,
    },
    // Animal grid styles
    animalCardWrapper: {
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
    accessibilityHint?: string;
}

const FilterChip = React.memo(function FilterChip({ label, value, active, onPress, styles, accessibilityHint }: FilterChipProps) {
    return (
        <Pressable
            style={[styles.filterChip, active && styles.filterChipActive]}
            onPress={() => onPress(value)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ selected: active }}
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
    accessibilityHint?: string;
}

const SortChip = React.memo(function SortChip({ label, value, active, onPress, styles, accessibilityHint }: SortChipProps) {
    return (
        <Pressable
            style={[styles.sortChip, active && styles.sortChipActive]}
            onPress={() => onPress(value)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ selected: active }}
        >
            <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>{label}</Text>
        </Pressable>
    );
});

// Constants for grid layout calculations
const GRID_GAP = 12;
const CARD_BASE_WIDTH = 80; // Base width for small cards
const CONTENT_PADDING = 24; // theme.spacing.lg
const SCROLL_TO_TOP_THRESHOLD = 500;

export default function CollectionScreen() {
    const router = useRouter();
    const navigation = useNavigation();
    const { state, toggleFavorite, i18n } = useGame();
    const { theme } = useTheme();
    const { width: screenWidth } = useWindowDimensions();
    const flashListRef = useRef<FlashListRef<ListItem>>(null);

    // Scroll position tracking for scroll-to-top button
    const [showScrollToTop, setShowScrollToTop] = useState(false);

    // Expanded sections state
    const [expandedSections, setExpandedSections] = useState<Record<Rarity, boolean>>({
        legendary: true,
        epic: true,
        rare: true,
        common: true,
    });

    // Calculate responsive card width based on screen size
    const { cardWidth, numColumns } = useMemo(() => {
        const availableWidth = screenWidth - (CONTENT_PADDING * 2);
        const cols = Math.floor((availableWidth + GRID_GAP) / (CARD_BASE_WIDTH + GRID_GAP));
        const clampedCols = Math.max(3, Math.min(5, cols));
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

        return result;
    }, [searchQuery, activeFilter, activeSort, collectionData, state.favorites, state.settings.language]);

    // Check if we're in filtered mode (not default view)
    const isFilteredView = searchQuery.trim() || activeFilter !== 'all' || activeSort !== 'rarity';

    // Build the list data for FlashList
    const listData = useMemo((): ListItem[] => {
        const items: ListItem[] = [];

        // Add filter header (contains search, filters, sorts)
        items.push({ type: 'filter-header' });

        // Add progress card
        items.push({ type: 'progress-card' });

        // Add stats grid
        items.push({ type: 'stats-grid' });

        if (isFilteredView) {
            // Filtered view: flat list of animals
            filteredAnimals.forEach(animal => {
                items.push({
                    type: 'animal',
                    animal,
                    rarity: animal.rarity,
                });
            });
        } else {
            // Default view: grouped by rarity with collapsible sections
            const rarityOrder: Rarity[] = ['legendary', 'epic', 'rare', 'common'];

            rarityOrder.forEach(rarity => {
                const animalsInRarity = animalsByRarity[rarity];
                if (animalsInRarity.length > 0) {
                    // Add section header
                    items.push({
                        type: 'section-header',
                        rarity,
                        isExpanded: expandedSections[rarity],
                    });

                    // Add animals if section is expanded
                    if (expandedSections[rarity]) {
                        animalsInRarity.forEach(animal => {
                            items.push({
                                type: 'animal',
                                animal,
                                rarity,
                            });
                        });
                    }
                }
            });
        }

        return items;
    }, [isFilteredView, filteredAnimals, animalsByRarity, expandedSections]);

    // Handle tap on animal card
    const handleAnimalPress = useCallback((animal: Animal) => {
        const data = collectionData.get(animal.id);
        if (data && data.count > 0) {
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

    // Toggle section expansion
    const toggleSection = useCallback((rarity: Rarity) => {
        if (state.settings.hapticsEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setExpandedSections(prev => ({
            ...prev,
            [rarity]: !prev[rarity],
        }));
    }, [state.settings.hapticsEnabled]);

    // Handle scroll for scroll-to-top button
    const handleScroll = useCallback((event: { nativeEvent: { contentOffset: { y: number } } }) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        setShowScrollToTop(offsetY > SCROLL_TO_TOP_THRESHOLD);
    }, []);

    // Scroll to top handler
    const handleScrollToTop = useCallback(() => {
        flashListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, []);

    // Render item for FlashList
    const renderItem = useCallback(({ item, index }: { item: ListItem; index: number }) => {
        switch (item.type) {
            case 'filter-header':
                return (
                    <View>
                        {/* Search Bar */}
                        <View style={styles.searchContainer}>
                            <Text style={styles.searchIcon} importantForAccessibility="no">🔍</Text>
                            <TextInput
                                style={styles.searchInput}
                                placeholder={i18n('searchPlaceholder')}
                                placeholderTextColor={theme.colors.textSecondary}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCapitalize="none"
                                autoCorrect={false}
                                accessible={true}
                                accessibilityLabel={i18n('searchPlaceholder')}
                                accessibilityHint={state.settings.language === 'tr' ? 'Hayvanları isme göre ara' : 'Search for animals by name'}
                            />
                            {searchQuery.length > 0 && (
                                <Pressable
                                    onPress={() => setSearchQuery('')}
                                    style={styles.searchClear}
                                    accessible={true}
                                    accessibilityRole="button"
                                    accessibilityLabel={state.settings.language === 'tr' ? 'Aramayı temizle' : 'Clear search'}
                                >
                                    <Text style={styles.searchClearText}>✕</Text>
                                </Pressable>
                            )}
                        </View>

                        {/* Filter Chips */}
                        <View style={styles.filterRow} accessibilityRole="radiogroup">
                            <FilterChip
                                label={i18n('filterAll')}
                                value="all"
                                active={activeFilter === 'all'}
                                onPress={handleFilterPress}
                                styles={styles}
                                accessibilityHint={state.settings.language === 'tr' ? 'Tüm hayvanları göster' : 'Show all animals'}
                            />
                            <FilterChip
                                label={i18n('filterCollected')}
                                value="collected"
                                active={activeFilter === 'collected'}
                                onPress={handleFilterPress}
                                styles={styles}
                                accessibilityHint={state.settings.language === 'tr' ? 'Sadece toplanan hayvanları göster' : 'Show collected animals only'}
                            />
                            <FilterChip
                                label={i18n('filterUncollected')}
                                value="uncollected"
                                active={activeFilter === 'uncollected'}
                                onPress={handleFilterPress}
                                styles={styles}
                                accessibilityHint={state.settings.language === 'tr' ? 'Sadece eksik hayvanları göster' : 'Show missing animals only'}
                            />
                            <FilterChip
                                label={state.settings.language === 'tr' ? 'Favoriler' : 'Favorites'}
                                value="favorites"
                                active={activeFilter === 'favorites'}
                                onPress={handleFilterPress}
                                styles={styles}
                                accessibilityHint={state.settings.language === 'tr' ? 'Sadece favori hayvanları göster' : 'Show favorite animals only'}
                            />
                        </View>

                        {/* Sort Chips */}
                        <View style={styles.sortRow} accessibilityRole="radiogroup">
                            <Text style={styles.sortLabel} importantForAccessibility="no">{i18n('sort')}:</Text>
                            <SortChip
                                label={i18n('sortByRarity')}
                                value="rarity"
                                active={activeSort === 'rarity'}
                                onPress={handleSortPress}
                                styles={styles}
                                accessibilityHint={state.settings.language === 'tr' ? 'Hayvanları nadirliğe göre sırala' : 'Sort animals by rarity'}
                            />
                            <SortChip
                                label={i18n('sortByRecent')}
                                value="recent"
                                active={activeSort === 'recent'}
                                onPress={handleSortPress}
                                styles={styles}
                                accessibilityHint={state.settings.language === 'tr' ? 'Hayvanları en son toplanana göre sırala' : 'Sort by most recently collected'}
                            />
                            <SortChip
                                label={i18n('sortByName')}
                                value="name"
                                active={activeSort === 'name'}
                                onPress={handleSortPress}
                                styles={styles}
                                accessibilityHint={state.settings.language === 'tr' ? 'Hayvanları alfabetik sırala' : 'Sort animals alphabetically'}
                            />
                        </View>
                    </View>
                );

            case 'progress-card':
                return (
                    <View
                        style={styles.progressCard}
                        accessible={true}
                        accessibilityRole="progressbar"
                        accessibilityLabel={`${i18n('collectionProgress')}: ${stats.total} ${state.settings.language === 'tr' ? 'hayvan' : 'animals'} / ${stats.max}, ${Math.round((stats.total / stats.max) * 100)}%`}
                        accessibilityValue={{ min: 0, max: stats.max, now: stats.total }}
                    >
                        <Text style={styles.progressTitle}>{i18n('collectionProgress')}</Text>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${(stats.total / stats.max) * 100}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.progressText} importantForAccessibility="no">
                            {stats.total} / {stats.max} {i18n('animalsCollected')} ({Math.round((stats.total / stats.max) * 100)}%)
                        </Text>
                    </View>
                );

            case 'stats-grid':
                return (
                    <View style={styles.statsGrid} accessibilityRole="summary">
                        <View
                            style={styles.statCard}
                            accessible={true}
                            accessibilityLabel={`${state.stats.totalFocusMinutes} ${i18n('minutes')}`}
                        >
                            <Text style={styles.statEmoji} importantForAccessibility="no">⏱️</Text>
                            <Text style={styles.statValue}>{state.stats.totalFocusMinutes}</Text>
                            <Text style={styles.statLabel}>{i18n('minutes')}</Text>
                        </View>
                        <View
                            style={styles.statCard}
                            accessible={true}
                            accessibilityLabel={`${state.stats.completedSessions} ${i18n('completed')}`}
                        >
                            <Text style={styles.statEmoji} importantForAccessibility="no">✅</Text>
                            <Text style={styles.statValue}>{state.stats.completedSessions}</Text>
                            <Text style={styles.statLabel}>{i18n('completed')}</Text>
                        </View>
                        <View
                            style={styles.statCard}
                            accessible={true}
                            accessibilityLabel={`${state.stats.bestStreak} ${i18n('bestStreak')}`}
                        >
                            <Text style={styles.statEmoji} importantForAccessibility="no">🔥</Text>
                            <Text style={styles.statValue}>{state.stats.bestStreak}</Text>
                            <Text style={styles.statLabel}>{i18n('bestStreak')}</Text>
                        </View>
                    </View>
                );

            case 'section-header': {
                const rarityColor = getRarityColor(item.rarity);
                const rarityStats = stats.byRarity[item.rarity];
                return (
                    <Pressable
                        onPress={() => toggleSection(item.rarity)}
                        style={({ pressed }) => [
                            styles.sectionHeader,
                            pressed && styles.sectionHeaderPressed,
                        ]}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`${getRarityLabelI18n(item.rarity, state.settings.language)} section, ${rarityStats.collected} of ${rarityStats.total}`}
                        accessibilityHint={item.isExpanded ? 'Double tap to collapse' : 'Double tap to expand'}
                        accessibilityState={{ expanded: item.isExpanded }}
                    >
                        <View style={[styles.sectionDot, { backgroundColor: rarityColor }]} />
                        <Text style={[styles.sectionTitle, { color: rarityColor }]}>
                            {getRarityLabelI18n(item.rarity, state.settings.language)}
                        </Text>
                        <Text style={styles.sectionCount}>
                            {rarityStats.collected} / {rarityStats.total}
                        </Text>
                        <View style={styles.chevronContainer}>
                            <Text style={[
                                styles.chevron,
                                { transform: [{ rotate: item.isExpanded ? '180deg' : '0deg' }] }
                            ]}>▼</Text>
                        </View>
                    </Pressable>
                );
            }

            case 'animal': {
                const data = collectionData.get(item.animal.id);
                const isCollected = data && data.count > 0;
                // Calculate entrance delay based on index within current section
                const entranceDelay = Math.min(index * 30, 300);

                return (
                    <View style={styles.animalCardWrapper}>
                        <AnimalCard
                            animal={item.animal}
                            collected={isCollected || false}
                            count={data?.count || 0}
                            size="small"
                            customWidth={cardWidth}
                            language={state.settings.language}
                            onPress={isCollected ? () => handleAnimalPress(item.animal) : undefined}
                            entranceDelay={entranceDelay}
                        />
                    </View>
                );
            }

            default:
                return null;
        }
    }, [
        styles, i18n, theme, searchQuery, activeFilter, activeSort,
        handleFilterPress, handleSortPress, state, stats, collectionData,
        cardWidth, handleAnimalPress, toggleSection
    ]);

    // Get item type for FlashList optimization
    const getItemType = useCallback((item: ListItem) => item.type, []);

    // Override item layout for better FlashList performance
    const overrideItemLayout = useCallback((
        layout: { span?: number; size?: number },
        item: ListItem,
    ) => {
        switch (item.type) {
            case 'filter-header':
                layout.size = 180;
                layout.span = numColumns;
                break;
            case 'progress-card':
                layout.size = 120;
                layout.span = numColumns;
                break;
            case 'stats-grid':
                layout.size = 100;
                layout.span = numColumns;
                break;
            case 'section-header':
                layout.size = 50;
                layout.span = numColumns;
                break;
            case 'animal':
                layout.size = Math.round(cardWidth * 1.25) + 4; // Card height + wrapper padding
                layout.span = 1;
                break;
        }
    }, [numColumns, cardWidth]);

    // Key extractor for FlashList
    const keyExtractor = useCallback((item: ListItem, index: number) => {
        switch (item.type) {
            case 'filter-header':
                return 'filter-header';
            case 'progress-card':
                return 'progress-card';
            case 'stats-grid':
                return 'stats-grid';
            case 'section-header':
                return `section-${item.rarity}`;
            case 'animal':
                return `animal-${item.animal.id}-${item.rarity}`;
            default:
                return `item-${index}`;
        }
    }, []);

    // Get selected animal data for modal
    const selectedAnimalData = selectedAnimal
        ? collectionData.get(selectedAnimal.id)
        : null;

    // Empty state for filtered view
    const ListEmptyComponent = useMemo(() => {
        if (isFilteredView && filteredAnimals.length === 0) {
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
        if (state.collection.length === 0) {
            return (
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
            );
        }
        return null;
    }, [isFilteredView, filteredAnimals.length, activeFilter, state.collection.length, i18n, router]);

    return (
        <SafeAreaView style={styles.container}>
            {/* Background Layer - must be first for proper Android rendering */}
            <View style={styles.backgroundLayer} pointerEvents="none">
                <AnimatedBackground sessionState="idle" variant="collection" />
                <FloatingParticles count={12} isActive={false} variant="collection" />
            </View>

            {/* Foreground Content Layer */}
            <View style={styles.foregroundLayer}>
                <FlashList
                    ref={flashListRef}
                    data={listData}
                    renderItem={renderItem}
                    numColumns={numColumns}
                    getItemType={getItemType}
                    overrideItemLayout={overrideItemLayout}
                    keyExtractor={keyExtractor}
                    contentContainerStyle={styles.listContent}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={ListEmptyComponent}
                />

                {/* Scroll to top button */}
                <ScrollToTopButton
                    visible={showScrollToTop}
                    onPress={handleScrollToTop}
                    hapticsEnabled={state.settings.hapticsEnabled}
                    accessibilityLabel={i18n('scrollToTop')}
                    accessibilityHint={i18n('scrollToTopHint')}
                />
            </View>

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
