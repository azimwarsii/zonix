import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, Path, Pattern, Rect } from 'react-native-svg';

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
    onMessagePress?: () => void;
};

export default function CharacterCard({ name, description, specialization, likes, followers, comments, imageUrl, isSale, isVerified, width: propWidth, height: propHeight, onPress, onMessagePress }: CharacterCardProps) {
    const colorScheme = useColorScheme();
    const themeColors = Colors[colorScheme ?? 'light'];

    const cardStyle = [
        styles.card,
        { backgroundColor: themeColors.card, borderColor: themeColors.border },
        propWidth ? { width: propWidth } : null,
    ];

    return (
        <Pressable style={cardStyle} onPress={onPress}>
            {/* Vector Background Pattern */}
            <View style={StyleSheet.absoluteFill}>
                <Svg height="100%" width="100%" style={{ opacity: 0.6 }}>
                    <Defs>
                        <Pattern
                            id="techPattern"
                            patternUnits="userSpaceOnUse"
                            x="0"
                            y="0"
                            width="40"
                            height="40"
                        >
                            {/* Angled Lines */}
                            <Path
                                d="M0 40 L40 0 M-10 10 L10 -10 M30 50 L50 30"
                                stroke={themeColors.text}
                                strokeWidth="0.5"
                                opacity={colorScheme === 'dark' ? 0.08 : 0.04}
                            />

                            {/* Small Dots */}
                            <Circle cx="35" cy="35" r="1.5" fill={themeColors.text} opacity={colorScheme === 'dark' ? 0.08 : 0.04} />
                        </Pattern>
                    </Defs>
                    <Rect x="0" y="0" width="100%" height="100%" fill="url(#techPattern)" />
                </Svg>
            </View>

            <View style={styles.contentContainer}>
                <View style={styles.headerRow}>
                    <View style={styles.nameContainer}>
                        <Image
                            source={{ uri: imageUrl }}
                            style={[styles.avatar, { borderColor: themeColors.text }]}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={200}
                            priority="high"
                        />
                        <Text style={[styles.name, { color: themeColors.text }]} numberOfLines={1}>{name}</Text>
                    </View>
                    {isVerified && (
                        <MaterialIcons name="verified" size={16} color={themeColors.text} />
                    )}
                </View>

                {specialization ? (
                    <Text style={[styles.specialization, { color: themeColors.icon }]}>{specialization}</Text>
                ) : null}

                <Text style={[styles.description, { color: themeColors.tabIconDefault }]} numberOfLines={2}>
                    {description}
                </Text>

                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Ionicons name="heart-outline" size={14} color={themeColors.text} />
                        <Text style={[styles.statText, { color: themeColors.text }]}>{formatNumber(likes)}</Text>
                    </View>
                    <View style={styles.stat}>
                        <Ionicons name="chatbubble-outline" size={14} color={themeColors.text} />
                        <Text style={[styles.statText, { color: themeColors.text }]}>{formatNumber(comments)}</Text>
                    </View>
                </View>

                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.actionButton, { borderColor: themeColors.border, borderWidth: 1 }]}
                        onPress={onPress}
                    >
                        <Text style={[styles.buttonText, { color: themeColors.text }]}>Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: themeColors.text }]}
                        onPress={onMessagePress}
                    >
                        <Text style={[styles.buttonText, { color: themeColors.background }]}>Message</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 0,
        overflow: 'hidden',
        borderWidth: 1,
        marginBottom: 16,
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 1,
        position: 'relative',
    },
    // Removed unused skeleton/shimmer styles
    contentContainer: {
        padding: 12,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    nameContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 4,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
        borderWidth: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        fontFamily: Fonts.heading,
        flex: 1,
    },
    specialization: {
        fontSize: 12,
        marginBottom: 6,
        fontFamily: Fonts.body,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    description: {
        fontSize: 14,
        marginBottom: 12,
        lineHeight: 20,
        fontFamily: Fonts.body,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 16,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 12,
        fontFamily: Fonts.body,
    },
    saleBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 2,
    },
    saleText: {
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: Fonts.bold,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: 12,
        fontWeight: '600',
        fontFamily: Fonts.bold,
    },
});
