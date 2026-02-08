import AuthModal from '@/components/AuthModal';
import Header from '@/components/Header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/Fonts';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function ChatScreen() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [loadingChats, setLoadingChats] = useState(true);
    const [chats, setChats] = useState<any[]>([]);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

    const toggleFaq = (id: string) => {
        setExpandedFaq(expandedFaq === id ? null : id);
    };

    useFocusEffect(
        useCallback(() => {
            if (!user) {
                setLoadingChats(false);
                return;
            }

            const fetchChats = async () => {
                setLoadingChats(true);
                try {
                    const snapshot = await firestore()
                        .collection('conversations')
                        .where('userId', '==', user.uid)
                        .orderBy('lastMessageAt', 'desc')
                        .get();

                    const chatPromises = snapshot.docs.map(async doc => {
                        const data = doc.data();
                        // Fetch coach details
                        let coach = { name: 'Unknown Coach', portraitUrl: '' };
                        if (data.coachId) {
                            const coachDoc = await firestore().collection('coaches').doc(data.coachId).get();
                            if (coachDoc.exists) {
                                coach = coachDoc.data() as any;
                            }
                        }

                        return {
                            id: doc.id,
                            ...data,
                            coach
                        };
                    });

                    const chatsData = await Promise.all(chatPromises);
                    setChats(chatsData);
                } catch (error) {
                    console.error('Error fetching chats:', error);
                } finally {
                    setLoadingChats(false);
                }
            };

            fetchChats();
        }, [user])
    );

    const handleDeleteChat = (chatId: string) => {
        Alert.alert(
            'Delete Conversation',
            'Are you sure you want to delete this chat? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await firestore().collection('conversations').doc(chatId).delete();
                            setChats(prev => prev.filter(c => c.id !== chatId));
                        } catch (error) {
                            console.error('Error deleting chat:', error);
                            Alert.alert('Error', 'Failed to delete chat.');
                        }
                    }
                }
            ]
        );
    };

    const renderChatItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.chatItem}
            onPress={() => router.push({ pathname: '/message/[id]', params: { id: item.coachId } })}
            onLongPress={() => handleDeleteChat(item.id)}
            delayLongPress={500}
            activeOpacity={0.7}
        >
            <Image
                source={{ uri: item.coach.portraitUrl || 'https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=3000&auto=format&fit=crop' }}
                style={styles.avatar}
                contentFit="cover"
            />
            <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                    <ThemedText style={styles.coachName}>{item.coach.name}</ThemedText>
                    {item.lastMessageAt && (
                        <ThemedText style={styles.chatTime}>
                            {item.lastMessageAt?.toDate?.().toLocaleDateString()}
                        </ThemedText>
                    )}
                </View>
                <ThemedText style={styles.lastMessage} numberOfLines={1}>
                    Tap to continue conversation...
                </ThemedText>
            </View>
        </TouchableOpacity>
    );

    // -- RENDER STATES --

    // 1. Auth Loading
    if (authLoading) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <Header />
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#aa48b7" />
                </View>
            </SafeAreaView>
        );
    }

    // 2. Not Signed In
    if (!user) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <Header />
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.emptyStateContainer}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="chatbubbles-outline" size={40} color="#aa48b7" />
                        </View>
                        <ThemedText style={styles.emptyStateTitle}>Sign in to Chat</ThemedText>
                        <ThemedText style={styles.emptyStateDescription}>
                            Connect with AI coaches, save your conversation history, and pick up right where you left off.
                        </ThemedText>

                        <TouchableOpacity
                            style={styles.ctaButton}
                            onPress={() => setShowAuthModal(true)}
                        >
                            <LinearGradient
                                colors={['#aa48b7', '#4a148c']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.ctaGradient}
                            >
                                <ThemedText style={styles.ctaText}>Sign In to Start</ThemedText>
                                <Ionicons name="log-in-outline" size={20} color="#fff" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* Quick Info for Signed Out Users */}
                    <View style={styles.infoSection}>
                        <ThemedText style={styles.sectionTitle}>Why Chat?</ThemedText>
                        <View style={styles.featureRow}>
                            <Ionicons name="infinite-outline" size={24} color="#888" style={{ marginRight: 15 }} />
                            <View style={{ flex: 1 }}>
                                <ThemedText style={styles.featureTitle}>Unlimited Conversations</ThemedText>
                                <ThemedText style={styles.featureDesc}>Talk as much as you want with any coach.</ThemedText>
                            </View>
                        </View>
                        <View style={styles.featureRow}>
                            <Ionicons name="lock-closed-outline" size={24} color="#888" style={{ marginRight: 15 }} />
                            <View style={{ flex: 1 }}>
                                <ThemedText style={styles.featureTitle}>Private & Secure</ThemedText>
                                <ThemedText style={styles.featureDesc}>Your chats are private and encrypted.</ThemedText>
                            </View>
                        </View>
                    </View>
                </ScrollView>

                <AuthModal
                    isVisible={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    mode="login"
                />
            </SafeAreaView>
        );
    }

    // 3. Signed In but No Chats (Empty State)
    if (chats.length === 0 && !loadingChats) {
        return (
            <SafeAreaView style={styles.container} edges={['top']}>
                <Header />
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <ThemedView style={styles.headerContainer}>
                        <ThemedText type="title" style={styles.pageTitle}>Your Chats</ThemedText>
                    </ThemedView>

                    <View style={styles.emptyStateContainer}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="chatbubble-ellipses-outline" size={40} color="#aa48b7" />
                        </View>
                        <ThemedText style={styles.emptyStateTitle}>Start a Conversation</ThemedText>
                        <ThemedText style={styles.emptyStateDescription}>
                            You haven't chatted with anyone yet. Explore our community of AI coaches and say hello!
                        </ThemedText>

                        <TouchableOpacity
                            style={styles.ctaButton}
                            onPress={() => router.push('/(tabs)/explore')}
                        >
                            <LinearGradient
                                colors={['#aa48b7', '#4a148c']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.ctaGradient}
                            >
                                <ThemedText style={styles.ctaText}>Explore Coaches</ThemedText>
                                <Ionicons name="compass-outline" size={20} color="#fff" />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* FAQ Section */}
                    <View style={styles.faqSection}>
                        <ThemedText style={styles.sectionTitle}>Frequently Asked Questions</ThemedText>

                        {[
                            { id: '1', q: "Are chats free?", a: "Yes, you can chat for free with most coaches. Premium features may require a subscription." },
                            { id: '2', q: "Can I create my own AI?", a: "Absolutely! Go to the 'Create' tab to build your own Digital Twin." },
                            { id: '3', q: "Is my history saved?", a: "Yes, once you're signed in, your conversation history is saved automatically." }
                        ].map(item => (
                            <TouchableOpacity
                                key={item.id}
                                style={styles.faqItem}
                                onPress={() => toggleFaq(item.id)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.faqHeader}>
                                    <ThemedText style={styles.faqQuestion}>{item.q}</ThemedText>
                                    <Ionicons
                                        name={expandedFaq === item.id ? "chevron-up" : "chevron-down"}
                                        size={20}
                                        color="#666"
                                    />
                                </View>
                                {expandedFaq === item.id && (
                                    <ThemedText style={styles.faqAnswer}>{item.a}</ThemedText>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    // 4. Has Chats List
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header />
            <ThemedView style={styles.headerContainer}>
                <ThemedText type="title" style={styles.pageTitle}>Your Chats</ThemedText>
            </ThemedView>

            {loadingChats ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#aa48b7" />
                </View>
            ) : (
                <FlatList
                    data={chats}
                    renderItem={renderChatItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    headerContainer: {
        paddingHorizontal: 20,
        paddingBottom: 16,
        paddingTop: 10,
        backgroundColor: '#0a0a0a',
    },
    pageTitle: {
        fontSize: 28,
        fontFamily: Fonts.bold,
        color: '#fff',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Empty State Styles
    emptyStateContainer: {
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingVertical: 40,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(170, 72, 183, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(170, 72, 183, 0.3)',
    },
    emptyStateTitle: {
        fontSize: 24,
        fontFamily: Fonts.bold,
        color: '#fff',
        marginBottom: 12,
        textAlign: 'center',
    },
    emptyStateDescription: {
        fontSize: 16,
        color: '#888',
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
    // Sections
    infoSection: {
        paddingHorizontal: 24,
        marginTop: 20,
    },
    guideSection: {
        paddingHorizontal: 24,
        marginTop: 10,
        marginBottom: 30,
    },
    faqSection: {
        paddingHorizontal: 24,
        marginBottom: 40,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: Fonts.bold,
        color: '#fff',
        marginBottom: 20,
        textAlign: 'left',
    },
    // Feature Row
    featureRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    featureTitle: {
        fontSize: 16,
        fontFamily: Fonts.bold,
        color: '#fff',
        marginBottom: 4,
    },
    featureDesc: {
        fontSize: 14,
        fontFamily: Fonts.body,
        color: '#666',
        lineHeight: 20,
    },
    // Guide Steps
    stepItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 0,
    },
    stepNumber: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#222',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    stepNumberText: {
        color: '#fff',
        fontFamily: Fonts.bold,
        fontSize: 14,
    },
    stepText: {
        flex: 1,
        fontSize: 15,
        color: '#ccc',
        fontFamily: Fonts.body,
        lineHeight: 22,
    },
    stepLine: {
        width: 2,
        height: 20,
        backgroundColor: '#222',
        marginLeft: 13, // align with circle center
        marginVertical: 4,
    },
    // FAQ
    faqItem: {
        backgroundColor: '#151515',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#222',
    },
    faqHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    faqQuestion: {
        fontSize: 15,
        fontFamily: Fonts.bold,
        color: '#eee',
        flex: 1,
        marginRight: 10,
    },
    faqAnswer: {
        marginTop: 12,
        fontSize: 14,
        fontFamily: Fonts.body,
        color: '#888',
        lineHeight: 20,
    },
    listContent: {
        padding: 16,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
        marginBottom: 4,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
        backgroundColor: '#333',
    },
    chatInfo: {
        flex: 1,
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    coachName: {
        fontSize: 16,
        fontFamily: Fonts.bold,
        color: '#fff',
    },
    chatTime: {
        fontSize: 12,
        color: '#666',
        fontFamily: Fonts.body,
    },
    lastMessage: {
        fontSize: 14,
        color: '#888',
        fontFamily: Fonts.body,
    },
});
