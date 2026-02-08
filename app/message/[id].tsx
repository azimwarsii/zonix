import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/Fonts';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    SafeAreaView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';

export default function MessageScreen() {
    const { id } = useLocalSearchParams(); // This is the coachId
    const router = useRouter();
    const { user } = useAuth();
    const [coach, setCoach] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [messageText, setMessageText] = useState('');
    const [messages, setMessages] = useState<any[]>([]);
    const [showMenu, setShowMenu] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

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

        const text = messageText.trim();
        setMessageText(''); // Clear input immediately
        setIsTyping(true);  // Show typing indicator

        const conversationId = `${user.uid}_${id}`;
        const conversationRef = firestore().collection('conversations').doc(conversationId);
        const messagesRef = conversationRef.collection('messages');

        try {
            await firestore().runTransaction(async (transaction) => {
                // Ensure conversation document exists
                transaction.set(conversationRef, {
                    lastMessageAt: firestore.FieldValue.serverTimestamp(),
                    participants: [user.uid, id],
                    coachId: id,
                    userId: user.uid,
                    // Optional: Initialize other fields like tokenUsageTotal if new
                }, { merge: true });

                // Add new message
                const newMessageRef = messagesRef.doc();
                transaction.set(newMessageRef, {
                    content: text,
                    role: 'user',
                    createdAt: firestore.FieldValue.serverTimestamp(),
                    userId: user.uid
                });
            });
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
                isUser ? styles.userBubble : styles.aiBubble
            ]}>
                <ThemedText style={[
                    styles.messageText,
                    isUser ? styles.userText : styles.aiText
                ]}>
                    {item.content}
                </ThemedText>
            </View>
        );
    };

    const renderHeader = () => {
        if (!isTyping) return null;
        return (
            <View style={[styles.messageBubble, styles.aiBubble, styles.typingBubble]}>
                <ActivityIndicator size="small" color="#aaa" />
            </View>
        );
    };

    const renderFooter = () => {
        // Show greeting at the "end" (visually top) of list
        const greeting = coach?.advanced?.primaryGreeting || `Hello! I'm ${coach?.name}. How can I help you today?`;

        // If we have messages, we still show the greeting as the very first message ever sent (bottom of list)
        return (
            <View style={[styles.messageBubble, styles.aiBubble, { marginBottom: 20 }]}>
                <ThemedText style={[styles.messageText, styles.aiText]}>
                    {greeting}
                </ThemedText>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#aa48b7" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Image
                        source={{ uri: coach?.portraitUrl || 'https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=3000&auto=format&fit=crop' }}
                        style={styles.avatar}
                        contentFit="cover"
                    />
                    <View>
                        <ThemedText style={styles.headerName}>{coach?.name || 'Coach'}</ThemedText>
                        <ThemedText style={styles.headerStatus}>Online</ThemedText>
                    </View>
                </View>
                <TouchableOpacity style={styles.menuButton} onPress={() => setShowMenu(true)}>
                    <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Menu Modal */}
            <Modal
                transparent
                visible={showMenu}
                animationType="fade"
                onRequestClose={() => setShowMenu(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowMenu(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.menuContainer}>
                            <TouchableOpacity style={styles.menuItem} onPress={() => {
                                setShowMenu(false);
                                router.push({ pathname: '/coach/[id]', params: { id: id as string } });
                            }}>
                                <Ionicons name="person-outline" size={20} color="#fff" />
                                <ThemedText style={styles.menuText}>View Profile</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.menuItem} onPress={handleReport}>
                                <Ionicons name="flag-outline" size={20} color="#fff" />
                                <ThemedText style={styles.menuText}>Report</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.menuItem, styles.deleteItem]} onPress={handleDeleteChat}>
                                <Ionicons name="trash-outline" size={20} color="#ff4b4b" />
                                <ThemedText style={[styles.menuText, styles.deleteText]}>Delete Chat</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

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
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message..."
                        placeholderTextColor="#888"
                        value={messageText}
                        onChangeText={setMessageText}
                        multiline
                    />
                    <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                        <Ionicons name="send" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0a0a0a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
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
        backgroundColor: '#333',
    },
    headerName: {
        fontSize: 16,
        fontFamily: Fonts.bold,
        color: '#fff',
    },
    headerStatus: {
        fontSize: 12,
        color: '#00cc00',
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
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 8,
        elevation: 5,
        shadowColor: "#000",
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
        color: '#fff',
        marginLeft: 12,
        fontSize: 16,
        fontFamily: Fonts.body,
    },
    deleteItem: {
        borderTopWidth: 1,
        borderTopColor: '#333',
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
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#aa48b7',
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#222',
        borderBottomLeftRadius: 4,
    },
    typingBubble: {
        width: 60,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageText: {
        fontSize: 15,
        fontFamily: Fonts.body,
        lineHeight: 22,
    },
    userText: {
        color: '#fff',
    },
    aiText: {
        color: '#eee',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: '#222',
        backgroundColor: '#0a0a0a',
    },
    input: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        color: '#fff',
        fontSize: 15,
        fontFamily: Fonts.body,
        maxHeight: 100,
        marginRight: 12,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#aa48b7',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
