import Logo from '@/components/Logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';
import AuthModal from './AuthModal';
import PremiumBadge from './PremiumBadge';

interface HeaderProps {
    rightContent?: 'auth' | 'profile';
}

const APP_FONT = Fonts.body;

export default function Header({ rightContent = 'auth' }: HeaderProps) {
    const navigation = useNavigation();
    const router = useRouter();
    const { user, userData, presentPaywall } = useAuth();
    const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
    const colorScheme = useColorScheme();
    const themeColors = Colors[colorScheme ?? 'light'];

    // Animation for the avatar glow
    const rotation = useSharedValue(0);

    useEffect(() => {
        rotation.value = withRepeat(
            withTiming(360, { duration: 10000, easing: Easing.linear }),
            -1,
            false
        );
    }, []);

    const animatedGlowStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotate: `${rotation.value}deg` }],
        };
    });

    const openAuthModal = (mode: 'login' | 'signup') => {
        setAuthMode(mode);
        setIsAuthModalVisible(true);
    };

    return (
        <ThemedView style={styles.header}>
            {/* Hamburger Menu */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity
                    onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
                    style={{ padding: 8, marginHorizontal: -8 }} // Increase touch area visually and logically
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} // Increase touch area invisibly
                >
                    <Ionicons name="menu" size={28} color={themeColors.text} />
                </TouchableOpacity>
                {/* App Logo */}
                <Logo width={120} height={30} />
            </View>

            {/* Right Content */}
            <View style={styles.headerRight}>
                {user ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {userData?.planType === 'Premium' ? (
                            <PremiumBadge />
                        ) : (
                            <TouchableOpacity
                                style={[styles.upgradeHeaderButton, { borderColor: themeColors.border }]}
                                onPress={presentPaywall}
                            >
                                <Ionicons name="diamond-outline" size={14} color={themeColors.text} />
                                <ThemedText style={styles.upgradeHeaderText}>Upgrade</ThemedText>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => router.push('/profile')}>
                            <View style={styles.miniAvatarContainer}>
                                <View style={[styles.miniAvatarInner, { borderColor: themeColors.border, backgroundColor: themeColors.card }]}>
                                    <ThemedText style={[styles.miniAvatarText, { color: themeColors.text }]}>
                                        {(userData?.userName || 'D')[0].toUpperCase()}
                                    </ThemedText>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                ) : rightContent === 'auth' ? (
                    <>
                        <TouchableOpacity style={styles.loginButton} onPress={() => openAuthModal('login')}>
                            <ThemedText style={styles.loginText}>Login</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.joinButton, { borderColor: themeColors.text }]} onPress={() => openAuthModal('signup')}>
                            <ThemedText style={styles.joinText}>Join</ThemedText>
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity onPress={() => router.push('/profile')}>
                        <Ionicons name="person-circle-outline" size={32} color={themeColors.text} />
                    </TouchableOpacity>
                )}
            </View>

            <AuthModal
                isVisible={isAuthModalVisible}
                onClose={() => setIsAuthModalVisible(false)}
                mode={authMode}
            />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    loginButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    loginText: {
        fontSize: 14,
        fontWeight: '500',
    },
    joinButton: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderWidth: 1,
        borderRadius: 4,
        marginLeft: 8,
    },
    joinText: {
        fontSize: 14,
        fontWeight: '500',
    },
    upgradeHeaderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333',
    },
    upgradeHeaderText: {
        fontSize: 12,
        fontWeight: '600',
    },
    premiumBadge: {
        backgroundColor: '#FFD70033',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFD700',
    },
    premiumText: {
        color: '#FFD700',
        fontWeight: 'bold',
        fontSize: 10,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 4,
    },
    miniAvatarContainer: {
        width: 34,
        height: 34,
        justifyContent: 'center',
        alignItems: 'center',
    },
    miniAvatarGlow: {
        position: 'absolute',
        width: 36,
        height: 36,
        borderRadius: 18,
        overflow: 'hidden',
    },
    miniAvatarInner: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    miniAvatarText: {
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: Fonts.bold,
    },
});
