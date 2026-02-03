import { Fonts } from '@/constants/Fonts';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

type CharacterCardProps = {
    name: string;
    description: string;
    likes: number;
    comments: string;
    imageUrl: string;
    isSale?: boolean;
    width?: number;
    height?: number;
};

export default function CharacterCard({ name, description, likes, comments, imageUrl, isSale, width: propWidth, height: propHeight }: CharacterCardProps) {
    const cardStyle = [
        styles.card,
        propWidth ? { width: propWidth } : null,
        propHeight ? { height: propHeight } : null,
    ];

    return (
        <Pressable style={cardStyle}>
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)', 'rgba(0,0,0,1)']}
                style={styles.gradient}
            >
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.description} numberOfLines={2}>{description}</Text>

                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <Ionicons name="heart" size={12} color="#817299" />
                        <Text style={styles.statText}>{likes}</Text>
                    </View>
                    <View style={styles.stat}>
                        <Ionicons name="chatbubble" size={12} color="#817299" />
                        <Text style={styles.statText}>{comments}</Text>
                    </View>
                    <MaterialIcons name="verified" size={16} color="#0095f6" style={{ marginLeft: 'auto' }} />
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
        backgroundColor: '#222',
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
        padding: 16, // More padding
        paddingTop: 60, // Deeper gradient
    },
    name: {
        color: '#fff',
        fontSize: 26, // Bigger
        marginBottom: 4,
        fontFamily: Fonts.bold,
    },
    description: {
        color: '#817299', // Updated color
        fontSize: 14,
        marginBottom: 8,
        lineHeight: 18,
        fontFamily: Fonts.body,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
    },
    statText: {
        color: '#817299', // Updated color
        fontSize: 14,
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
