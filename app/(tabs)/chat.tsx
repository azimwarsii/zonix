import AuthModal from '@/components/AuthModal';
import Header from '@/components/Header';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { Image } from 'expo-image';
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
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const SkeletonChatRow = ({ themeColors }: { themeColors: any }) => {
    const opacity = useSharedValue(0.3);

    React.useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.7, { duration: 1000 }),
                withTiming(0.3, { duration: 1000 })
            ),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <View style={[styles.chatItem, { borderBottomColor: themeColors.border, paddingVertical: 16 }]}>
            <Animated.View style={[styles.skeletonAvatar, { backgroundColor: themeColors.card }, animatedStyle]} />
            <View style={{ flex: 1, gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Animated.View style={[styles.skeletonTitle, { backgroundColor: themeColors.card }, animatedStyle]} />
                    <Animated.View style={[styles.skeletonTime, { backgroundColor: themeColors.card }, animatedStyle]} />
                </View>
                <Animated.View style={[styles.skeletonText, { backgroundColor: themeColors.card }, animatedStyle]} />
            </View>
        </View>
    );
};

const { width } = Dimensions.get('window');

export default function ChatScreen() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [loadingChats, setLoadingChats] = useState(true);
    const [chats, setChats] = useState<any[]>([]);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

    const colorScheme = useColorScheme();
    const themeColors = Colors[colorScheme ?? 'light'];

    const toggleFaq = (id: string) => {
        setExpandedFaq(expandedFaq === id ? null : id);
    };

    useFocusEffect(
        useCallback(() => {
            if (!user) {
                setLoadingChats(false);
                return;
            }

            // Real-time listener is much faster and benefits from local cache
            const unsubscribe = firestore()
                .collection('conversations')
                .where('userId', '==', user.uid)
                .orderBy('lastMessageAt', 'desc')
                .onSnapshot(async (snapshot) => {
                    if (!snapshot) return;

                    const chatData = snapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data,
                            // Support both denormalized and old format
                            coach: data.coachName ? {
                                name: data.coachName,
                                portraitUrl: data.coachPortraitUrl
                            } : null
                        };
                    });

                    // For chats missing denormalized data, fetch in background without blocking UI
                    const needsFetching = chatData.filter(c => !c.coach);

                    if (needsFetching.length === 0) {
                        setChats(chatData);
                        setLoadingChats(false);
                    } else {
                        // Initial set with what we have
                        setChats(chatData);
                        setLoadingChats(false);

                        // Background fetch for legacy chats
                        const updatedChats = await Promise.all(chatData.map(async (chat: any) => {
                            if (chat.coach) return chat;
                            try {
                                const coachDoc = await firestore().collection('coaches').doc(chat.coachId).get();
                                return {
                                    ...chat,
                                    coach: coachDoc.exists() ? coachDoc.data() : { name: 'Unknown Coach' }
                                };
                            } catch (e) {
                                return { ...chat, coach: { name: 'Unknown Coach' } };
                            }
                        }));
                        setChats(updatedChats);
                    }
                }, (error) => {
                    console.error('Error listening to chats:', error);
                    setLoadingChats(false);
                });

            return () => unsubscribe();
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
            style={[styles.chatItem, { borderBottomColor: themeColors.border }]}
            onPress={() => router.push({ pathname: '/message/[id]', params: { id: item.coachId } })}
            onLongPress={() => handleDeleteChat(item.id)}
            delayLongPress={500}
            activeOpacity={0.7}
        >
            <Image
                source={{ uri: item.coach.portraitUrl || 'https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=3000&auto=format&fit=crop' }}
                style={[styles.avatar, { borderColor: themeColors.border }]}
                contentFit="cover"
            />
            <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                    <ThemedText style={[styles.coachName, { color: themeColors.text }]}>{item.coach.name}</ThemedText>
                    {item.lastMessageAt && (
                        <ThemedText style={[styles.chatTime, { color: themeColors.icon }]}>
                            {item.lastMessageAt?.toDate?.().toLocaleDateString()}
                        </ThemedText>
                    )}
                </View>
                <ThemedText style={[styles.lastMessage, { color: themeColors.icon }]} numberOfLines={1}>
                    Tap to continue conversation...
                </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={themeColors.border} />
        </TouchableOpacity>
    );

    // -- RENDER STATES --

    // 1. Auth Loading
    if (authLoading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
                <Header />
                <View style={[styles.centered, { backgroundColor: themeColors.background }]}>
                    <ActivityIndicator size="large" color={themeColors.text} />
                </View>
            </SafeAreaView>
        );
    }

    // 2. Not Signed In
    if (!user) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
                <Header />
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.emptyStateContainer}>
                        <View style={[styles.iconCircle, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                            <Ionicons name="chatbubbles-outline" size={40} color={themeColors.text} />
                        </View>
                        <ThemedText style={[styles.emptyStateTitle, { color: themeColors.text }]}>Sign in to Chat</ThemedText>
                        <ThemedText style={[styles.emptyStateDescription, { color: themeColors.icon }]}>
                            Connect with AI coaches, save your conversation history, and pick up right where you left off.
                        </ThemedText>

                        <TouchableOpacity
                            style={styles.ctaButton}
                            onPress={() => setShowAuthModal(true)}
                        >
                            <View style={[styles.ctaGradient, { backgroundColor: themeColors.text }]}>
                                <ThemedText style={[styles.ctaText, { color: themeColors.background }]}>Sign In to Start</ThemedText>
                                <Ionicons name="log-in-outline" size={20} color={themeColors.background} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Quick Info for Signed Out Users */}
                    <View style={styles.infoSection}>
                        <ThemedText style={[styles.sectionTitle, { color: themeColors.text }]}>Why Chat?</ThemedText>
                        <View style={styles.featureRow}>
                            <Ionicons name="infinite-outline" size={24} color={themeColors.icon} style={{ marginRight: 15 }} />
                            <View style={{ flex: 1 }}>
                                <ThemedText style={[styles.featureTitle, { color: themeColors.text }]}>Unlimited Conversations</ThemedText>
                                <ThemedText style={[styles.featureDesc, { color: themeColors.icon }]}>Talk as much as you want with any coach.</ThemedText>
                            </View>
                        </View>
                        <View style={styles.featureRow}>
                            <Ionicons name="lock-closed-outline" size={24} color={themeColors.icon} style={{ marginRight: 15 }} />
                            <View style={{ flex: 1 }}>
                                <ThemedText style={[styles.featureTitle, { color: themeColors.text }]}>Private & Secure</ThemedText>
                                <ThemedText style={[styles.featureDesc, { color: themeColors.icon }]}>Your chats are private and encrypted.</ThemedText>
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
            <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
                <Header />
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>


                    <View style={styles.emptyStateContainer}>
                        <View style={[styles.iconCircle, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                            <Ionicons name="chatbubble-ellipses-outline" size={40} color={themeColors.text} />
                        </View>
                        <ThemedText style={[styles.emptyStateTitle, { color: themeColors.text }]}>Start a Conversation</ThemedText>
                        <ThemedText style={[styles.emptyStateDescription, { color: themeColors.icon }]}>
                            You haven't chatted with anyone yet. Explore our community of AI coaches and say hello!
                        </ThemedText>

                        <TouchableOpacity
                            style={styles.ctaButton}
                            onPress={() => router.push('/(tabs)/explore')}
                        >
                            <View style={[styles.ctaGradient, { backgroundColor: themeColors.text }]}>
                                <ThemedText style={[styles.ctaText, { color: themeColors.background }]}>Explore Coaches</ThemedText>
                                <Ionicons name="compass-outline" size={20} color={themeColors.background} />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* FAQ Section */}
                    <View style={styles.faqSection}>
                        <ThemedText style={[styles.sectionTitle, { color: themeColors.text }]}>Frequently Asked Questions</ThemedText>

                        {[
                            { id: '1', q: "Are chats free?", a: "New users receive free trial credits to start chatting! After that, you can upgrade for unlimited access." },
                            { id: '2', q: "Can I create my own AI?", a: "Absolutely! Go to the 'Create' tab to build your own Digital Twin." },
                            { id: '3', q: "Is my history saved?", a: "Yes, once you're signed in, your conversation history is saved automatically." }
                        ].map(item => (
                            <TouchableOpacity
                                key={item.id}
                                style={[styles.faqItem, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                                onPress={() => toggleFaq(item.id)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.faqHeader}>
                                    <ThemedText style={[styles.faqQuestion, { color: themeColors.text }]}>{item.q}</ThemedText>
                                    <Ionicons
                                        name={expandedFaq === item.id ? "chevron-up" : "chevron-down"}
                                        size={20}
                                        color={themeColors.icon}
                                    />
                                </View>
                                {expandedFaq === item.id && (
                                    <ThemedText style={[styles.faqAnswer, { color: themeColors.icon }]}>{item.a}</ThemedText>
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
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
            <Header />

            {loadingChats ? (
                <View style={styles.listContent}>
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <SkeletonChatRow key={i} themeColors={themeColors} />
                    ))}
                </View>
            ) : (
                <FlatList
                    data={chats}
                    renderItem={renderChatItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: 'transparent' }} />}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
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
        marginBottom: 4,
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
        borderWidth: 1,
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
    },
    chatTime: {
        fontSize: 12,
        fontFamily: Fonts.body,
    },
    lastMessage: {
        fontSize: 14,
        fontFamily: Fonts.body,
    },
    // Skeleton Styles
    skeletonAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    skeletonTitle: {
        width: 120,
        height: 16,
        borderRadius: 4,
    },
    skeletonTime: {
        width: 40,
        height: 12,
        borderRadius: 4,
    },
    skeletonText: {
        width: '80%',
        height: 14,
        borderRadius: 4,
    },
});
