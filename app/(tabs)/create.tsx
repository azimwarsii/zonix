import AuthModal from '@/components/AuthModal';
import FaceDetectorCamera from '@/components/FaceDetectorCamera';
import Header from '@/components/Header';
import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/Fonts';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import storage from '@react-native-firebase/storage';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import * as RN from 'react-native';
import {
    Alert,
    Dimensions,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    const [creationType, setCreationType] = useState<'clone' | 'imaginative'>('clone');
    const [name, setName] = useState('');
    const [experience, setExperience] = useState(0);
    const [expertise, setExpertise] = useState<string | null>(null);
    const [showExpertisePicker, setShowExpertisePicker] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
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
    const { user, userData } = useAuth();

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

    const handlePhotoCapture = (path: string) => {
        setPortraitImage(`file://${path}`);
        setShowCamera(false);
    };

    const resetForm = () => {
        setCreationType('clone');
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
        if (creationType === 'clone' && !portraitImage) errors.push('portrait');
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
                type: creationType,
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
                    `Your coach "${name}" has been forged. 5 credits have been deducted.`,
                    [{
                        text: 'Great!',
                        onPress: () => {
                            resetForm();
                            router.push('/(tabs)');
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

    if (showCamera) {
        return (
            <FaceDetectorCamera
                onCapture={handlePhotoCapture}
                onClose={() => setShowCamera(false)}
            />
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Header />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Title */}
                <View style={styles.headerTextContainer}>
                    <ThemedText style={styles.mainTitle}>Forge Your AI Coach</ThemedText>
                    <ThemedText style={styles.descriptionText}>
                        Evolve a <Text style={{ color: '#aa48b7', fontFamily: Fonts.bold }}>Digital Twin</Text> to mirror your own wisdom, or architect a <Text style={{ color: '#aa48b7', fontFamily: Fonts.bold }}>Visionary Entity</Text> from the ground up.
                    </ThemedText>
                </View>

                {/* Creation Type Selector */}
                <View style={styles.typeSelectorContainer}>
                    <TouchableOpacity
                        onPress={() => setCreationType('clone')}
                        style={[styles.typeButton, creationType === 'clone' && styles.activeTypeButton]}
                    >
                        <Ionicons name="copy-outline" size={20} color={creationType === 'clone' ? '#fff' : '#666'} />
                        <ThemedText style={[styles.typeButtonText, creationType === 'clone' && styles.activeTypeButtonText]}>Digital Twin</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setCreationType('imaginative')}
                        style={[styles.typeButton, creationType === 'imaginative' && styles.activeTypeButton]}
                    >
                        <Ionicons name="color-palette-outline" size={20} color={creationType === 'imaginative' ? '#fff' : '#666'} />
                        <ThemedText style={[styles.typeButtonText, creationType === 'imaginative' && styles.activeTypeButtonText]}>Visionary Entity</ThemedText>
                    </TouchableOpacity>
                </View>

                {/* Digital Twin specific fields */}
                {creationType === 'clone' && (
                    <View style={styles.imageUploadSection}>
                        <ThemedText style={styles.sectionLabel}>Portrait Selection</ThemedText>
                        <TouchableOpacity
                            style={[
                                styles.imagePlaceholder,
                                validationErrors.includes('portrait') && styles.errorBorder
                            ]}
                            onPress={() => setShowCamera(true)}
                        >
                            {portraitImage ? (
                                <Image
                                    source={{ uri: portraitImage }}
                                    style={styles.capturedImage}
                                    contentFit="cover"
                                />
                            ) : (
                                <>
                                    <Ionicons name="camera-outline" size={40} color={validationErrors.includes('portrait') ? '#ff4444' : "#aa48b7"} />
                                    <ThemedText style={[styles.imagePlaceholderText, validationErrors.includes('portrait') && { color: '#ff4444' }]}>Capture live photo</ThemedText>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Character Name Section */}
                <View style={styles.inputSection}>
                    <ThemedText style={[styles.sectionLabel, validationErrors.includes('name') && { color: '#ff4444' }]}>{creationType === 'clone' ? 'Your Name' : 'Coach Identity'}</ThemedText>
                    <View style={[styles.inputWrapper, validationErrors.includes('name') && styles.errorBorder]}>
                        <TextInput
                            style={styles.textInput}
                            placeholder={creationType === 'clone' ? "Enter your full name" : "e.g. Master Strategist"}
                            placeholderTextColor="#666"
                            value={name}
                            onChangeText={(text) => {
                                setName(text);
                                if (text.trim()) setValidationErrors(prev => prev.filter(err => err !== 'name'));
                            }}
                        />
                    </View>
                </View>

                {/* Expertise Dropdown */}
                <View style={styles.inputSection}>
                    <ThemedText style={[styles.sectionLabel, validationErrors.includes('expertise') && { color: '#ff4444' }]}>Specialization</ThemedText>
                    <TouchableOpacity
                        style={[styles.inputWrapper, validationErrors.includes('expertise') && styles.errorBorder]}
                        onPress={() => setShowExpertisePicker(true)}
                    >
                        <ThemedText style={[styles.textInput, !expertise && { color: '#666' }]}>
                            {expertise || "Select Expertise"}
                        </ThemedText>
                        <Ionicons name="chevron-down" size={20} color={validationErrors.includes('expertise') ? '#ff4444' : "#aa48b7"} />
                    </TouchableOpacity>
                </View>

                {/* Personality Details Grid */}
                <View style={styles.gridSection}>
                    <ThemedText style={styles.sectionLabel}>Core Essence</ThemedText>
                    <ThemedText style={styles.sectionSubLabel}>Select philosophy for each trait</ThemedText>

                    <View style={styles.grid}>
                        <View style={styles.gridRow}>
                            <PersonalityCard
                                label="Talk Style"
                                value={essences["Talk Style"]}
                                icon="chatbubbles-outline"
                                error={validationErrors.includes("Talk Style")}
                                onPress={() => setActiveEssencePicker("Talk Style")}
                            />
                            <PersonalityCard
                                label="Temperament"
                                value={essences["Temperament"]}
                                icon="shield-half-outline"
                                error={validationErrors.includes("Temperament")}
                                onPress={() => setActiveEssencePicker("Temperament")}
                            />
                        </View>
                        <View style={styles.gridRow}>
                            <PersonalityCard
                                label="Focus Area"
                                value={essences["Focus Area"]}
                                icon="trending-up-outline"
                                error={validationErrors.includes("Focus Area")}
                                onPress={() => setActiveEssencePicker("Focus Area")}
                            />
                            <PersonalityCard
                                label="Approach"
                                value={essences["Approach"]}
                                icon="construct-outline"
                                error={validationErrors.includes("Approach")}
                                onPress={() => setActiveEssencePicker("Approach")}
                            />
                        </View>
                        <View style={styles.gridRow}>
                            <PersonalityCard
                                label="Insight Level"
                                value={essences["Insight Level"]}
                                icon="eye-outline"
                                error={validationErrors.includes("Insight Level")}
                                onPress={() => setActiveEssencePicker("Insight Level")}
                            />
                            <PersonalityCard
                                label="Presence"
                                value={essences["Presence"]}
                                icon="ribbon-outline"
                                error={validationErrors.includes("Presence")}
                                onPress={() => setActiveEssencePicker("Presence")}
                            />
                        </View>
                    </View>
                </View>

                {/* Advanced Details Accordion */}
                <TouchableOpacity
                    style={styles.accordionHeader}
                    onPress={() => setShowAdvanced(!showAdvanced)}
                >
                    <ThemedText style={styles.accordionTitle}>Advanced Details</ThemedText>
                    <Ionicons name={showAdvanced ? "chevron-down" : "chevron-up"} size={20} color="#666" />
                </TouchableOpacity>

                {showAdvanced && (
                    <View>
                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={() => setActiveAdvancedModal('Primary Greeting')}
                        >
                            <ThemedText style={styles.actionLabel}>Primary Greeting</ThemedText>
                            <Ionicons name="pencil-sharp" size={18} color="#aa48b7" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={() => setActiveAdvancedModal('Knowledge Base')}
                        >
                            <ThemedText style={styles.actionLabel}>Knowledge Base</ThemedText>
                            <Ionicons name="pencil-sharp" size={18} color="#aa48b7" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionItem}
                            onPress={() => setActiveAdvancedModal('Who Am I?')}
                        >
                            <ThemedText style={styles.actionLabel}>Who Am I ?</ThemedText>
                            <Ionicons name="pencil-sharp" size={18} color="#aa48b7" />
                        </TouchableOpacity>
                        {creationType === 'clone' && (
                            <TouchableOpacity
                                style={styles.actionItem}
                                onPress={() => setActiveAdvancedModal('Social Links')}
                            >
                                <ThemedText style={styles.actionLabel}>Social Links</ThemedText>
                                <Ionicons name="share-social-outline" size={18} color="#aa48b7" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={[styles.nextButton, (isCreating || !name) && { opacity: 0.7 }]}
                    onPress={handleNext}
                    disabled={isCreating}
                >
                    <LinearGradient
                        colors={['#aa48b7', '#4a148c']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.nextGradient}
                    >
                        <View style={{ alignItems: 'center' }}>
                            <ThemedText style={styles.nextText}>
                                {isCreating ? 'FORGING...' : 'FORGE AGENT'}
                            </ThemedText>
                            {!isCreating && (
                                <Text style={styles.creditDeductionText}>-5 Coins</Text>
                            )}
                        </View>
                        {isCreating && (
                            <RN.ActivityIndicator size="small" color="#fff" style={{ marginLeft: 12 }} />
                        )}
                        {!isCreating && <Ionicons name="sparkles" size={20} color="#fff" style={{ marginLeft: 8 }} />}
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            {/* Expertise Picker Modal */}
            <Modal visible={showExpertisePicker} transparent animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <ThemedText style={styles.modalTitle}>Choose Specialization</ThemedText>
                            <TouchableOpacity onPress={() => setShowExpertisePicker(false)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={EXPERTISE_OPTIONS}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.pickerItem}
                                    onPress={() => {
                                        setExpertise(item);
                                        setValidationErrors(prev => prev.filter(err => err !== 'expertise'));
                                        setShowExpertisePicker(false);
                                    }}
                                >
                                    <ThemedText style={[styles.pickerItemText, item === expertise && { color: '#aa48b7' }]}>
                                        {item}
                                    </ThemedText>
                                    {item === expertise && <Ionicons name="checkmark" size={20} color="#aa48b7" />}
                                </TouchableOpacity>
                            )}
                            keyExtractor={item => item}
                        />
                    </View>
                </View>
            </Modal>

            {/* Essence Picker Modal */}
            <Modal visible={!!activeEssencePicker} transparent animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <ThemedText style={styles.modalTitle}>{activeEssencePicker}</ThemedText>
                            <TouchableOpacity onPress={() => setActiveEssencePicker(null)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        {activeEssencePicker && (
                            <FlatList
                                data={ESSENCE_OPTIONS[activeEssencePicker as keyof typeof ESSENCE_OPTIONS]}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.pickerItem}
                                        onPress={() => handleEssenceSelect(activeEssencePicker, item)}
                                    >
                                        <ThemedText style={[styles.pickerItemText, item === (essences as any)[activeEssencePicker] && { color: '#aa48b7' }]}>
                                            {item}
                                        </ThemedText>
                                        {item === (essences as any)[activeEssencePicker] && <Ionicons name="checkmark" size={20} color="#aa48b7" />}
                                    </TouchableOpacity>
                                )}
                                keyExtractor={item => item}
                            />
                        )}
                    </View>
                </View>
            </Modal>
            {/* Advanced Details Modal */}
            <Modal visible={!!activeAdvancedModal} transparent animationType="slide">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalContainer}>
                        <View style={[
                            styles.modalContent,
                            { height: '90%', borderTopLeftRadius: 20, borderTopRightRadius: 20 }
                        ]}>
                            <View style={styles.modalHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <ThemedText style={styles.modalTitle}>{activeAdvancedModal}</ThemedText>
                                    {isSyncing ? (
                                        <RN.ActivityIndicator size="small" color="#aa48b7" />
                                    ) : (
                                        <View style={styles.savedBadge}>
                                            <Ionicons name="checkmark-circle" size={14} color="#34A853" />
                                            <Text style={styles.savedText}>Saved</Text>
                                        </View>
                                    )}
                                </View>
                                <TouchableOpacity onPress={() => setActiveAdvancedModal(null)}>
                                    <View style={styles.closeButtonContainer}>
                                        <Ionicons name="close" size={24} color="#fff" />
                                    </View>
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
                                {activeAdvancedModal === 'Primary Greeting' && (
                                    <View style={styles.modalSection}>
                                        <ThemedText style={styles.modalSectionLabel}>Greeting Text</ThemedText>
                                        <TextInput
                                            style={styles.modalTextArea}
                                            placeholder="Enter the first thing your coach says..."
                                            placeholderTextColor="#444"
                                            multiline
                                            value={primaryGreeting}
                                            onChangeText={(txt) => {
                                                setPrimaryGreeting(txt);
                                                handleAutoSave();
                                            }}
                                        />
                                    </View>
                                )}

                                {activeAdvancedModal === 'Knowledge Base' && (
                                    <>
                                        <View style={styles.modalSection}>
                                            <ThemedText style={styles.modalSectionLabel}>Text Records</ThemedText>
                                            <TextInput
                                                style={styles.modalTextArea}
                                                placeholder="Paste or write key facts, rules, or data..."
                                                placeholderTextColor="#444"
                                                multiline
                                                value={knowledgeBaseText}
                                                onChangeText={(txt) => {
                                                    setKnowledgeBaseText(txt);
                                                    handleAutoSave();
                                                }}
                                            />
                                        </View>
                                        <View style={styles.infoBox}>
                                            <Ionicons name="information-circle-outline" size={20} color="#aa48b7" />
                                            <ThemedText style={styles.infoText}>
                                                Paste key facts, rules, or data here. This information will form the core of your AI's knowledge base.
                                            </ThemedText>
                                        </View>

                                        <View style={{ paddingBottom: 40 }}>
                                            <ThemedText style={styles.guideTitle}>What to include?</ThemedText>

                                            {[
                                                "Personal core values and philosophy",
                                                "Specific methodologies or frameworks you use",
                                                "Frequently asked questions (FAQs)",
                                                "Standard operating procedures (SOPs)",
                                                "Writing style preferences and common phrases",
                                                "Key life achievements or milestones"
                                            ].map((item, index) => (
                                                <View key={index} style={styles.guideItem}>
                                                    <Text style={styles.guideBullet}>•</Text>
                                                    <ThemedText style={styles.guideText}>{item}</ThemedText>
                                                </View>
                                            ))}

                                            <TouchableOpacity
                                                style={[styles.infoBox, { marginTop: 24 }]}
                                                onPress={() => RN.Linking.openURL('https://docs.google.com/document/d/1oqN4wLYgDMWfUolHtkMOS1SMn1U7FccTytQ-X0Faa3g/edit?usp=sharing')}
                                            >
                                                <Ionicons name="document-text-outline" size={20} color="#aa48b7" />
                                                <ThemedText style={styles.infoText}>
                                                    See an <Text style={styles.exampleLink}>Example Knowledge Base</Text> to understand the ideal formatting.
                                                </ThemedText>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}



                                {activeAdvancedModal === 'Who Am I?' && (
                                    <View style={styles.modalSection}>
                                        <ThemedText style={styles.modalSectionLabel}>Bio & Identity</ThemedText>
                                        <TextInput
                                            style={styles.modalTextArea}
                                            placeholder="Define this entity's origin story and ultimate purpose..."
                                            placeholderTextColor="#444"
                                            multiline
                                            value={whoAmI}
                                            onChangeText={(txt) => {
                                                setWhoAmI(txt);
                                                handleAutoSave();
                                            }}
                                        />
                                    </View>
                                )}

                                {activeAdvancedModal === 'Social Links' && (
                                    <View style={styles.modalSection}>
                                        <ThemedText style={styles.modalSectionLabel}>Connect Social Media</ThemedText>

                                        <View style={styles.socialInputRow}>
                                            <Ionicons name="logo-instagram" size={24} color="#E4405F" style={styles.socialIcon} />
                                            <View style={[styles.modalInputWrapper, { flex: 1 }]}>
                                                <TextInput
                                                    style={styles.modalInput}
                                                    placeholder="Instagram Username"
                                                    placeholderTextColor="#444"
                                                    value={socialLinks.instagram}
                                                    onChangeText={(txt) => {
                                                        setSocialLinks(prev => ({ ...prev, instagram: txt }));
                                                        handleAutoSave();
                                                    }}
                                                />
                                            </View>
                                        </View>

                                        <View style={styles.socialInputRow}>
                                            <Ionicons name="logo-twitter" size={24} color="#1DA1F2" style={styles.socialIcon} />
                                            <View style={[styles.modalInputWrapper, { flex: 1 }]}>
                                                <TextInput
                                                    style={styles.modalInput}
                                                    placeholder="X / Twitter Username"
                                                    placeholderTextColor="#444"
                                                    value={socialLinks.twitter}
                                                    onChangeText={(txt) => {
                                                        setSocialLinks(prev => ({ ...prev, twitter: txt }));
                                                        handleAutoSave();
                                                    }}
                                                />
                                            </View>
                                        </View>

                                        <View style={styles.socialInputRow}>
                                            <Ionicons name="logo-linkedin" size={24} color="#0077B5" style={styles.socialIcon} />
                                            <View style={[styles.modalInputWrapper, { flex: 1 }]}>
                                                <TextInput
                                                    style={styles.modalInput}
                                                    placeholder="LinkedIn URL"
                                                    placeholderTextColor="#444"
                                                    value={socialLinks.linkedin}
                                                    onChangeText={(txt) => {
                                                        setSocialLinks(prev => ({ ...prev, linkedin: txt }));
                                                        handleAutoSave();
                                                    }}
                                                />
                                            </View>
                                        </View>

                                        <View style={styles.socialInputRow}>
                                            <Ionicons name="logo-tiktok" size={24} color="#fff" style={styles.socialIcon} />
                                            <View style={[styles.modalInputWrapper, { flex: 1 }]}>
                                                <TextInput
                                                    style={styles.modalInput}
                                                    placeholder="TikTok Username"
                                                    placeholderTextColor="#444"
                                                    value={socialLinks.tiktok}
                                                    onChangeText={(txt) => {
                                                        setSocialLinks(prev => ({ ...prev, tiktok: txt }));
                                                        handleAutoSave();
                                                    }}
                                                />
                                            </View>
                                        </View>

                                        <View style={styles.socialInputRow}>
                                            <Ionicons name="logo-youtube" size={24} color="#FF0000" style={styles.socialIcon} />
                                            <View style={[styles.modalInputWrapper, { flex: 1 }]}>
                                                <TextInput
                                                    style={styles.modalInput}
                                                    placeholder="YouTube Channel URL"
                                                    placeholderTextColor="#444"
                                                    value={socialLinks.youtube}
                                                    onChangeText={(txt) => {
                                                        setSocialLinks(prev => ({ ...prev, youtube: txt }));
                                                        handleAutoSave();
                                                    }}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            <AuthModal
                isVisible={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                mode="signup"
            />
        </SafeAreaView>
    );
}

function PersonalityCard({ label, value, icon, error, onPress }: { label: string, value: string | null, icon: any, error?: boolean, onPress: () => void }) {
    return (
        <TouchableOpacity style={[styles.card, error && styles.errorBorder]} onPress={onPress}>
            <View style={styles.cardInfo}>
                <ThemedText style={[styles.cardLabel, error && { color: '#ff4444' }]}>{label}</ThemedText>
                <ThemedText style={[styles.cardValue, !value && { color: '#444' }]}>{value || "Select"}</ThemedText>
            </View>
            <Ionicons name={icon} size={28} color={error ? '#ff4444' : "#aa48b7"} style={styles.cardIcon} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    headerTextContainer: {
        alignItems: 'center',
        marginVertical: 10,
    },
    mainTitle: {
        fontSize: 32,
        fontFamily: Fonts.bold,
        color: '#fff',
        textAlign: 'center',
        paddingTop: 10,
    },
    descriptionText: {
        fontSize: 14,
        color: '#888',
        fontFamily: Fonts.body,
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 20,
        marginTop: 8,
    },
    stepIndicatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 24,
    },
    stepWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stepCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    activeStepCircle: {
        backgroundColor: '#aa48b7',
        borderColor: '#aa48b7',
    },
    stepLine: {
        width: 20,
        height: 2,
        backgroundColor: '#333',
        marginHorizontal: 4,
    },
    activeStepLine: {
        backgroundColor: '#aa48b7',
    },
    typeSelectorContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32,
        paddingHorizontal: 4,
    },
    typeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#151515',
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#333',
        gap: 8,
    },
    activeTypeButton: {
        backgroundColor: '#aa48b7',
        borderColor: '#aa48b7',
    },
    typeButtonText: {
        fontSize: 14,
        color: '#666',
        fontFamily: Fonts.bold,
    },
    activeTypeButtonText: {
        color: '#fff',
    },
    imageUploadSection: {
        marginBottom: 24,
        alignItems: 'center',
    },
    imagePlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#151515',
        borderWidth: 2,
        borderColor: '#aa48b7',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    imagePlaceholderText: {
        fontSize: 10,
        color: '#666',
        marginTop: 8,
        fontFamily: Fonts.body,
    },
    capturedImage: {
        width: '100%',
        height: '100%',
        borderRadius: 60,
    },
    inputSection: {
        marginBottom: 24,
    },
    sectionLabel: {
        fontSize: 18,
        fontFamily: Fonts.bold,
        color: '#fff',
        textAlign: 'center',
        marginBottom: 12,
    },
    sectionSubLabel: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        textTransform: 'lowercase',
        marginTop: -8,
        marginBottom: 16,
    },
    inputWrapper: {
        backgroundColor: '#151515',
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 12,
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    textInput: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontFamily: Fonts.body,
    },
    horizontalScrollContainer: {
        paddingHorizontal: 10,
        alignItems: 'center',
        height: 60,
    },
    agePickerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        paddingVertical: 10,
    },
    ageItem: {
        paddingHorizontal: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeAgeItem: {
        backgroundColor: '#aa48b7',
        borderRadius: 8,
        height: 44,
        paddingHorizontal: 20,
    },
    ageText: {
        color: '#444',
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
    activeAgeText: {
        color: '#fff',
        fontSize: 20,
    },
    gridSection: {
        marginBottom: 24,
    },
    grid: {
        gap: 12,
    },
    gridRow: {
        flexDirection: 'row',
        gap: 12,
    },
    card: {
        flex: 1,
        backgroundColor: '#151515',
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 80,
    },
    cardInfo: {
        flex: 1,
    },
    cardLabel: {
        fontSize: 12,
        color: '#fff',
        fontFamily: Fonts.body,
    },
    cardValue: {
        fontSize: 16,
        color: '#fff',
        fontFamily: Fonts.bold,
        marginTop: 4,
    },
    cardIcon: {
        opacity: 0.8,
    },
    accordionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#222',
        marginBottom: 16,
    },
    accordionTitle: {
        fontSize: 14,
        color: '#444',
        fontFamily: Fonts.body,
    },
    advancedItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#151515',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#222',
    },
    advancedLabel: {
        fontSize: 14,
        color: '#fff',
        fontFamily: Fonts.bold,
    },
    advancedSubLabel: {
        fontSize: 12,
        color: '#666',
        fontFamily: Fonts.body,
    },
    aiButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    actionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderColor: '#222',
    },
    actionLabel: {
        fontSize: 16,
        color: '#fff',
        fontFamily: Fonts.body,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        paddingHorizontal: 20,
        paddingBottom: 30,
        paddingTop: 10,
        backgroundColor: 'transparent',
    },
    nextButton: {
        borderRadius: 25,
        overflow: 'hidden',
    },
    nextGradient: {
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    errorBorder: {
        borderColor: '#ff4444',
        borderWidth: 1.5,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    nextText: {
        color: '#fff',
        fontSize: 18,
        fontFamily: Fonts.bold,
    },
    creditDeductionText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontFamily: Fonts.regular,
        marginTop: -2,
    },
    creditBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 12,
    },
    creditText: {
        color: '#fff',
        fontSize: 14,
        fontFamily: Fonts.bold,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#111',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        height: '60%',
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontFamily: Fonts.bold,
        color: '#fff',
    },
    pickerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderColor: '#222',
    },
    pickerItemText: {
        fontSize: 16,
        color: '#ccc',
        fontFamily: Fonts.body,
    },
    modalSection: {
        marginBottom: 24,
    },
    modalSectionLabel: {
        fontSize: 14,
        fontFamily: Fonts.bold,
        color: '#888',
        marginBottom: 10,
        textTransform: 'uppercase',
    },
    modalTextArea: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        fontSize: 16,
        fontFamily: Fonts.body,
        height: 150,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#333',
    },
    modalInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 52,
        borderWidth: 1,
        borderColor: '#333',
    },
    modalInput: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        fontFamily: Fonts.body,
    },
    infoBox: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: 'rgba(170, 72, 183, 0.1)',
        borderRadius: 12,
        marginTop: 12,
        gap: 12,
        borderWidth: 0.5,
        borderColor: 'rgba(170, 72, 183, 0.3)',
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: '#aaa',
        lineHeight: 18,
        fontFamily: Fonts.body,
    },
    saveButton: {
        marginTop: 10,
        marginBottom: 30,
        borderRadius: 25,
        overflow: 'hidden',
    },
    saveButtonGradient: {
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
    googleLinkButton: {
        backgroundColor: '#4285F4',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 50,
        borderRadius: 12,
        marginTop: 10,
    },
    googleLinkButtonActive: {
        backgroundColor: '#34A853',
    },
    googleLinkText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
    socialInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    socialIcon: {
        width: 32,
        marginRight: 12,
    },
    savedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(52, 168, 83, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    savedText: {
        color: '#34A853',
        fontSize: 10,
        fontFamily: Fonts.bold,
    },
    closeButtonContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    exampleLink: {
        color: '#aa48b7',
        textDecorationLine: 'underline',
        fontFamily: Fonts.bold,
    },
    guideTitle: {
        fontSize: 15,
        fontFamily: Fonts.bold,
        color: '#fff',
        marginTop: 24,
        marginBottom: 12,
    },
    guideItem: {
        flexDirection: 'row',
        marginBottom: 8,
        paddingRight: 10,
    },
    guideBullet: {
        color: '#aa48b7',
        fontSize: 16,
        marginRight: 10,
        marginTop: -1,
    },
    guideText: {
        fontSize: 13,
        color: '#999',
        fontFamily: Fonts.body,
        lineHeight: 18,
    },
});
