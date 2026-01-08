// Notification Service for Ovo Focus
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Animal } from '../data/animals';
import { Language, t, getAnimalName } from '../i18n/translations';

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

// Request notification permissions
export async function requestNotificationPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return false;
    }

    // iOS specific configuration
    if (Platform.OS === 'ios') {
        await Notifications.setNotificationCategoryAsync('session', [
            {
                identifier: 'open',
                buttonTitle: 'Open',
                options: { opensAppToForeground: true },
            },
        ]);
    }

    return true;
}

// Send session complete notification with animal info
export async function sendSessionCompleteNotification(
    animal: Animal,
    language: Language
): Promise<void> {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    const animalName = getAnimalName(animal.id, language);
    const title = `${animal.emoji} ${t('newAnimalTitle', language)}`;
    const body = `${animalName} - ${t('sessionCompleteBody', language)}`;

    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            sound: 'default',
            data: { animalId: animal.id },
            categoryIdentifier: 'session',
        },
        trigger: null, // Send immediately
    });
}

// Send a reminder notification (optional feature)
export async function sendFocusReminderNotification(language: Language): Promise<void> {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    await Notifications.scheduleNotificationAsync({
        content: {
            title: '🥚 Ovo Focus',
            body: language === 'tr'
                ? 'Odaklanma zamanı! Yeni bir hayvan çıkarmaya ne dersin?'
                : "It's focus time! How about hatching a new animal?",
            sound: 'default',
        },
        trigger: null,
    });
}

// Cancel all scheduled notifications
export async function cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

// Get notification permission status
export async function getNotificationPermissionStatus(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
}
