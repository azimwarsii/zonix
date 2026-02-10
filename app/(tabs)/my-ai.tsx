import AuthModal from '@/components/AuthModal';
import CharacterCard from '@/components/CharacterCard';
import Header from '@/components/Header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 2 columns with padding

export default function MyAIScreen() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [coaches, setCoaches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);

    const colorScheme = useColorScheme();
    const themeColors = Colors[colorScheme ?? 'light'];

    useFocusEffect(
        useCallback(() => {
            if (!user) {
                setCoaches([]);
                setLoading(false);
                return;
            }

            // Real-time listener: instant updates + offline cache support
            const unsubscribe = firestore()
                .collection('coaches')
                .where('creatorId', '==', user.uid)
                .orderBy('createdAt', 'desc')
                .onSnapshot(snapshot => {
                    if (snapshot) {
                        const fetchedCoaches = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        setCoaches(fetchedCoaches);
                        setLoading(false);
                    }
                }, error => {
                    console.error('Error listening to my coaches:', error);
                    setLoading(false);
                });

            return () => unsubscribe();
        }, [user])
    );

    const handleDelete = (coachId: string, coachName: string) => {
        Alert.alert(
            'Delete Coach',
            `Are you sure you want to delete "${coachName}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await firestore().collection('coaches').doc(coachId).delete();
                            setCoaches(prev => prev.filter(c => c.id !== coachId));
                        } catch (error) {
                            console.error('Error deleting coach:', error);
                            Alert.alert('Error', 'Failed to delete coach.');
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.cardContainer}>
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push({ pathname: '/coach/[id]', params: { id: item.id } })}
            >
                <CharacterCard
                    name={item.name}
                    specialization={item.specialization || ''}
                    description={item.advanced?.whoAmI || ''}
                    likes={item.stats?.likes ?? (Array.isArray(item.likedBy) ? item.likedBy.length : (item.likes || 0))}
                    followers={item.stats?.follows ?? (Array.isArray(item.follows) ? item.follows.length : (item.follows || item.followers || 0))}
                    comments={item.stats?.chats ?? (item.chatCount || 0)}
                    imageUrl={item.portraitUrl || 'https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=3000&auto=format&fit=crop'}
                    isVerified={item.isVerified}
                    width={cardWidth}
                    height={cardWidth * 1.5}
                    onPress={() => router.push({ pathname: '/coach/[id]', params: { id: item.id } })}
                    onMessagePress={() => router.push({ pathname: '/message/[id]', params: { id: item.id } })}
                />
            </TouchableOpacity>

            <View style={[styles.actionRow, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => router.push({ pathname: '/edit-coach', params: { id: item.id } })}
                >
                    <Ionicons name="create-outline" size={18} color={themeColors.text} />
                    <ThemedText style={[styles.actionText, { color: themeColors.text }]}>Edit</ThemedText>
                </TouchableOpacity>

                <View style={[styles.actionDivider, { backgroundColor: themeColors.border }]} />

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(item.id, item.name)}
                >
                    <Ionicons name="trash-outline" size={18} color="#ff4444" />
                    <ThemedText style={[styles.actionText, { color: '#ff4444' }]}>Delete</ThemedText>
                </TouchableOpacity>
            </View>
        </View>
    );

    // -- RENDER STATES --

    // 1. Loading State
    if (authLoading || (loading && user)) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
                <Header />
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={themeColors.text} />
                </View>
            </SafeAreaView>
        );
    }

    // 2. Not Signed In State
    if (!user) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
                <Header />
                <View style={styles.emptyStateContainer}>
                    <View style={[styles.iconCircle, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                        <Ionicons name="person-outline" size={40} color={themeColors.text} />
                    </View>
                    <ThemedText style={[styles.emptyStateTitle, { color: themeColors.text }]}>Sign in to view your AI</ThemedText>
                    <ThemedText style={[styles.emptyStateDescription, { color: themeColors.icon }]}>
                        Create an account to build, manage, and chat with your own custom AI coaches.
                    </ThemedText>

                    <TouchableOpacity
                        style={styles.ctaButton}
                        onPress={() => setShowAuthModal(true)}
                    >
                        <View style={[styles.ctaGradient, { backgroundColor: themeColors.text }]}>
                            <ThemedText style={[styles.ctaText, { color: themeColors.background }]}>Sign In / Sign Up</ThemedText>
                            <Ionicons name="arrow-forward" size={20} color={themeColors.background} />
                        </View>
                    </TouchableOpacity>
                </View>

                <AuthModal
                    isVisible={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    mode="signup"
                />
            </SafeAreaView>
        );
    }

    // 3. Signed In but No Coaches State
    if (coaches.length === 0) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
                <Header />
                <ThemedView style={[styles.headerContainer, { backgroundColor: themeColors.background }]}>
                    <ThemedText type="title" style={[styles.pageTitle, { color: themeColors.text }]}>My AI Coaches</ThemedText>
                </ThemedView>
                <View style={styles.emptyStateContainer}>
                    <View style={[styles.iconCircle, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                        <Ionicons name="sparkles-outline" size={40} color={themeColors.text} />
                    </View>
                    <ThemedText style={[styles.emptyStateTitle, { color: themeColors.text }]}>No AI Coaches Yet</ThemedText>
                    <ThemedText style={[styles.emptyStateDescription, { color: themeColors.icon }]}>
                        You haven't created any digital twins yet. Start building your personal AI workforce today.
                    </ThemedText>

                    <TouchableOpacity
                        style={styles.ctaButton}
                        onPress={() => router.push('/(tabs)/create')}
                    >
                        <View style={[styles.ctaGradient, { backgroundColor: themeColors.text }]}>
                            <ThemedText style={[styles.ctaText, { color: themeColors.background }]}>Create New AI</ThemedText>
                            <Ionicons name="add-circle-outline" size={20} color={themeColors.background} />
                        </View>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // 4. Signed In and Has Coaches State
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
            <Header />
            <ThemedView style={[styles.headerContainer, { backgroundColor: themeColors.background }]}>
                <ThemedText type="title" style={[styles.pageTitle, { color: themeColors.text }]}>My AI Coaches</ThemedText>
                <ThemedText style={[styles.subtitle, { color: themeColors.icon }]}>{coaches.length} {coaches.length === 1 ? 'Coach' : 'Coaches'} Created</ThemedText>
            </ThemedView>

            <FlatList
                data={coaches}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        paddingHorizontal: 20,
        paddingBottom: 16,
        paddingTop: 10,
    },
    pageTitle: {
        fontSize: 28,
        fontFamily: Fonts.bold,
    },
    subtitle: {
        fontSize: 14,
        fontFamily: Fonts.body,
        marginTop: 4,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
        paddingBottom: 100,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    cardContainer: {
        width: cardWidth,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        gap: 6,
    },
    actionDivider: {
        width: 1,
        height: '60%',
    },
    actionText: {
        fontSize: 12,
        fontFamily: Fonts.body,
        fontWeight: '500',
    },
    // Empty State Styles
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        marginTop: -50, // Visual balance
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
    },
    emptyStateTitle: {
        fontSize: 24,
        fontFamily: Fonts.bold,
        marginBottom: 12,
        textAlign: 'center',
        lineHeight: 32,
        includeFontPadding: false, // Critical for Android cropping
    },
    emptyStateDescription: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        fontFamily: Fonts.body,
        marginBottom: 32,
    },
    ctaButton: {
        width: '100%',
        borderRadius: 25,
        overflow: 'hidden',
        maxWidth: 280,
    },
    ctaGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 10,
    },
    ctaText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
});
