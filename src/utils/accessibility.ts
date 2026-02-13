// Accessibility utilities for screen reader announcements
import { AccessibilityInfo } from 'react-native';
import { t, TranslationKey, Language } from '../i18n/translations';

/**
 * Announces a message to screen readers (VoiceOver on iOS, TalkBack on Android)
 * Uses AccessibilityInfo.announceForAccessibility for cross-platform support
 *
 * @param message - The message to announce
 */
export function announceForAccessibility(message: string): void {
    if (message && message.trim()) {
        AccessibilityInfo.announceForAccessibility(message);
    }
}

/**
 * Announces a localized message to screen readers
 * Supports placeholder replacement for dynamic content
 *
 * @param key - The translation key
 * @param language - The current language setting
 * @param replacements - Optional object with placeholder replacements
 */
export function announceLocalized(
    key: TranslationKey,
    language: Language,
    replacements?: Record<string, string | number>
): void {
    let message = t(key, language);

    // Replace placeholders like {minutes}, {count}, etc.
    if (replacements) {
        Object.entries(replacements).forEach(([placeholder, value]) => {
            message = message.replace(`{${placeholder}}`, String(value));
        });
    }

    announceForAccessibility(message);
}

/**
 * Announces session start to screen readers
 */
export function announceSessionStart(
    durationMinutes: number,
    language: Language
): void {
    announceLocalized('a11yAnnounceSessionStarted', language, {
        minutes: durationMinutes,
    });
}

/**
 * Announces session pause to screen readers
 */
export function announceSessionPause(
    pausesRemaining: number,
    language: Language
): void {
    announceLocalized('a11yAnnounceSessionPaused', language, {
        pauses: pausesRemaining,
    });
}

/**
 * Announces session resume to screen readers
 */
export function announceSessionResume(language: Language): void {
    announceLocalized('a11yAnnounceSessionResumed', language);
}

/**
 * Announces session completion to screen readers
 */
export function announceSessionComplete(
    animalName: string,
    rarity: string,
    language: Language
): void {
    // Get localized rarity name with validation
    const validRarities = ['common', 'rare', 'epic', 'legendary'];
    const localizedRarity = validRarities.includes(rarity) ? t(rarity as TranslationKey, language) : rarity;

    announceLocalized('a11yAnnounceSessionCompleted', language, {
        animal: animalName,
        rarity: localizedRarity,
    });
}

/**
 * Announces session failure to screen readers
 */
export function announceSessionFailed(language: Language): void {
    announceLocalized('a11yAnnounceSessionFailed', language);
}

/**
 * Announces streak update to screen readers
 */
export function announceStreakUpdate(
    streakCount: number,
    isBestStreak: boolean,
    language: Language
): void {
    if (isBestStreak && streakCount > 1) {
        announceLocalized('a11yAnnounceNewBestStreak', language, {
            count: streakCount,
        });
    } else {
        announceLocalized('a11yAnnounceStreakUpdate', language, {
            count: streakCount,
        });
    }
}

/**
 * Announces timer warning to screen readers
 */
export function announceTimerWarning(
    minutesRemaining: number,
    language: Language
): void {
    switch (minutesRemaining) {
        case 1:
            announceLocalized('a11yAnnounceTimerWarning1min', language);
            break;
        case 5:
            announceLocalized('a11yAnnounceTimerWarning5min', language);
            break;
        case 10:
            announceLocalized('a11yAnnounceTimerWarning10min', language);
            break;
    }
}

/**
 * Announces achievement unlock to screen readers
 */
export function announceAchievementUnlocked(
    achievementName: string,
    language: Language
): void {
    announceLocalized('a11yAnnounceAchievementUnlocked', language, {
        achievement: achievementName,
    });
}

/**
 * Announces milestone reached to screen readers
 */
export function announceMilestoneReached(
    milestoneName: string,
    language: Language
): void {
    announceLocalized('a11yAnnounceMilestoneReached', language, {
        milestone: milestoneName,
    });
}

/**
 * Announces daily goal completion to screen readers
 */
export function announceDailyGoalComplete(
    sessionCount: number,
    language: Language
): void {
    announceLocalized('a11yAnnounceDailyGoalComplete', language, {
        count: sessionCount,
    });
}

/**
 * Checks if screen reader is enabled
 * Returns a promise that resolves to true if enabled
 */
export async function isScreenReaderEnabled(): Promise<boolean> {
    return AccessibilityInfo.isScreenReaderEnabled();
}
