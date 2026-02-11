import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MessageScreen() {
    const { id, initialName, initialPortrait } = useLocalSearchParams(); // This is the coachId
    const router = useRouter();
    const { user, userData, presentPaywall } = useAuth();

    // Optimistic loading: Start with basic info if passed via params
    const [coach, setCoach] = useState<any>(initialName ? {
        name: initialName,
        portraitUrl: initialPortrait
    } : null);

    // Only show full screen loader if we have NO data at all
    const [loading, setLoading] = useState(!initialName);
    const [messageText, setMessageText] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [showMenu, setShowMenu] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    const colorScheme = useColorScheme();
    const themeColors = Colors[colorScheme ?? 'light'];
    const insets = useSafeAreaInsets();
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

    useEffect(() => {
        const showSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => setIsKeyboardVisible(true)
        );
        const hideSub = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setIsKeyboardVisible(false)
        );
        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    useEffect(() => {
        const fetchCoach = async () => {
            if (!id) return;
            try {
                const doc = await firestore().collection('coaches').doc(id as string).get();
                // @ts-ignore
                if (doc.exists) {
                    setCoach(doc.data());
                }
            } catch (error) {
                console.error('Error fetching coach:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchCoach();
    }, [id]);

    useEffect(() => {
        if (!user || !id) return;

        const conversationId = `${user.uid}_${id}`;
        const messagesRef = firestore()
            .collection('conversations')
            .doc(conversationId)
            .collection('messages')
            .orderBy('createdAt', 'desc');

        const unsubscribe = messagesRef.onSnapshot(snapshot => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            setMessages(msgs);

            // Stop typing indicator if latest message is from assistant
            if (msgs.length > 0 && (msgs[0] as any).role === 'assistant') {
                setIsTyping(false);
            }
        }, error => {
            console.error('Error subscribing to messages:', error);
        });

        return () => unsubscribe();
    }, [user, id]);

    const handleSend = async () => {
        if (!messageText.trim() || !user || !id) return;

        // Check for credits if not premium
        if (userData?.planType !== 'Premium' && (userData?.credits || 0) < 1) {
            Alert.alert(
                "Out of Coins 🪙",
                "You need at least 1 coin to send a message. Upgrade to Pro for unlimited access!",
                [
                    { text: "Later", style: "cancel" },
                    { text: "Upgrade Now", onPress: () => presentPaywall() }
                ]
            );
            return;
        }

        const text = messageText.trim();
        setMessageText(''); // Clear input immediately
        setIsTyping(true);  // Show typing indicator

        const conversationId = `${user.uid}_${id}`;
        const conversationRef = firestore().collection('conversations').doc(conversationId);
        const messagesRef = conversationRef.collection('messages');

        try {
            // Use batch write instead of transaction for optimistic UI updates (instant feedback)
            const batch = firestore().batch();

            // 1. Update/Create Conversation Doc
            batch.set(conversationRef, {
                lastMessageAt: firestore.FieldValue.serverTimestamp(),
                participants: [user.uid, id],
                coachId: id,
                userId: user.uid,
                coachName: coach?.name || 'Coach',
                coachPortraitUrl: coach?.portraitUrl || '',
                lastMessage: text,
            }, { merge: true });

            // 2. Add New Message
            const newMessageRef = messagesRef.doc();
            batch.set(newMessageRef, {
                content: text,
                role: 'user',
                createdAt: firestore.FieldValue.serverTimestamp(),
                userId: user.uid
            });

            await batch.commit();
        } catch (error) {
            console.error('Error sending message:', error);
            setIsTyping(false); // Revert on error
            Alert.alert('Error', 'Failed to send message.');
        }
    };

    const handleDeleteChat = () => {
        setShowMenu(false);
        Alert.alert('Delete Chat', 'Are you sure you want to delete this conversation? This action cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    if (!user || !id) return;
                    setLoading(true);
                    try {
                        const conversationId = `${user.uid}_${id}`;
                        // Delete all messages batch (limit 500)
                        const msgs = await firestore().collection('conversations').doc(conversationId).collection('messages').get();
                        const batch = firestore().batch();
                        msgs.forEach(doc => batch.delete(doc.ref));
                        await batch.commit();

                        // Delete conversation doc
                        await firestore().collection('conversations').doc(conversationId).delete();
                        router.back();
                    } catch (error) {
                        console.error(error);
                        Alert.alert('Error', 'Failed to delete chat.');
                        setLoading(false);
                    }
                }
            }
        ]);
    };

    const handleReport = () => {
        setShowMenu(false);
        Alert.alert('Report', 'This conversation has been reported. We will investigate.');
    };

    const renderMessage = ({ item }: { item: any }) => {
        const isUser = item.role === 'user';
        return (
            <View style={[
                styles.messageBubble,
                isUser
                    ? { backgroundColor: themeColors.tint, borderBottomRightRadius: 4, alignSelf: 'flex-end' }
                    : { backgroundColor: themeColors.card, borderBottomLeftRadius: 4, alignSelf: 'flex-start' }
            ]}>
                <ThemedText style={[
                    styles.messageText,
                    isUser ? { color: themeColors.background } : { color: themeColors.text }
                ]}>
                    {item.content}
                </ThemedText>
            </View>
        );
    };

    const renderHeader = () => {
        if (!isTyping) return null;
        return (
            <View style={[styles.messageBubble, { backgroundColor: themeColors.card, borderBottomLeftRadius: 4, width: 60, height: 40, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="small" color={themeColors.icon} />
            </View>
        );
    };

    const renderFooter = () => {
        // Show greeting at the "end" (visually top) of list
        const greeting = coach?.advanced?.primaryGreeting || `Hello! I'm ${coach?.name}. How can I help you today?`;

        // If we have messages, we still show the greeting as the very first message ever sent (bottom of list)
        return (
            <View style={[styles.messageBubble, { backgroundColor: themeColors.card, borderBottomLeftRadius: 4, marginBottom: 20 }]}>
                <ThemedText style={[styles.messageText, { color: themeColors.text }]}>
                    {greeting}
                </ThemedText>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: themeColors.background }]}>
                <ActivityIndicator size="large" color={themeColors.text} />
            </View>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
            {/* Menu Modal */}
            <Modal
                transparent
                visible={showMenu}
                animationType="fade"
                onRequestClose={() => setShowMenu(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.menuContainer, { backgroundColor: themeColors.card, shadowColor: "#000" }]}>
                            <TouchableOpacity style={styles.menuItem} onPress={() => {
                                setShowMenu(false);
                                router.push({ pathname: '/coach/[id]', params: { id: id as string } });
                            }}>
                                <Ionicons name="person-outline" size={20} color={themeColors.text} />
                                <ThemedText style={[styles.menuText, { color: themeColors.text }]}>View Profile</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} onPress={handleReport}>
                                <Ionicons name="flag-outline" size={20} color={themeColors.text} />
                                <ThemedText style={[styles.menuText, { color: themeColors.text }]}>Report</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.menuItem, styles.deleteItem, { borderTopColor: themeColors.border }]} onPress={handleDeleteChat}>
                                <Ionicons name="trash-outline" size={20} color="#ff4b4b" />
                                <ThemedText style={[styles.menuText, styles.deleteText]}>Delete Chat</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
            {/* Content wrapped to avoid keyboard */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={0}
            >
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: themeColors.border, backgroundColor: themeColors.background }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={themeColors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.headerContent}
                        onPress={() => router.push({ pathname: '/coach/[id]', params: { id: id as string } })}
                        activeOpacity={0.7}
                    >
                        <Image
                            source={{ uri: coach?.portraitUrl || 'https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=3000&auto=format&fit=crop' }}
                            style={[styles.avatar, { borderColor: themeColors.border }]}
                            contentFit="cover"
                        />
                        <View>
                            <ThemedText style={[styles.headerName, { color: themeColors.text }]}>{coach?.name || 'Coach'}</ThemedText>
                            <ThemedText style={[styles.headerStatus, { color: 'green' }]}>Online</ThemedText>
                        </View>
                    </TouchableOpacity>

                    {/* Minimalist Coin Badge for non-Premium users */}
                    {userData?.planType !== 'Premium' && (
                        <TouchableOpacity
                            style={[styles.coinsBadge, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                            activeOpacity={0.7}
                            onPress={() => presentPaywall()}
                        >
                            <Ionicons name="sparkles" size={14} color="#FFD700" />
                            <ThemedText style={[styles.coinsText, { color: themeColors.text }]}>
                                {`${userData?.credits || 0}`}
                            </ThemedText>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.menuButton} onPress={() => setShowMenu(true)}>
                        <Ionicons name="ellipsis-vertical" size={24} color={themeColors.text} />
                    </TouchableOpacity>
                </View>

                {/* Chat Area */}
                <FlatList
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id}
                    inverted
                    ListHeaderComponent={renderHeader}
                    ListFooterComponent={renderFooter}
                    contentContainerStyle={styles.messageList}
                />

                {/* Input Area */}
                <View style={[
                    styles.inputContainer,
                    {
                        backgroundColor: themeColors.background,
                        borderTopColor: themeColors.border,
                        paddingBottom: Math.max(insets.bottom, 12)
                    }
                ]}>
                    <TextInput
                        style={[styles.input, { backgroundColor: themeColors.card, color: themeColors.text, borderColor: themeColors.border }]}
                        placeholder="Type a message..."
                        placeholderTextColor={themeColors.icon}
                        value={messageText}
                        onChangeText={setMessageText}
                        multiline
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, { backgroundColor: themeColors.text }]}
                        onPress={handleSend}
                    >
                        <Ionicons name="send" size={18} color={themeColors.background} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        paddingTop: Platform.OS === 'android' ? 40 : 12,
        zIndex: 10,
    },
    backButton: {
        marginRight: 12,
    },
    headerContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        marginRight: 10,
        borderWidth: 1,
    },
    headerName: {
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
    headerStatus: {
        fontSize: 12,
        fontFamily: Fonts.body,
    },
    menuButton: {
        padding: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    menuContainer: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 80 : 100, // Approximate header height
        right: 16,
        borderRadius: 12,
        padding: 8,
        elevation: 5,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        minWidth: 180,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    menuText: {
        marginLeft: 12,
        fontSize: 16,
        fontFamily: Fonts.body,
    },
    deleteItem: {
        borderTopWidth: 1,
        marginTop: 4,
    },
    deleteText: {
        color: '#ff4b4b',
    },
    messageList: {
        padding: 16,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 16,
        marginBottom: 8,
    },
    messageText: {
        fontSize: 15,
        fontFamily: Fonts.body,
        lineHeight: 22,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    input: {
        flex: 1,
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 12, // Slightly taller for premium feel
        fontSize: 16,
        fontFamily: Fonts.body,
        maxHeight: 120,
        marginRight: 12,
        borderWidth: 1,
    },
    sendButton: {
        width: 44, // Slightly larger button
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2, // Fine-tuned alignment with input text
    },
    coinsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
        borderWidth: 1,
        marginRight: 8,
        gap: 4,
    },
    coinsText: {
        fontSize: 14,
        fontFamily: Fonts.bold,
    },
});
