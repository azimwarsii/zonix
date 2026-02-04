import Header from '@/components/Header';
import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/Fonts';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    Dimensions,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const STEPS = [
    { icon: 'person', id: 1 },
    { icon: 'card', id: 2 },
    { icon: 'happy', id: 3 },
    { icon: 'body', id: 4 },
    { icon: 'document-text', id: 5 },
    { icon: 'image', id: 6 },
];

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
    const [currentStep, setCurrentStep] = useState(1);
    const [creationType, setCreationType] = useState<'clone' | 'imaginative'>('clone');
    const [name, setName] = useState('');
    const [experience, setExperience] = useState(0);
    const [expertise, setExpertise] = useState(EXPERTISE_OPTIONS[0]);
    const [showExpertisePicker, setShowExpertisePicker] = useState(false);

    // Essence states
    const [essences, setEssences] = useState({
        "Talk Style": "Socratic",
        "Temperament": "Stoic",
        "Focus Area": "Growth",
        "Approach": "Pragmatic",
        "Insight Level": "Meta-Cognitive",
        "Presence": "Authority"
    });

    const [activeEssencePicker, setActiveEssencePicker] = useState<string | null>(null);

    const handleEssenceSelect = (label: string, value: string) => {
        setEssences(prev => ({ ...prev, [label]: value }));
        setActiveEssencePicker(null);
    };


    const experienceRange = Array.from({ length: 51 }, (_, i) => i);

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
                        <TouchableOpacity style={styles.imagePlaceholder}>
                            <Ionicons name="camera-outline" size={40} color="#aa48b7" />
                            <ThemedText style={styles.imagePlaceholderText}>Upload your portrait</ThemedText>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Character Name Section */}
                <View style={styles.inputSection}>
                    <ThemedText style={styles.sectionLabel}>{creationType === 'clone' ? 'Your Name' : 'Coach Identity'}</ThemedText>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.textInput}
                            placeholder={creationType === 'clone' ? "Enter your full name" : "e.g. Master Strategist"}
                            placeholderTextColor="#666"
                            value={name}
                            onChangeText={setName}
                        />
                    </View>
                </View>

                {/* Expertise Dropdown */}
                <View style={styles.inputSection}>
                    <ThemedText style={styles.sectionLabel}>Specialization</ThemedText>
                    <TouchableOpacity
                        style={styles.inputWrapper}
                        onPress={() => setShowExpertisePicker(true)}
                    >
                        <ThemedText style={[styles.textInput, !expertise && { color: '#666' }]}>
                            {expertise || "Select Expertise"}
                        </ThemedText>
                        <Ionicons name="chevron-down" size={20} color="#aa48b7" />
                    </TouchableOpacity>
                </View>

                {/* Experience Section */}
                <View style={styles.inputSection}>
                    <ThemedText style={styles.sectionLabel}>Years of Expertise</ThemedText>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.horizontalScrollContainer}
                    >
                        {experienceRange.map((val) => (
                            <TouchableOpacity
                                key={val}
                                onPress={() => setExperience(val)}
                                style={[styles.ageItem, val === experience && styles.activeAgeItem]}
                            >
                                <Text style={[styles.ageText, val === experience && styles.activeAgeText]}>
                                    {val}+
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
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
                                onPress={() => setActiveEssencePicker("Talk Style")}
                            />
                            <PersonalityCard
                                label="Temperament"
                                value={essences["Temperament"]}
                                icon="shield-half-outline"
                                onPress={() => setActiveEssencePicker("Temperament")}
                            />
                        </View>
                        <View style={styles.gridRow}>
                            <PersonalityCard
                                label="Focus Area"
                                value={essences["Focus Area"]}
                                icon="trending-up-outline"
                                onPress={() => setActiveEssencePicker("Focus Area")}
                            />
                            <PersonalityCard
                                label="Approach"
                                value={essences["Approach"]}
                                icon="construct-outline"
                                onPress={() => setActiveEssencePicker("Approach")}
                            />
                        </View>
                        <View style={styles.gridRow}>
                            <PersonalityCard
                                label="Insight Level"
                                value={essences["Insight Level"]}
                                icon="eye-outline"
                                onPress={() => setActiveEssencePicker("Insight Level")}
                            />
                            <PersonalityCard
                                label="Presence"
                                value={essences["Presence"]}
                                icon="ribbon-outline"
                                onPress={() => setActiveEssencePicker("Presence")}
                            />
                        </View>
                    </View>
                </View>

                {/* Advanced Details Accordion Placeholder */}
                <TouchableOpacity style={styles.accordionHeader}>
                    <ThemedText style={styles.accordionTitle}>Advanced Details (optional)</ThemedText>
                    <Ionicons name="chevron-up" size={20} color="#666" />
                </TouchableOpacity>

                {/* Autocomplete Row */}
                <View style={styles.advancedItem}>
                    <View style={{ flex: 1 }}>
                        <ThemedText style={styles.advancedLabel}>Autocomplete With AI</ThemedText>
                        <ThemedText style={styles.advancedSubLabel}>Let our AI complete empty fields</ThemedText>
                    </View>
                    <View style={styles.aiButton}>
                        <Ionicons name="sparkles" size={18} color="#666" />
                    </View>
                </View>

                {/* Action Items */}
                <TouchableOpacity style={styles.actionItem}>
                    <ThemedText style={styles.actionLabel}>Knowledge Base & Experience</ThemedText>
                    <Ionicons name="pencil-sharp" size={18} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionItem}>
                    <ThemedText style={styles.actionLabel}>Primary Greeting</ThemedText>
                    <Ionicons name="pencil-sharp" size={18} color="#666" />
                </TouchableOpacity>
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.nextButton}>
                    <LinearGradient
                        colors={['#aa48b7', '#4a148c']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.gradientButton}
                    >
                        <View style={styles.buttonContent}>
                            <ThemedText style={styles.nextText}>Next</ThemedText>
                            <View style={styles.creditBadge}>
                                <ThemedText style={styles.creditText}>5</ThemedText>
                                <Ionicons name="chatbubble" size={12} color="#fff" style={{ marginLeft: 4 }} />
                            </View>
                        </View>
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
        </SafeAreaView>
    );
}

function PersonalityCard({ label, value, icon, onPress }: { label: string, value: string, icon: any, onPress: () => void }) {
    return (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            <View style={styles.cardInfo}>
                <ThemedText style={styles.cardLabel}>{label}</ThemedText>
                <ThemedText style={styles.cardValue}>{value}</ThemedText>
            </View>
            <Ionicons name={icon} size={28} color="#aa48b7" style={styles.cardIcon} />
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
        color: '#666',
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
        color: '#888',
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
        color: '#888',
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
    gradientButton: {
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
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
    }
});
