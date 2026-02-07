import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/Fonts';
import { useAuth } from '@/context/AuthContext';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    Share,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const formatNumber = (num: number | string | undefined) => {
    if (!num) return '0';
    const n = Number(num);
    if (isNaN(n)) return '0';

    if (n >= 1000000000) {
        return (n / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    }
    if (n >= 1000000) {
        return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (n >= 1000) {
        return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    return n.toString();
};

export default function CoachProfileScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();
    const [coach, setCoach] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isLiked, setIsLiked] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [followCount, setFollowCount] = useState(0);
    const [chatCount, setChatCount] = useState(0);

    useEffect(() => {
        const fetchCoach = async () => {
            if (!id) return;
            try {
                const doc = await firestore().collection('coaches').doc(id as string).get();
                // @ts-ignore
                if (doc.exists) {
                    const data = doc.data();
                    setCoach(data);

                    // Robust Likes
                    const lCount = data?.stats?.likes ?? (Array.isArray(data?.likedBy) ? data?.likedBy.length : (data?.likes || 0));
                    setLikeCount(Number(lCount));

                    // Robust Follows
                    const fCount = data?.stats?.follows ?? (Array.isArray(data?.follows) ? data?.follows.length : (data?.follows || data?.followers || 0));
                    setFollowCount(Number(fCount));

                    // Robust Chats
                    const cCount = data?.stats?.chats ?? (data?.chatCount || 0);
                    setChatCount(Number(cCount));

                    if (user && data?.likedBy && data.likedBy.includes(user.uid)) {
                        setIsLiked(true);
                    }
                    // check following status if needed
                } else {
                    Alert.alert('Error', 'Coach not found.');
                    router.back();
                }
            } catch (error) {
                console.error('Error fetching coach:', error);
                Alert.alert('Error', 'Failed to load coach details.');
            } finally {
                setLoading(false);
            }
        };
        fetchCoach();
    }, [id, user]);

    const handleShare = async () => {
        try {
            // Generates a deep link like "zonix://coach/123" or "exp://..."
            // This resolves the issue of redirecting to `zonix.app` (which is likely a squatted domain)
            // and instead uses the app's configured scheme (`zonix://`).
            // `Linking.createURL` handles both Expo Go and standalone builds.
            const shareUrl = Linking.createURL(`/coach/${id}`);
            const message = `Check out ${coach?.name} on Zonix! An AI Coach specialized in ${coach?.specialization}.\n\n${shareUrl}`;

            await Share.share({
                message: message,
                url: shareUrl,
                title: `Meet ${coach?.name}`
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleLike = async () => {
        if (!user) {
            Alert.alert('Sign In', 'Please sign in to like this coach.');
            return;
        }
        const newStatus = !isLiked;
        setIsLiked(newStatus);
        setLikeCount(prev => newStatus ? prev + 1 : prev - 1);

        try {
            const coachRef = firestore().collection('coaches').doc(id as string);
            if (newStatus) {
                await coachRef.update({
                    likes: firestore.FieldValue.increment(1),
                    likedBy: firestore.FieldValue.arrayUnion(user.uid)
                });
            } else {
                await coachRef.update({
                    likes: firestore.FieldValue.increment(-1),
                    likedBy: firestore.FieldValue.arrayRemove(user.uid)
                });
            }
        } catch (error) {
            console.error('Error updating like:', error);
            setIsLiked(!newStatus);
            setLikeCount(prev => !newStatus ? prev + 1 : prev - 1);
        }
    };

    const handleFollow = () => {
        if (!user) {
            Alert.alert('Sign In', 'Please sign in to follow this coach.');
            return;
        }
        setIsFollowing(!isFollowing);
        // Optimistic update
        setFollowCount(prev => !isFollowing ? prev + 1 : prev - 1);
    };

    const handleChat = () => {
        if (!user) {
            Alert.alert('Sign In', 'Please sign in to start chatting.');
            return;
        }
        Alert.alert('Coming Soon', 'Chat functionality is under construction!');
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#aa48b7" />
            </View>
        );
    }

    if (!coach) return null;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Header Actions */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
                        <Ionicons name="share-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Profile Image */}
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: coach.portraitUrl || 'https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=3000&auto=format&fit=crop' }}
                        style={styles.image}
                        contentFit="cover"
                        transition={500}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.8)', '#0a0a0a']}
                        style={styles.gradient}
                    />
                </View>

                <View style={styles.content}>
                    <View style={styles.titleRow}>
                        <ThemedText style={styles.name}>{coach.name}</ThemedText>
                        {coach.isVerified && (
                            <MaterialIcons name="verified" size={24} color="#0095f6" />
                        )}
                    </View>

                    <ThemedText style={styles.subtitle}>{coach.specialization}</ThemedText>

                    {/* Interaction Actions Row (Merged Stats & Actions) */}
                    <View style={styles.interactionRow}>
                        {/* Like Action */}
                        <TouchableOpacity style={styles.interactionBtn} onPress={handleLike}>
                            <View style={[styles.iconCircle, isLiked && { backgroundColor: 'rgba(255, 68, 68, 0.15)', borderColor: '#ff4444' }]}>
                                <Ionicons name={isLiked ? "heart" : "heart-outline"} size={22} color={isLiked ? "#ff4444" : "#fff"} />
                            </View>
                            <ThemedText style={[styles.interactionValue, isLiked && { color: '#ff4444' }]}>
                                {formatNumber(likeCount)}
                            </ThemedText>
                            <ThemedText style={styles.interactionLabel}>Likes</ThemedText>
                        </TouchableOpacity>

                        {/* Follow Action */}
                        <TouchableOpacity style={styles.interactionBtn} onPress={handleFollow}>
                            <View style={[styles.iconCircle, isFollowing && { backgroundColor: 'rgba(170, 72, 183, 0.15)', borderColor: '#aa48b7' }]}>
                                <Ionicons name={isFollowing ? "people" : "people-outline"} size={22} color={isFollowing ? "#aa48b7" : "#fff"} />
                            </View>
                            <ThemedText style={[styles.interactionValue, isFollowing && { color: '#aa48b7' }]}>
                                {formatNumber(followCount)}
                            </ThemedText>
                            <ThemedText style={styles.interactionLabel}>Followers</ThemedText>
                        </TouchableOpacity>

                        {/* Chat Action */}
                        <TouchableOpacity style={styles.interactionBtn} onPress={handleChat}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="chatbubble-ellipses-outline" size={22} color="#fff" />
                            </View>
                            <ThemedText style={styles.interactionValue}>
                                {formatNumber(chatCount)}
                            </ThemedText>
                            <ThemedText style={styles.interactionLabel}>Chats</ThemedText>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.section}>
                        <ThemedText style={styles.sectionTitle}>About</ThemedText>
                        <ThemedText style={styles.description}>
                            {coach.advanced?.whoAmI || "No description available."}
                        </ThemedText>
                    </View>

                    {/* Traits / Essence */}
                    {coach.essence && (
                        <View style={styles.section}>
                            <ThemedText style={styles.sectionTitle}>Core Essence</ThemedText>
                            <View style={styles.tagsContainer}>
                                {Object.entries(coach.essence).map(([key, value]) => (
                                    <View key={key} style={styles.tag}>
                                        <ThemedText style={styles.tagLabel}>{key}: </ThemedText>
                                        <ThemedText style={styles.tagValue}>{value as string}</ThemedText>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Socials Section */}
                    {coach.advanced?.socialLinks && Object.values(coach.advanced.socialLinks).some(link => link) && (
                        <View style={styles.section}>
                            <ThemedText style={styles.sectionTitle}>Connect</ThemedText>
                            <View style={styles.socialsRow}>
                                {coach.advanced.socialLinks.instagram ? (
                                    <TouchableOpacity style={styles.socialBtn}>
                                        <Ionicons name="logo-instagram" size={24} color="#E1306C" />
                                    </TouchableOpacity>
                                ) : null}
                                {coach.advanced.socialLinks.twitter ? (
                                    <TouchableOpacity style={styles.socialBtn}>
                                        <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
                                    </TouchableOpacity>
                                ) : null}
                                {coach.advanced.socialLinks.linkedin ? (
                                    <TouchableOpacity style={styles.socialBtn}>
                                        <Ionicons name="logo-linkedin" size={24} color="#0077B5" />
                                    </TouchableOpacity>
                                ) : null}
                                {coach.advanced.socialLinks.youtube ? (
                                    <TouchableOpacity style={styles.socialBtn}>
                                        <Ionicons name="logo-youtube" size={24} color="#FF0000" />
                                    </TouchableOpacity>
                                ) : null}
                                {coach.advanced.socialLinks.tiktok ? (
                                    <TouchableOpacity style={styles.socialBtn}>
                                        <Ionicons name="logo-tiktok" size={24} color="#fff" />
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        </View>
                    )}
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
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0a0a0a',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
        zIndex: 10,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageContainer: {
        width: width,
        height: width * 1.2, // Taller image
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 250,
    },
    content: {
        paddingHorizontal: 20,
        marginTop: -60, // Overlap properly
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    name: {
        fontSize: 32,
        fontFamily: Fonts.bold,
        color: '#fff',
        lineHeight: 40,
    },
    subtitle: {
        fontSize: 16,
        color: '#aa48b7',
        fontFamily: Fonts.body,
        marginBottom: 32,
        fontWeight: '500',
    },
    interactionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
        gap: 12,
    },
    interactionBtn: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#2a2a2a',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    interactionValue: {
        fontSize: 16,
        fontFamily: Fonts.bold,
        color: '#fff',
        marginBottom: 2,
    },
    interactionLabel: {
        fontSize: 12,
        color: '#888',
        fontFamily: Fonts.body,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: Fonts.bold,
        color: '#fff',
        marginBottom: 12,
    },
    description: {
        fontSize: 15,
        color: '#ccc',
        lineHeight: 24,
        fontFamily: Fonts.body,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    tag: {
        flexDirection: 'row',
        backgroundColor: '#1a1a1a',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#333',
    },
    tagLabel: {
        color: '#888',
        fontSize: 12,
        fontFamily: Fonts.body,
        textTransform: 'capitalize',
    },
    tagValue: {
        color: '#fff',
        fontSize: 12,
        fontFamily: Fonts.bold,
        textTransform: 'capitalize',
    },
    socialsRow: {
        flexDirection: 'row',
        gap: 16,
    },
    socialBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
});
