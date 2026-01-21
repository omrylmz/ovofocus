// Egg Styles - Customization options for egg appearance
// Users can unlock and select different egg patterns and colors

import { theme } from '../styles/theme';

export type EggPattern = 'solid' | 'spotted' | 'striped' | 'cracked' | 'galaxy' | 'hearts';
export type EggUnlockCondition = 'default' | 'streak' | 'collection' | 'sessions';

export interface EggStyle {
    id: string;
    name: string; // Translation key
    pattern: EggPattern;
    primaryColor: string;
    secondaryColor?: string;
    unlockCondition: EggUnlockCondition;
    unlockValue?: number; // e.g., 7 for 7-day streak, 10 for 10 animals collected
    emoji?: string; // Optional emoji override for the egg
}

// Default egg styles available in the app
export const EGG_STYLES: EggStyle[] = [
    // Default styles (unlocked from start)
    {
        id: 'classic',
        name: 'eggStyleClassic',
        pattern: 'solid',
        primaryColor: theme.colors.accent, // Golden yellow
        unlockCondition: 'default',
        emoji: '🥚',
    },
    {
        id: 'coral',
        name: 'eggStyleCoral',
        pattern: 'solid',
        primaryColor: theme.colors.primary, // Coral red
        unlockCondition: 'default',
        emoji: '🥚',
    },
    {
        id: 'teal',
        name: 'eggStyleTeal',
        pattern: 'solid',
        primaryColor: theme.colors.secondary, // Teal
        unlockCondition: 'default',
        emoji: '🥚',
    },

    // Streak-based unlocks
    {
        id: 'spotted_blue',
        name: 'eggStyleSpottedBlue',
        pattern: 'spotted',
        primaryColor: theme.colors.rare, // Blue
        secondaryColor: '#FFFFFF',
        unlockCondition: 'streak',
        unlockValue: 3, // 3-day streak
        emoji: '🥚',
    },
    {
        id: 'striped_gold',
        name: 'eggStyleStripedGold',
        pattern: 'striped',
        primaryColor: theme.colors.legendary, // Gold
        secondaryColor: theme.colors.accent,
        unlockCondition: 'streak',
        unlockValue: 7, // 7-day streak
        emoji: '🥚',
    },

    // Collection-based unlocks
    {
        id: 'spotted_purple',
        name: 'eggStyleSpottedPurple',
        pattern: 'spotted',
        primaryColor: theme.colors.epic, // Purple
        secondaryColor: '#FFB6C1',
        unlockCondition: 'collection',
        unlockValue: 5, // 5 unique animals
        emoji: '🥚',
    },
    {
        id: 'galaxy',
        name: 'eggStyleGalaxy',
        pattern: 'galaxy',
        primaryColor: '#1A1A4E', // Deep space blue
        secondaryColor: '#FF69B4', // Pink nebula
        unlockCondition: 'collection',
        unlockValue: 15, // 15 unique animals
        emoji: '🪐',
    },

    // Session-based unlocks
    {
        id: 'hearts',
        name: 'eggStyleHearts',
        pattern: 'hearts',
        primaryColor: '#FF6B8A', // Pink
        secondaryColor: '#FF4D6D',
        unlockCondition: 'sessions',
        unlockValue: 10, // 10 completed sessions
        emoji: '💝',
    },
    {
        id: 'cracked_gold',
        name: 'eggStyleCrackedGold',
        pattern: 'cracked',
        primaryColor: theme.colors.legendary,
        secondaryColor: '#FFE66D',
        unlockCondition: 'sessions',
        unlockValue: 25, // 25 completed sessions
        emoji: '✨',
    },

    // Rarity-themed eggs (unlocked by collecting animals of that rarity)
    {
        id: 'common_gray',
        name: 'eggStyleCommonGray',
        pattern: 'solid',
        primaryColor: theme.colors.common,
        unlockCondition: 'default',
        emoji: '🥚',
    },
    {
        id: 'rare_blue',
        name: 'eggStyleRareBlue',
        pattern: 'striped',
        primaryColor: theme.colors.rare,
        secondaryColor: '#7DD4F9',
        unlockCondition: 'collection',
        unlockValue: 3, // 3 rare animals
        emoji: '🥚',
    },
    {
        id: 'epic_purple',
        name: 'eggStyleEpicPurple',
        pattern: 'spotted',
        primaryColor: theme.colors.epic,
        secondaryColor: '#DA9AE8',
        unlockCondition: 'collection',
        unlockValue: 2, // 2 epic animals
        emoji: '🥚',
    },
    {
        id: 'legendary_gold',
        name: 'eggStyleLegendaryGold',
        pattern: 'galaxy',
        primaryColor: theme.colors.legendary,
        secondaryColor: '#FFF8DC',
        unlockCondition: 'collection',
        unlockValue: 1, // 1 legendary animal
        emoji: '🌟',
    },
];

// Helper function to get an egg style by ID
export function getEggStyleById(id: string): EggStyle | undefined {
    return EGG_STYLES.find(style => style.id === id);
}

// Helper function to get the default egg style
export function getDefaultEggStyle(): EggStyle {
    return EGG_STYLES[0]; // 'classic' style
}

// Check if an egg style is unlocked based on user stats
export interface UnlockCheckParams {
    currentStreak: number;
    bestStreak: number;
    completedSessions: number;
    uniqueAnimalsCollected: number;
    rareAnimalsCollected?: number;
    epicAnimalsCollected?: number;
    legendaryAnimalsCollected?: number;
}

export function isEggStyleUnlocked(style: EggStyle, params: UnlockCheckParams): boolean {
    switch (style.unlockCondition) {
        case 'default':
            return true;

        case 'streak':
            // Check if user has achieved the required streak (current or best)
            return params.bestStreak >= (style.unlockValue || 0);

        case 'collection':
            // Special handling for rarity-themed eggs
            if (style.id === 'rare_blue' && params.rareAnimalsCollected !== undefined) {
                return params.rareAnimalsCollected >= (style.unlockValue || 0);
            }
            if (style.id === 'epic_purple' && params.epicAnimalsCollected !== undefined) {
                return params.epicAnimalsCollected >= (style.unlockValue || 0);
            }
            if (style.id === 'legendary_gold' && params.legendaryAnimalsCollected !== undefined) {
                return params.legendaryAnimalsCollected >= (style.unlockValue || 0);
            }
            // Default collection check
            return params.uniqueAnimalsCollected >= (style.unlockValue || 0);

        case 'sessions':
            return params.completedSessions >= (style.unlockValue || 0);

        default:
            return false;
    }
}

// Get unlock progress for a style (returns a number between 0 and 1)
export function getUnlockProgress(style: EggStyle, params: UnlockCheckParams): number {
    if (isEggStyleUnlocked(style, params)) {
        return 1;
    }

    const unlockValue = style.unlockValue || 1;

    switch (style.unlockCondition) {
        case 'default':
            return 1;

        case 'streak':
            return Math.min(params.bestStreak / unlockValue, 1);

        case 'collection':
            if (style.id === 'rare_blue' && params.rareAnimalsCollected !== undefined) {
                return Math.min(params.rareAnimalsCollected / unlockValue, 1);
            }
            if (style.id === 'epic_purple' && params.epicAnimalsCollected !== undefined) {
                return Math.min(params.epicAnimalsCollected / unlockValue, 1);
            }
            if (style.id === 'legendary_gold' && params.legendaryAnimalsCollected !== undefined) {
                return Math.min(params.legendaryAnimalsCollected / unlockValue, 1);
            }
            return Math.min(params.uniqueAnimalsCollected / unlockValue, 1);

        case 'sessions':
            return Math.min(params.completedSessions / unlockValue, 1);

        default:
            return 0;
    }
}

// Get unlock requirement description
export function getUnlockRequirementKey(style: EggStyle): string {
    switch (style.unlockCondition) {
        case 'default':
            return 'eggUnlockDefault';
        case 'streak':
            return 'eggUnlockStreak';
        case 'collection':
            if (style.id === 'rare_blue') return 'eggUnlockRareAnimals';
            if (style.id === 'epic_purple') return 'eggUnlockEpicAnimals';
            if (style.id === 'legendary_gold') return 'eggUnlockLegendaryAnimals';
            return 'eggUnlockCollection';
        case 'sessions':
            return 'eggUnlockSessions';
        default:
            return 'eggUnlockDefault';
    }
}
