import { Fonts } from '@/constants/Fonts';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';

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

type CharacterCardProps = {
    name: string;
    description: string;
    specialization?: string;
    likes: number | string;
    followers: number | string;
    comments: number | string;
    imageUrl: string;
    isSale?: boolean;
    isVerified?: boolean;
    width?: number;
    height?: number;
    onPress?: () => void;
};

export default function CharacterCard({ name, description, specialization, likes, followers, comments, imageUrl, isSale, isVerified, width: propWidth, height: propHeight, onPress }: CharacterCardProps) {
    const [isLoaded, setIsLoaded] = React.useState(false);
    const shimmerValue = useSharedValue(0);

    useEffect(() => {
        shimmerValue.value = withRepeat(
            withTiming(1, { duration: 1500 }),
            -1,
            false
        );
    }, []);

    const shimmerStyle = useAnimatedStyle(() => {
        const translateX = interpolate(shimmerValue.value, [0, 1], [-propWidth! || -200, propWidth! || 200]);
        return {
            transform: [{ translateX }],
        };
    });

    const cardStyle = [
        styles.card,
        propWidth ? { width: propWidth } : null,
        propHeight ? { height: propHeight } : null,
    ];

    return (
        <Pressable style={cardStyle} onPress={onPress}>
            {!isLoaded && (
                <View style={[StyleSheet.absoluteFill, styles.skeletonContainer]}>
                    <Animated.View style={[styles.shimmer, shimmerStyle]}>
                        <LinearGradient
                            colors={['transparent', 'rgba(255,255,255,0.1)', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>
                </View>
            )}
            <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                contentFit="cover"
                transition={300}
                onLoad={() => setIsLoaded(true)}
            />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,1)']}
                style={styles.gradient}
            >
                <Text style={styles.name}>{name}</Text>
                {specialization ? (
                    <Text style={styles.specialization}>{specialization}</Text>
                ) : null}
                <Text style={styles.description} numberOfLines={2}>{description}</Text>

                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Ionicons name="heart" size={12} color="#fff" />
                        <Text style={styles.statText}>{formatNumber(likes)}</Text>
                    </View>
                    <View style={styles.stat}>
                        <Ionicons name="people" size={12} color="#fff" />
                        <Text style={styles.statText}>{formatNumber(followers)}</Text>
                    </View>
                    <View style={styles.stat}>
                        <Ionicons name="chatbubble" size={12} color="#fff" />
                        <Text style={styles.statText}>{formatNumber(comments)}</Text>
                    </View>
                    {isVerified && (
                        <MaterialIcons name="verified" size={16} color="#0095f6" style={{ marginLeft: 'auto' }} />
                    )}
                </View>
            </LinearGradient>

            {isSale && (
                <View style={styles.saleBadge}>
                    <Text style={styles.saleText}>75% OFF</Text>
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#1a1a1a', // Darker background for skeleton
    },
    skeletonContainer: {
        backgroundColor: '#222',
        overflow: 'hidden',
    },
    shimmer: {
        width: '200%',
        height: '100%',
        position: 'absolute',
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
        padding: 16,
        paddingTop: 60,
    },
    name: {
        color: '#fff',
        fontSize: 28,
        marginBottom: 2,
        fontFamily: Fonts.bold,
        lineHeight: 34,
    },
    specialization: {
        color: '#ccc',
        fontSize: 12,
        marginBottom: 4,
        fontFamily: Fonts.body,
        lineHeight: 16,
    },
    description: {
        color: '#aa48b7',
        fontSize: 13,
        marginBottom: 8,
        lineHeight: 18,
        fontFamily: Fonts.body,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start', // Changed to flex-start + gap? No, keep logic but allow auto margin
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    statText: {
        color: '#fff', // White explicitly requested? "icons same color white" was previous request. Text color usually matches or is light grey.
        // User asked "give these icons same color white". I did that.
        // Now "reduce font size of the stats".
        fontSize: 13,
        marginLeft: 4,
        fontFamily: Fonts.body,
    },
    saleBadge: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: '#ff4b91',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    saleText: {
        color: '#fff',
        fontSize: 10,
        fontFamily: Fonts.bold,
    }
});
