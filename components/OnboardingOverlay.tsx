
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
    Modal,
    StyleSheet,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';
import Animated, {
    FadeIn,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from './themed-text';

const ONBOARDING_KEY = 'has_seen_onboarding_v5';

interface Step {
    title: string;
    description: string;
    targetTab: number; // 0: Explore, 1: Chat, 2: Create, 3: Ranks, 4: My AI
    icon: keyof typeof Ionicons.glyphMap;
}

const STEPS: Step[] = [
    {
        title: "EXPLORE",
        description: "Discover a curated network of specialized AI minds designed for growth.",
        targetTab: 0,
        icon: "compass"
    },
    {
        title: "CONNECT",
        description: "Engage in deep, secure conversations with your personal AI workspace.",
        targetTab: 1,
        icon: "chatbubble"
    },
    {
        title: "FORGE",
        description: "Build bespoke intelligence. Create custom coaches tailored to your unique goals.",
        targetTab: 2,
        icon: "add-circle"
    },
    {
        title: "ASCEND",
        description: "Observe the global community and track the impact of top-tier AI creations.",
        targetTab: 3,
        icon: "trophy"
    },
    {
        title: "ORCHESTRATE",
        description: "Manage, refine, and evolve your workforce of digital assistants.",
        targetTab: 4,
        icon: "sparkles"
    }
];

export default function OnboardingOverlay() {
    const { width, height } = useWindowDimensions();
    const [visible, setVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const themeColors = Colors[colorScheme ?? 'light'];

    const arrowBounce = useSharedValue(0);

    useEffect(() => {
        const checkOnboarding = async () => {
            const hasSeen = await AsyncStorage.getItem(ONBOARDING_KEY);
            if (!hasSeen) {
                setVisible(true);
            }
        };
        checkOnboarding();
    }, []);

    useEffect(() => {
        if (visible) {
            arrowBounce.value = withRepeat(
                withTiming(1, { duration: 1000 }),
                -1,
                true
            );
        }
    }, [visible]);

    const handleSkip = async () => {
        await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
        setVisible(false);
    };

    const handleNext = async () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            await handleSkip();
        }
    };

    const animatedArrowStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: arrowBounce.value * 8 }]
        };
    });

    if (!visible) return null;

    const step = STEPS[currentStep];
    const tabWidth = width / 5;
    const centerX = (step.targetTab * tabWidth) + (tabWidth / 2);

    // Dynamic position calculation to match TabLayout's height: 60 + insets.bottom
    const tabBarHeight = 60 + insets.bottom;
    const tabIconY = height - tabBarHeight + 25; // 20px down from tab bar top (8px padding + 12px icon half-height)

    return (
        <Modal transparent visible={visible} animationType="fade">
            <View style={[styles.overlay, { backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.92)' }]}>
                {/* Skip Button */}
                <TouchableOpacity
                    style={[styles.skipButton, { top: insets.top + 10 }]}
                    onPress={handleSkip}
                >
                    <ThemedText style={[styles.skipText, { color: themeColors.icon }]}>SKIP</ThemedText>
                </TouchableOpacity>

                {/* Card Container - Minimalist */}
                <Animated.View
                    key={`card-${currentStep}`}
                    entering={FadeIn.duration(400)}
                    exiting={FadeOut.duration(400)}
                    style={[styles.card, {
                        backgroundColor: themeColors.card,
                        borderColor: themeColors.border,
                        width: width * 0.85
                    }]}
                >
                    <ThemedText style={[styles.title, { color: themeColors.text }]}>{step.title}</ThemedText>
                    <ThemedText style={[styles.description, { color: themeColors.icon }]}>{step.description}</ThemedText>

                    <View style={styles.footer}>
                        <View style={styles.dots}>
                            {STEPS.map((_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.dot,
                                        {
                                            backgroundColor: i === currentStep ? themeColors.text : themeColors.border,
                                            width: i === currentStep ? 12 : 4,
                                            opacity: i === currentStep ? 1 : 0.3
                                        }
                                    ]}
                                />
                            ))}
                        </View>
                        <TouchableOpacity style={[styles.nextButton, { backgroundColor: themeColors.text }]} onPress={handleNext}>
                            <ThemedText style={[styles.nextText, { color: themeColors.background }]}>
                                {currentStep === STEPS.length - 1 ? "FINISH" : "NEXT"}
                            </ThemedText>
                        </TouchableOpacity>
                    </View>
                </Animated.View>

                {/* Spotlight Circle and Cloned Icon - Making the tab visible */}
                <View style={[styles.spotlight, {
                    left: centerX - 30,
                    top: tabIconY - 30,
                    backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                }]} />
                <View style={[styles.iconClone, { left: centerX - 12, top: tabIconY - 12 }]}>
                    <Ionicons name={step.icon} size={24} color={themeColors.text} />
                </View>

                {/* Arrow pointing to spotlight */}
                <Animated.View
                    style={[
                        styles.arrowContainer,
                        {
                            left: centerX - 15,
                            top: tabIconY - 80
                        },
                        animatedArrowStyle
                    ]}
                >
                    <Ionicons name="arrow-down" size={30} color={themeColors.text} />
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    skipButton: {
        position: 'absolute',
        right: 24,
        padding: 10,
    },
    skipText: {
        fontFamily: Fonts.bold,
        fontSize: 12,
        letterSpacing: 2,
    },
    card: {
        borderRadius: 24,
        padding: 32,
        borderWidth: 1,
        alignItems: 'flex-start', // Left aligned for better legibility
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
    },
    title: {
        fontSize: 14,
        fontFamily: Fonts.bold,
        letterSpacing: 4, // Ultra minimalist wide tracking
        marginBottom: 16,
        opacity: 0.8,
    },
    description: {
        fontSize: 18, // Slightly larger for better readability
        fontFamily: Fonts.body,
        lineHeight: 26,
        letterSpacing: -0.2,
        marginBottom: 32,
    },
    footer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dots: {
        flexDirection: 'row',
        gap: 4,
        alignItems: 'center',
    },
    dot: {
        height: 4,
        borderRadius: 2,
    },
    nextButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 30,
    },
    nextText: {
        fontFamily: Fonts.bold,
        fontSize: 12,
        letterSpacing: 1,
    },
    spotlight: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    iconClone: {
        position: 'absolute',
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    arrowContainer: {
        position: 'absolute',
        alignItems: 'center',
        width: 30,
    },
});
