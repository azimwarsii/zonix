import { Fonts } from '@/constants/Fonts';
import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width, height } = Dimensions.get('window');

interface AuthModalProps {
    isVisible: boolean;
    onClose: () => void;
    mode: 'login' | 'signup';
}

export default function AuthModal({ isVisible, onClose, mode }: AuthModalProps) {
    const [isAppleAvailable, setIsAppleAvailable] = useState(false);

    useEffect(() => {
        AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable);
    }, []);

    const handleGoogleSignIn = async () => {
        try {
            // Check if your device has Google Play Services
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            // Get the users ID token
            const response = await GoogleSignin.signIn() as any;
            const idToken = response.idToken || response.data?.idToken;

            if (!idToken) throw new Error('No ID Token found');

            // Create a Google credential with the token
            const googleCredential = auth.GoogleAuthProvider.credential(idToken);

            // Sign-in the user with the credential
            await auth().signInWithCredential(googleCredential);

            onClose();
        } catch (error: any) {
            console.error('Google sign in error:', error);
            Alert.alert('Login Error', 'Failed to sign in with Google. Please try again.');
        }
    };

    const handleAppleSignIn = async () => {
        try {
            const appleAuthRequestResponse = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            }) as any;

            const { identityToken, nonce } = appleAuthRequestResponse;

            if (identityToken) {
                const appleCredential = auth.AppleAuthProvider.credential(identityToken, nonce);
                await auth().signInWithCredential(appleCredential);

                onClose();
            }
        } catch (error: any) {
            if (error.code !== 'ERR_CANCELED') {
                console.error('Apple sign in error:', error);
                Alert.alert('Login Error', 'Failed to sign in with Apple. Please try again.');
            }
        }
    };

    const handleEmailSignIn = () => {
        // Implementation for Email Sign In will go here
        console.log('Email Sign In');
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />

                <View style={styles.container}>
                    <Image
                        source={require('@/assets/images/auth_bg.png')}
                        style={StyleSheet.absoluteFillObject}
                        contentFit="cover"
                    />
                    <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.4)' }]} />

                    <View style={styles.content}>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>

                        <Text style={styles.title}>{mode === 'login' ? 'WELCOME BACK' : 'SIGN UP FOR FREE'}</Text>
                        <Text style={styles.subtitle}>AI Coaches are waiting for you</Text>

                        {/* Google Button */}
                        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleSignIn}>
                            <View style={styles.googleIconContainer}>
                                <Ionicons name="logo-google" size={20} color="#EA4335" />
                            </View>
                            <Text style={styles.googleButtonText}>Continue with Google</Text>
                        </TouchableOpacity>



                        {/* Apple Button */}
                        {isAppleAvailable && (
                            <View style={styles.separatorContainer}>
                                <View style={styles.separatorLine} />
                                <Text style={styles.separatorText}>OR</Text>
                                <View style={styles.separatorLine} />
                            </View>
                        )}
                        {isAppleAvailable && (

                            <TouchableOpacity style={styles.appleButton} onPress={handleAppleSignIn}>
                                <Ionicons name="logo-apple" size={20} color="#fff" style={styles.buttonIcon} />
                                <Text style={styles.appleButtonText}>Continue with Apple</Text>
                            </TouchableOpacity>
                        )}

                        <Text style={styles.footerText}>
                            By continuing, you confirm that you are over 18 years old and agree to the{' '}
                            <Text
                                style={styles.linkText}
                                onPress={() => Linking.openURL('https://zonix-ai.vercel.app/#/terms')}
                            >
                                Terms and Conditions
                            </Text>
                        </Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dismissArea: {
        ...StyleSheet.absoluteFillObject,
    },
    container: {
        width: width * 0.9,
        maxWidth: 400,
        borderRadius: 24,
        overflow: 'hidden',
        aspectRatio: 0.8,
    },
    content: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1,
    },
    title: {
        fontSize: 28,
        color: '#fff',
        fontFamily: Fonts.bold,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#eee',
        fontFamily: Fonts.body,
        textAlign: 'center',
        marginBottom: 32,
    },
    googleButton: {
        width: '100%',
        height: 50,
        backgroundColor: '#fff',
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    googleIconContainer: {
        marginRight: 10,
    },
    googleButtonText: {
        fontSize: 16,
        color: '#000',
        fontFamily: Fonts.bold,
    },
    appleButton: {
        width: '100%',
        height: 50,
        backgroundColor: '#000',
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    appleButtonText: {
        fontSize: 16,
        color: '#fff',
        fontFamily: Fonts.bold,
    },
    emailButton: {
        width: '100%',
        height: 50,
        backgroundColor: 'transparent',
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#fff',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emailButtonText: {
        fontSize: 16,
        color: '#fff',
        fontFamily: Fonts.bold,
    },
    buttonIcon: {
        marginRight: 10,
    },
    separatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginBottom: 16,
    },
    separatorLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    separatorText: {
        color: '#fff',
        marginHorizontal: 16,
        fontSize: 12,
        fontFamily: Fonts.bold,
    },
    featuresContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 32,
    },
    featureItem: {
        alignItems: 'center',
        width: '45%',
    },
    featureText: {
        color: '#fff',
        fontSize: 12,
        marginTop: 4,
        fontFamily: Fonts.body,
        textAlign: 'center',
    },
    footerText: {
        color: '#ccc',
        fontSize: 10,
        textAlign: 'center',
        fontFamily: Fonts.body,
        lineHeight: 14,
    },
    linkText: {
        textDecorationLine: 'underline',
    },
});
