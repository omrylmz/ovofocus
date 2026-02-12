// Share Service for Ovo Focus
// Enables social sharing of achievements to promote user engagement and app discovery
// Uses React Native's built-in Share API for cross-platform compatibility

import { Share, Platform } from 'react-native';
import { Rarity } from '../data/animals';
import { Language, t, getAnimalName, getRarityLabelI18n } from '../i18n/translations';

// ============================================================================
// Types
// ============================================================================

/**
 * Achievement types that can be shared
 */
export type ShareAchievementType =
    | 'streak'
    | 'collection'
    | 'session'
    | 'rare_animal'
    | 'milestone';

/**
 * Data required for each share type
 */
export interface StreakShareData {
    type: 'streak';
    streakCount: number;
}

export interface CollectionShareData {
    type: 'collection';
    collectedCount: number;
    totalCount: number;
}

export interface SessionShareData {
    type: 'session';
    durationMinutes: number;
}

export interface RareAnimalShareData {
    type: 'rare_animal';
    animalId: string;
    animalEmoji: string;
    rarity: Rarity;
}

export interface MilestoneShareData {
    type: 'milestone';
    milestoneName: string;
    milestoneEmoji?: string;
}

/**
 * Union type for all share data
 */
export type ShareData =
    | StreakShareData
    | CollectionShareData
    | SessionShareData
    | RareAnimalShareData
    | MilestoneShareData;

/**
 * Result of a share operation
 */
export interface ShareResult {
    success: boolean;
    action: 'sharedAction' | 'dismissedAction' | 'unavailable' | 'error';
    error?: string;
}

/**
 * Configuration for share messages
 */
interface ShareConfig {
    appStoreLink: string;
    playStoreLink: string;
    appName: string;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: ShareConfig = {
    // TODO: Replace with actual app store links when published
    appStoreLink: 'https://apps.apple.com/app/ovo-focus',
    playStoreLink: 'https://play.google.com/store/apps/details?id=com.ovofocus',
    appName: 'Ovo Focus',
};

// ============================================================================
// Message Templates (English)
// ============================================================================

const messagesEn = {
    streak: (count: number) =>
        `I've maintained a ${count}-day focus streak on Ovo Focus! 🔥`,
    collection: (collected: number, total: number) =>
        `I've collected ${collected}/${total} animals in Ovo Focus! 🐣`,
    session: (minutes: number) =>
        `Just completed a ${minutes}-minute focus session! 🎯`,
    rareAnimal: (rarity: string, animalName: string, emoji: string) =>
        `I just hatched a ${rarity} ${animalName}! ${emoji} 🌟`,
    milestone: (name: string, emoji: string) =>
        `Achievement unlocked: ${name}! ${emoji} 🏆`,
    appPromo: () =>
        `\n\nTry Ovo Focus - gamified productivity app!`,
};

// ============================================================================
// Message Templates (Turkish)
// ============================================================================

const messagesTr = {
    streak: (count: number) =>
        `Ovo Focus'ta ${count} günlük odaklanma serisi yaptım! 🔥`,
    collection: (collected: number, total: number) =>
        `Ovo Focus'ta ${collected}/${total} hayvan topladım! 🐣`,
    session: (minutes: number) =>
        `${minutes} dakikalık odaklanma seansını tamamladım! 🎯`,
    rareAnimal: (rarity: string, animalName: string, emoji: string) =>
        `${rarity} ${animalName} çıkardım! ${emoji} 🌟`,
    milestone: (name: string, emoji: string) =>
        `Başarı açıldı: ${name}! ${emoji} 🏆`,
    appPromo: () =>
        `\n\nOvo Focus'u dene - oyunlaştırılmış üretkenlik uygulaması!`,
};

// ============================================================================
// Share Service Implementation
// ============================================================================

/**
 * ShareService - Social sharing for achievements
 *
 * Features:
 * - Share various achievement types (streaks, collection progress, etc.)
 * - Localized messages in English and Turkish
 * - Platform-specific handling for iOS and Android
 * - App store links for discovery
 * - Error handling with descriptive results
 *
 * Usage:
 * ```typescript
 * import { shareService } from './shareService';
 *
 * // Share a streak achievement
 * const result = await shareService.shareAchievement(
 *     { type: 'streak', streakCount: 7 },
 *     'en'
 * );
 *
 * // Generate message without sharing
 * const message = shareService.generateShareMessage(
 *     { type: 'session', durationMinutes: 25 },
 *     'tr'
 * );
 * ```
 */
class ShareService {
    private config: ShareConfig;

    constructor(config: ShareConfig = DEFAULT_CONFIG) {
        this.config = config;
    }

    // ========================================================================
    // Configuration
    // ========================================================================

    /**
     * Update share service configuration
     */
    public setConfig(config: Partial<ShareConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Get current configuration
     */
    public getConfig(): ShareConfig {
        return { ...this.config };
    }

    // ========================================================================
    // Core Sharing Functions
    // ========================================================================

    /**
     * Check if sharing is available on this device
     * Note: React Native's Share API is always available, but this
     * provides a consistent interface for future platform checks
     */
    public canShare(): boolean {
        // Share API is available on both iOS and Android
        return true;
    }

    /**
     * Share an achievement with generated message
     * @param data - Achievement data to share
     * @param language - Language for the message
     * @returns Share result with success status and action taken
     */
    public async shareAchievement(
        data: ShareData,
        language: Language = 'en'
    ): Promise<ShareResult> {
        if (!this.canShare()) {
            return {
                success: false,
                action: 'unavailable',
                error: 'Sharing is not available on this device',
            };
        }

        const message = this.generateShareMessage(data, language);
        return this.shareMessage(message);
    }

    /**
     * Share a custom message
     * @param message - Message to share
     * @returns Share result
     */
    public async shareMessage(message: string): Promise<ShareResult> {
        try {
            const result = await Share.share(
                {
                    message,
                    // iOS supports both message and title
                    // Android primarily uses message
                    ...(Platform.OS === 'ios' && { title: this.config.appName }),
                },
                {
                    // iOS specific options
                    ...(Platform.OS === 'ios' && {
                        excludedActivityTypes: [
                            'com.apple.UIKit.activity.Print',
                            'com.apple.UIKit.activity.AssignToContact',
                            'com.apple.UIKit.activity.SaveToCameraRoll',
                            'com.apple.UIKit.activity.AddToReadingList',
                        ],
                    }),
                    // Android specific options
                    dialogTitle: this.config.appName,
                }
            );

            return {
                success: result.action !== Share.dismissedAction,
                action: result.action,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.warn('[ShareService] Share failed:', errorMessage);
            return {
                success: false,
                action: 'error',
                error: errorMessage,
            };
        }
    }

    /**
     * Share a message with an optional image
     * Note: React Native's Share API has limited image support.
     * For full image sharing, consider using expo-sharing or a native module.
     * @param message - Message to share
     * @param imageUri - Optional image URI (limited platform support)
     * @returns Share result
     */
    public async shareWithImage(
        message: string,
        imageUri?: string
    ): Promise<ShareResult> {
        try {
            // Basic Share API doesn't support images directly
            // We include the image URI in the share content when available
            const shareContent: { message: string; url?: string; title?: string } = {
                message,
            };

            // On iOS, we can include a URL (which could be a local file)
            if (Platform.OS === 'ios' && imageUri) {
                shareContent.url = imageUri;
            }

            if (Platform.OS === 'android' && imageUri) {
                console.log('[ShareService] Image sharing not supported on Android, sharing text only');
            }

            if (Platform.OS === 'ios') {
                shareContent.title = this.config.appName;
            }

            const result = await Share.share(shareContent, {
                dialogTitle: this.config.appName,
            });

            return {
                success: result.action !== Share.dismissedAction,
                action: result.action,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.warn('[ShareService] Share with image failed:', errorMessage);
            return {
                success: false,
                action: 'error',
                error: errorMessage,
            };
        }
    }

    // ========================================================================
    // Message Generation
    // ========================================================================

    /**
     * Generate a share message for an achievement
     * @param data - Achievement data
     * @param language - Language for the message
     * @returns Formatted share message with app promo
     */
    public generateShareMessage(data: ShareData, language: Language = 'en'): string {
        const messages = language === 'tr' ? messagesTr : messagesEn;
        let message: string;

        switch (data.type) {
            case 'streak':
                message = messages.streak(data.streakCount);
                break;

            case 'collection':
                message = messages.collection(data.collectedCount, data.totalCount);
                break;

            case 'session':
                message = messages.session(data.durationMinutes);
                break;

            case 'rare_animal': {
                const animalName = getAnimalName(data.animalId, language);
                const rarityLabel = getRarityLabelI18n(data.rarity, language);
                message = messages.rareAnimal(rarityLabel, animalName, data.animalEmoji);
                break;
            }

            case 'milestone': {
                const emoji = data.milestoneEmoji || '🏆';
                message = messages.milestone(data.milestoneName, emoji);
                break;
            }

            default:
                // Type guard - should never reach here
                const _exhaustiveCheck: never = data;
                message = '';
        }

        // Add app promo and store link
        const appPromo = messages.appPromo();
        const storeLink = this.getStoreLink();

        return `${message}${appPromo}\n${storeLink}`;
    }

    /**
     * Get the appropriate app store link based on platform
     */
    private getStoreLink(): string {
        return Platform.select({
            ios: this.config.appStoreLink,
            android: this.config.playStoreLink,
            default: this.config.playStoreLink,
        });
    }

    // ========================================================================
    // Convenience Methods
    // ========================================================================

    /**
     * Share a streak milestone
     */
    public async shareStreak(
        streakCount: number,
        language: Language = 'en'
    ): Promise<ShareResult> {
        return this.shareAchievement({ type: 'streak', streakCount }, language);
    }

    /**
     * Share collection progress
     */
    public async shareCollectionProgress(
        collectedCount: number,
        totalCount: number,
        language: Language = 'en'
    ): Promise<ShareResult> {
        return this.shareAchievement(
            { type: 'collection', collectedCount, totalCount },
            language
        );
    }

    /**
     * Share a completed session
     */
    public async shareSessionCompletion(
        durationMinutes: number,
        language: Language = 'en'
    ): Promise<ShareResult> {
        return this.shareAchievement(
            { type: 'session', durationMinutes },
            language
        );
    }

    /**
     * Share a rare animal hatch
     */
    public async shareRareAnimal(
        animalId: string,
        animalEmoji: string,
        rarity: Rarity,
        language: Language = 'en'
    ): Promise<ShareResult> {
        return this.shareAchievement(
            { type: 'rare_animal', animalId, animalEmoji, rarity },
            language
        );
    }

    /**
     * Share a milestone achievement
     */
    public async shareMilestone(
        milestoneName: string,
        milestoneEmoji?: string,
        language: Language = 'en'
    ): Promise<ShareResult> {
        return this.shareAchievement(
            { type: 'milestone', milestoneName, milestoneEmoji },
            language
        );
    }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Singleton share service instance
 * Use this throughout the app for consistent sharing behavior
 */
export const shareService = new ShareService();

// Default export for convenience
export default shareService;
