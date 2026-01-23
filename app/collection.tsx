import React, { useMemo, useState, useCallback, useLayoutEffect, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, Pressable, useWindowDimensions } from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import Animated, {
    useAnimatedStyle,
    withTiming,
    useSharedValue,
    Easing,
    cancelAnimation,
} from 'react-native-reanimated';
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
import { getRarityLabelI18n, getAnimalName, Language } from '../src/i18n/translations';

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
    indexInSection: number; // Position within current rarity section for optimized animations
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

type ExpandAllItem = {
    type: 'expand-all';
    allExpanded: boolean;
};

type EmptyStateItem = {
    type: 'empty-state';
    variant: 'no-results' | 'no-collection';
};

type ListItem = SectionHeaderItem | AnimalItem | ProgressCardItem | StatsGridItem | FilterHeaderItem | ExpandAllItem | EmptyStateItem;

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
    // Filter section container with label and badge
    filterSection: {
        marginBottom: theme.spacing.md,
    },
    filterSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    filterSectionLabel: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.medium,
    },
    activeFilterBadge: {
        marginLeft: theme.spacing.sm,
        backgroundColor: theme.colors.accent,
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.round,
    },
    activeFilterBadgeText: {
        fontSize: theme.fontSize.xs,
        color: theme.colors.background,
        fontWeight: theme.fontWeight.bold,
    },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    // Unified chip styles - consistent for both filter and sort
    chip: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.round,
        borderWidth: 2,
        borderColor: theme.colors.surface,
        backgroundColor: 'transparent',
    },
    chipActive: {
        borderColor: theme.colors.accent,
        backgroundColor: theme.colors.accent,
    },
    chipText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.medium,
    },
    chipTextActive: {
        color: theme.colors.background,
        fontWeight: theme.fontWeight.bold,
    },
    // Sort section with segmented control style
    sortSection: {
        marginBottom: theme.spacing.lg,
    },
    sortSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    sortSectionLabel: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.medium,
    },
    sortSegmentedControl: {
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: 4,
    },
    sortSegment: {
        flex: 1,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sortSegmentActive: {
        backgroundColor: theme.colors.secondary,
    },
    sortSegmentText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.medium,
    },
    sortSegmentTextActive: {
        color: theme.colors.background,
        fontWeight: theme.fontWeight.bold,
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
    // Expand/Collapse all button
    expandAllContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: theme.spacing.sm,
    },
    expandAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surface,
    },
    expandAllButtonPressed: {
        opacity: 0.7,
    },
    expandAllText: {
        fontSize: theme.fontSize.sm,
        color: theme.colors.textSecondary,
        fontWeight: theme.fontWeight.medium,
    },
    expandAllIcon: {
        fontSize: 12,
        marginLeft: theme.spacing.xs,
        color: theme.colors.textSecondary,
    },
});

// Unified chip component - memoized to prevent unnecessary re-renders
// Used for both filter and sort options with consistent styling
interface ChipProps {
    label: string;
    active: boolean;
    onPress: () => void;
    styles: ReturnType<typeof createStyles>;
    accessibilityHint?: string;
}

const Chip = React.memo(function Chip({ label, active, onPress, styles, accessibilityHint }: ChipProps) {
    return (
        <Pressable
            style={[styles.chip, active && styles.chipActive]}
            onPress={onPress}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ selected: active }}
        >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
        </Pressable>
    );
});

// Sort segment component for segmented control - memoized
interface SortSegmentProps {
    label: string;
    active: boolean;
    onPress: () => void;
    styles: ReturnType<typeof createStyles>;
    accessibilityHint?: string;
}

const SortSegment = React.memo(function SortSegment({ label, active, onPress, styles, accessibilityHint }: SortSegmentProps) {
    return (
        <Pressable
            style={[styles.sortSegment, active && styles.sortSegmentActive]}
            onPress={onPress}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint={accessibilityHint}
            accessibilityState={{ selected: active }}
        >
            <Text style={[styles.sortSegmentText, active && styles.sortSegmentTextActive]}>{label}</Text>
        </Pressable>
    );
});

// Animated collapsible section header component
interface SectionHeaderComponentProps {
    rarity: Rarity;
    isExpanded: boolean;
    collectedCount: number;
    totalCount: number;
    onToggle: () => void;
    styles: ReturnType<typeof createStyles>;
    language: Language;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SectionHeaderComponent = React.memo(function SectionHeaderComponent({
    rarity,
    isExpanded,
    collectedCount,
    totalCount,
    onToggle,
    styles,
    language,
}: SectionHeaderComponentProps) {
    const rarityColor = getRarityColor(rarity);
    const rotation = useSharedValue(isExpanded ? 180 : 0);
    const scale = useSharedValue(1);

    // Animate chevron rotation when expanded state changes
    useEffect(() => {
        rotation.value = withTiming(isExpanded ? 180 : 0, {
            duration: 200,
            easing: Easing.out(Easing.ease),
        });

        return () => {
            cancelAnimation(rotation);
            cancelAnimation(scale);
        };
    }, [isExpanded, rotation, scale]);

    const chevronStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    const containerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = useCallback(() => {
        scale.value = withTiming(0.98, { duration: 100 });
    }, [scale]);

    const handlePressOut = useCallback(() => {
        scale.value = withTiming(1, { duration: 100 });
    }, [scale]);

    return (
        <AnimatedPressable
            onPress={onToggle}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[styles.sectionHeader, containerStyle]}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`${getRarityLabelI18n(rarity, language)} section, ${collectedCount} of ${totalCount}`}
            accessibilityHint={isExpanded ? 'Double tap to collapse' : 'Double tap to expand'}
            accessibilityState={{ expanded: isExpanded }}
        >
            <View style={[styles.sectionDot, { backgroundColor: rarityColor }]} />
            <Text style={[styles.sectionTitle, { color: rarityColor }]}>
                {getRarityLabelI18n(rarity, language)}
            </Text>
            <Text style={styles.sectionCount}>
                {collectedCount} / {totalCount}
            </Text>
            <View style={styles.chevronContainer}>
                <Animated.Text style={[styles.chevron, chevronStyle]}>▼</Animated.Text>
            </View>
        </AnimatedPressable>
    );
});

// Constants for grid layout calculations
const GRID_GAP = 12;
const CARD_BASE_WIDTH = 80; // Base width for small cards
const CONTENT_PADDING = 24; // theme.spacing.lg
const SCROLL_TO_TOP_THRESHOLD = 500;

// Animation optimization constants
const MAX_ANIMATED_ITEMS_PER_SECTION = 12; // Limit staggered animations per section
const ANIMATION_DELAY_INCREMENT = 25; // ms between each card animation
const MAX_ANIMATION_DELAY = 200; // Maximum total delay for entrance animations

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

    // Check if all sections are expanded or collapsed
    const allExpanded = useMemo(() =>
        Object.values(expandedSections).every(v => v),
        [expandedSections]
    );

    // Check if collection is empty (no animals collected yet)
    const hasNoCollection = state.collection.length === 0;

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
            // Filtered view: flat list of animals with optimized indexing
            if (filteredAnimals.length === 0) {
                // Add empty state for no search/filter results
                items.push({ type: 'empty-state', variant: 'no-results' });
            } else {
                filteredAnimals.forEach((animal, index) => {
                    items.push({
                        type: 'animal',
                        animal,
                        rarity: animal.rarity,
                        indexInSection: index, // Use flat index for filtered view
                    });
                });
            }
        } else {
            // Check if user has no animals collected at all
            if (hasNoCollection) {
                items.push({ type: 'empty-state', variant: 'no-collection' });
            } else {
                // Default view: grouped by rarity with collapsible sections
                const rarityOrder: Rarity[] = ['legendary', 'epic', 'rare', 'common'];

                // Add expand/collapse all button
                items.push({
                    type: 'expand-all',
                    allExpanded,
                });

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
                            animalsInRarity.forEach((animal, indexInSection) => {
                                items.push({
                                    type: 'animal',
                                    animal,
                                    rarity,
                                    indexInSection, // Track position within section for animations
                                });
                            });
                        }
                    }
                });
            }
        }

        return items;
    }, [isFilteredView, filteredAnimals, animalsByRarity, expandedSections, allExpanded, hasNoCollection]);

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

    // Toggle all sections at once
    const toggleAllSections = useCallback(() => {
        if (state.settings.hapticsEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        const newState = !allExpanded;
        setExpandedSections({
            legendary: newState,
            epic: newState,
            rare: newState,
            common: newState,
        });
    }, [allExpanded, state.settings.hapticsEnabled]);

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
            case 'filter-header': {
                // Calculate active filter count for badge
                const activeFilterCount = (activeFilter !== 'all' ? 1 : 0) +
                    (searchQuery.trim() ? 1 : 0);

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

                        {/* Filter Section with Label and Active Badge */}
                        <View style={styles.filterSection}>
                            <View style={styles.filterSectionHeader}>
                                <Text style={styles.filterSectionLabel}>
                                    {state.settings.language === 'tr' ? 'Filtrele' : 'Filter'}
                                </Text>
                                {activeFilterCount > 0 && (
                                    <View
                                        style={styles.activeFilterBadge}
                                        accessible={true}
                                        accessibilityLabel={state.settings.language === 'tr'
                                            ? `${activeFilterCount} aktif filtre`
                                            : `${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}`}
                                    >
                                        <Text style={styles.activeFilterBadgeText}>{activeFilterCount}</Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.filterRow} accessibilityRole="radiogroup">
                                <Chip
                                    label={i18n('filterAll')}
                                    active={activeFilter === 'all'}
                                    onPress={() => handleFilterPress('all')}
                                    styles={styles}
                                    accessibilityHint={state.settings.language === 'tr' ? 'Tüm hayvanları göster' : 'Show all animals'}
                                />
                                <Chip
                                    label={i18n('filterCollected')}
                                    active={activeFilter === 'collected'}
                                    onPress={() => handleFilterPress('collected')}
                                    styles={styles}
                                    accessibilityHint={state.settings.language === 'tr' ? 'Sadece toplanan hayvanları göster' : 'Show collected animals only'}
                                />
                                <Chip
                                    label={i18n('filterUncollected')}
                                    active={activeFilter === 'uncollected'}
                                    onPress={() => handleFilterPress('uncollected')}
                                    styles={styles}
                                    accessibilityHint={state.settings.language === 'tr' ? 'Sadece eksik hayvanları göster' : 'Show missing animals only'}
                                />
                                <Chip
                                    label={state.settings.language === 'tr' ? 'Favoriler' : 'Favorites'}
                                    active={activeFilter === 'favorites'}
                                    onPress={() => handleFilterPress('favorites')}
                                    styles={styles}
                                    accessibilityHint={state.settings.language === 'tr' ? 'Sadece favori hayvanları göster' : 'Show favorite animals only'}
                                />
                            </View>
                        </View>

                        {/* Sort Section with Segmented Control */}
                        <View style={styles.sortSection}>
                            <View style={styles.sortSectionHeader}>
                                <Text style={styles.sortSectionLabel}>
                                    {i18n('sort')}
                                </Text>
                            </View>
                            <View style={styles.sortSegmentedControl} accessibilityRole="radiogroup">
                                <SortSegment
                                    label={i18n('sortByRarity')}
                                    active={activeSort === 'rarity'}
                                    onPress={() => handleSortPress('rarity')}
                                    styles={styles}
                                    accessibilityHint={state.settings.language === 'tr' ? 'Hayvanları nadirliğe göre sırala' : 'Sort animals by rarity'}
                                />
                                <SortSegment
                                    label={i18n('sortByRecent')}
                                    active={activeSort === 'recent'}
                                    onPress={() => handleSortPress('recent')}
                                    styles={styles}
                                    accessibilityHint={state.settings.language === 'tr' ? 'Hayvanları en son toplanana göre sırala' : 'Sort by most recently collected'}
                                />
                                <SortSegment
                                    label={i18n('sortByName')}
                                    active={activeSort === 'name'}
                                    onPress={() => handleSortPress('name')}
                                    styles={styles}
                                    accessibilityHint={state.settings.language === 'tr' ? 'Hayvanları alfabetik sırala' : 'Sort animals alphabetically'}
                                />
                            </View>
                        </View>
                    </View>
                );
            }

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

            case 'expand-all':
                return (
                    <View style={styles.expandAllContainer}>
                        <Pressable
                            onPress={toggleAllSections}
                            style={({ pressed }) => [
                                styles.expandAllButton,
                                pressed && styles.expandAllButtonPressed,
                            ]}
                            accessible={true}
                            accessibilityRole="button"
                            accessibilityLabel={item.allExpanded
                                ? (state.settings.language === 'tr' ? 'Tümünü daralt' : 'Collapse all')
                                : (state.settings.language === 'tr' ? 'Tümünü genislet' : 'Expand all')}
                            accessibilityHint={state.settings.language === 'tr'
                                ? 'Tüm bölümleri genislet veya daralt'
                                : 'Expand or collapse all sections'}
                        >
                            <Text style={styles.expandAllText}>
                                {item.allExpanded
                                    ? (state.settings.language === 'tr' ? 'Tümünü daralt' : 'Collapse all')
                                    : (state.settings.language === 'tr' ? 'Tümünü genislet' : 'Expand all')}
                            </Text>
                            <Text style={styles.expandAllIcon}>
                                {item.allExpanded ? '▲' : '▼'}
                            </Text>
                        </Pressable>
                    </View>
                );

            case 'section-header': {
                const rarityStats = stats.byRarity[item.rarity];
                return (
                    <SectionHeaderComponent
                        rarity={item.rarity}
                        isExpanded={item.isExpanded}
                        collectedCount={rarityStats.collected}
                        totalCount={rarityStats.total}
                        onToggle={() => toggleSection(item.rarity)}
                        styles={styles}
                        language={state.settings.language}
                    />
                );
            }

            case 'animal': {
                const data = collectionData.get(item.animal.id);
                const isCollected = data && data.count > 0;
                // Optimize entrance delay: only animate first N items per section
                // Items beyond the threshold get no delay (instant render)
                const shouldAnimate = item.indexInSection < MAX_ANIMATED_ITEMS_PER_SECTION;
                const entranceDelay = shouldAnimate
                    ? Math.min(item.indexInSection * ANIMATION_DELAY_INCREMENT, MAX_ANIMATION_DELAY)
                    : undefined; // Skip animation for items deep in sections

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

            case 'empty-state':
                if (item.variant === 'no-results') {
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
                // no-collection variant
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

            default:
                return null;
        }
    }, [
        styles, i18n, theme, searchQuery, activeFilter, activeSort,
        handleFilterPress, handleSortPress, state, stats, collectionData,
        cardWidth, handleAnimalPress, toggleSection, toggleAllSections, router
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
                // Filter header includes: search bar (~60), filter section (~80), sort section (~70)
                layout.size = 220;
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
            case 'expand-all':
                layout.size = 40;
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
            case 'empty-state':
                layout.size = 200; // EmptyState component height
                layout.span = numColumns;
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
            case 'expand-all':
                return 'expand-all';
            case 'section-header':
                return `section-${item.rarity}`;
            case 'animal':
                return `animal-${item.animal.id}-${item.rarity}`;
            case 'empty-state':
                return `empty-state-${item.variant}`;
            default:
                return `item-${index}`;
        }
    }, []);

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
                    drawDistance={250}
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
