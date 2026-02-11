
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useEffect } from 'react';
import { Dimensions, Image, StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashScreenProps {
    onAnimationFinish: () => void;
}

export default function AnimatedSplashScreen({ onAnimationFinish }: AnimatedSplashScreenProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const backgroundColor = isDark ? '#000000' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#000000';

    const scale = useSharedValue(0.8);
    const iconOpacity = useSharedValue(0);
    const textY = useSharedValue(40);
    const textOpacity = useSharedValue(0);
    const containerOpacity = useSharedValue(1);

    useEffect(() => {
        // 1. Icon Motion Sequence
        iconOpacity.value = withTiming(1, { duration: 1000 });
        scale.value = withTiming(1, {
            duration: 1200,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1)
        }, (finished) => {
            if (finished) {
                // 2. Text Reveal
                textY.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.exp) });
                textOpacity.value = withTiming(1, { duration: 800 });

                // 3. Final Exit
                containerOpacity.value = withDelay(
                    2000,
                    withTiming(0, { duration: 600 }, (finished) => {
                        if (finished) {
                            runOnJS(onAnimationFinish)();
                        }
                    })
                );
            }
        });
    }, []);

    const animatedIconStyle = useAnimatedStyle(() => {
        return {
            opacity: iconOpacity.value,
            transform: [
                { scale: scale.value }
            ],
        };
    });

    const animatedTextStyle = useAnimatedStyle(() => {
        return {
            opacity: textOpacity.value,
            transform: [{ translateY: textY.value }],
        };
    });

    const animatedContainerStyle = useAnimatedStyle(() => {
        return {
            opacity: containerOpacity.value,
        };
    });

    return (
        <Animated.View style={[styles.container, { backgroundColor }, animatedContainerStyle]}>
            <View style={styles.content}>
                <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
                    <Image
                        source={require('../assets/images/splash-icon.png')}
                        style={styles.icon}
                        resizeMode="contain"
                    />
                </Animated.View>
                <View style={styles.textWrapper}>
                    <Animated.Text style={[styles.title, { color: textColor }, animatedTextStyle]}>
                        ZONIX
                    </Animated.Text>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 99999,
        elevation: 100, // For Android
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        width: '100%',
        height: '100%',
    },
    textWrapper: {
        marginTop: 20,
        height: 70,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 52,
        fontWeight: '900',
        letterSpacing: 12,
    },
});
