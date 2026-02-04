import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/Fonts';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';

interface PremiumBadgeProps {
    showText?: boolean;
    size?: 'small' | 'large';
}

export default function PremiumBadge({ showText = true, size = 'small' }: PremiumBadgeProps) {
    const shimmerValue = useSharedValue(-1);

    useEffect(() => {
        shimmerValue.value = withRepeat(
            withTiming(1, {
                duration: 2000,
                easing: Easing.bezier(0.4, 0, 0.2, 1),
            }),
            -1,
            false
        );
    }, []);

    const animatedShimmerStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    translateX: shimmerValue.value * 150,
                },
            ],
        };
    });

    const isLarge = size === 'large';

    return (
        <View style={[styles.badgeContainer, isLarge && styles.badgeLarge]}>
            <LinearGradient
                colors={['#FFD700', '#FDB931', '#FFD700']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
            />

            {/* Shimmer Effect */}
            <Animated.View style={[StyleSheet.absoluteFill, animatedShimmerStyle]}>
                <LinearGradient
                    colors={['transparent', 'rgba(255, 255, 255, 0.4)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.shimmerGradient}
                />
            </Animated.View>

            <View style={styles.content}>
                <Ionicons name="sparkles" size={isLarge ? 16 : 12} color="#000" style={styles.icon} />
                {showText && (
                    <ThemedText style={[styles.badgeText, isLarge && styles.badgeTextLarge]}>
                        PREMIUM
                    </ThemedText>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    badgeContainer: {
        height: 24,
        paddingHorizontal: 10,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    badgeLarge: {
        height: 32,
        paddingHorizontal: 16,
        borderRadius: 16,
    },
    shimmerGradient: {
        width: 100,
        height: '100%',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 1,
    },
    icon: {
        marginRight: 4,
    },
    badgeText: {
        color: '#000',
        fontSize: 10,
        fontWeight: '900',
        fontFamily: Fonts.bold,
        letterSpacing: 0.5,
    },
    badgeTextLarge: {
        fontSize: 14,
        letterSpacing: 1,
    },
});
