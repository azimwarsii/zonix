import Logo from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { DrawerItem } from '@react-navigation/drawer';
import { useRouter, useSegments } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/Fonts';
import PremiumBadge from './PremiumBadge';

export default function CustomDrawerContent(props: any) {
    const router = useRouter();
    const segments = useSegments() as string[];
    const insets = useSafeAreaInsets();
    const { user, userData, presentPaywall } = useAuth();

    const navigateTo = (route: string) => {
        router.push(route as any);
    };

    const isExploreActive = segments.length === 0 || segments.includes('explore') || (segments.includes('(tabs)') && !['chat', 'community', 'my-ai', 'create'].some(s => segments.includes(s)));

    return (
        <View style={{ flex: 1, backgroundColor: '#000', borderRightWidth: 1, borderRightColor: '#aa48b7' }}>
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
                        labelStyle={[styles.drawerLabel, isExploreActive && { color: '#aa48b7' }]}
                        icon={({ size }) => <Ionicons name={isExploreActive ? "compass" : "compass-outline"} size={size} color={isExploreActive ? '#aa48b7' : '#fff'} />}
                        onPress={() => navigateTo('/(tabs)')}
                        style={[styles.drawerItem, isExploreActive && { backgroundColor: 'rgba(129, 114, 153, 0.2)' }]}
                    />
                    <DrawerItem
                        label="Chats"
                        labelStyle={[styles.drawerLabel, segments.includes('chat') && { color: '#aa48b7' }]}
                        icon={({ size }) => <Ionicons name={segments.includes('chat') ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} size={size} color={segments.includes('chat') ? '#aa48b7' : '#fff'} />}
                        onPress={() => navigateTo('/(tabs)/chat')}
                        style={[styles.drawerItem, segments.includes('chat') && { backgroundColor: 'rgba(129, 114, 153, 0.2)' }]}
                    />
                    <DrawerItem
                        label="Create"
                        labelStyle={[styles.drawerLabel, segments.includes('create') && { color: '#aa48b7' }]}
                        icon={({ size }) => <Ionicons name={segments.includes('create') ? "add-circle" : "add-circle-outline"} size={size} color={segments.includes('create') ? '#aa48b7' : '#fff'} />}
                        onPress={() => navigateTo('/(tabs)/create')}
                        style={[styles.drawerItem, segments.includes('create') && { backgroundColor: 'rgba(129, 114, 153, 0.2)' }]}
                    />
                    <DrawerItem
                        label="My AI"
                        labelStyle={[styles.drawerLabel, segments.includes('my-ai') && { color: '#aa48b7' }]}
                        icon={({ size }) => <Ionicons name={segments.includes('my-ai') ? "sparkles" : "sparkles-outline"} size={size} color={segments.includes('my-ai') ? '#aa48b7' : '#fff'} />}
                        onPress={() => navigateTo('/(tabs)/my-ai')}
                        style={[styles.drawerItem, segments.includes('my-ai') && { backgroundColor: 'rgba(129, 114, 153, 0.2)' }]}
                    />
                    <DrawerItem
                        label="Feed"
                        labelStyle={[styles.drawerLabel, segments.includes('feed') && { color: '#aa48b7' }]}
                        icon={({ size }) => <Ionicons name={segments.includes('feed') ? "play" : "play-outline"} size={size} color={segments.includes('feed') ? '#aa48b7' : '#fff'} />}
                        onPress={() => navigateTo('/feed')}
                        style={[styles.drawerItem, segments.includes('feed') && { backgroundColor: 'rgba(129, 114, 153, 0.2)' }]}
                    />
                    <DrawerItem
                        label="Community"
                        labelStyle={[styles.drawerLabel, segments.includes('community') && { color: '#aa48b7' }]}
                        icon={({ size }) => <Ionicons name={segments.includes('community') ? "people" : "people-outline"} size={size} color={segments.includes('community') ? '#aa48b7' : '#fff'} />}
                        onPress={() => navigateTo('/(tabs)/community')}
                        style={[styles.drawerItem, segments.includes('community') && { backgroundColor: 'rgba(129, 114, 153, 0.2)' }]}
                    />
                </View>

                {/* Dynamic Upgrade/Auth Button */}
                <View style={styles.upgradeContainer}>
                    {!user ? (
                        <TouchableOpacity
                            style={styles.authButton}
                            onPress={() => navigateTo('/profile')}
                        >
                            <Ionicons name="person-add-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.upgradeText}>Login or Join free</Text>
                        </TouchableOpacity>
                    ) : userData?.planType === 'Premium' ? (
                        <PremiumBadge size="large" />
                    ) : (
                        <TouchableOpacity style={styles.upgradeButton} onPress={presentPaywall}>
                            <Ionicons name="diamond-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.upgradeText}>Upgrade</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
                <TouchableOpacity style={styles.footerItem} onPress={() => navigateTo('/profile')}>
                    <Ionicons name="person-outline" size={20} color="#aaa" />
                    <Text style={styles.footerText}>Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerItem} onPress={() => navigateTo('/profile')}>
                    <Ionicons name="headset-outline" size={20} color="#aaa" />
                    <Text style={styles.footerText}>Support</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerItem} onPress={() => navigateTo('https://discord.gg/YJBwagY5z7')}>
                    <Ionicons name="logo-discord" size={20} color="#aaa" />
                    <Text style={styles.footerText}>Discord</Text>
                </TouchableOpacity>
                <View style={styles.footerItem}>
                    <Ionicons name="ellipsis-horizontal" size={20} color="#aaa" />
                    <Text style={styles.footerText}>More</Text>
                </View>

                <View style={styles.legalSection}>
                    <Text style={styles.legalText}>TERMS & POLICIES</Text>
                    <Text style={styles.legalText}>AI COACH TYPES</Text>
                    <Text style={styles.legalText}>2026 ZONIX</Text>
                </View>
            </View>
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
        backgroundColor: '#222',
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
        backgroundColor: '#aa48b7',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 8,
    },
    authButton: {
        backgroundColor: '#222',
        borderWidth: 1,
        borderColor: '#aa48b7',
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
        color: '#555',
        fontSize: 10,
        marginBottom: 4,
        fontFamily: Fonts.body,
    }
});
