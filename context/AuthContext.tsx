import NotificationHandler from '@/components/NotificationHandler';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import React, { createContext, useContext, useEffect, useState } from 'react';
import Purchases from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

interface AuthContextType {
    user: FirebaseAuthTypes.User | null;
    userData: any;
    isLoading: boolean;
    signOut: () => Promise<void>;
    deleteAccount: () => Promise<void>;
    presentPaywall: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Configure Google Sign In
        GoogleSignin.configure({
            webClientId: '1089756321378-48a5istasmq0hpakbu5nqo62o7k1lc9e.apps.googleusercontent.com',
            offlineAccess: true,
            forceCodeForRefreshToken: true,
        });

        const subscriber = auth().onAuthStateChanged((userState) => {
            setUser(userState);
            setIsLoading(false);

            // Link User ID to RevenueCat as soon as Auth state changes
            if (userState) {
                Purchases.logIn(userState.uid).catch(err =>
                    console.error('RevenueCat logIn error on auth state change:', err)
                );
            }
        });

        // Step 2: Listen for changes (Frontend)
        // This ensures the UI updates immediately even before the extension syncs to Firestore
        const customerInfoListener = Purchases.addCustomerInfoUpdateListener((info) => {
            console.log('RevenueCat: CustomerInfo updated', info.entitlements.active);
            if (user) {
                syncSubscriptionStatus(user.uid);
            }
        });

        return () => {
            subscriber();
            // Clean up listener
            // Note: addCustomerInfoUpdateListener returns a function in some versions, 
            // but in newer react-native-purchases it might handle it differently.
            // Following standard practice for event listeners.
        };
    }, []);

    useEffect(() => {
        if (!user) {
            setUserData(null);
            return;
        }

        // Sync subscription status whenever user state changes
        syncSubscriptionStatus(user.uid);

        let unsubscribeSnapshot = () => { };

        try {
            unsubscribeSnapshot = firestore()
                .collection('users')
                .doc(user.uid)
                .onSnapshot((doc) => {
                    if (doc.exists()) {
                        setUserData(doc.data());
                    } else {
                        // Fallback for existing users without documents
                        setUserData({ credits: 5, plan: 'Free' });
                    }
                }, (error) => {
                    console.error('Firestore snapshot error:', error);
                });
        } catch (error) {
            console.warn('Firestore not available (likely missing native modules):', error);
            // Provide fallback data so the app doesn't crash in Expo Go
            setUserData({ credits: 5, plan: 'Free' });
        }

        return unsubscribeSnapshot;
    }, [user]);

    const signOut = async () => {
        try {
            await auth().signOut();
            await GoogleSignin.signOut();
        } catch (error) {
            console.error('Sign out error:', error);
        }
    };

    const deleteAccount = async () => {
        console.log('deleteAccount: Starting process');
        if (!user) {
            console.error('deleteAccount: No user authenticated');
            return;
        }

        const uid = user.uid;
        const providerId = user.providerData[0]?.providerId;

        try {
            // 1. Re-authenticate for sensitive operation
            if (providerId === 'google.com') {
                console.log('deleteAccount: Re-authenticating Google user');
                const response = await GoogleSignin.signIn() as any;
                const idToken = response.idToken || response.data?.idToken;

                if (idToken) {
                    const googleCredential = auth.GoogleAuthProvider.credential(idToken);
                    await user.reauthenticateWithCredential(googleCredential);
                }
            } else if (providerId === 'apple.com') {
                console.log('deleteAccount: Re-authenticating Apple user');
                const appleAuthRequestResponse = await AppleAuthentication.signInAsync({
                    requestedScopes: [
                        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                        AppleAuthentication.AppleAuthenticationScope.EMAIL,
                    ],
                }) as any;

                const { identityToken, nonce } = appleAuthRequestResponse;
                if (identityToken) {
                    const appleCredential = auth.AppleAuthProvider.credential(identityToken, nonce);
                    await user.reauthenticateWithCredential(appleCredential);
                }
            }

            // 2. Delete Auth user 
            // Note: The Firestore document cleanup is now handled by the 'onUserDelete' Cloud Function
            // to ensure atomicity and avoid orphaned Auth accounts if this step fails.
            console.log('deleteAccount: Deleting Firebase Auth user');
            await user.delete();

            // 3. Sign out from providers
            if (providerId === 'google.com') {
                await GoogleSignin.signOut();
            }
            console.log('deleteAccount: Process complete');
        } catch (error: any) {
            console.error('deleteAccount: Error occurred:', error);
            if (error.code === 'auth/requires-recent-login') {
                throw new Error('For security reasons, this action requires a recent sign-in. Please sign out and sign in again, then try once more.');
            }
            throw error;
        }
    };

    const syncSubscriptionStatus = async (uid: string) => {
        try {
            console.log('syncSubscriptionStatus: Fetching customer info for UID:', uid);
            // We don't necessarily need to call logIn here every time if onAuthStateChanged handles it,
            // but it's safe to keep as per Step 1 of the architecture.
            await Purchases.logIn(uid);

            const customerInfo = await Purchases.getCustomerInfo();
            const isPremium = typeof customerInfo.entitlements.active['Zonix Pro'] !== "undefined";

            console.log('syncSubscriptionStatus: User premium status:', isPremium);

            // Sync with Firestore if different
            // Note: If you have the Firebase Extension fully configured, 
            // this manual write becomes a backup/fallback.
            const userDoc = await firestore().collection('users').doc(uid).get();
            if (userDoc.exists()) {
                const currentPlan = userDoc.data()?.planType;
                const newPlan = isPremium ? 'Premium' : 'Free';

                if (currentPlan !== newPlan) {
                    console.log(`syncSubscriptionStatus: Updating Firestore plan from ${currentPlan} to ${newPlan}`);
                    await firestore().collection('users').doc(uid).update({
                        planType: newPlan,
                        updatedAt: firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        } catch (error) {
            console.error('syncSubscriptionStatus: Error syncing with RevenueCat:', error);
        }
    };

    const handlePostPurchase = async (uid: string) => {
        try {
            console.log('handlePostPurchase: Starting post-purchase logic for UID:', uid);
            const userRef = firestore().collection('users').doc(uid);

            const newPayment = {
                id: Date.now().toString(), // Use current timestamp as a simple ID
                amount: '$19.99', // Placeholder or fetch from RC
                date: firestore.Timestamp.now(),
                status: 'Completed',
                description: 'Premium Subscription (1,000 Credits Bonus)'
            };

            // 1. Add 1000 credits, set plan to Premium, and add to payment history array
            await userRef.update({
                credits: firestore.FieldValue.increment(1000),
                planType: 'Premium',
                paymentHistory: firestore.FieldValue.arrayUnion(newPayment),
                lastPurchaseAt: firestore.FieldValue.serverTimestamp(),
                updatedAt: firestore.FieldValue.serverTimestamp()
            });

            console.log('handlePostPurchase: Success!');
        } catch (error) {
            console.error('handlePostPurchase: Error updating credits/history:', error);
        }
    };

    const presentPaywall = async () => {
        try {
            console.log('presentPaywall: Presenting...');
            const result: PAYWALL_RESULT = await RevenueCatUI.presentPaywall();
            console.log('presentPaywall: Result:', result);

            if (result === PAYWALL_RESULT.PURCHASED) {
                if (user) {
                    console.log('presentPaywall: Purchase successful. Refreshing token...');
                    // Pro-Tip: Force refresh token to get new Custom Claims from the Extension
                    try {
                        await auth().currentUser?.getIdToken(true);
                        console.log('presentPaywall: Token refreshed successfully');
                    } catch (tokenErr) {
                        console.error('presentPaywall: Failed to refresh token:', tokenErr);
                    }

                    await handlePostPurchase(user.uid);
                    await syncSubscriptionStatus(user.uid);
                }
            } else if (result === PAYWALL_RESULT.RESTORED) {
                if (user) {
                    await auth().currentUser?.getIdToken(true);
                    await syncSubscriptionStatus(user.uid);
                }
            }
        } catch (error) {
            console.error('presentPaywall: Error:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, userData, isLoading, signOut, deleteAccount, presentPaywall }}>
            <NotificationHandler />
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
