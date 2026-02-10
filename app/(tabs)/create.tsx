import AuthModal from '@/components/AuthModal';
import Header from '@/components/Header';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import storage from '@react-native-firebase/storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Keyboard,
    Modal,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');


const EXPERTISE_OPTIONS = [
    "Business Strategy", "Life Coaching", "Software Engineering",
    "Fitness & Nutrition", "Relationship Advisor", "Mental Health",
    "Financial Planning", "Public Speaking", "Creative Arts"
];

const ESSENCE_OPTIONS = {
    "Talk Style": ["Socratic", "Direct", "Compassionate", "Casual", "Academic", "Humorous"],
    "Temperament": ["Stoic", "Enthusiastic", "Patient", "Firm", "Calm", "Provocative"],
    "Focus Area": ["Growth", "Stability", "Discipline", "Creativity", "Mindfulness", "Performance"],
    "Approach": ["Pragmatic", "Intuitive", "Analytical", "Holistic", "Systematic", "Experimental"],
    "Insight Level": ["Meta-Cognitive", "Philosophical", "Practical", "Deep-Dive", "Summarized"],
    "Presence": ["Authority", "Co-Pilot", "Shadow", "Inspirational", "Mentor", "Challenger"]
};

export default function CreateScreen() {
    const [name, setName] = useState('');
    const [experience, setExperience] = useState(0);
    const [expertise, setExpertise] = useState<string | null>(null);
    const [showExpertisePicker, setShowExpertisePicker] = useState(false);
    const [portraitImage, setPortraitImage] = useState<string | null>(null);
    const [activeAdvancedModal, setActiveAdvancedModal] = useState<string | null>(null);
    const [knowledgeBaseText, setKnowledgeBaseText] = useState('');
    const [primaryGreeting, setPrimaryGreeting] = useState('');
    const [whoAmI, setWhoAmI] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [socialLinks, setSocialLinks] = useState({
        instagram: '',
        twitter: '',
        linkedin: '',
        tiktok: '',
        youtube: '',
    });
    const [isSyncing, setIsSyncing] = useState(false);
    const syncTimeoutRef = useRef<any>(null);

    const handleAutoSave = () => {
        setIsSyncing(true);
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = setTimeout(() => {
            setIsSyncing(false);
        }, 800);
    };

    const router = useRouter();
    const { user, userData, presentPaywall } = useAuth();
    const colorScheme = useColorScheme();
    const themeColors = Colors[colorScheme ?? 'light'];
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => setIsKeyboardVisible(true)
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => setIsKeyboardVisible(false)
        );

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);

    // Essence states
    const [essences, setEssences] = useState<Record<string, string | null>>({
        "Talk Style": null,
        "Temperament": null,
        "Focus Area": null,
        "Approach": null,
        "Insight Level": null,
        "Presence": null
    });

    const [activeEssencePicker, setActiveEssencePicker] = useState<string | null>(null);

    const handleEssenceSelect = (label: string, value: string) => {
        setEssences(prev => ({ ...prev, [label]: value }));
        setValidationErrors(prev => prev.filter(err => err !== label));
        setActiveEssencePicker(null);
    };

    const handlePickImage = async () => {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
            Alert.alert('Permission Required', 'We need camera and library permissions to upload your portrait.');
            return;
        }

        Alert.alert(
            'Select Portrait',
            'How would you like to add your photo?',
            [
                {
                    text: 'Take Photo',
                    onPress: async () => {
                        const result = await ImagePicker.launchCameraAsync({
                            allowsEditing: true,
                            aspect: [2, 3],
                            quality: 0.8,
                        });
                        if (!result.canceled) setPortraitImage(result.assets[0].uri);
                    }
                },
                {
                    text: 'Choose from Library',
                    onPress: async () => {
                        const result = await ImagePicker.launchImageLibraryAsync({
                            allowsEditing: true,
                            aspect: [2, 3],
                            quality: 0.8,
                        });
                        if (!result.canceled) setPortraitImage(result.assets[0].uri);
                    }
                },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const resetForm = () => {
        setName('');
        setExperience(0);
        setExpertise(null);
        setPortraitImage(null);
        setActiveAdvancedModal(null);
        setKnowledgeBaseText('');
        setPrimaryGreeting('');
        setWhoAmI('');
        setValidationErrors([]);
        setEssences({
            "Talk Style": null,
            "Temperament": null,
            "Focus Area": null,
            "Approach": null,
            "Insight Level": null,
            "Presence": null
        });
        setSocialLinks({
            instagram: '',
            twitter: '',
            linkedin: '',
            tiktok: '',
            youtube: '',
        });
    };

    const handleNext = () => {
        if (!user) {
            setShowAuthModal(true);
            return;
        }
        handleCreateCoach();
    };

    const validateForm = () => {
        const errors: string[] = [];
        if (!name.trim()) errors.push('name');
        if (!portraitImage) errors.push('portrait');
        if (!expertise) errors.push('expertise');

        Object.keys(essences).forEach(key => {
            if (!essences[key]) errors.push(key);
        });

        setValidationErrors(errors);
        return errors.length === 0;
    };

    const handleCreateCoach = async () => {
        if (!validateForm()) {
            Alert.alert('Missing Fields', 'Please fill in all highlighted fields before forging your coach.');
            return;
        }

        // Credits/Premium Check
        if (userData?.planType !== 'Premium') {
            const credits = userData?.credits || 0;
            if (credits < 5) {
                Alert.alert(
                    'Insufficient Coins',
                    'Forging an AI Coach costs 5 coins. Upgrade to Premium for UNLIMITED forging!',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Upgrade', onPress: () => presentPaywall() }
                    ]
                );
                return;
            }

            // Simple Confirmation
            const confirmForge = () => new Promise((resolve) => {
                Alert.alert(
                    'Forge AI Coach',
                    'Forging this coach will cost 5 coins. Continue?',
                    [
                        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                        { text: 'Forge (5 Coins)', onPress: () => resolve(true) }
                    ]
                );
            });

            const confirmed = await confirmForge();
            if (!confirmed) return;
        }

        setIsCreating(true);
        try {
            console.log('Preparing coach data and uploading assets...');
            const coachId = firestore().collection('coaches').doc().id;
            let finalPortraitUrl = portraitImage;

            // Handle portrait image upload if it's a local file
            if (portraitImage && portraitImage.startsWith('file://')) {
                try {
                    console.log('--- STORAGE UPLOAD START ---');
                    const filePath = portraitImage.replace('file://', '');
                    const storagePath = `coaches/${coachId}/portrait.jpg`;
                    const reference = storage().ref(storagePath);

                    console.log('Local File:', filePath);
                    console.log('Storage Reference:', storagePath);
                    console.log('Full Ref:', reference.toString());

                    // Perform upload and wait for it to finish
                    await reference.putFile(filePath);
                    console.log('putFile finished successfully');

                    // Small delay to ensure eventual consistency (sometimes needed on new buckets)
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Attempt to get download URL with a simple retry
                    let downloadUrl = '';
                    for (let attempt = 1; attempt <= 3; attempt++) {
                        try {
                            downloadUrl = await reference.getDownloadURL();
                            if (downloadUrl) break;
                        } catch (urlErr) {
                            console.log(`getDownloadURL attempt ${attempt} failed, retrying...`);
                            if (attempt === 3) throw urlErr;
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    }

                    finalPortraitUrl = downloadUrl;
                    console.log('Final Download URL:', finalPortraitUrl);
                    console.log('--- STORAGE UPLOAD END ---');
                } catch (uploadError: any) {
                    console.error('CRITICAL STORAGE ERROR:', uploadError);
                    let errorMsg = uploadError.message;
                    if (uploadError.code === 'storage/object-not-found') {
                        errorMsg = 'Internal sync error: Upload succeeded but file not found. Please try again.';
                    } else if (uploadError.code === 'storage/unauthorized') {
                        errorMsg = 'Permission denied: Check Storage Rules.';
                    }
                    throw new Error(errorMsg);
                }
            }

            console.log('Calling createCoach Cloud Function with ID:', coachId);
            const result = (await functions().httpsCallable('createCoach')({
                coachId,
                name,
                type: 'clone',
                portraitUrl: finalPortraitUrl,
                specialization: expertise,
                yearsOfExpertise: experience,
                essence: essences,
                advanced: {
                    primaryGreeting,
                    whoAmI,
                    socialLinks
                },
                knowledge: {
                    textRecords: knowledgeBaseText
                }
            })) as any;

            if (result.data.success) {
                Alert.alert(
                    'Coach Created!',
                    `Your coach "${name}" has been forged successfully.`,
                    [{
                        text: 'Great!',
                        onPress: () => {
                            resetForm();
                            router.push({ pathname: '/coach/[id]', params: { id: coachId } });
                        }
                    }]
                );
            }
        } catch (error: any) {
            console.error('Create Coach Error:', error);
            Alert.alert(
                'Creation Failed',
                error.message || 'An unexpected error occurred. Please try again later.'
            );
        } finally {
            setIsCreating(false);
        }
    };



    return (
        <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
            <Header />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >

                {/* Portrait - Minimal Circle */}
                <TouchableOpacity onPress={handlePickImage} style={styles.portraitContainer}>
                    {portraitImage ? (
                        <Image source={{ uri: portraitImage }} style={[styles.portraitImage, { borderColor: validationErrors.includes('portrait') ? '#ef4444' : themeColors.border }]} />
                    ) : (
                        <View style={[styles.portraitPlaceholder, { backgroundColor: themeColors.card, borderColor: validationErrors.includes('portrait') ? '#ef4444' : themeColors.border }]}>
                            <Ionicons name="camera-outline" size={32} color={validationErrors.includes('portrait') ? '#ef4444' : themeColors.icon} />
                        </View>
                    )}
                    <View style={[styles.editBadge, { backgroundColor: themeColors.tint }]}>
                        <Ionicons name="pencil" size={12} color={themeColors.background} />
                    </View>
                </TouchableOpacity>

                {/* Name Input - Clean Underline */}
                <View style={styles.inputGroup}>
                    <TextInput
                        style={[styles.minimalInput, { color: themeColors.text, borderBottomColor: validationErrors.includes('name') ? '#ef4444' : themeColors.border }]}
                        placeholder="Coach Name"
                        placeholderTextColor={validationErrors.includes('name') ? '#ef4444' : themeColors.icon}
                        value={name}
                        onChangeText={(text) => {
                            setName(text);
                            if (text.trim()) setValidationErrors(prev => prev.filter(err => err !== 'name'));
                        }}
                    />
                </View>

                {/* Specialization - Clean Selector */}
                <TouchableOpacity
                    style={[styles.inputGroup, { borderBottomWidth: 1, borderBottomColor: validationErrors.includes('expertise') ? '#ef4444' : themeColors.border }]}
                    onPress={() => setShowExpertisePicker(true)}
                >
                    <ThemedText style={[styles.selectorText, { color: expertise ? themeColors.text : (validationErrors.includes('expertise') ? '#ef4444' : themeColors.icon) }]}>
                        {expertise || "Select Specialization"}
                    </ThemedText>
                    <Ionicons name="chevron-down" size={20} color={validationErrors.includes('expertise') ? '#ef4444' : themeColors.icon} />
                </TouchableOpacity>

                {/* Essence Grid - Minimal Icons */}
                <View style={styles.sectionContainer}>
                    <ThemedText style={[styles.sectionTitle, { color: themeColors.text }]}>Core Essence</ThemedText>
                    <View style={styles.grid}>
                        {Object.entries(essences).map(([key, value]) => (
                            <TouchableOpacity
                                key={key}
                                style={[
                                    styles.gridItem,
                                    {
                                        backgroundColor: themeColors.card,
                                        borderColor: validationErrors.includes(key) ? '#ef4444' : (value ? themeColors.tint : 'transparent'),
                                        borderWidth: (validationErrors.includes(key) || value) ? 1 : 0
                                    }
                                ]}
                                onPress={() => {
                                    setActiveEssencePicker(key);
                                    if (validationErrors.includes(key)) setValidationErrors(prev => prev.filter(err => err !== key));
                                }}
                            >
                                <ThemedText style={[styles.gridLabel, { color: validationErrors.includes(key) ? '#ef4444' : themeColors.icon }]}>{key}</ThemedText>
                                <ThemedText style={[styles.gridValue, { color: value ? themeColors.text : (validationErrors.includes(key) ? '#ef4444' : themeColors.icon) }]}>
                                    {value || "Select"}
                                </ThemedText>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Advanced Toggle - Minimal Text */}
                <TouchableOpacity
                    style={styles.advancedToggle}
                    onPress={() => setShowAdvanced(!showAdvanced)}
                >
                    <ThemedText style={[styles.advancedToggleText, { color: themeColors.tint }]}>{showAdvanced ? "Hide Advanced" : "Advanced Details"}</ThemedText>
                </TouchableOpacity>

                {showAdvanced && (
                    <View style={styles.advancedContainer}>
                        {['Primary Greeting', 'Knowledge Base', 'Who Am I?', 'Social Links'].map((item) => (
                            <TouchableOpacity
                                key={item}
                                style={[styles.advancedItem, { backgroundColor: themeColors.card }]}
                                onPress={() => setActiveAdvancedModal(item)}
                            >
                                <ThemedText style={[styles.advancedItemText, { color: themeColors.text }]}>{item}</ThemedText>
                                <Ionicons name="chevron-forward" size={16} color={themeColors.icon} />
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Bottom Button - Floating */}
            <View style={[styles.bottomContainer, { bottom: Math.max(insets.bottom, 20) }]}>
                <TouchableOpacity
                    style={[styles.createButton, { backgroundColor: themeColors.tint }, (isCreating || !name) && { opacity: 0.7 }]}
                    onPress={handleNext}
                    disabled={isCreating}
                >
                    {isCreating ? (
                        <ActivityIndicator color={themeColors.background} />
                    ) : (
                        <ThemedText style={[styles.createButtonText, { color: themeColors.background }]}>
                            {userData?.planType === 'Premium' ? 'Create Coach' : 'Create Coach (5 Coins)'}
                        </ThemedText>
                    )}
                </TouchableOpacity>
            </View>

            {/* Modals - Simplified (Keeping same logic, just wrapping with Theme) */}
            {/* Expertise Picker Modal */}
            <Modal visible={showExpertisePicker} transparent animationType="slide">
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowExpertisePicker(false)} activeOpacity={1}>
                    <View style={[styles.modalContent, { backgroundColor: themeColors.background, borderColor: themeColors.border, borderWidth: 1 }]}>
                        <View style={styles.modalHandle} />
                        <ThemedText style={[styles.modalTitle, { color: themeColors.text }]}>Select Specialization</ThemedText>
                        <FlatList
                            data={EXPERTISE_OPTIONS}
                            contentContainerStyle={{ paddingBottom: 20 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.modalItem, { borderBottomColor: themeColors.border }]}
                                    onPress={() => {
                                        setExpertise(item);
                                        setShowExpertisePicker(false);
                                    }}
                                >
                                    <ThemedText style={[styles.modalItemText, { color: themeColors.text }]}>{item}</ThemedText>
                                </TouchableOpacity>
                            )}
                            keyExtractor={i => i}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Essence Picker Modal */}
            <Modal visible={!!activeEssencePicker} transparent animationType="slide">
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setActiveEssencePicker(null)} activeOpacity={1}>
                    <View style={[styles.modalContent, { backgroundColor: themeColors.background, borderColor: themeColors.border, borderWidth: 1 }]}>
                        <View style={styles.modalHandle} />
                        <ThemedText style={[styles.modalTitle, { color: themeColors.text }]}>{activeEssencePicker}</ThemedText>
                        {activeEssencePicker && (
                            <FlatList
                                data={ESSENCE_OPTIONS[activeEssencePicker as keyof typeof ESSENCE_OPTIONS]}
                                contentContainerStyle={{ paddingBottom: 20 }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.modalItem, { borderBottomColor: themeColors.border }]}
                                        onPress={() => handleEssenceSelect(activeEssencePicker!, item)}
                                    >
                                        <ThemedText style={[styles.modalItemText, { color: themeColors.text }]}>{item}</ThemedText>
                                    </TouchableOpacity>
                                )}
                                keyExtractor={i => i}
                            />
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Advanced Modal - Keeping simplified for now, as user can just close it */}
            <Modal visible={!!activeAdvancedModal} transparent animationType="slide">
                <TouchableOpacity style={styles.modalOverlay} onPress={() => setActiveAdvancedModal(null)} activeOpacity={1}>
                    <View style={[styles.modalContent, { backgroundColor: themeColors.background, borderColor: themeColors.border, borderWidth: 1, height: '95%', maxHeight: undefined }]}>
                        <View style={styles.modalHandle} />
                        <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
                            <TouchableOpacity onPress={() => setActiveAdvancedModal(null)}>
                                <ThemedText style={{ color: themeColors.text }}>Cancel</ThemedText>
                            </TouchableOpacity>
                            <ThemedText style={[styles.modalHeaderTitle, { color: themeColors.text }]}>{activeAdvancedModal}</ThemedText>
                            <TouchableOpacity onPress={() => setActiveAdvancedModal(null)}>
                                <ThemedText style={{ color: themeColors.tint }}>Done</ThemedText>
                            </TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={{ padding: 20 }}>
                            {/* Simplified Content Rendering based on activeAdvancedModal */}
                            {activeAdvancedModal === 'Primary Greeting' && (
                                <View>
                                    <View style={{ backgroundColor: themeColors.card, borderRadius: 12, padding: 16, marginBottom: 24, flexDirection: 'row', gap: 12 }}>
                                        <Ionicons name="chatbubbles-outline" size={24} color={themeColors.tint} />
                                        <View style={{ flex: 1 }}>
                                            <ThemedText style={{ color: themeColors.text, fontFamily: Fonts.bold, marginBottom: 4 }}>First Impression</ThemedText>
                                            <ThemedText style={{ color: themeColors.icon, fontFamily: Fonts.body, lineHeight: 20 }}>
                                                The first message your coach sends to start a conversation. Make it welcoming and relevant to their persona.
                                            </ThemedText>
                                        </View>
                                    </View>
                                    <TextInput
                                        multiline
                                        style={[styles.textArea, { color: themeColors.text, backgroundColor: themeColors.background, borderColor: themeColors.border, borderWidth: 1, minHeight: 150 }]}
                                        value={primaryGreeting}
                                        onChangeText={setPrimaryGreeting}
                                        placeholder="Type your greeting here..."
                                        placeholderTextColor={themeColors.icon}
                                    />
                                </View>
                            )}
                            {activeAdvancedModal === 'Knowledge Base' && (
                                <View>
                                    <View style={{ backgroundColor: themeColors.card, borderRadius: 12, padding: 16, marginBottom: 24, flexDirection: 'row', gap: 12 }}>
                                        <Ionicons name="library-outline" size={24} color={themeColors.tint} />
                                        <View style={{ flex: 1 }}>
                                            <ThemedText style={{ color: themeColors.text, fontFamily: Fonts.bold, marginBottom: 4 }}>Core Knowledge</ThemedText>
                                            <ThemedText style={{ color: themeColors.icon, fontFamily: Fonts.body, lineHeight: 20 }}>
                                                Paste text, articles, or notes here. Your coach will use this unique knowledge to answer questions accurately.
                                            </ThemedText>
                                        </View>
                                    </View>
                                    <TextInput
                                        multiline
                                        style={[styles.textArea, { color: themeColors.text, backgroundColor: themeColors.background, borderColor: themeColors.border, borderWidth: 1, height: 300 }]}
                                        value={knowledgeBaseText}
                                        onChangeText={setKnowledgeBaseText}
                                        placeholder="Paste or type knowledge content here..."
                                        placeholderTextColor={themeColors.icon}
                                    />
                                </View>
                            )}
                            {activeAdvancedModal === 'Who Am I?' && (
                                <View>
                                    <View style={{ backgroundColor: themeColors.card, borderRadius: 12, padding: 16, marginBottom: 24, flexDirection: 'row', gap: 12 }}>
                                        <Ionicons name="person-circle-outline" size={24} color={themeColors.tint} />
                                        <View style={{ flex: 1 }}>
                                            <ThemedText style={{ color: themeColors.text, fontFamily: Fonts.bold, marginBottom: 4 }}>Bio & Backstory</ThemedText>
                                            <ThemedText style={{ color: themeColors.icon, fontFamily: Fonts.body, lineHeight: 20 }}>
                                                Describe your coach's background, origin story, and specific traits in detail. This helps define their identity.
                                            </ThemedText>
                                        </View>
                                    </View>
                                    <TextInput
                                        multiline
                                        style={[styles.textArea, { color: themeColors.text, backgroundColor: themeColors.background, borderColor: themeColors.border, borderWidth: 1, minHeight: 150 }]}
                                        value={whoAmI}
                                        onChangeText={setWhoAmI}
                                        placeholder="Type your bio here..."
                                        placeholderTextColor={themeColors.icon}
                                    />
                                </View>
                            )}
                            {activeAdvancedModal === 'Social Links' && (
                                <View>
                                    <View style={{ backgroundColor: themeColors.card, borderRadius: 12, padding: 16, marginBottom: 24, flexDirection: 'row', gap: 12 }}>
                                        <Ionicons name="share-social-outline" size={24} color={themeColors.tint} />
                                        <View style={{ flex: 1 }}>
                                            <ThemedText style={{ color: themeColors.text, fontFamily: Fonts.bold, marginBottom: 4 }}>Connect</ThemedText>
                                            <ThemedText style={{ color: themeColors.icon, fontFamily: Fonts.body, lineHeight: 20 }}>
                                                Add links to your coach's social profiles so users can follow them.
                                            </ThemedText>
                                        </View>
                                    </View>
                                    <TextInput
                                        style={[styles.minimalInput, { color: themeColors.text, borderBottomWidth: 1, borderBottomColor: themeColors.border, backgroundColor: themeColors.background, padding: 12, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: themeColors.border }]}
                                        value={socialLinks.instagram}
                                        onChangeText={t => setSocialLinks({ ...socialLinks, instagram: t })}
                                        placeholder="Instagram URL"
                                        placeholderTextColor={themeColors.icon}
                                    />
                                    <TextInput
                                        style={[styles.minimalInput, { color: themeColors.text, borderBottomWidth: 1, borderBottomColor: themeColors.border, backgroundColor: themeColors.background, padding: 12, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: themeColors.border }]}
                                        value={socialLinks.twitter}
                                        onChangeText={t => setSocialLinks({ ...socialLinks, twitter: t })}
                                        placeholder="Twitter URL"
                                        placeholderTextColor={themeColors.icon}
                                    />
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
            <AuthModal
                isVisible={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                mode="signup"
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
    headerSpacer: {
        marginTop: 20,
        marginBottom: 30,
    },
    mainTitle: {
        fontSize: 28,
        fontFamily: Fonts.bold,
        marginBottom: 8,
    },
    portraitContainer: {
        alignSelf: 'center',
        marginBottom: 40,
        position: 'relative',
    },
    portraitImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
    },
    portraitPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 1,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    inputGroup: {
        marginBottom: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    minimalInput: {
        flex: 1,
        fontSize: 18,
        fontFamily: Fonts.body,
        paddingVertical: 8,
        borderBottomWidth: 1,
    },
    selectorText: {
        fontSize: 18,
        fontFamily: Fonts.body,
    },
    sectionContainer: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: Fonts.bold,
        marginBottom: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    gridItem: {
        width: '48%',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        gap: 4,
    },
    gridLabel: {
        fontSize: 12,
        textTransform: 'uppercase',
        fontFamily: Fonts.bold,
        letterSpacing: 0.5,
    },
    gridValue: {
        fontSize: 14,
        fontFamily: Fonts.body,
    },
    advancedToggle: {
        alignSelf: 'center',
        padding: 10,
        marginBottom: 20,
    },
    advancedToggleText: {
        fontSize: 14,
        fontFamily: Fonts.bold,
    },
    advancedContainer: {
        gap: 12,
    },
    advancedItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
    },
    advancedItemText: {
        fontSize: 16,
        fontFamily: Fonts.body,
    },
    bottomContainer: {
        position: 'absolute',
        left: 20,
        right: 20,
    },
    createButton: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    createButtonText: {
        fontSize: 18,
        fontFamily: Fonts.bold,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        paddingBottom: 40,
        paddingTop: 12,
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#ccc',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: Fonts.bold,
        textAlign: 'center',
        marginBottom: 16,
    },
    modalItem: {
        padding: 16,
        borderBottomWidth: 1,
    },
    modalItemText: {
        fontSize: 16,
        fontFamily: Fonts.body,
    },
    fullScreenModal: {
        flex: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    modalHeaderTitle: {
        fontSize: 18,
        fontFamily: Fonts.bold,
    },
    textArea: {
        height: 200,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        textAlignVertical: 'top',
        lineHeight: 24,
        marginBottom: 20,
    },
});
