// Notification Service for Ovo Focus
// Note: Push notifications are not supported in Expo Go (SDK 53+)
// This service gracefully handles the case when notifications are unavailable

import { Platform, AppState } from 'react-native';
import Constants from 'expo-constants';
import { Animal } from '../data/animals';
import { Language, t, getAnimalName } from '../i18n/translations';

// Notification identifiers for cancellation
const NOTIFICATION_IDS = {
    STREAK_REMINDER: 'streak-reminder',
    DAILY_GOAL_REMINDER: 'daily-goal-reminder',
    REENGAGEMENT: 'reengagement-reminder',
} as const;

// Check if we're running in Expo Go (notifications not supported)
const isExpoGo = Constants.appOwnership === 'expo';

// Dynamically import notifications only when not in Expo Go
let Notifications: typeof import('expo-notifications') | null = null;

async function getNotificationsModule() {
    if (isExpoGo) {
        console.log('Notifications not available in Expo Go');
        return null;
    }
    if (!Notifications) {
        try {
            Notifications = await import('expo-notifications');
            // Configure notification behavior - only show if app is backgrounded
            // Check AppState.currentState directly to avoid race conditions with stale state
            Notifications.setNotificationHandler({
                handleNotification: async () => {
                    const isInForeground = AppState.currentState === 'active';
                    return {
                        shouldShowAlert: !isInForeground,
                        shouldPlaySound: !isInForeground,
                        shouldSetBadge: false,
                        shouldShowBanner: !isInForeground,
                        shouldShowList: !isInForeground,
                    };
                },
            });
        } catch (error) {
            console.log('Failed to load notifications module:', error);
            return null;
        }
    }
    return Notifications;
}

// Request notification permissions
export async function requestNotificationPermissions(): Promise<boolean> {
    const notif = await getNotificationsModule();
    if (!notif) return false;

    try {
        const { status: existingStatus } = await notif.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await notif.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Notification permissions not granted');
            return false;
        }

        // iOS specific configuration
        if (Platform.OS === 'ios') {
            await notif.setNotificationCategoryAsync('session', [
                {
                    identifier: 'open',
                    buttonTitle: 'Open',
                    options: { opensAppToForeground: true },
                },
            ]);
        }

        return true;
    } catch (error) {
        console.log('Error requesting notification permissions:', error);
        return false;
    }
}

// Send session complete notification with animal info (only if app is backgrounded)
export async function sendSessionCompleteNotification(
    animal: Animal,
    language: Language
): Promise<void> {
    // Only send notification if app is backgrounded
    // Check AppState.currentState directly to avoid race conditions with stale state
    if (AppState.currentState === 'active') {
        console.log('App in foreground - skipping notification');
        return;
    }

    const notif = await getNotificationsModule();
    if (!notif) return;

    try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return;

        const animalName = getAnimalName(animal.id, language);
        const title = `${animal.emoji} ${t('newAnimalTitle', language)}`;
        const body = `${animalName} - ${t('sessionCompleteBody', language)}`;

        await notif.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: 'default',
                data: { animalId: animal.id },
                categoryIdentifier: 'session',
            },
            trigger: null, // Send immediately
        });
    } catch (error) {
        console.log('Error sending notification:', error);
    }
}

// Send a reminder notification (optional feature)
export async function sendFocusReminderNotification(language: Language): Promise<void> {
    const notif = await getNotificationsModule();
    if (!notif) return;

    try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return;

        await notif.scheduleNotificationAsync({
            content: {
                title: '🥚 Ovo Focus',
                body: language === 'tr'
                    ? 'Odaklanma zamanı! Yeni bir hayvan çıkarmaya ne dersin?'
                    : "It's focus time! How about hatching a new animal?",
                sound: 'default',
            },
            trigger: null,
        });
    } catch (error) {
        console.log('Error sending reminder notification:', error);
    }
}

// Cancel all scheduled notifications
export async function cancelAllNotifications(): Promise<void> {
    const notif = await getNotificationsModule();
    if (!notif) return;

    try {
        await notif.cancelAllScheduledNotificationsAsync();
    } catch (error) {
        console.log('Error canceling notifications:', error);
    }
}

// Get notification permission status
export async function getNotificationPermissionStatus(): Promise<boolean> {
    const notif = await getNotificationsModule();
    if (!notif) return false;

    try {
        const { status } = await notif.getPermissionsAsync();
        return status === 'granted';
    } catch (error) {
        console.log('Error getting notification status:', error);
        return false;
    }
}

// ============================================
// Android Notification Channel Configuration
// ============================================

export async function configureNotificationChannels(): Promise<void> {
    const notif = await getNotificationsModule();
    if (!notif) {
        console.log('[Notifications] Expo Go - skipping channel configuration');
        return;
    }

    if (Platform.OS !== 'android') return;

    try {
        // Main notification channel for session-related notifications
        await notif.setNotificationChannelAsync('session', {
            name: 'Session Notifications',
            importance: notif.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF6B35',
            sound: 'default',
        });

        // Reminder channel for streaks and daily goals
        await notif.setNotificationChannelAsync('reminders', {
            name: 'Reminders',
            importance: notif.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 100, 100, 100],
            lightColor: '#4ECDC4',
            sound: 'default',
        });

        // Achievement channel
        await notif.setNotificationChannelAsync('achievements', {
            name: 'Achievements',
            importance: notif.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FFD700',
            sound: 'default',
        });

        // Re-engagement channel (lower priority)
        await notif.setNotificationChannelAsync('reengagement', {
            name: 'Re-engagement',
            importance: notif.AndroidImportance.LOW,
            sound: 'default',
        });

        console.log('[Notifications] Android channels configured successfully');
    } catch (error) {
        console.log('[Notifications] Error configuring channels:', error);
    }
}

// ============================================
// Streak Reminder Notifications
// ============================================

/**
 * Schedule a daily streak reminder notification
 * @param streakCount - Current streak count to display
 * @param reminderTime - Time of day to send the reminder
 * @param language - User's language preference
 */
export async function scheduleStreakReminder(
    streakCount: number,
    reminderTime: Date,
    language: Language
): Promise<void> {
    const notif = await getNotificationsModule();
    if (!notif) {
        console.log('[Notifications] Expo Go - skipping streak reminder');
        return;
    }

    try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return;

        // Cancel any existing streak reminder first
        await cancelStreakReminder();

        const title = t('streakReminderTitle', language);
        const body = t('streakReminderBody', language).replace('{count}', streakCount.toString());

        // Schedule daily repeating notification
        await notif.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: 'default',
                data: { type: 'streak-reminder', streakCount },
                ...(Platform.OS === 'android' && { channelId: 'reminders' }),
            },
            trigger: {
                type: notif.SchedulableTriggerInputTypes.DAILY,
                hour: reminderTime.getHours(),
                minute: reminderTime.getMinutes(),
            },
            identifier: NOTIFICATION_IDS.STREAK_REMINDER,
        });

        console.log(`[Notifications] Streak reminder scheduled for ${reminderTime.getHours()}:${reminderTime.getMinutes()}`);
    } catch (error) {
        console.log('[Notifications] Error scheduling streak reminder:', error);
    }
}

/**
 * Cancel the scheduled streak reminder notification
 */
export async function cancelStreakReminder(): Promise<void> {
    const notif = await getNotificationsModule();
    if (!notif) {
        console.log('[Notifications] Expo Go - skipping cancel streak reminder');
        return;
    }

    try {
        await notif.cancelScheduledNotificationAsync(NOTIFICATION_IDS.STREAK_REMINDER);
        console.log('[Notifications] Streak reminder cancelled');
    } catch (error) {
        console.log('[Notifications] Error cancelling streak reminder:', error);
    }
}

// ============================================
// Achievement Notifications
// ============================================

/**
 * Send an immediate notification when an achievement is unlocked
 * @param achievementName - Name of the achievement
 * @param achievementDescription - Description of the achievement
 * @param language - User's language preference
 */
export async function scheduleAchievementNotification(
    achievementName: string,
    achievementDescription: string,
    language: Language
): Promise<void> {
    const notif = await getNotificationsModule();
    if (!notif) {
        console.log('[Notifications] Expo Go - skipping achievement notification');
        return;
    }

    // Only send if app is backgrounded
    if (AppState.currentState === 'active') {
        console.log('[Notifications] App in foreground - skipping achievement notification');
        return;
    }

    try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return;

        const title = `🏆 ${t('achievementUnlockedTitle', language)}`;
        const body = `${achievementName}: ${achievementDescription}`;

        await notif.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: 'default',
                data: { type: 'achievement', achievementName },
                ...(Platform.OS === 'android' && { channelId: 'achievements' }),
            },
            trigger: null, // Send immediately
        });

        console.log(`[Notifications] Achievement notification sent: ${achievementName}`);
    } catch (error) {
        console.log('[Notifications] Error sending achievement notification:', error);
    }
}

// ============================================
// Daily Goal Notifications
// ============================================

/**
 * Schedule a mid-day reminder if user hasn't reached daily goal
 * @param currentSessions - Number of sessions completed today
 * @param goalSessions - Daily goal target
 * @param language - User's language preference
 */
export async function scheduleDailyGoalReminder(
    currentSessions: number,
    goalSessions: number,
    language: Language
): Promise<void> {
    const notif = await getNotificationsModule();
    if (!notif) {
        console.log('[Notifications] Expo Go - skipping daily goal reminder');
        return;
    }

    // Don't schedule if goal is already achieved
    if (currentSessions >= goalSessions) {
        console.log('[Notifications] Daily goal already achieved - skipping reminder');
        return;
    }

    try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return;

        // Cancel any existing daily goal reminder first
        await cancelDailyGoalReminder();

        const remaining = goalSessions - currentSessions;
        const title = t('dailyGoalReminderTitle', language);
        const body = t('dailyGoalReminderBody', language)
            .replace('{remaining}', remaining.toString())
            .replace('{goal}', goalSessions.toString());

        // Schedule for 2 PM today (or tomorrow if past 2 PM)
        const now = new Date();
        const triggerTime = new Date();
        triggerTime.setHours(14, 0, 0, 0);

        // If it's already past 2 PM, schedule for tomorrow
        if (now.getHours() >= 14) {
            triggerTime.setDate(triggerTime.getDate() + 1);
        }

        const secondsUntilTrigger = Math.max(1, Math.floor((triggerTime.getTime() - now.getTime()) / 1000));

        await notif.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: 'default',
                data: { type: 'daily-goal', currentSessions, goalSessions },
                ...(Platform.OS === 'android' && { channelId: 'reminders' }),
            },
            trigger: {
                type: notif.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: secondsUntilTrigger,
            },
            identifier: NOTIFICATION_IDS.DAILY_GOAL_REMINDER,
        });

        console.log(`[Notifications] Daily goal reminder scheduled for ${triggerTime.toLocaleString()}`);
    } catch (error) {
        console.log('[Notifications] Error scheduling daily goal reminder:', error);
    }
}

/**
 * Send celebration notification when daily goal is achieved
 * @param goalSessions - The goal that was achieved
 * @param language - User's language preference
 */
export async function sendDailyGoalAchievedNotification(
    goalSessions: number,
    language: Language
): Promise<void> {
    const notif = await getNotificationsModule();
    if (!notif) {
        console.log('[Notifications] Expo Go - skipping daily goal achieved notification');
        return;
    }

    // Only send if app is backgrounded
    if (AppState.currentState === 'active') {
        console.log('[Notifications] App in foreground - skipping daily goal achieved notification');
        return;
    }

    try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return;

        // Cancel any pending daily goal reminder
        await cancelDailyGoalReminder();

        const title = t('dailyGoalAchievedTitle', language);
        const body = t('dailyGoalAchievedBody', language).replace('{goal}', goalSessions.toString());

        await notif.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: 'default',
                data: { type: 'daily-goal-achieved', goalSessions },
                ...(Platform.OS === 'android' && { channelId: 'achievements' }),
            },
            trigger: null, // Send immediately
        });

        console.log('[Notifications] Daily goal achieved notification sent');
    } catch (error) {
        console.log('[Notifications] Error sending daily goal achieved notification:', error);
    }
}

/**
 * Cancel the scheduled daily goal reminder notification
 */
export async function cancelDailyGoalReminder(): Promise<void> {
    const notif = await getNotificationsModule();
    if (!notif) {
        console.log('[Notifications] Expo Go - skipping cancel daily goal reminder');
        return;
    }

    try {
        await notif.cancelScheduledNotificationAsync(NOTIFICATION_IDS.DAILY_GOAL_REMINDER);
        console.log('[Notifications] Daily goal reminder cancelled');
    } catch (error) {
        console.log('[Notifications] Error cancelling daily goal reminder:', error);
    }
}

// ============================================
// Re-engagement Notifications
// ============================================

/**
 * Schedule a re-engagement notification for inactive users
 * @param lastSessionDate - Date of the user's last completed session
 * @param language - User's language preference
 */
export async function scheduleReengagementNotification(
    lastSessionDate: Date,
    language: Language
): Promise<void> {
    const notif = await getNotificationsModule();
    if (!notif) {
        console.log('[Notifications] Expo Go - skipping reengagement notification');
        return;
    }

    try {
        const hasPermission = await requestNotificationPermissions();
        if (!hasPermission) return;

        // Cancel any existing re-engagement notification first
        await cancelReengagementNotification();

        const now = new Date();
        const daysSinceLastSession = Math.floor(
            (now.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Only schedule if user has been inactive for 3+ days
        if (daysSinceLastSession < 3) {
            // Schedule for 3 days after last session
            const triggerDate = new Date(lastSessionDate);
            triggerDate.setDate(triggerDate.getDate() + 3);
            triggerDate.setHours(10, 0, 0, 0); // Send at 10 AM

            const secondsUntilTrigger = Math.max(1, Math.floor((triggerDate.getTime() - now.getTime()) / 1000));

            const title = t('reengagementTitle', language);
            const body = t('reengagementBody', language);

            await notif.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    sound: 'default',
                    data: { type: 'reengagement', daysSinceLastSession: 3 },
                    ...(Platform.OS === 'android' && { channelId: 'reengagement' }),
                },
                trigger: {
                    type: notif.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: secondsUntilTrigger,
                },
                identifier: NOTIFICATION_IDS.REENGAGEMENT,
            });

            console.log(`[Notifications] Reengagement notification scheduled for ${triggerDate.toLocaleString()}`);
        } else {
            // User is already inactive, send notification tomorrow at 10 AM
            const triggerDate = new Date();
            triggerDate.setDate(triggerDate.getDate() + 1);
            triggerDate.setHours(10, 0, 0, 0);

            const secondsUntilTrigger = Math.max(1, Math.floor((triggerDate.getTime() - now.getTime()) / 1000));

            const title = t('reengagementTitle', language);
            const body = t('reengagementBody', language);

            await notif.scheduleNotificationAsync({
                content: {
                    title,
                    body,
                    sound: 'default',
                    data: { type: 'reengagement', daysSinceLastSession },
                    ...(Platform.OS === 'android' && { channelId: 'reengagement' }),
                },
                trigger: {
                    type: notif.SchedulableTriggerInputTypes.TIME_INTERVAL,
                    seconds: secondsUntilTrigger,
                },
                identifier: NOTIFICATION_IDS.REENGAGEMENT,
            });

            console.log(`[Notifications] Reengagement notification scheduled for tomorrow at 10 AM`);
        }
    } catch (error) {
        console.log('[Notifications] Error scheduling reengagement notification:', error);
    }
}

/**
 * Cancel the scheduled re-engagement notification
 */
export async function cancelReengagementNotification(): Promise<void> {
    const notif = await getNotificationsModule();
    if (!notif) {
        console.log('[Notifications] Expo Go - skipping cancel reengagement notification');
        return;
    }

    try {
        await notif.cancelScheduledNotificationAsync(NOTIFICATION_IDS.REENGAGEMENT);
        console.log('[Notifications] Reengagement notification cancelled');
    } catch (error) {
        console.log('[Notifications] Error cancelling reengagement notification:', error);
    }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get all scheduled notifications (for debugging)
 */
export async function getScheduledNotifications(): Promise<unknown[]> {
    const notif = await getNotificationsModule();
    if (!notif) {
        console.log('[Notifications] Expo Go - cannot get scheduled notifications');
        return [];
    }

    try {
        const scheduled = await notif.getAllScheduledNotificationsAsync();
        console.log('[Notifications] Scheduled notifications:', scheduled.length);
        return scheduled;
    } catch (error) {
        console.log('[Notifications] Error getting scheduled notifications:', error);
        return [];
    }
}
