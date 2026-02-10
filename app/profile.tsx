import AuthModal from '@/components/AuthModal';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import { useRouter } from 'expo-router';
import React, { useEffect, useState, } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Platform, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const router = useRouter()
    const { user, userData, signOut, deleteAccount, presentPaywall, restorePurchases } = useAuth();
    const colorScheme = useColorScheme();
    const themeColors = Colors[colorScheme ?? 'light'];
    const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
    const [redeemCode, setRedeemCode] = useState('');
    const [isRedeeming, setIsRedeeming] = useState(false);

    // Settings States
    const [isPersonaModalVisible, setIsPersonaModalVisible] = useState(false);
    const [personaText, setPersonaText] = useState(userData?.persona || '');
    const [isNotificationsModalVisible, setIsNotificationsModalVisible] = useState(false);
    const [isPreferencesModalVisible, setIsPreferencesModalVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isRedeemCodeModalVisible, setIsRedeemCodeModalVisible] = useState(false);

    const rotation = useSharedValue(0);

    useEffect(() => {
        rotation.value = withRepeat(
            withTiming(360, { duration: 10000, easing: Easing.linear }),
            -1,
            false
        );
    }, []);

    useEffect(() => {
        if (userData?.persona !== undefined) {
            setPersonaText(userData.persona);
        }
    }, [userData?.persona]);

    const animatedGlowStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotate: `${rotation.value}deg` }],
        };
    });

    const openAuthModal = (mode: 'login' | 'signup') => {
        setAuthMode(mode);
        setIsAuthModalVisible(true);
    };

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out', style: 'destructive', onPress: async () => {
                    await signOut();
                }
            },
        ]);
    };

    const handleDeleteAccount = () => {
        console.log('Delete Account button pressed');
        if (!deleteAccount) {
            console.error('deleteAccount function is missing');
            Alert.alert('Error', 'Service unavailable. Please restart the app.');
            return;
        }
        Alert.alert(
            'Delete Account',
            'Are you sure you want to delete your account? This action is irreversible and all your data will be permanently deleted.',
            [
                { text: 'Cancel', style: 'cancel', onPress: () => console.log('Deletion cancelled by user') },
                {
                    text: 'Delete Permanently',
                    style: 'destructive',
                    onPress: async () => {
                        console.log('User confirmed deletion in Alert');
                        try {
                            await deleteAccount();
                            Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
                        } catch (error: any) {
                            console.error('Delete account action failed:', error);
                            Alert.alert('Error', error.message || 'Failed to delete account. You may need to login again to perform this sensitive action.');
                        }
                    }
                },
            ]
        );
    };

    const handleRedeemCode = async () => {
        if (!redeemCode.trim()) {
            Alert.alert('Invalid Code', 'Please enter a code.');
            return;
        }

        setIsRedeeming(true);

        try {
            const redeemCodeFunction = functions().httpsCallable('redeemCode');
            const result = await redeemCodeFunction({ code: redeemCode.trim() });

            if ((result.data as any).success) {
                Alert.alert(
                    'Success! 🎉',
                    (result.data as any).message,
                    [{ text: 'OK', onPress: () => setRedeemCode('') }]
                );
            }
        } catch (error: any) {
            console.error('Redeem code error:', error);

            let errorMessage = 'Failed to redeem code. Please try again.';

            if (error.code === 'functions/not-found') {
                errorMessage = 'Invalid code. Please check and try again.';
            } else if (error.code === 'functions/already-exists') {
                errorMessage = 'You have already redeemed this code.';
            } else if (error.code === 'functions/unauthenticated') {
                errorMessage = 'Please sign in to redeem codes.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            Alert.alert('Redemption Failed', errorMessage);
        } finally {
            setIsRedeeming(false);
        }
    };

    const updateSetting = async (key: string, value: any) => {
        if (!user) return;
        setIsSaving(true);
        try {
            await firestore().collection('users').doc(user.uid).update({
                [key]: value,
                updatedAt: firestore.FieldValue.serverTimestamp(),
            });
        } catch (error) {
            console.error(`Error updating ${key}:`, error);
            Alert.alert('Update Failed', `Failed to update ${key}. Please try again.`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSavePersona = async () => {
        await updateSetting('persona', personaText);
        setIsPersonaModalVisible(false);
    };

    const toggleNotification = async (value: boolean) => {
        await updateSetting('notifications', value);
    };

    const togglePreference = async (key: string, value: boolean) => {
        await updateSetting(key, value);
    };

    const renderLoggedIn = () => (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Minimalist Profile Header */}
            <View style={[styles.profileHeaderSection, {
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
                borderWidth: 1,
                paddingHorizontal: 20,
                paddingVertical: 24,
                marginBottom: 24,
                borderRadius: 24
            }]}>
                <View style={styles.avatarContainer}>
                    <View style={[styles.avatarInner, { borderColor: themeColors.border, backgroundColor: themeColors.background, width: 80, height: 80, borderRadius: 40 }]}>
                        <ThemedText style={[styles.avatarTextLarge, { fontSize: 29, color: themeColors.text }]}>
                            {(userData?.userName || 'D')[0].toUpperCase()}
                        </ThemedText>
                    </View>
                    {userData?.planType === 'Premium' && (
                        <View style={[styles.premiumIndicator, { backgroundColor: themeColors.tint, borderColor: themeColors.background }]}>
                            <Ionicons name="sparkles" size={12} color={themeColors.background} />
                        </View>
                    )}
                </View>

                <View style={styles.userInfoContainer}>
                    <ThemedText style={[styles.profileUserName, { color: themeColors.text, fontSize: 28, lineHeight: 34, paddingTop: 4 }]}>
                        {userData?.userName || 'Dreamer'}
                    </ThemedText>
                    <ThemedText style={[styles.profileEmail, { color: themeColors.icon }]}>{user?.email}</ThemedText>
                </View>
            </View>

            {/* Subscription Section */}
            <View style={{ marginBottom: 30 }}>
                <ThemedText style={{ color: themeColors.icon, fontSize: 13, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 }}>Subscription</ThemedText>
                {userData?.planType === 'Premium' ? (
                    <View style={[styles.itemCard, { backgroundColor: themeColors.card, borderColor: themeColors.tint }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: themeColors.tint, alignItems: 'center', justifyContent: 'center' }}>
                                <Ionicons name="diamond" size={16} color={themeColors.background} />
                            </View>
                            <View>
                                <ThemedText style={{ color: themeColors.text, fontWeight: '600' }}>Premium Active</ThemedText>
                                <ThemedText style={{ color: themeColors.icon, fontSize: 12 }}>Unlimited Access</ThemedText>
                            </View>
                        </View>
                        <TouchableOpacity onPress={() => Linking.openURL(Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions')}>
                            <ThemedText style={{ color: themeColors.tint, fontWeight: '600', fontSize: 14 }}>Manage</ThemedText>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={{ gap: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: themeColors.card, borderRadius: 12, borderWidth: 1, borderColor: themeColors.border }}>
                            <View>
                                <ThemedText style={{ color: themeColors.text, fontWeight: '600', fontSize: 16 }}>Free Plan</ThemedText>
                                <ThemedText style={{ color: themeColors.icon, fontSize: 12 }}>Upgrade for unlimited power</ThemedText>
                            </View>
                            <TouchableOpacity style={{ backgroundColor: themeColors.text, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }} onPress={presentPaywall}>
                                <ThemedText style={{ color: themeColors.background, fontWeight: '600', fontSize: 14 }}>Upgrade</ThemedText>
                            </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 }}>
                            <Ionicons name="gift-outline" size={20} color={themeColors.tint} />
                            <View style={{ flex: 1 }}>
                                <ThemedText style={{ color: themeColors.text, fontWeight: '600' }}>{userData?.credits || 0} Free Trial Credits</ThemedText>
                                <ThemedText style={{ color: themeColors.icon, fontSize: 12 }}>One-time use. Cannot be purchased.</ThemedText>
                            </View>
                        </View>

                        {/* <TouchableOpacity style={{ marginTop: 8, paddingHorizontal: 4 }} onPress={restorePurchases}>
                            <ThemedText style={{ color: themeColors.icon, fontSize: 14, textDecorationLine: 'underline' }}>Restore Purchases</ThemedText>
                        </TouchableOpacity> */}
                    </View>
                )}
            </View>

            {/* Configuration */}
            <View style={{ marginBottom: 30 }}>
                <ThemedText style={{ color: themeColors.icon, fontSize: 13, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 }}>Configuration</ThemedText>

                <TouchableOpacity style={[styles.settingRow, { borderBottomColor: themeColors.border }]} onPress={() => setIsPersonaModalVisible(true)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Ionicons name="person-circle-outline" size={22} color={themeColors.text} style={{ marginRight: 12 }} />
                        <ThemedText style={{ flex: 1, color: themeColors.text, fontSize: 16 }}>My Personas</ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={themeColors.icon} />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.settingRow, { borderBottomColor: themeColors.border }]} onPress={() => setIsNotificationsModalVisible(true)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Ionicons name="notifications-outline" size={22} color={themeColors.text} style={{ marginRight: 12 }} />
                        <ThemedText style={{ flex: 1, color: themeColors.text, fontSize: 16 }}>Notifications</ThemedText>
                    </View>
                    {/* Switch is inside modal, just show arrow here */}
                    <Ionicons name="chevron-forward" size={16} color={themeColors.icon} />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.settingRow, { borderBottomColor: themeColors.border }]} onPress={() => setIsPreferencesModalVisible(true)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Ionicons name="options-outline" size={22} color={themeColors.text} style={{ marginRight: 12 }} />
                        <ThemedText style={{ flex: 1, color: themeColors.text, fontSize: 16 }}>Preferences</ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={themeColors.icon} />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.settingRow, { borderBottomColor: themeColors.border }]} onPress={() => setIsRedeemCodeModalVisible(true)}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Ionicons name="gift-outline" size={22} color={themeColors.text} style={{ marginRight: 12 }} />
                        <ThemedText style={{ flex: 1, color: themeColors.text, fontSize: 16 }}>Redeem Code</ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={themeColors.icon} />
                </TouchableOpacity>
            </View>

            {/* Support */}
            <View style={{ marginBottom: 30 }}>
                <ThemedText style={{ color: themeColors.icon, fontSize: 13, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 }}>Support</ThemedText>

                <TouchableOpacity
                    style={[styles.settingRow, { borderBottomColor: themeColors.border, borderBottomWidth: 0 }]}
                    onPress={() => Linking.openURL('mailto:azimahmed356@gmail.com')}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Ionicons name="mail-outline" size={22} color={themeColors.text} style={{ marginRight: 12 }} />
                        <View style={{ flex: 1 }}>
                            <ThemedText style={{ color: themeColors.text, fontSize: 16 }}>Contact Support</ThemedText>
                            <ThemedText style={{ color: themeColors.icon, fontSize: 12 }}>azimahmed356@gmail.com</ThemedText>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={themeColors.icon} />
                </TouchableOpacity>
            </View>

            {/* Account Actions */}
            <View style={{ marginBottom: 40 }}>
                <ThemedText style={{ color: themeColors.icon, fontSize: 13, textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 }}>Account</ThemedText>

                {userData?.paymentHistory && userData.paymentHistory.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 8 }}>
                            <Ionicons name="receipt-outline" size={16} color={themeColors.icon} style={{ marginRight: 8 }} />
                            <ThemedText style={{ color: themeColors.icon }}>History</ThemedText>
                        </View>
                        {userData.paymentHistory.slice(0, 5).map((payment: any, index: number) => (
                            <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: index !== (userData.paymentHistory.length - 1) && index !== 4 ? 1 : 0, borderBottomColor: themeColors.border }}>
                                <View style={{ flex: 1 }}>
                                    <ThemedText style={{ color: themeColors.text, fontSize: 14, fontWeight: '500' }}>{payment.description}</ThemedText>
                                    <ThemedText style={{ color: themeColors.icon, fontSize: 12, marginTop: 2 }}>
                                        {payment.date?.toDate ? payment.date.toDate().toLocaleDateString() : (payment.date ? new Date(payment.date).toLocaleDateString() : '')}
                                    </ThemedText>
                                </View>
                                <ThemedText style={{ color: themeColors.text, fontWeight: '600' }}>{payment.amount}</ThemedText>
                            </View>
                        ))}
                    </View>
                )}

                <TouchableOpacity style={[styles.settingRow, { borderBottomColor: themeColors.border }]} onPress={handleSignOut}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Ionicons name="log-out-outline" size={22} color={themeColors.text} style={{ marginRight: 12 }} />
                        <ThemedText style={{ color: themeColors.text, fontSize: 16 }}>Sign Out</ThemedText>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.settingRow, { borderBottomColor: themeColors.border, borderBottomWidth: 0 }]} onPress={handleDeleteAccount}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Ionicons name="trash-outline" size={22} color="#ff4444" style={{ marginRight: 12 }} />
                        <ThemedText style={{ color: '#ff4444', fontSize: 16 }}>Delete Account</ThemedText>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Persona Bottom Sheet */}
            <Modal
                visible={isPersonaModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsPersonaModalVisible(false)}
            >
                <View
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <TouchableOpacity
                        style={[styles.modalOverlay, { justifyContent: 'flex-end', padding: 0 }]}
                        activeOpacity={1}
                        onPress={() => setIsPersonaModalVisible(false)}
                    >
                        <TouchableOpacity
                            activeOpacity={1}
                            style={[styles.modalContent, {
                                backgroundColor: themeColors.card,
                                borderTopLeftRadius: 32,
                                borderTopRightRadius: 32,
                                borderBottomLeftRadius: 0,
                                borderBottomRightRadius: 0,
                                padding: 24,
                                paddingBottom: Platform.OS === 'ios' ? 40 : 24,
                                borderWidth: 0,
                                borderTopWidth: 1,
                                borderColor: themeColors.border,
                                maxWidth: '100%',
                                height: '95%'
                            }]}
                        >
                            <View style={{ width: 40, height: 4, backgroundColor: themeColors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />

                            <ThemedText style={[styles.modalTitle, { color: themeColors.text, textAlign: 'left', fontSize: 24, marginBottom: 12 }]}>My Persona</ThemedText>

                            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                                <View style={{ backgroundColor: themeColors.background, padding: 16, borderRadius: 16, marginBottom: 20 }}>
                                    <ThemedText style={{ color: themeColors.icon, fontSize: 13, lineHeight: 18 }}>
                                        Tell us about yourself so our AI coaches can tailor their advice and personality to your specific needs.
                                    </ThemedText>
                                </View>

                                <TextInput
                                    style={[styles.modalInput, {
                                        backgroundColor: themeColors.background,
                                        color: themeColors.text,
                                        borderColor: themeColors.border,
                                        borderRadius: 16,
                                        minHeight: 120,
                                        padding: 16,
                                        fontSize: 15
                                    }]}
                                    placeholder="e.g. I am a professional athlete..."
                                    placeholderTextColor={themeColors.placeholder}
                                    value={personaText}
                                    onChangeText={setPersonaText}
                                    multiline
                                    maxLength={500}
                                />

                                <View style={[styles.modalButtons, { marginTop: 20 }]}>
                                    <TouchableOpacity style={[styles.modalCancelButton, { backgroundColor: themeColors.border, height: 50, justifyContent: 'center' }]} onPress={() => setIsPersonaModalVisible(false)}>
                                        <ThemedText style={[styles.modalCancelText, { color: themeColors.text }]}>Cancel</ThemedText>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.modalSaveButton, { backgroundColor: themeColors.text, borderRadius: 25, height: 50, justifyContent: 'center' }]} onPress={handleSavePersona} disabled={isSaving}>
                                        {isSaving ? <ActivityIndicator color={themeColors.background} size="small" /> : <ThemedText style={[styles.modalSaveText, { color: themeColors.background }]}>Update</ThemedText>}
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </View>
            </Modal>

            <Modal
                visible={isNotificationsModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsNotificationsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: themeColors.card, borderColor: 'transparent', borderWidth: 0, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 }]}>
                        <View style={[styles.modalHeader, { marginBottom: 10, justifyContent: 'center' }]}>
                            <ThemedText style={[styles.modalTitle, { color: themeColors.text }]}>Notifications</ThemedText>
                        </View>

                        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                            <View style={{ flex: 1 }}>
                                <ThemedText style={[styles.settingLabel, { color: themeColors.text }]}>Push Notifications</ThemedText>
                                <ThemedText style={[styles.settingDesc, { color: themeColors.icon }]}>Receive alerts and updates</ThemedText>
                            </View>
                            <Switch
                                value={userData?.notifications ?? true}
                                onValueChange={toggleNotification}
                                trackColor={{ false: themeColors.border, true: themeColors.text }}
                                thumbColor={userData?.notifications ? (colorScheme === 'dark' ? '#000' : '#fff') : '#f4f3f4'}
                            />
                        </View>

                        <TouchableOpacity style={{ marginTop: 20, padding: 15, alignItems: 'center' }} onPress={() => setIsNotificationsModalVisible(false)}>
                            <ThemedText style={{ color: themeColors.text, fontWeight: '600' }}>Close</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={isPreferencesModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsPreferencesModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: themeColors.card, borderColor: 'transparent', borderWidth: 0, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 }]}>
                        <View style={[styles.modalHeader, { marginBottom: 10, justifyContent: 'center' }]}>
                            <ThemedText style={[styles.modalTitle, { color: themeColors.text }]}>Preferences</ThemedText>
                        </View>

                        <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: themeColors.border }]}>
                            <View style={{ flex: 1 }}>
                                <ThemedText style={[styles.settingLabel, { color: themeColors.text }]}>Active Messaging</ThemedText>
                                <ThemedText style={[styles.settingDesc, { color: themeColors.icon }]}>Enable real-time chat</ThemedText>
                            </View>
                            <Switch
                                value={userData?.active_messaging ?? true}
                                onValueChange={(val) => togglePreference('active_messaging', val)}
                                trackColor={{ false: themeColors.border, true: themeColors.text }}
                                thumbColor={userData?.active_messaging ? (colorScheme === 'dark' ? '#000' : '#fff') : '#f4f3f4'}
                            />
                        </View>

                        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                            <View style={{ flex: 1 }}>
                                <ThemedText style={[styles.settingLabel, { color: themeColors.text }]}>AI Calls</ThemedText>
                                <ThemedText style={[styles.settingDesc, { color: themeColors.icon }]}>Allow voice interaction</ThemedText>
                            </View>
                            <Switch
                                value={userData?.calls ?? true}
                                onValueChange={(val) => togglePreference('calls', val)}
                                trackColor={{ false: themeColors.border, true: themeColors.text }}
                                thumbColor={userData?.calls ? (colorScheme === 'dark' ? '#000' : '#fff') : '#f4f3f4'}
                            />
                        </View>

                        <TouchableOpacity style={{ marginTop: 20, padding: 15, alignItems: 'center' }} onPress={() => setIsPreferencesModalVisible(false)}>
                            <ThemedText style={{ color: themeColors.text, fontWeight: '600' }}>Close</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Redeem Code Modal - Minimalist */}
            <Modal
                visible={isRedeemCodeModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsRedeemCodeModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: themeColors.card, borderColor: 'transparent', borderWidth: 0, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 }]}>
                        <ThemedText style={[styles.modalTitle, { color: themeColors.text, textAlign: 'center', marginBottom: 8 }]}>Redeem Code</ThemedText>
                        <ThemedText style={[styles.settingDesc, { color: themeColors.icon, textAlign: 'center' }]}>
                            Have a promo code? Redeem it here.
                        </ThemedText>

                        <TextInput
                            style={[styles.textInput, { color: themeColors.text, backgroundColor: themeColors.background, borderColor: themeColors.border, borderRadius: 12, marginTop: 20, marginBottom: 20, height: 50, flex: 0 }]}
                            placeholder="Enter Code"
                            placeholderTextColor={themeColors.placeholder}
                            value={redeemCode}
                            onChangeText={setRedeemCode}
                            autoCapitalize="characters"
                            autoCorrect={false}
                            returnKeyType="done"
                            onSubmitEditing={handleRedeemCode}
                            editable={!isRedeeming}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalCancelButton, { backgroundColor: 'transparent' }]} onPress={() => setIsRedeemCodeModalVisible(false)}>
                                <ThemedText style={[styles.modalCancelText, { color: themeColors.text }]}>Cancel</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalSaveButton, { backgroundColor: themeColors.text, borderRadius: 25 }]} onPress={handleRedeemCode} disabled={isRedeeming || !redeemCode.trim()}>
                                <ThemedText style={[styles.modalSaveText, { color: themeColors.background }]}>
                                    {isRedeeming ? 'Redeeming...' : 'Redeem'}
                                </ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );

    const renderNotLoggedIn = () => (
        <ScrollView style={[styles.scroll, { backgroundColor: themeColors.background }]} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Get Started Card */}
            <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <ThemedText style={[styles.cardTitle, { color: themeColors.text }]}>Get Started</ThemedText>
                <ThemedText style={[styles.cardSubtitle, { color: themeColors.icon }]}>Sign up to get 50 free credits</ThemedText>

                <View style={styles.promoContainer}>
                    <ThemedText style={[styles.promoTextBold, { color: themeColors.text }]}>Create a free account and get 50 credits!</ThemedText>

                    <View style={styles.benefitItem}>
                        <Ionicons name="checkmark-circle-outline" size={18} color={themeColors.text} />
                        <ThemedText style={[styles.benefitText, { color: themeColors.icon }]}>50 free credits upon signup</ThemedText>
                    </View>
                    <View style={styles.benefitItem}>
                        <Ionicons name="checkmark-circle-outline" size={18} color={themeColors.text} />
                        <ThemedText style={[styles.benefitText, { color: themeColors.icon }]}>No credit card required</ThemedText>
                    </View>
                </View>

                <View style={styles.buttonRow}>
                    <TouchableOpacity style={[styles.primaryButton, { backgroundColor: themeColors.text }]} onPress={() => openAuthModal('signup')}>
                        <ThemedText style={[styles.primaryButtonText, { color: themeColors.background }]}>Sign Up Now</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.outlineButton, { borderColor: themeColors.text }]} onPress={() => openAuthModal('login')}>
                        <ThemedText style={[styles.outlineButtonText, { color: themeColors.text }]}>Login</ThemedText>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Support Section */}
            <View style={styles.section}>
                <ThemedText style={[styles.sectionTitle, { color: themeColors.text }]}>Support</ThemedText>
                <ThemedText style={[styles.sectionSubtitle, { color: themeColors.icon }]}>We are here to help</ThemedText>

                <TouchableOpacity
                    style={[styles.itemCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                    onPress={() => Linking.openURL('mailto:azimahmed356@gmail.com')}
                >
                    <View>
                        <ThemedText style={[styles.itemTitle, { color: themeColors.text }]}>Contact Support</ThemedText>
                        <ThemedText style={[styles.itemSubtitle, { color: themeColors.icon }]}>azimahmed356@gmail.com</ThemedText>
                    </View>
                    <Ionicons name="mail-outline" size={24} color={themeColors.text} />
                </TouchableOpacity>
            </View>

            {/* Legal Section */}
            <View style={styles.section}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Ionicons name="document-text-outline" size={20} color={themeColors.text} />
                    <ThemedText style={[styles.sectionTitle, { color: themeColors.text }]}>Legal</ThemedText>
                </View>
                <ThemedText style={[styles.sectionSubtitle, { color: themeColors.icon }]}>Terms and policies</ThemedText>

                <View style={{ gap: 12 }}>
                    <TouchableOpacity
                        style={[styles.outlineButtonLarge, { backgroundColor: themeColors.card, borderColor: themeColors.border, marginTop: 8 }]}
                        onPress={() => Linking.openURL('https://zonix-ai.vercel.app/#/terms')}
                    >
                        <ThemedText style={[styles.outlineButtonText, { color: themeColors.text }]}>Terms & Conditions</ThemedText>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.outlineButtonLarge, { backgroundColor: themeColors.card, borderColor: themeColors.border, marginTop: 0 }]}
                        onPress={() => Linking.openURL('https://zonix-ai.vercel.app/#/privacy')}
                    >
                        <ThemedText style={[styles.outlineButtonText, { color: themeColors.text }]}>Privacy Policy</ThemedText>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 }}>
                <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
                    <Ionicons name="arrow-back" size={24} color={themeColors.text} />
                </TouchableOpacity>
            </View>
            {user ? renderLoggedIn() : renderNotLoggedIn()}

            <AuthModal
                isVisible={isAuthModalVisible}
                onClose={() => setIsAuthModalVisible(false)}
                mode={authMode}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
        gap: 20,
    },
    card: {
        backgroundColor: '#111',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#222',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#fff',
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#aaa',
        marginBottom: 20,
    },
    promoContainer: {
        marginBottom: 24,
    },
    promoText: {
        fontSize: 16,
        color: '#fff',
        marginBottom: 8,
    },
    promoTextBold: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 16,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    benefitText: {
        fontSize: 14,
        color: '#aaa',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    primaryButton: {
        backgroundColor: '#aa48b7',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        flex: 1,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    outlineButton: {
        borderWidth: 1,
        borderColor: '#aa48b7',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        alignItems: 'center',
    },
    outlineButtonText: {
        color: '#fff',
        fontWeight: '500',
        fontSize: 14,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#aaa',
        marginBottom: 16,
    },
    itemCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#222',
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 2,
    },
    itemSubtitle: {
        fontSize: 12,
        color: '#888',
    },
    itemTitleWhite: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    itemSubtitleWhite: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginVertical: 16,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: '#222',
    },
    dividerText: {
        color: '#444',
        fontSize: 12,
    },
    outlineButtonLarge: {
        borderWidth: 1,
        borderColor: '#222',
        backgroundColor: '#111',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    accountBadge: {
        backgroundColor: '#1a1a1a',
        padding: 4,
        paddingRight: 12,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        alignSelf: 'flex-start',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#333',
    },
    avatarPlaceholder: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#333',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: '#aaa',
        fontSize: 12,
        fontWeight: 'bold',
    },
    accountUsername: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    accountLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 16,
    },
    emailBox: {
        backgroundColor: '#1a1a1a',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#222',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    emailText: {
        color: '#fff',
        fontSize: 14,
    },
    creditsBar: {
        backgroundColor: '#1a0d11',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    creditsText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    planCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#222',
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#888',
    },
    upgradeButton: {
        backgroundColor: '#aa48b7',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    upgradeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    manageButton: {
        backgroundColor: '#222',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#333',
    },
    manageButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    paymentList: {
        backgroundColor: '#111',
        borderRadius: 16,
        padding: 4,
        borderWidth: 1,
        borderColor: '#222',
    },
    paymentItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    paymentDesc: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 2,
    },
    paymentDate: {
        color: '#666',
        fontSize: 12,
    },
    paymentAmount: {
        color: '#aa48b7',
        fontWeight: 'bold',
        fontSize: 14,
    },
    signOutButton: {
        backgroundColor: '#3d1414',
        alignSelf: 'flex-end',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginTop: 8,
    },
    signOutButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    inputRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    inputBox: {
        backgroundColor: '#1a1a1a',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#222',
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    placeholderText: {
        color: '#555',
        fontSize: 14,
    },
    applyButton: {
        backgroundColor: '#222',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
    },
    applyButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    submitButton: {
        backgroundColor: '#aa48b7',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
    },
    hintText: {
        fontSize: 11,
        color: '#444',
        marginTop: 8,
    },
    dangerZone: {
        borderWidth: 1,
        borderColor: '#3d1414',
        borderRadius: 16,
        padding: 16,
        backgroundColor: '#110a0a',
    },
    deleteButton: {
        backgroundColor: '#8b2222',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    profileHeaderSection: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 16,
        backgroundColor: '#111',
        borderRadius: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#222',
        gap: 20,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarGlow: {
        position: 'absolute',
        width: 84,
        height: 84,
        borderRadius: 42,
        overflow: 'hidden',
    },
    avatarInner: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#0a0a0a',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    avatarTextLarge: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        fontFamily: Fonts.bold,
    },
    premiumIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#aa48b7',
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#0a0a0a',
        zIndex: 2,
    },
    userInfoContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    profileUserName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
        fontFamily: Fonts.bold,
        lineHeight: 28,
    },
    emailContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    profileEmail: {
        fontSize: 14,
        color: '#aaa',
    },
    verifiedBadge: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    textInput: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        flex: 1,
        fontSize: 14,
        fontFamily: Fonts.body,
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#111',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: '#222',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        fontFamily: Fonts.bold,
    },
    modalInput: {
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        minHeight: 120,
        textAlignVertical: 'top',
        marginBottom: 24,
        borderWidth: 1,
        fontFamily: Fonts.body,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalCancelButton: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        borderRadius: 14,
    },
    modalCancelText: {
        fontWeight: '600',
        fontFamily: Fonts.regular,
    },
    modalSaveButton: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        borderRadius: 14,
    },
    modalSaveText: {
        fontWeight: 'bold',
        fontFamily: Fonts.bold,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
        fontFamily: Fonts.regular,
    },
    settingDesc: {
        fontSize: 13,
        fontFamily: Fonts.body,
    },
});
