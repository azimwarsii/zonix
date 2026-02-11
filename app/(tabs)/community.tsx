import Header from '@/components/Header';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Modal, ScrollView, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const formatNumber = (num: number | undefined) => {
    if (!num) return '0';
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'm';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return num.toString();
};

export default function CommunityScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const themeColors = Colors[colorScheme ?? 'light'];
    const [sortBy, setSortBy] = useState<'likes' | 'chats'>('likes');
    const [showSortModal, setShowSortModal] = useState(false);
    const [coaches, setCoaches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchCoaches = async () => {
        try {
            const snapshot = await firestore().collection('coaches').get();
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCoaches(data);
        } catch (error) {
            console.error('Error fetching coaches:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchCoaches();
        // Optional: Real-time listener
        const unsubscribe = firestore().collection('coaches').onSnapshot(snapshot => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCoaches(data);
            setLoading(false);
        }, error => {
            console.error("Real-time update error:", error);
        });
        return () => unsubscribe();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchCoaches();
    };

    const sortedCreators = [...coaches].sort((a, b) => {
        const valA = sortBy === 'likes'
            ? (a.stats?.likes ?? (Array.isArray(a.likedBy) ? a.likedBy.length : (a.likes || 0)))
            : (a.stats?.chats ?? (a.chatCount || 0));

        const valB = sortBy === 'likes'
            ? (b.stats?.likes ?? (Array.isArray(b.likedBy) ? b.likedBy.length : (b.likes || 0)))
            : (b.stats?.chats ?? (b.chatCount || 0));

        return valB - valA;
    });

    // Featured: Top 5 by likes (always)
    const featuredCreators = [...coaches].sort((a, b) => {
        const valA = (a.stats?.likes ?? (Array.isArray(a.likedBy) ? a.likedBy.length : (a.likes || 0)));
        const valB = (b.stats?.likes ?? (Array.isArray(b.likedBy) ? b.likedBy.length : (b.likes || 0)));
        return valB - valA;
    }).slice(0, 5);

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
                <Header />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={themeColors.text} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
            <Header />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Featured Section */}
                <View style={styles.sectionHeader}>
                    <Ionicons name="star" size={18} color={themeColors.text} />
                    <ThemedText style={[styles.sectionTitle, { color: themeColors.text }]}>Featured</ThemedText>
                </View>

                {featuredCreators.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredList}>
                        {featuredCreators.map((creator) => (
                            <TouchableOpacity
                                key={creator.id}
                                activeOpacity={0.9}
                                onPress={() => router.push({
                                    pathname: '/coach/[id]',
                                    params: {
                                        id: creator.id,
                                        initialName: creator.name,
                                        initialPortrait: creator.portraitUrl,
                                        initialSpec: creator.specialization,
                                        initialVerified: creator.isVerified ? 'true' : 'false'
                                    }
                                })}
                            >
                                <View style={[styles.featuredCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                                    <Image
                                        source={{ uri: creator.portraitUrl || 'https://images.unsplash.com/photo-1675897634504-bf03f1a2a66a?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }}
                                        style={[styles.featuredAvatar, { borderColor: themeColors.border }]}
                                    />
                                    <ThemedText style={[styles.featuredName, { color: themeColors.text }]} numberOfLines={1}>{creator.name}</ThemedText>
                                    <View style={styles.statsRow}>
                                        <View style={styles.statItem}>
                                            <Ionicons name="heart-outline" size={12} color={themeColors.icon} />
                                            <ThemedText style={[styles.statText, { color: themeColors.icon }]}>
                                                {formatNumber(creator.stats?.likes ?? (Array.isArray(creator.likedBy) ? creator.likedBy.length : (creator.likes || 0)))}
                                            </ThemedText>
                                        </View>
                                        <View style={styles.statItem}>
                                            <Ionicons name="chatbubble-outline" size={12} color={themeColors.icon} />
                                            <ThemedText style={[styles.statText, { color: themeColors.icon }]}>
                                                {formatNumber(creator.stats?.chats ?? (creator.chatCount || 0))}
                                            </ThemedText>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                ) : (
                    <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
                        <ThemedText style={{ color: themeColors.icon, fontFamily: Fonts.body }}>No featured coaches available.</ThemedText>
                    </View>
                )}

                {/* Top Creators Content */}
                < View style={[styles.sectionHeader, { justifyContent: 'space-between', paddingRight: 20 }]} >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="analytics-outline" size={20} color={themeColors.text} />
                        <ThemedText style={[styles.sectionTitle, { color: themeColors.text }]}>Top - By {sortBy === 'likes' ? 'Likes' : 'Chats'}</ThemedText>
                    </View>
                    <TouchableOpacity onPress={() => setShowSortModal(true)}>
                        <Ionicons name="options-outline" size={20} color={themeColors.icon} />
                    </TouchableOpacity>
                </View>

                <View style={styles.topList}>
                    {sortedCreators.map((item, index) => {
                        const rank = index + 1;
                        const likes = item.stats?.likes ?? (Array.isArray(item.likedBy) ? item.likedBy.length : (item.likes || 0));
                        const chats = item.stats?.chats ?? (item.chatCount || 0);

                        return (
                            <TouchableOpacity
                                key={item.id}
                                activeOpacity={0.9}
                                onPress={() => router.push({
                                    pathname: '/coach/[id]',
                                    params: {
                                        id: item.id,
                                        initialName: item.name,
                                        initialPortrait: item.portraitUrl,
                                        initialSpec: item.specialization,
                                        initialVerified: item.isVerified ? 'true' : 'false'
                                    }
                                })}
                            >
                                <View style={[styles.topItem, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                                    {/* Rank Column */}
                                    <View style={styles.rankContainer}>
                                        {rank === 1 ? (
                                            <View style={[styles.rankIconContainer, { backgroundColor: themeColors.text }]}>
                                                <Ionicons name="trophy" size={14} color={themeColors.background} />
                                            </View>
                                        ) : rank <= 3 ? (
                                            <View style={[styles.rankIconContainer, { backgroundColor: themeColors.icon, opacity: 0.8 }]}>
                                                <Ionicons name="medal" size={14} color={themeColors.background} />
                                            </View>
                                        ) : (
                                            <ThemedText style={[styles.rankText, { color: themeColors.icon }]}>#{rank}</ThemedText>
                                        )}
                                    </View>

                                    {/* Avatar */}
                                    <Image
                                        source={{ uri: item.portraitUrl || 'https://images.unsplash.com/photo-1675897634504-bf03f1a2a66a?q=80&w=1740&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }}
                                        style={[styles.topAvatar, { borderColor: themeColors.border }]}
                                    />

                                    {/* Info Column */}
                                    <View style={styles.topInfo}>
                                        <View style={styles.nameRow}>
                                            <ThemedText style={[styles.topName, { color: themeColors.text }]}>{item.name}</ThemedText>
                                            {item.isVerified && (
                                                <MaterialIcons name="verified" size={14} color={Colors.light.tint} style={{ marginRight: 4 }} />
                                            )}
                                            {item.specialization && (
                                                <View style={[styles.tagBadge, { backgroundColor: themeColors.text }]}>
                                                    <ThemedText style={[styles.tagText, { color: themeColors.background }]}>{item.specialization}</ThemedText>
                                                </View>
                                            )}
                                        </View>

                                        <ThemedText style={{ fontSize: 12, color: themeColors.icon, marginBottom: 6 }} numberOfLines={2}>
                                            {item.advanced?.whoAmI || "AI Coach"}
                                        </ThemedText>

                                        <View style={styles.statsRowLarge}>
                                            <View style={styles.statItemLarge}>
                                                <Ionicons
                                                    name="heart-outline"
                                                    size={14}
                                                    color={sortBy === 'likes' ? themeColors.text : themeColors.icon}
                                                />
                                                <ThemedText style={[styles.statTextLarge, {
                                                    color: sortBy === 'likes' ? themeColors.text : themeColors.icon,
                                                    fontFamily: sortBy === 'likes' ? Fonts.bold : Fonts.body
                                                }]}>
                                                    {formatNumber(likes)}
                                                </ThemedText>
                                            </View>
                                            <View style={styles.statItemLarge}>
                                                <Ionicons
                                                    name="chatbubble-outline"
                                                    size={14}
                                                    color={sortBy === 'chats' ? themeColors.text : themeColors.icon}
                                                />
                                                <ThemedText style={[styles.statTextLarge, {
                                                    color: sortBy === 'chats' ? themeColors.text : themeColors.icon,
                                                    fontFamily: sortBy === 'chats' ? Fonts.bold : Fonts.body
                                                }]}>
                                                    {formatNumber(chats)}
                                                </ThemedText>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

            </ScrollView>

            {/* Sort Modal */}
            <Modal
                transparent
                visible={showSortModal}
                animationType="fade"
                onRequestClose={() => setShowSortModal(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowSortModal(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.menuContainer, { backgroundColor: themeColors.card }]}>
                            <ThemedText style={[styles.menuHeader, { color: themeColors.icon }]}>Sort Leaderboard By</ThemedText>

                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setSortBy('likes');
                                    setShowSortModal(false);
                                }}
                            >
                                <Ionicons
                                    name={sortBy === 'likes' ? "radio-button-on" : "radio-button-off"}
                                    size={20}
                                    color={themeColors.text}
                                />
                                <ThemedText style={[
                                    styles.menuText,
                                    { color: themeColors.text, fontFamily: sortBy === 'likes' ? Fonts.bold : Fonts.body }
                                ]}>
                                    Most Liked
                                </ThemedText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setSortBy('chats');
                                    setShowSortModal(false);
                                }}
                            >
                                <Ionicons
                                    name={sortBy === 'chats' ? "radio-button-on" : "radio-button-off"}
                                    size={20}
                                    color={themeColors.text}
                                />
                                <ThemedText style={[
                                    styles.menuText,
                                    { color: themeColors.text, fontFamily: sortBy === 'chats' ? Fonts.bold : Fonts.body }
                                ]}>
                                    Most Chats
                                </ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
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
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
        marginTop: 24,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: Fonts.bold,
    },
    // Featured Styles
    featuredList: {
        paddingHorizontal: 15,
        paddingBottom: 10,
    },
    featuredCard: {
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        marginHorizontal: 5,
        width: 110,
        borderWidth: 1,
        // Shadow for depth
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    featuredAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginBottom: 8,
        borderWidth: 2,
    },
    featuredName: {
        fontSize: 12,
        fontFamily: Fonts.bold,
        marginBottom: 6,
        textAlign: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 4,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    statText: {
        fontSize: 10,
        fontFamily: Fonts.body,
    },
    // Top List Styles
    topList: {
        paddingHorizontal: 15,
    },
    topItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
    },
    rankContainer: {
        width: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    rankIconContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankText: {
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
    topAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
        borderWidth: 1,
    },
    topInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        flexWrap: 'wrap',
    },
    topName: {
        fontSize: 15,
        fontFamily: Fonts.bold,
        marginRight: 8,
    },
    tagBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    tagText: {
        fontSize: 9,
        fontFamily: Fonts.bold,
        textTransform: 'uppercase',
    },
    statsRowLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    statItemLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statTextLarge: {
        fontSize: 12,
        fontFamily: Fonts.body,
    },
    // Modal & Menu Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuContainer: {
        width: '80%',
        borderRadius: 20,
        padding: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    menuHeader: {
        fontSize: 14,
        fontFamily: Fonts.bold,
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        gap: 12,
    },
    menuText: {
        fontSize: 16,
    },
});
