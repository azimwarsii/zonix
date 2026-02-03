import Logo from '@/components/Logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/Fonts';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';
import AuthModal from './AuthModal';

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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
                    <Ionicons name="menu" size={24} color="#fff" />
                </TouchableOpacity>
                {/* App Logo */}
                <Logo width={120} height={30} />
            </View>

            {/* Right Content */}
            <View style={styles.headerRight}>
                {user ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {userData?.planType === 'Premium' ? (
                            <View style={styles.premiumBadge}>
                                <ThemedText style={styles.premiumText}>PREMIUM</ThemedText>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.upgradeHeaderButton}
                                onPress={presentPaywall}
                            >
                                <Ionicons name="diamond" size={14} color="#fff" />
                                <ThemedText style={styles.upgradeHeaderText}>Upgrade</ThemedText>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => router.push('/profile')}>
                            <View style={styles.miniAvatarContainer}>
                                <Animated.View style={[styles.miniAvatarGlow, animatedGlowStyle]}>
                                    <LinearGradient
                                        colors={['#aa48b7', '#4a148c', '#aa48b7']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                </Animated.View>
                                <View style={styles.miniAvatarInner}>
                                    <Text style={styles.miniAvatarText}>
                                        {(userData?.userName || 'D')[0].toUpperCase()}
                                    </Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                ) : rightContent === 'auth' ? (
                    <>
                        <TouchableOpacity style={styles.loginButton} onPress={() => openAuthModal('login')}>
                            <ThemedText style={styles.loginText}>Login</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.joinButton} onPress={() => openAuthModal('signup')}>
                            <ThemedText style={styles.joinText}>Join Free</ThemedText>
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity onPress={() => router.push('/profile')}>
                        <Ionicons name="person-circle-outline" size={32} color="#fff" />
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
        backgroundColor: '#0a0a0a',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    loginButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#aa48b7',
    },
    loginText: {
        color: '#aa48b7',
        fontWeight: '600',
        fontSize: 12,
    },
    joinButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#aa48b7',
    },
    joinText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
    },
    upgradeHeaderButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#aa48b7',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    upgradeHeaderText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
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
        backgroundColor: '#0a0a0a',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    miniAvatarText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: Fonts.bold,
    },
});
