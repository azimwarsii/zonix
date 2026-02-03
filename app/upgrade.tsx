import { Fonts } from '@/constants/Fonts';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const ACCENT_COLOR = '#aa48b7';

export default function UpgradeScreen() {
    const router = useRouter();
    const [isYearly, setIsYearly] = useState(true);

    const price = isYearly ? '9' : '19';
    const originalPrice = isYearly ? '$39.99/mo' : '$39.99/mo';
    const billedLabel = isYearly ? '$119.88 billed annually' : '$19.99 billed monthly';

    const features = [
        { icon: 'cloud-upload', text: '1,000 Dreamcoins Every Month', subtext: ['200 images', '20 minutes of voice calls', '10 videos'] },
        { icon: 'chatbubbles', text: 'Unlimited Messages' },
        { icon: 'mic', text: 'Unlimited Audio Messages' },
        { icon: 'videocam', text: 'Image & Video Generation' },
        { icon: 'call', text: 'Voice Calls' },
        { icon: 'earth', text: 'Publish Your Characters' },
    ];

    // Make sure to configure a Paywall in the Dashboard first.
    async function handleUpgrade(): Promise<void> {
        try {
            console.log('handleUpgrade: Presenting paywall...');
            const paywallResult: PAYWALL_RESULT = await RevenueCatUI.presentPaywall();

            console.log('handleUpgrade: Paywall result:', paywallResult);

            switch (paywallResult) {
                case PAYWALL_RESULT.NOT_PRESENTED:
                    Alert.alert('Error', 'Paywall could not be presented. Please try again later.');
                    break;
                case PAYWALL_RESULT.ERROR:
                    Alert.alert('Error', 'An error occurred while presenting the paywall.');
                    break;
                case PAYWALL_RESULT.CANCELLED:
                    console.log('handleUpgrade: User cancelled');
                    break;
                case PAYWALL_RESULT.PURCHASED:
                    Alert.alert('Success', 'Welcome to Premium! Your features are now unlocked.', [
                        { text: 'Awesome', onPress: () => router.push('/(tabs)/explore') }
                    ]);
                    break;
                case PAYWALL_RESULT.RESTORED:
                    Alert.alert('Restored', 'Your premium subscription has been restored.', [
                        { text: 'Great', onPress: () => router.push('/(tabs)/explore') }
                    ]);
                    break;
                default:
                    break;
            }
        } catch (e) {
            console.error('handleUpgrade: Exception caught:', e);
            Alert.alert('Error', 'An unexpected error occurred. Please try again.');
        }
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Custom Header with Back Button */}
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Top Banner Section */}
                <View style={styles.bannerContainer}>
                    <Image
                        source="https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?q=80&w=2000&auto=format&fit=crop"
                        style={styles.bannerBg}
                        contentFit="cover"
                    />
                    <LinearGradient
                        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
                        style={StyleSheet.absoluteFill}
                    />
                    <View style={styles.bannerContent}>
                        <Text style={styles.bannerTitle}>UPGRADE YOUR EXPERIENCE!</Text>
                        <View style={styles.bannerCategories}>
                            <Ionicons name="diamond-outline" size={14} color="#fff" />
                            <Text style={styles.bannerCategoryText}>CHAT</Text>
                            <Ionicons name="diamond-outline" size={14} color="#fff" />
                            <Text style={styles.bannerCategoryText}>PICS</Text>
                            <Ionicons name="diamond-outline" size={14} color="#fff" />
                            <Text style={styles.bannerCategoryText}>VIDS</Text>
                            <Ionicons name="diamond-outline" size={14} color="#fff" />
                            <Text style={styles.bannerCategoryText}>CALLS</Text>
                            <Ionicons name="diamond-outline" size={14} color="#fff" />
                        </View>
                    </View>
                </View>

                {/* Subscriptions Options */}
                <View style={styles.subscriptionSection}>
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity
                            style={[styles.toggleButton, !isYearly && styles.activeToggle]}
                            onPress={() => setIsYearly(false)}
                        >
                            <View style={styles.discountBadgeTop}>
                                <Text style={styles.discountTextTop}>50% off</Text>
                            </View>
                            <Text style={[styles.toggleText, !isYearly && styles.activeToggleText]}>Monthly</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleButton, isYearly && styles.activeToggle]}
                            onPress={() => setIsYearly(true)}
                        >
                            <View style={[styles.discountBadgeTop, { backgroundColor: '#E91E63' }]}>
                                <Text style={styles.discountTextTop}>75% off</Text>
                            </View>
                            <Text style={[styles.toggleText, isYearly && styles.activeToggleText]}>Yearly</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.priceRow}>
                        <View>
                            <Text style={styles.planName}>Premium {isYearly ? 'Yearly' : 'Monthly'}</Text>
                            <Text style={styles.originalPrice}>was {originalPrice}</Text>
                        </View>
                        <View style={styles.priceContainer}>
                            <Text style={styles.currencySymbol}>$</Text>
                            <Text style={styles.priceValue}>{price}</Text>
                            <View>
                                <Text style={styles.priceCents}>.99</Text>
                                <Text style={styles.pricePeriod}>/mo</Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.subscribeButton} onPress={handleUpgrade}>
                        <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
                    </TouchableOpacity>

                    <Text style={styles.billedInfo}>{billedLabel}</Text>

                    <View style={styles.trustRow}>
                        <View style={styles.trustItem}>
                            <MaterialIcons name="security" size={16} color="#4CAF50" />
                            <Text style={styles.trustText}>No adult transaction in your bank statement</Text>
                            <MaterialIcons name="security" size={16} color="#4CAF50" />
                        </View>
                        <View style={styles.trustItem}>
                            <MaterialIcons name="security" size={16} color="#4CAF50" />
                            <Text style={styles.trustText}>Cancel subscription at any time</Text>
                            <MaterialIcons name="security" size={16} color="#4CAF50" />
                        </View>
                    </View>

                    {/* Features Card */}
                    <View style={styles.featuresCard}>
                        {isYearly && (
                            <View style={styles.bonusBadgeContainer}>
                                <View style={styles.bonusIcon}>
                                    <Ionicons name="gift" size={20} color="#fff" />
                                </View>
                                <View style={styles.bonusContent}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Text style={styles.bonusTitle}>YEARLY BONUS</Text>
                                        <View style={styles.limitedTimeBadge}>
                                            <Text style={styles.limitedTimeText}>Limited Time</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.bonusSubtitle}>+1,000 Bonus Dreamcoins First Month</Text>
                                </View>
                            </View>
                        )}

                        {features.map((feature, index) => (
                            <View key={index} style={styles.featureItem}>
                                <View style={styles.featureIconContainer}>
                                    <Ionicons name={feature.icon as any} size={22} color={ACCENT_COLOR} />
                                </View>
                                <View style={styles.featureTextContainer}>
                                    <Text style={styles.featureText}>{feature.text}</Text>
                                    {feature.subtext && feature.subtext.map((sub, i) => (
                                        <View key={i} style={styles.subtextItem}>
                                            <Ionicons name="checkmark" size={14} color={ACCENT_COLOR} />
                                            <Text style={styles.subinnerText}>{sub}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    headerRow: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        position: 'absolute',
        top: 40,
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    bannerContainer: {
        height: 200,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bannerBg: {
        ...StyleSheet.absoluteFillObject,
    },
    bannerContent: {
        alignItems: 'center',
    },
    bannerTitle: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '900',
        textAlign: 'center',
        fontStyle: 'italic',
        fontFamily: Fonts.bold,
    },
    bannerCategories: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    bannerCategoryText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1,
    },
    subscriptionSection: {
        paddingHorizontal: 20,
        marginTop: -30,
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#1a1a1a',
        borderRadius: 25,
        padding: 4,
        marginBottom: 24,
    },
    toggleButton: {
        flex: 1,
        height: 40,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    activeToggle: {
        backgroundColor: '#aa48b7',
    },
    toggleText: {
        color: '#666',
        fontWeight: '700',
        fontSize: 16,
    },
    activeToggleText: {
        color: '#fff',
    },
    discountBadgeTop: {
        position: 'absolute',
        top: -15,
        right: -5,
        backgroundColor: '#aa48b7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    discountTextTop: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    planName: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        fontFamily: Fonts.bold,
    },
    originalPrice: {
        color: '#666',
        fontSize: 14,
        textDecorationLine: 'line-through',
        fontStyle: 'italic',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    currencySymbol: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 4,
    },
    priceValue: {
        color: '#fff',
        fontSize: 60,
        fontWeight: '900',
    },
    priceCents: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 10,
    },
    pricePeriod: {
        color: '#666',
        fontSize: 16,
    },
    subscribeButton: {
        backgroundColor: '#E91E63',
        height: 56,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    subscribeButtonText: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '900',
        fontFamily: Fonts.bold,
    },
    billedInfo: {
        color: '#666',
        fontSize: 14,
        textAlign: 'center',
        fontStyle: 'italic',
        marginBottom: 16,
    },
    trustRow: {
        alignItems: 'center',
        gap: 8,
        marginBottom: 24,
    },
    trustItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    trustText: {
        color: '#666',
        fontSize: 12,
        textAlign: 'center',
    },
    featuresCard: {
        backgroundColor: '#111',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#222',
    },
    bonusBadgeContainer: {
        flexDirection: 'row',
        backgroundColor: '#1a0d14',
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#301524',
    },
    bonusIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#301524',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    bonusContent: {
        flex: 1,
    },
    bonusTitle: {
        color: ACCENT_COLOR,
        fontSize: 16,
        fontWeight: '900',
    },
    limitedTimeBadge: {
        backgroundColor: ACCENT_COLOR,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    limitedTimeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    bonusSubtitle: {
        color: ACCENT_COLOR,
        fontSize: 14,
    },
    featureItem: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    featureIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    featureTextContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    featureText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: Fonts.bold,
    },
    subtextItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
        marginLeft: 4,
    },
    subinnerText: {
        color: '#666',
        fontSize: 14,
    },
});
