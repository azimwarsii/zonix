import AuthModal from '@/components/AuthModal';
import Header from '@/components/Header';
import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/Fonts';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState, } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, Platform, ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
    const router = useRouter()
    const { user, userData, signOut, deleteAccount, presentPaywall } = useAuth();
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

    const renderNotLoggedIn = () => (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Get Started Card */}
            <View style={styles.card}>
                <ThemedText style={styles.cardTitle}>Get Started</ThemedText>
                <ThemedText style={styles.cardSubtitle}>Sign up to get 1000 free coins</ThemedText>

                <View style={styles.promoContainer}>
                    <ThemedText style={styles.promoTextBold}>Create a free account and get 50 coins!</ThemedText>

                    <View style={styles.benefitItem}>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                        <ThemedText style={styles.benefitText}>1000 free coins upon signup</ThemedText>
                    </View>
                    <View style={styles.benefitItem}>
                        <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                        <ThemedText style={styles.benefitText}>No credit card required</ThemedText>
                    </View>
                </View>

                <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.primaryButton} onPress={() => openAuthModal('signup')}>
                        <ThemedText style={styles.primaryButtonText}>Sign Up Now</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.outlineButton} onPress={() => openAuthModal('login')}>
                        <ThemedText style={styles.outlineButtonText}>Login</ThemedText>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Settings Section */}
            <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Settings</ThemedText>
                <ThemedText style={styles.sectionSubtitle}>Manage your profile and notification settings</ThemedText>

                <TouchableOpacity style={styles.itemCard}>
                    <View>
                        <ThemedText style={styles.itemTitle}>Notifications</ThemedText>
                        <ThemedText style={styles.itemSubtitle}>Configure your notification preferences</ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.itemCard}>
                    <View>
                        <ThemedText style={styles.itemTitle}>Preferences</ThemedText>
                        <ThemedText style={styles.itemSubtitle}>Video looping, active messages, and more</ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
            </View>

            {/* Support Section */}
            <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Support & Feedback</ThemedText>

                <TouchableOpacity style={[styles.itemCard, { backgroundColor: '#5865F2' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Ionicons name="logo-discord" size={24} color="#fff" />
                        <View>
                            <ThemedText style={styles.itemTitleWhite}>Join the Community</ThemedText>
                            <ThemedText style={styles.itemSubtitleWhite}>Get help from coaches</ThemedText>
                        </View>
                    </View>
                    <Ionicons name="open-outline" size={20} color="#fff" />
                </TouchableOpacity>

                <View style={styles.dividerRow}>
                    <View style={styles.divider} />
                    <ThemedText style={styles.dividerText}>or</ThemedText>
                    <View style={styles.divider} />
                </View>

                <View style={styles.buttonRow}>
                    <TouchableOpacity style={[styles.outlineButton, { flex: 1 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                            <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                            <ThemedText style={styles.outlineButtonText}>Request Help</ThemedText>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.outlineButton, { flex: 1 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                            <Ionicons name="help-circle-outline" size={18} color="#fff" />
                            <ThemedText style={styles.outlineButtonText}>FAQ</ThemedText>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Legal Section */}
            <View style={styles.section}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Ionicons name="document-text-outline" size={20} color="#fff" />
                    <ThemedText style={styles.sectionTitle}>Legal</ThemedText>
                </View>
                <ThemedText style={styles.sectionSubtitle}>Terms and policies</ThemedText>

                <TouchableOpacity style={styles.outlineButtonLarge} onPress={() => router.push('https://drive.google.com/drive/folders/1Q9KbF5WG6AnJjHjN2YDDFNMxmrE_0nuS?usp=drive_link')}>
                    <ThemedText style={styles.outlineButtonText}>View Terms & Privacy Policy</ThemedText>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    const renderLoggedIn = () => (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Animated Profile Avatar Section */}
            <View style={styles.profileHeaderSection}>
                <View style={styles.avatarContainer}>
                    <Animated.View style={[styles.avatarGlow, animatedGlowStyle]}>
                        <LinearGradient
                            colors={['#aa48b7', '#4a148c', '#aa48b7']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>
                    <View style={styles.avatarInner}>
                        <ThemedText style={styles.avatarTextLarge}>
                            {(userData?.userName || 'D')[0].toUpperCase()}
                        </ThemedText>
                    </View>
                    <View style={styles.premiumIndicator}>
                        <Ionicons name="sparkles" size={10} color="#fff" />
                    </View>
                </View>

                <View style={styles.userInfoContainer}>
                    <ThemedText style={styles.profileUserName}>@{userData?.userName || 'dreamer'}</ThemedText>
                    <View style={styles.emailContainer}>
                        <ThemedText style={styles.profileEmail}>{user?.email}</ThemedText>
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#aa48b7" />
                        </View>
                    </View>
                </View>
            </View>

            {/* Subscription Card */}
            <View style={styles.card}>
                <ThemedText style={styles.cardTitle}>Subscription</ThemedText>
                <View style={styles.creditsBar}>
                    <Ionicons name="cloud" size={16} color="#aa48b7" />
                    <ThemedText style={styles.creditsText}>{userData?.credits || 0} coins remaining</ThemedText>
                </View>

                {userData?.planType === 'Premium' ? (
                    <View style={[styles.planCard, { borderColor: '#aa48b7', backgroundColor: '#1a0d11' }]}>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <View style={[styles.activeDot, { backgroundColor: '#aa48b7' }]} />
                                <ThemedText style={styles.itemTitle}>Premium Member</ThemedText>
                            </View>
                            <ThemedText style={[styles.itemSubtitle, { maxWidth: '90%' }]}>
                                Active • Renews monthly
                            </ThemedText>
                        </View>
                        <TouchableOpacity
                            style={styles.manageButton}
                            onPress={() => Linking.openURL(Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions')}
                        >
                            <ThemedText style={styles.manageButtonText}>Manage</ThemedText>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.planCard}>
                        <View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <View style={styles.activeDot} />
                                <ThemedText style={styles.itemTitle}>{userData?.planType || 'Free'} Plan</ThemedText>
                            </View>
                            <ThemedText style={[styles.itemSubtitle, { maxWidth: '70%' }]}>
                                Upgrade to get unlimited messages and more coins.
                            </ThemedText>
                        </View>
                        <TouchableOpacity style={styles.upgradeButton} onPress={presentPaywall}>
                            <Ionicons name="diamond" size={14} color="#fff" />
                            <ThemedText style={styles.upgradeButtonText}>Upgrade</ThemedText>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Payment History Section */}
            {userData?.paymentHistory && userData.paymentHistory.length > 0 && (
                <View style={styles.section}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <Ionicons name="receipt-outline" size={20} color="#fff" />
                        <ThemedText style={styles.sectionTitle}>Payment History</ThemedText>
                    </View>
                    <View style={styles.paymentList}>
                        {[...userData.paymentHistory]
                            .sort((a, b) => {
                                const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
                                const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
                                return dateB.getTime() - dateA.getTime();
                            })
                            .slice(0, 5) // Show only latest 5
                            .map((payment, index) => (
                                <View key={payment.id || index.toString()} style={styles.paymentItem}>
                                    <View>
                                        <ThemedText style={styles.paymentDesc}>{payment.description}</ThemedText>
                                        <ThemedText style={styles.paymentDate}>
                                            {payment.date ? (payment.date.toDate ? payment.date.toDate().toLocaleDateString() : new Date(payment.date).toLocaleDateString()) : 'Recent'}
                                        </ThemedText>
                                    </View>
                                    <ThemedText style={styles.paymentAmount}>{payment.amount}</ThemedText>
                                </View>
                            ))}
                    </View>
                </View>
            )}

            {/* Settings Section */}
            <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Settings</ThemedText>
                <ThemedText style={styles.sectionSubtitle}>Manage your profile and notification settings</ThemedText>

                <TouchableOpacity style={styles.itemCard} onPress={() => setIsPersonaModalVisible(true)}>
                    <View>
                        <ThemedText style={styles.itemTitle}>Personas</ThemedText>
                        <ThemedText style={styles.itemSubtitle}>{userData?.persona ? userData.persona : 'Create and use your personas for chats'}</ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.itemCard} onPress={() => setIsNotificationsModalVisible(true)}>
                    <View>
                        <ThemedText style={styles.itemTitle}>Notifications</ThemedText>
                        <ThemedText style={styles.itemSubtitle}>Configure your notification preferences</ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.itemCard} onPress={() => setIsPreferencesModalVisible(true)}>
                    <View>
                        <ThemedText style={styles.itemTitle}>Preferences</ThemedText>
                        <ThemedText style={styles.itemSubtitle}>Active messages, calls, and more</ThemedText>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                    <ThemedText style={styles.signOutButtonText}>Sign Out</ThemedText>
                </TouchableOpacity>
            </View>

            {/* Persona Modal */}
            <Modal
                visible={isPersonaModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsPersonaModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <ThemedText style={styles.modalTitle}>Update Persona</ThemedText>
                        <ThemedText style={styles.settingDesc}>This helps coaches to guide you better</ThemedText>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Enter your persona..."
                            placeholderTextColor="#666"
                            value={personaText}
                            onChangeText={setPersonaText}
                            multiline
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setIsPersonaModalVisible(false)}>
                                <ThemedText style={styles.modalCancelText}>Cancel</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSaveButton} onPress={handleSavePersona} disabled={isSaving}>
                                {isSaving ? <ActivityIndicator color="#fff" size="small" /> : <ThemedText style={styles.modalSaveText}>Save</ThemedText>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Notifications Modal */}
            <Modal
                visible={isNotificationsModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsNotificationsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <ThemedText style={styles.modalTitle}>Notifications</ThemedText>
                            <TouchableOpacity onPress={() => setIsNotificationsModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.settingRow}>
                            <View>
                                <ThemedText style={styles.settingLabel}>Push Notifications</ThemedText>
                                <ThemedText style={styles.settingDesc}>Receive alerts and updates</ThemedText>
                            </View>
                            <Switch
                                value={userData?.notifications ?? true}
                                onValueChange={toggleNotification}
                                trackColor={{ false: '#333', true: '#aa48b7' }}
                                thumbColor={userData?.notifications ? '#fff' : '#f4f3f4'}
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Preferences Modal */}
            <Modal
                visible={isPreferencesModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsPreferencesModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <ThemedText style={styles.modalTitle}>Preferences</ThemedText>
                            <TouchableOpacity onPress={() => setIsPreferencesModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.settingRow}>
                            <View>
                                <ThemedText style={styles.settingLabel}>Active Messaging</ThemedText>
                                <ThemedText style={styles.settingDesc}>Enable real-time chat</ThemedText>
                            </View>
                            <Switch
                                value={userData?.active_messaging ?? true}
                                onValueChange={(val) => togglePreference('active_messaging', val)}
                                trackColor={{ false: '#333', true: '#aa48b7' }}
                                thumbColor={userData?.active_messaging ? '#fff' : '#f4f3f4'}
                            />
                        </View>

                        <View style={styles.settingRow}>
                            <View>
                                <ThemedText style={styles.settingLabel}>AI Calls</ThemedText>
                                <ThemedText style={styles.settingDesc}>Allow voice interaction</ThemedText>
                            </View>
                            <Switch
                                value={userData?.calls ?? true}
                                onValueChange={(val) => togglePreference('calls', val)}
                                trackColor={{ false: '#333', true: '#aa48b7' }}
                                thumbColor={userData?.calls ? '#fff' : '#f4f3f4'}
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Redeem Code Section */}
            <View style={styles.section}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Ionicons name="gift-outline" size={20} color="#fff" />
                    <ThemedText style={styles.sectionTitle}>Redeem Code</ThemedText>
                </View>
                <ThemedText style={styles.sectionSubtitle}>
                    Have a promo code? Redeem it for a subscription or coins!
                </ThemedText>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Enter your code"
                        placeholderTextColor="#555"
                        value={redeemCode}
                        onChangeText={setRedeemCode}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        returnKeyType="done"
                        onSubmitEditing={handleRedeemCode}
                        editable={!isRedeeming}
                    />
                    <TouchableOpacity
                        style={[styles.submitButton, isRedeeming && styles.submitButtonDisabled]}
                        onPress={handleRedeemCode}
                        disabled={isRedeeming || !redeemCode.trim()}
                    >
                        <ThemedText style={styles.applyButtonText}>
                            {isRedeeming ? 'Redeeming...' : 'Submit'}
                        </ThemedText>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Legal & Danger Zone */}
            <View style={styles.section}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Ionicons name="document-text-outline" size={20} color="#fff" />
                    <ThemedText style={styles.sectionTitle}>Legal</ThemedText>
                </View>
                <ThemedText style={styles.sectionSubtitle}>Terms and policies</ThemedText>
                <TouchableOpacity style={styles.outlineButtonLarge} onPress={() => router.push('https://drive.google.com/drive/folders/1Q9KbF5WG6AnJjHjN2YDDFNMxmrE_0nuS?usp=drive_link')}>
                    <ThemedText style={styles.outlineButtonText}>View Terms & Privacy Policy</ThemedText>
                </TouchableOpacity>
            </View>

            <View style={[styles.section, styles.dangerZone]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Ionicons name="warning-outline" size={20} color="#ff4444" />
                    <ThemedText style={[styles.sectionTitle, { color: '#ff4444' }]}>Danger Zone</ThemedText>
                </View>
                <ThemedText style={styles.sectionSubtitle}>Irreversible account actions</ThemedText>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDeleteAccount}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <ThemedText style={styles.applyButtonText}>Delete Account</ThemedText>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header />
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
        backgroundColor: '#0a0a0a',
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
        backgroundColor: '#1a1a1a',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#222',
        flex: 1,
        color: '#fff',
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
        color: '#fff',
        fontFamily: Fonts.bold,
    },
    modalInput: {
        backgroundColor: '#0a0a0a',
        borderRadius: 16,
        padding: 16,
        color: '#fff',
        fontSize: 16,
        minHeight: 120,
        textAlignVertical: 'top',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#333',
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
        backgroundColor: '#222',
    },
    modalCancelText: {
        color: '#aaa',
        fontWeight: '600',
        fontFamily: Fonts.regular,
    },
    modalSaveButton: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        borderRadius: 14,
        backgroundColor: '#aa48b7',
    },
    modalSaveText: {
        color: '#fff',
        fontWeight: 'bold',
        fontFamily: Fonts.bold,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 2,
        fontFamily: Fonts.regular,
    },
    settingDesc: {
        fontSize: 13,
        color: '#666',
        fontFamily: Fonts.body,
    },
});
