import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    Modal,
    StyleSheet,
    TouchableOpacity,
    View,
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

const { width, height } = Dimensions.get('window');

const ONBOARDING_KEY = 'has_seen_onboarding_v2';

interface Step {
    title: string;
    description: string;
    targetTab: number; // 0: Explore, 1: Chat, 2: Create, 3: Ranks, 4: My AI
    icon: keyof typeof Ionicons.glyphMap;
}

const STEPS: Step[] = [
    {
        title: "Discover AI Coaches",
        description: "Explore a world of specialized AI coaches ready to help you grow.",
        targetTab: 0,
        icon: "compass"
    },
    {
        title: "Your Conversations",
        description: "Access your chat history and continue growing with your AI.",
        targetTab: 1,
        icon: "chatbubble"
    },
    {
        title: "Forge Your Own",
        description: "Create an AI Coach tailored to your specific needs.",
        targetTab: 2,
        icon: "add-circle"
    },
    {
        title: "Leaderboard",
        description: "Track the top coaches and see community rankings.",
        targetTab: 3,
        icon: "trophy"
    },
    {
        title: "Manage Creations",
        description: "Fine-tune and update the coaches you've forged.",
        targetTab: 4,
        icon: "sparkles"
    }
];

export default function OnboardingOverlay() {
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

    // Position of the icon in the tab bar (approximate)
    const tabIconY = height - (insets.bottom > 0 ? insets.bottom + 30 : 38);
    const tabAreaHeight = 60 + insets.bottom;

    return (
        <Modal transparent visible={visible} animationType="fade">
            <View style={[styles.overlay, { backgroundColor: colorScheme === 'dark' ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.92)' }]}>
                {/* Skip Button */}
                <TouchableOpacity
                    style={[styles.skipButton, { top: insets.top + 10 }]}
                    onPress={handleSkip}
                >
                    <ThemedText style={[styles.skipText, { color: themeColors.icon }]}>Skip</ThemedText>
                </TouchableOpacity>

                {/* Card Container - Minimalist */}
                <Animated.View
                    key={`card-${currentStep}`}
                    entering={FadeIn.duration(400)}
                    exiting={FadeOut.duration(400)}
                    style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
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
                                        { backgroundColor: i === currentStep ? themeColors.text : themeColors.border }
                                    ]}
                                />
                            ))}
                        </View>
                        <TouchableOpacity style={[styles.nextButton, { backgroundColor: themeColors.text }]} onPress={handleNext}>
                            <ThemedText style={[styles.nextText, { color: themeColors.background }]}>
                                {currentStep === STEPS.length - 1 ? "Finish" : "Continue"}
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
        fontFamily: Fonts.body,
        fontSize: 14,
        letterSpacing: 0.5,
    },
    card: {
        width: width * 0.8,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontFamily: Fonts.bold,
        marginBottom: 10,
        textAlign: 'center',
    },
    description: {
        fontSize: 14,
        fontFamily: Fonts.body,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    footer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dots: {
        flexDirection: 'row',
        gap: 6,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    nextButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    nextText: {
        fontFamily: Fonts.bold,
        fontSize: 14,
    },
    spotlight: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.1)', // Subtle highlight behind the cloned icon
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
