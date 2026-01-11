// Notification Service for Ovo Focus
// Note: Push notifications are not supported in Expo Go (SDK 53+)
// This service gracefully handles the case when notifications are unavailable

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Animal } from '../data/animals';
import { Language, t, getAnimalName } from '../i18n/translations';

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
            // Configure notification behavior
            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: false,
                    shouldShowBanner: true,
                    shouldShowList: true,
                }),
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

// Send session complete notification with animal info
export async function sendSessionCompleteNotification(
    animal: Animal,
    language: Language
): Promise<void> {
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
