import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import { useEffect } from 'react';
import { Alert, Platform } from 'react-native';

export function useNotifications(user: any) {
    useEffect(() => {
        if (!user) return;

        const requestUserPermission = async () => {
            const authStatus = await messaging().requestPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            if (enabled) {
                console.log('Authorization status:', authStatus);
                getFcmToken();
            }
        };

        const getFcmToken = async () => {
            try {
                // Get the token
                const fcmToken = await messaging().getToken();
                if (fcmToken) {
                    console.log('FCM Token:', fcmToken);
                    // Save it to the user's document
                    await firestore().collection('users').doc(user.uid).set({
                        fcmToken: fcmToken,
                        lastTokenUpdate: firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });
                }
            } catch (error) {
                console.log('Error getting FCM token:', error);
            }
        };

        const setupListeners = () => {
            // Foreground notifications
            const unsubscribeForeground = messaging().onMessage(async remoteMessage => {
                Alert.alert(
                    remoteMessage.notification?.title || 'New Message',
                    remoteMessage.notification?.body || 'Check your app for updates!'
                );
            });

            // Notification clicked while app is in background
            const unsubscribeBackground = messaging().onNotificationOpenedApp(remoteMessage => {
                console.log('Notification caused app to open from background state:', remoteMessage.notification);
            });

            // Notification clicked while app is in killed state
            messaging()
                .getInitialNotification()
                .then(remoteMessage => {
                    if (remoteMessage) {
                        console.log('Notification caused app to open from quit state:', remoteMessage.notification);
                    }
                });

            return () => {
                unsubscribeForeground();
                unsubscribeBackground();
            };
        };

        if (Platform.OS === 'ios' || Platform.OS === 'android') {
            requestUserPermission();
            return setupListeners();
        }
    }, [user]);
}
