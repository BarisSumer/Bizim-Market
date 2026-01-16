import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

/**
 * Check if push notifications are supported on this device
 * Push notifications only work on physical devices, not simulators/emulators
 */
export function isPushNotificationsSupported(): boolean {
    return Device.isDevice;
}

/**
 * Request notification permissions from the user
 * @returns true if permissions were granted, false otherwise
 */
export async function requestNotificationPermissions(): Promise<boolean> {
    if (!isPushNotificationsSupported()) {
        console.log('[Notifications] Push notifications not supported on this device (simulator/emulator)');
        return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.log('[Notifications] Permission not granted');
        return false;
    }

    return true;
}

/**
 * Get the Expo push token for this device
 * @returns The push token string, or null if unable to get token
 */
export async function getExpoPushToken(): Promise<string | null> {
    if (!isPushNotificationsSupported()) {
        console.log('[Notifications] Cannot get push token on simulator/emulator');
        return null;
    }

    try {
        // For Android, we need to set up a notification channel
        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#4ADE80',
            });
        }

        // Get the projectId from expo-constants (required for Expo Go and EAS builds)
        const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ??
            Constants?.easConfig?.projectId;

        if (!projectId) {
            console.error('[Notifications] Project ID not found. Make sure you have configured EAS in your project.');
            console.error('[Notifications] Run "npx eas build:configure" to set up your project with EAS.');
            return null;
        }

        console.log('[Notifications] Using projectId:', projectId);

        const token = await Notifications.getExpoPushTokenAsync({
            projectId: projectId,
        });

        console.log('[Notifications] Push token:', token.data);
        return token.data;
    } catch (error) {
        console.error('[Notifications] Error getting push token:', error);
        return null;
    }
}

