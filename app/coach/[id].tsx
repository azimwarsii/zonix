import AuthModal from '@/components/AuthModal';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import { Image } from 'expo-image';
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
    const { id, initialName, initialPortrait, initialSpec, initialVerified } = useLocalSearchParams();
    const router = useRouter();
    const { user } = useAuth();

    // Optimistic Data
    const [coach, setCoach] = useState<any>(initialName ? {
        name: initialName,
        portraitUrl: initialPortrait,
        specialization: initialSpec,
        isVerified: initialVerified === 'true'
    } : null);

    const [loading, setLoading] = useState(!initialName);
    const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
    const [isLiked, setIsLiked] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [followCount, setFollowCount] = useState(0);
    const [chatCount, setChatCount] = useState(0);

    const colorScheme = useColorScheme();
    const themeColors = Colors[colorScheme ?? 'light'];

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

    const openAuthModal = (mode: 'login' | 'signup') => {
        setAuthMode(mode);
        setIsAuthModalVisible(true);
    };

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
            openAuthModal('signup');
            return;
        }
        const newStatus = !isLiked;
        setIsLiked(newStatus);
        setLikeCount(prev => newStatus ? prev + 1 : prev - 1);

        try {
            const toggleLike = functions().httpsCallable('toggleLike');
            const result = await toggleLike({ coachId: id });
            const data = result.data as any;

            if (data.success) {
                // Sync with server truth
                setIsLiked(data.isLiked);
                setLikeCount(data.likes);
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            // Revert optimistic update on error
            setIsLiked(!newStatus);
            setLikeCount(prev => !newStatus ? prev + 1 : prev - 1);
            Alert.alert('Error', 'Failed to update like. Please try again.');
        }
    };

    const handleFollow = () => {
        if (!user) {
            openAuthModal('signup');
            return;
        }
        setIsFollowing(!isFollowing);
        // Optimistic update
        setFollowCount(prev => !isFollowing ? prev + 1 : prev - 1);
    };

    const handleChat = () => {
        if (!user) {
            openAuthModal('signup');
            return;
        }
        router.push(`/message/${id}`);
    };

    if (loading) {
        return (
            <View style={[styles.centered, { backgroundColor: themeColors.background }]}>
                <ActivityIndicator size="large" color={themeColors.text} />
            </View>
        );
    }

    if (!coach) return null;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Header Actions */}
                <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
                    <TouchableOpacity
                        style={[styles.iconButton, { backgroundColor: themeColors.card }]}
                        onPress={() => router.back()}
                    >
                        <Ionicons name="arrow-back" size={24} color={themeColors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.iconButton, { backgroundColor: themeColors.card }]}
                        onPress={handleShare}
                    >
                        <Ionicons name="share-outline" size={24} color={themeColors.text} />
                    </TouchableOpacity>
                </View>

                {/* Profile Section - Minimalist */}
                <View style={styles.profileHeader}>
                    <Image
                        source={{ uri: coach.portraitUrl || 'https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=3000&auto=format&fit=crop' }}
                        style={[styles.profileImage, { borderColor: themeColors.border }]}
                        contentFit="cover"
                        transition={500}
                    />
                    <View style={styles.profileInfo}>
                        <View style={styles.titleRow}>
                            <ThemedText style={[styles.name, { color: themeColors.text }]}>{coach.name}</ThemedText>
                            {coach.isVerified && (
                                <MaterialIcons name="verified" size={20} color={themeColors.text} />
                            )}
                        </View>
                        <ThemedText style={[styles.subtitle, { color: themeColors.icon }]}>{coach.specialization}</ThemedText>
                    </View>
                </View>


                <View style={[styles.content]}>
                    <View style={[styles.section, { borderTopColor: themeColors.border, borderTopWidth: 1, paddingTop: 24 }]}>
                        <ThemedText style={[styles.sectionTitle, { color: themeColors.text }]}>About</ThemedText>
                        <ThemedText style={[styles.description, { color: themeColors.text, opacity: 0.8 }]}>
                            {coach.advanced?.whoAmI || "No description available."}
                        </ThemedText>
                    </View>

                    {/* Traits / Essence */}
                    {coach.essence && (
                        <View style={styles.section}>
                            <ThemedText style={[styles.sectionTitle, { color: themeColors.text }]}>Core Essence</ThemedText>
                            <View style={styles.tagsContainer}>
                                {Object.entries(coach.essence).map(([key, value]) => (
                                    <View key={key} style={[styles.tag, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                                        <ThemedText style={[styles.tagLabel, { color: themeColors.icon }]}>{key}: </ThemedText>
                                        <ThemedText style={[styles.tagValue, { color: themeColors.text }]}>{value as string}</ThemedText>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Interaction Actions Row (Likes & Chats) - Moved after Essence */}
                    <View style={styles.interactionRow}>
                        {/* Like Action */}
                        <TouchableOpacity
                            style={[styles.interactionBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                            onPress={handleLike}
                        >
                            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={20} color={isLiked ? "#ff4444" : themeColors.text} style={{ marginBottom: 4 }} />
                            <ThemedText style={[styles.interactionValue, { color: themeColors.text }]}>
                                {formatNumber(likeCount)}
                            </ThemedText>
                            <ThemedText style={[styles.interactionLabel, { color: themeColors.icon }]}>Likes</ThemedText>
                        </TouchableOpacity>

                        {/* Chat Action */}
                        <TouchableOpacity
                            style={[styles.interactionBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                            onPress={handleChat}
                        >
                            <Ionicons name="chatbubble-ellipses-outline" size={20} color={themeColors.text} style={{ marginBottom: 4 }} />
                            <ThemedText style={[styles.interactionValue, { color: themeColors.text }]}>
                                {formatNumber(chatCount)}
                            </ThemedText>
                            <ThemedText style={[styles.interactionLabel, { color: themeColors.icon }]}>Tap to Chat</ThemedText>
                        </TouchableOpacity>
                    </View>

                    {/* Socials Section */}
                    {coach.advanced?.socialLinks && Object.values(coach.advanced.socialLinks).some(link => link) && (
                        <View style={styles.section}>
                            <ThemedText style={[styles.sectionTitle, { color: themeColors.text }]}>Connect</ThemedText>
                            <View style={styles.socialsRow}>
                                {coach.advanced.socialLinks.instagram ? (
                                    <TouchableOpacity style={[styles.socialBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                                        <Ionicons name="logo-instagram" size={20} color={themeColors.text} />
                                    </TouchableOpacity>
                                ) : null}
                                {coach.advanced.socialLinks.twitter ? (
                                    <TouchableOpacity style={[styles.socialBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                                        <Ionicons name="logo-twitter" size={20} color={themeColors.text} />
                                    </TouchableOpacity>
                                ) : null}
                                {coach.advanced.socialLinks.linkedin ? (
                                    <TouchableOpacity style={[styles.socialBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                                        <Ionicons name="logo-linkedin" size={20} color={themeColors.text} />
                                    </TouchableOpacity>
                                ) : null}
                                {coach.advanced.socialLinks.youtube ? (
                                    <TouchableOpacity style={[styles.socialBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                                        <Ionicons name="logo-youtube" size={20} color={themeColors.text} />
                                    </TouchableOpacity>
                                ) : null}
                                {coach.advanced.socialLinks.tiktok ? (
                                    <TouchableOpacity style={[styles.socialBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                                        <Ionicons name="logo-tiktok" size={20} color={themeColors.text} />
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            <AuthModal
                isVisible={isAuthModalVisible}
                onClose={() => setIsAuthModalVisible(false)}
                mode={authMode}
            />
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
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileHeader: {
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 20,
    },
    profileImage: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 1,
        marginBottom: 16,
    },
    profileInfo: {
        alignItems: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    name: {
        fontSize: 24,
        fontFamily: Fonts.bold,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        fontFamily: Fonts.body,
        fontWeight: '500',
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    content: {
        paddingHorizontal: 20,
    },
    interactionRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 32,
        gap: 16,
    },
    interactionBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    interactionValue: {
        fontSize: 16,
        fontFamily: Fonts.bold,
        marginBottom: 2,
    },
    interactionLabel: {
        fontSize: 12,
        fontFamily: Fonts.body,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 16,
        fontFamily: Fonts.bold,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    description: {
        fontSize: 15,
        lineHeight: 24,
        fontFamily: Fonts.body,
    },
    tagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
    },
    tagLabel: {
        fontSize: 12,
        fontFamily: Fonts.body,
        textTransform: 'capitalize',
    },
    tagValue: {
        fontSize: 12,
        fontFamily: Fonts.bold,
        textTransform: 'capitalize',
    },
    socialsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    socialBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
});
