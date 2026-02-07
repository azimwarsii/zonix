import Header from '@/components/Header';
import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/Fonts';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Dimensions, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// Mock Data
const FEATURED_CREATORS = [
    { id: '1', name: 'vikinghuset4...', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=viking', users: '625', likes: '5.0k' },
    { id: '2', name: 'goonmoon', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=moon', users: '2.0k', likes: '5.8k' },
    { id: '3', name: 'sword71', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sword', users: '539', likes: '2.1k' },
    { id: '4', name: 'naturallover', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=nature', users: '769', likes: '2.3k' },
];

const TOP_CREATORS = [
    { id: '1', rank: 1, name: 'cheating0girls', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=cheat', users: '2.2k', likes: '2.9k', chats: '1.9m', tag: 'lucid' },
    { id: '2', rank: 2, name: 'jmathersmind', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=math', users: '619', likes: '1.9k', chats: '1.8m', tag: 'rising' },
    { id: '3', rank: 3, name: 'stepfantasy', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=step', users: '4.1k', likes: '3.8k', chats: '1.6m', tag: 'rising' },
    { id: '4', rank: 4, name: 'serenaod', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=serena', users: '880', likes: '7.1k', chats: '1.4m', tag: 'lucid' },
    { id: '5', rank: 5, name: 'towelie112', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=towel', users: '3.7k', likes: '8.6k', chats: '1.3m', tag: 'lucid' },
    { id: '6', rank: 6, name: 'seilem', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=seil', users: '942', likes: '4.1k', chats: '1.2m', tag: 'lucid' },
    { id: '7', rank: 7, name: 'anotherworldly', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=world', users: '2.5k', likes: '5.0k', chats: '1.2m', tag: 'lucid' },
    { id: '8', rank: 8, name: 'studl3y', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=stud', users: '1.2k', likes: '4.1k', chats: '1.1m', tag: 'lucid' },
];

export default function CommunityScreen() {
    const router = useRouter();
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Featured Section */}
                <View style={styles.sectionHeader}>
                    <Ionicons name="star-outline" size={20} color="#ff69b4" />
                    <ThemedText style={styles.sectionTitle}>Featured</ThemedText>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredList}>
                    {FEATURED_CREATORS.map((creator) => (
                        <TouchableOpacity
                            key={creator.id}
                            activeOpacity={0.9}
                            onPress={() => router.push({ pathname: '/coach/[id]', params: { id: creator.id } })}
                        >
                            <View style={styles.featuredCard}>
                                <Image source={{ uri: creator.avatar }} style={styles.featuredAvatar} />
                                <ThemedText style={styles.featuredName} numberOfLines={1}>{creator.name}</ThemedText>
                                <View style={styles.statsRow}>
                                    <View style={styles.statItem}>
                                        <Ionicons name="people-outline" size={12} color="#888" />
                                        <ThemedText style={styles.statText}>{creator.users}</ThemedText>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Ionicons name="heart-outline" size={12} color="#ff69b4" />
                                        <ThemedText style={styles.statText}>{creator.likes}</ThemedText>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Top Creators Content */}
                < View style={[styles.sectionHeader, { justifyContent: 'space-between', paddingRight: 20 }]} >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="trophy-outline" size={20} color="#ff69b4" />
                        <ThemedText style={styles.sectionTitle}>Top - Last 30 Days</ThemedText>
                    </View>
                    <TouchableOpacity>
                        <Ionicons name="options-outline" size={20} color="#888" />
                    </TouchableOpacity>
                </View>

                <View style={styles.topList}>
                    {TOP_CREATORS.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            activeOpacity={0.9}
                            onPress={() => router.push({ pathname: '/coach/[id]', params: { id: item.id } })}
                        >
                            <View style={styles.topItem}>
                                {/* Rank Column */}
                                <View style={styles.rankContainer}>
                                    {item.rank === 1 ? (
                                        <View style={[styles.rankIconContainer, { backgroundColor: '#ff69b4' }]}>
                                            <Ionicons name="trophy" size={16} color="#fff" />
                                        </View>
                                    ) : item.rank <= 3 ? (
                                        <View style={[styles.rankIconContainer, { backgroundColor: '#ff69b4', opacity: 0.8 }]}>
                                            <Ionicons name="medal" size={16} color="#fff" />
                                        </View>
                                    ) : (
                                        <ThemedText style={styles.rankText}>#{item.rank}</ThemedText>
                                    )}
                                </View>

                                {/* Avatar */}
                                <Image source={{ uri: item.avatar }} style={styles.topAvatar} />

                                {/* Info Column */}
                                <View style={styles.topInfo}>
                                    <View style={styles.nameRow}>
                                        <ThemedText style={styles.topName}>{item.name}</ThemedText>
                                        {item.tag && (
                                            <LinearGradient
                                                colors={item.tag === 'lucid' ? ['#4a148c', '#7b1fa2'] : ['#880e4f', '#c2185b']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={styles.tagBadge}
                                            >
                                                {item.tag === 'lucid' && <Ionicons name="moon" size={10} color="#fff" style={{ marginRight: 2 }} />}
                                                {item.tag === 'rising' && <Ionicons name="flame" size={10} color="#fff" style={{ marginRight: 2 }} />}
                                                <ThemedText style={styles.tagText}>{item.tag}</ThemedText>
                                            </LinearGradient>
                                        )}
                                    </View>
                                    <View style={styles.statsRowLarge}>
                                        <View style={styles.statItemLarge}>
                                            <Ionicons name="people-outline" size={14} color="#888" />
                                            <ThemedText style={styles.statTextLarge}>{item.users}</ThemedText>
                                        </View>
                                        <View style={styles.statItemLarge}>
                                            <Ionicons name="heart-outline" size={14} color="#ff69b4" />
                                            <ThemedText style={styles.statTextLarge}>{item.likes}</ThemedText>
                                        </View>
                                        <View style={styles.statItemLarge}>
                                            <Ionicons name="chatbubble-outline" size={14} color="#00bcd4" />
                                            <ThemedText style={styles.statTextLarge}>{item.chats}</ThemedText>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

            </ScrollView>
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
        color: '#fff',
    },
    // Featured Styles
    featuredList: {
        paddingHorizontal: 15,
        paddingBottom: 10,
    },
    featuredCard: {
        backgroundColor: '#151515',
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        marginHorizontal: 5,
        width: 110,
        borderWidth: 1,
        borderColor: '#222',
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
        borderColor: '#333',
    },
    featuredName: {
        fontSize: 12,
        fontFamily: Fonts.bold,
        color: '#fff',
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
        color: '#888',
        fontFamily: Fonts.body,
    },
    // Top List Styles
    topList: {
        paddingHorizontal: 15,
    },
    topItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#151515',
        borderRadius: 16,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#222',
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
        color: '#666',
    },
    topAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#333',
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
        color: '#fff',
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
        fontSize: 10,
        fontFamily: Fonts.bold,
        color: '#fff',
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
        color: '#888',
        fontFamily: Fonts.body,
    },
});
