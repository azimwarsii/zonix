import Logo from '@/components/Logo';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { DrawerItem } from '@react-navigation/drawer';
import { useRouter, useSegments } from 'expo-router';
import React from 'react';
import { Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/Fonts';
import PremiumBadge from './PremiumBadge';

export default function CustomDrawerContent(props: any) {
    const router = useRouter();
    const segments = useSegments() as string[];
    const insets = useSafeAreaInsets();
    const { user, userData, presentPaywall } = useAuth();
    const colorScheme = useColorScheme();
    const themeColors = Colors[colorScheme ?? 'light'];
    const [showMoreModal, setShowMoreModal] = React.useState(false);

    const navigateTo = (route: string) => {
        router.push(route as any);
    };

    const isExploreActive = segments.length === 0 || segments.includes('explore') || (segments.includes('(tabs)') && !['chat', 'community', 'my-ai', 'create'].some(s => segments.includes(s)));

    return (
        <View style={{ flex: 1, backgroundColor: themeColors.background, borderRightWidth: 1, borderRightColor: themeColors.border }}>
            <View
                {...props}
                contentContainerStyle={{ paddingTop: 0 }}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {/* App Logo Header */}
                <View style={styles.headerSection}>
                    <Logo style={{ marginBottom: 16, marginTop: 46 }} width={120} height={30} />
                </View>

                <View style={styles.sectionSeparator} />

                {/* Main Menu */}
                <View style={styles.menuSection}>
                    <DrawerItem
                        label="Explore"
                        labelStyle={[styles.drawerLabel, isExploreActive && { fontWeight: '700' }, { color: themeColors.text }]}
                        icon={({ size }) => <Ionicons name={isExploreActive ? "compass" : "compass-outline"} size={size} color={themeColors.text} />}
                        onPress={() => navigateTo('/(tabs)')}
                        style={[styles.drawerItem, isExploreActive && { backgroundColor: themeColors.border }]}
                    />
                    <DrawerItem
                        label="Chats"
                        labelStyle={[styles.drawerLabel, segments.includes('chat') && { fontWeight: '700' }, { color: themeColors.text }]}
                        icon={({ size }) => <Ionicons name={segments.includes('chat') ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} size={size} color={themeColors.text} />}
                        onPress={() => navigateTo('/(tabs)/chat')}
                        style={[styles.drawerItem, segments.includes('chat') && { backgroundColor: themeColors.border }]}
                    />
                    <DrawerItem
                        label="Create"
                        labelStyle={[styles.drawerLabel, segments.includes('create') && { fontWeight: '700' }, { color: themeColors.text }]}
                        icon={({ size }) => <Ionicons name={segments.includes('create') ? "add-circle" : "add-circle-outline"} size={size} color={themeColors.text} />}
                        onPress={() => navigateTo('/(tabs)/create')}
                        style={[styles.drawerItem, segments.includes('create') && { backgroundColor: themeColors.border }]}
                    />
                    <DrawerItem
                        label="Ranks"
                        labelStyle={[styles.drawerLabel, segments.includes('community') && { fontWeight: '700' }, { color: themeColors.text }]}
                        icon={({ size }) => <Ionicons name={segments.includes('community') ? "trophy" : "trophy-outline"} size={size} color={themeColors.text} />}
                        onPress={() => navigateTo('/(tabs)/community')}
                        style={[styles.drawerItem, segments.includes('community') && { backgroundColor: themeColors.border }]}
                    />
                    <DrawerItem
                        label="My AI"
                        labelStyle={[styles.drawerLabel, segments.includes('my-ai') && { fontWeight: '700' }, { color: themeColors.text }]}
                        icon={({ size }) => <Ionicons name={segments.includes('my-ai') ? "sparkles" : "sparkles-outline"} size={size} color={themeColors.text} />}
                        onPress={() => navigateTo('/(tabs)/my-ai')}
                        style={[styles.drawerItem, segments.includes('my-ai') && { backgroundColor: themeColors.border }]}
                    />

                </View>

                {/* Dynamic Upgrade/Auth Button */}
                <View style={styles.upgradeContainer}>
                    {!user ? (
                        <TouchableOpacity
                            style={[styles.authButton, { borderColor: themeColors.text, backgroundColor: 'transparent' }]}
                            onPress={() => navigateTo('/profile')}
                        >
                            <Ionicons name="person-add-outline" size={20} color={themeColors.text} style={{ marginRight: 8 }} />
                            <Text style={[styles.upgradeText, { color: themeColors.text }]}>Login or Join free</Text>
                        </TouchableOpacity>
                    ) : userData?.planType === 'Premium' ? (
                        <PremiumBadge size="large" />
                    ) : (
                        <TouchableOpacity style={[styles.upgradeButton, { backgroundColor: themeColors.text }]} onPress={presentPaywall}>
                            <Ionicons name="diamond-outline" size={20} color={themeColors.background} style={{ marginRight: 8 }} />
                            <Text style={[styles.upgradeText, { color: themeColors.background }]}>Upgrade</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 10, borderTopColor: themeColors.border }]}>
                <TouchableOpacity style={[styles.footerItem, { borderColor: themeColors.border }]} onPress={() => navigateTo('/profile')}>
                    <Ionicons name="person-outline" size={20} color={themeColors.text} />
                    <Text style={[styles.footerText, { color: themeColors.text }]}>Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.footerItem, { borderColor: themeColors.border }]} onPress={() => Linking.openURL('https://zonix-ai.vercel.app/#/support')}>
                    <Ionicons name="headset-outline" size={20} color={themeColors.text} />
                    <Text style={[styles.footerText, { color: themeColors.text }]}>Support</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.footerItem, { borderColor: themeColors.border }]} onPress={() => Linking.openURL('https://discord.gg/YJBwagY5z7')}>
                    <Ionicons name="logo-discord" size={20} color={themeColors.text} />
                    <Text style={[styles.footerText, { color: themeColors.text }]}>Discord</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.footerItem, { borderColor: themeColors.border }]} onPress={() => setShowMoreModal(true)}>
                    <Ionicons name="ellipsis-horizontal" size={20} color={themeColors.text} />
                    <Text style={[styles.footerText, { color: themeColors.text }]}>More</Text>
                </TouchableOpacity>

                <View style={styles.legalSection}>
                    <TouchableOpacity onPress={() => Linking.openURL('https://zonix-ai.vercel.app/#/terms')}>
                        <Text style={[styles.legalText, { color: themeColors.icon }]}>TERMS & CONDITIONS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => Linking.openURL('https://zonix-ai.vercel.app/#/privacy')}>
                        <Text style={[styles.legalText, { color: themeColors.icon }]}>PRIVACY POLICY</Text>
                    </TouchableOpacity>
                    <Text style={[styles.legalText, { color: themeColors.icon }]}>2026 ZONIX</Text>
                </View>
            </View>

            {/* More Modal */}
            <Modal
                transparent
                visible={showMoreModal}
                animationType="fade"
                onRequestClose={() => setShowMoreModal(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowMoreModal(false)}
                >
                    <View style={[styles.modalContent, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                        <TouchableOpacity
                            style={styles.modalItem}
                            onPress={() => {
                                setShowMoreModal(false);
                                Linking.openURL('https://zonix-ai.vercel.app/#/');
                            }}
                        >
                            <Ionicons name="globe-outline" size={24} color={themeColors.text} />
                            <Text style={[styles.modalText, { color: themeColors.text }]}>Website</Text>
                            <Ionicons name="open-outline" size={16} color={themeColors.icon} style={{ marginLeft: 'auto' }} />
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    headerSection: {
        alignItems: 'center',
    },
    appName: {
        color: '#fff',
        fontSize: 32,
        letterSpacing: 1,
    },
    sectionSeparator: {
        height: 1,
        backgroundColor: '#E5E5E5',
        marginHorizontal: 20,
        marginBottom: 10,
    },
    menuSection: {
        marginBottom: 20,
    },
    drawerItem: {
        borderRadius: 8,
        marginHorizontal: 10,
    },
    drawerLabel: {
        color: '#fff',
        fontSize: 16,
        marginLeft: 10,
        fontFamily: Fonts.body,
    },
    upgradeContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    upgradeButton: {
        // backgroundColor: '#aa48b7',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
    },
    authButton: {
        // backgroundColor: '#222',
        borderWidth: 1,
        // borderColor: '#aa48b7',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
    },
    premiumButton: {
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        borderWidth: 1,
        borderColor: '#FFD700',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
    },
    upgradeText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: '#222',
        padding: 20,
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        paddingVertical: 5,
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 8,
        paddingHorizontal: 15,
    },
    footerText: {
        color: '#fff',
        marginLeft: 10,
        fontSize: 14,
        fontFamily: Fonts.body,
    },
    legalSection: {
        marginTop: 20,
    },
    legalText: {
        fontSize: 10,
        marginBottom: 8,
        fontFamily: Fonts.body,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '80%',
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
    },
    modalText: {
        fontSize: 16,
        fontFamily: Fonts.body,
    },
});
