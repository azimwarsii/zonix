import Logo from '@/components/Logo';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface HeaderProps {
    rightContent?: 'auth' | 'profile';
}

import { Fonts } from '@/constants/Fonts';

const APP_FONT = Fonts.body;

export default function Header({ rightContent = 'auth' }: HeaderProps) {
    const navigation = useNavigation();

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
                {rightContent === 'auth' ? (
                    <>
                        <TouchableOpacity style={styles.loginButton}>
                            <ThemedText style={styles.loginText}>Login</ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.joinButton}>
                            <ThemedText style={styles.joinText}>Join Free</ThemedText>
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity>
                        <Ionicons name="person-circle-outline" size={32} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>
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
    headerTitle: {
        fontSize: 24, // Larger for Antonio
        color: '#fff',
        letterSpacing: 1,
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
        borderColor: '#817299',
    },
    loginText: {
        color: '#817299',
        fontWeight: '600',
        fontSize: 12,
    },
    joinButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#817299',
    },
    joinText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
    },
});
