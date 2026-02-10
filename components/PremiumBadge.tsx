import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useColorScheme } from '@/hooks/use-color-scheme';
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
    const colorScheme = useColorScheme();
    const themeColors = Colors[colorScheme ?? 'light'];

    useEffect(() => {
        shimmerValue.value = withRepeat(
            withTiming(1, {
                duration: 2500,
                easing: Easing.inOut(Easing.ease),
            }),
            -1,
            true // reverse
        );
    }, []);

    const animatedShimmerStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    translateX: shimmerValue.value * 50, // Reduced range for subtle effect
                },
            ],
            opacity: 0.3,
        };
    });

    const isLarge = size === 'large';
    const goldColor = '#FFD700';

    return (
        <View style={[
            styles.badgeContainer,
            isLarge && styles.badgeLarge,
            { borderColor: goldColor, backgroundColor: colorScheme === 'dark' ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 215, 0, 0.05)' }
        ]}>
            {/* Minimalist Shimmer Overlay */}
            <Animated.View style={[StyleSheet.absoluteFill, animatedShimmerStyle]}>
                <LinearGradient
                    colors={['transparent', goldColor, 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>

            <View style={styles.content}>
                <Ionicons name="sparkles" size={isLarge ? 14 : 10} color={goldColor} style={styles.icon} />
                {showText && (
                    <ThemedText style={[styles.badgeText, isLarge && styles.badgeTextLarge, { color: goldColor }]}>
                        PREMIUM
                    </ThemedText>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    badgeContainer: {
        height: 22,
        paddingHorizontal: 8,
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 1,
    },
    badgeLarge: {
        height: 30,
        paddingHorizontal: 12,
        borderRadius: 6,
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
        fontSize: 10,
        fontWeight: '700',
        fontFamily: Fonts.bold,
        letterSpacing: 1,
    },
    badgeTextLarge: {
        fontSize: 12,
        letterSpacing: 1.5,
    },
});
