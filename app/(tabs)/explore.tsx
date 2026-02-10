import CharacterCard from '@/components/CharacterCard';
import Header from '@/components/Header';
import OnboardingOverlay from '@/components/OnboardingOverlay';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/Colors';
import { Fonts } from '@/constants/Fonts';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const cardWidth = (width - 28) / 2;

const SkeletonCard = ({ themeColors }: { themeColors: any }) => {
  const opacity = useSharedValue(0.3);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 1000 }),
        withTiming(0.6, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={{
      width: cardWidth,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: themeColors.border,
      padding: 12,
      backgroundColor: themeColors.card // or transparent if card has bg
    }}>
      {/* Header Row: Avatar + Name */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <Animated.View style={[{ width: 32, height: 32, borderRadius: 16, backgroundColor: themeColors.border, marginRight: 8 }, animatedStyle]} />
        <Animated.View style={[{ height: 16, width: '60%', backgroundColor: themeColors.border, borderRadius: 4 }, animatedStyle]} />
      </View>

      {/* Specialization */}
      <Animated.View style={[{ height: 12, width: '40%', backgroundColor: themeColors.border, marginBottom: 8, borderRadius: 2 }, animatedStyle]} />

      {/* Description lines */}
      <Animated.View style={[{ height: 12, width: '100%', backgroundColor: themeColors.border, marginBottom: 4, borderRadius: 2 }, animatedStyle]} />
      <Animated.View style={[{ height: 12, width: '80%', backgroundColor: themeColors.border, marginBottom: 16, borderRadius: 2 }, animatedStyle]} />

      {/* Buttons Row */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 'auto' }}>
        <Animated.View style={[{ flex: 1, height: 32, backgroundColor: themeColors.border, borderRadius: 4 }, animatedStyle]} />
        <Animated.View style={[{ flex: 1, height: 32, backgroundColor: themeColors.border, borderRadius: 4 }, animatedStyle]} />
      </View>
    </View>
  );
};

const SORT_OPTIONS = ["Latest", "Popular", "Chats"];

const FILTER_ATTRIBUTES = [
  "Sort",
  "Talk Style",
  "Temperament",
  "Focus Area",
  "Approach",
  "Insight Level",
  "Presence"
];

const FILTER_OPTIONS: Record<string, string[]> = {
  "Specialization": [
    "Business Strategy", "Life Coaching", "Software Engineering",
    "Fitness & Nutrition", "Relationship Advisor", "Mental Health",
    "Financial Planning", "Public Speaking", "Creative Arts"
  ],
  "Talk Style": ["Socratic", "Direct", "Compassionate", "Casual", "Academic", "Humorous"],
  "Temperament": ["Stoic", "Enthusiastic", "Patient", "Firm", "Calm", "Provocative"],
  "Focus Area": ["Growth", "Stability", "Discipline", "Creativity", "Mindfulness", "Performance"],
  "Approach": ["Pragmatic", "Intuitive", "Analytical", "Holistic", "Systematic", "Experimental"],
  "Insight Level": ["Meta-Cognitive", "Philosophical", "Practical", "Deep-Dive", "Summarized"],
  "Presence": ["Authority", "Co-Pilot", "Shadow", "Inspirational", "Mentor", "Challenger"]
};
const PAGE_SIZE = 8;

const ExploreHeader = ({
  searchQuery,
  setSearchQuery,
  handleSearch,
  activeSpecialization,
  setShowSpecPicker,
  activeSort,
  setShowSortPicker,
  activeAttribute,
  setActiveAttribute,
  activeFilterValue,
  setActiveFilterValue,
  setShowAttributePicker
}: any) => {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];

  return (
    <View style={{ backgroundColor: themeColors.card, paddingBottom: 12, marginBottom: 16 }}>
      <Header />

      {/* Merged Search & Specialization Bar */}
      <ThemedView style={[styles.searchContainer, { backgroundColor: themeColors.background }]}>
        <Ionicons name="search" size={18} color={themeColors.icon} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: themeColors.text }]}
          placeholder="Search coaches..."
          placeholderTextColor={themeColors.placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />

        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginRight: 8 }}>
            <Ionicons name="close-circle" size={18} color={themeColors.icon} />
          </TouchableOpacity>
        )}

        {/* Vertical Divider */}
        <View style={{ width: 1, height: 20, backgroundColor: themeColors.border, marginRight: 12 }} />

        {/* Specialization Dropdown */}
        <TouchableOpacity
          onPress={() => setShowSpecPicker(true)}
          style={styles.inlineSpecButton}
        >
          <ThemedText style={[styles.inlineSpecText, { color: themeColors.text }]}>
            {activeSpecialization === 'All' ? 'All' : (activeSpecialization.length > 8 ? activeSpecialization.slice(0, 8) + '..' : activeSpecialization)}
          </ThemedText>
          <Ionicons name="chevron-down" size={12} color={themeColors.icon} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </ThemedView>

      {/* Filter Chips - Single Single Row */}
      <View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={{ paddingRight: 20 }}
          data={FILTER_ATTRIBUTES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const isActive = (item === 'Sort' && activeSort !== 'Latest') ||
              (item !== 'Sort' && activeAttribute === item && activeFilterValue !== null);

            return (
              <TouchableOpacity
                style={[
                  styles.compactPill,
                  { backgroundColor: isActive ? themeColors.text : themeColors.background }
                ]}
                onPress={() => {
                  if (item === 'Sort') {
                    setShowSortPicker(true);
                  } else {
                    setActiveAttribute(item);
                    setShowAttributePicker(true);
                  }
                }}
              >
                <ThemedText style={[
                  styles.compactPillText,
                  { color: isActive ? themeColors.background : themeColors.icon }
                ]}>
                  {item === 'Sort' && activeSort !== 'Latest' ? activeSort : item}
                </ThemedText>
                <Ionicons
                  name="chevron-down"
                  size={10}
                  color={isActive ? themeColors.background : themeColors.icon}
                  style={{ marginLeft: 6 }}
                />
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Active Filter Indicator - Minimalist Tag */}
      {activeFilterValue && (
        <View style={{ paddingHorizontal: 16, marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => setActiveFilterValue(null)}
            style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: themeColors.card, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}
          >
            <ThemedText style={{ fontSize: 12, color: themeColors.text, marginRight: 4 }}>
              {activeAttribute}: {activeFilterValue}
            </ThemedText>
            <Ionicons name="close" size={12} color={themeColors.icon} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default function ExploreScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? 'light'];
  const [coaches, setCoaches] = useState<any[]>([]);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSpecialization, setActiveSpecialization] = useState('All');
  const [showSpecPicker, setShowSpecPicker] = useState(false);

  const [activeSort, setActiveSort] = useState('Latest');
  const [showSortPicker, setShowSortPicker] = useState(false);
  const [showAttributePicker, setShowAttributePicker] = useState(false);

  const [activeAttribute, setActiveAttribute] = useState<string | null>(null);
  const [activeFilterValue, setActiveFilterValue] = useState<string | null>(null);

  const fetchCoaches = useCallback(async (isReset = false, isPullToRefresh = false) => {
    if (loading || (loadingMore && !isReset && !isPullToRefresh)) return;

    if (isPullToRefresh) {
      setRefreshing(true);
      // Do not clear coaches to keep the list visible while refreshing
    } else if (isReset) {
      setLoading(true);
      setCoaches([]); // Clear list to trigger skeleton view for hard resets (filters/search)
    } else {
      setLoadingMore(true);
    }

    try {
      let query: any = firestore().collection('coaches');

      // 1. Specialization Filter (Primary)
      if (activeSpecialization !== 'All') {
        query = query.where('specialization', '==', activeSpecialization);
      }

      // 2. Attribute Filters
      if (activeAttribute && activeFilterValue) {
        query = query.where(`essence.${activeAttribute}`, '==', activeFilterValue);
      }

      // 3. Search OR Sort
      if (searchQuery.trim()) {
        const searchVal = searchQuery.trim();
        query = query.where('name', '>=', searchVal)
          .where('name', '<=', searchVal + '\uf8ff')
          .orderBy('name');
      } else {
        // Apply Sort ONLY if not searching
        switch (activeSort) {
          case 'Popular':
            query = query.orderBy('likes', 'desc');
            break;
          case 'Chats':
            query = query.orderBy('chatCount', 'desc');
            break;
          default: // Latest
            query = query.orderBy('createdAt', 'desc');
        }
      }

      query = query.limit(PAGE_SIZE);

      // If resetting or refreshing, we start from top, so NO startAfter
      if (!isReset && !isPullToRefresh && lastVisible) {
        query = query.startAfter(lastVisible);
      }

      const snapshot = await query.get();

      const fetchedCoaches = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }));

      if (isReset || isPullToRefresh) {
        setCoaches(fetchedCoaches);
      } else {
        setCoaches(prev => {
          const existingIds = new Set(prev.map((c: any) => c.id));
          const uniqueNew = fetchedCoaches.filter((c: any) => !existingIds.has(c.id));
          return [...prev, ...uniqueNew];
        });
      }

      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching coaches:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
      setIsInitialLoad(false);
    }
  }, [lastVisible, loading, loadingMore, coaches.length, activeSpecialization, activeAttribute, activeFilterValue, activeSort, searchQuery]);

  const handleSearch = () => {
    setLastVisible(null);
    setHasMore(true);
    // Standard reset
    fetchCoaches(true);
  };

  // Trigger refresh when filters change
  useEffect(() => {
    setLastVisible(null);
    setHasMore(true);
    fetchCoaches(true);
  }, [activeSpecialization, activeFilterValue, activeSort]);

  // Auto-refresh when search is cleared
  useEffect(() => {
    if (searchQuery === '') {
      setLastVisible(null);
      setHasMore(true);
      fetchCoaches(true);
    }
  }, [searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    setLastVisible(null);
    setHasMore(true);
    fetchCoaches(true, true);
  };

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 40 }} />;
    return (
      <View style={styles.loaderFooter}>
        <ActivityIndicator size="small" color={themeColors.text} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={48} color={themeColors.placeholder} style={{ marginBottom: 16 }} />
        <ThemedText style={[styles.emptyText, { color: themeColors.text }]}>No coaches found matching your criteria.</ThemedText>
        <ThemedText style={{ color: themeColors.icon, marginTop: 8, textAlign: 'center' }}>
          Try adjusting your filters or search terms.
        </ThemedText>
      </View>
    );
  };

  const headerElement = React.useMemo(() => (
    <ExploreHeader
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      handleSearch={handleSearch}
      activeSpecialization={activeSpecialization}
      setShowSpecPicker={setShowSpecPicker}
      activeSort={activeSort}
      setShowSortPicker={setShowSortPicker}
      activeAttribute={activeAttribute}
      setActiveAttribute={setActiveAttribute}
      activeFilterValue={activeFilterValue}
      setActiveFilterValue={setActiveFilterValue}
      setShowAttributePicker={setShowAttributePicker}
    />
  ), [searchQuery, activeSpecialization, activeSort, activeAttribute, activeFilterValue]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <OnboardingOverlay />


      {/* Main List - Handles both Content and Loading/Empty states to keep Header visible */}
      <FlatList
        data={((loading || isInitialLoad) && coaches.length === 0) ? [1, 2, 3, 4, 5, 6] : coaches}
        numColumns={2}
        keyExtractor={(item) => typeof item === 'number' ? `skeleton-${item}` : item.id}
        ListHeaderComponent={headerElement}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={(!loading && !isInitialLoad) ? renderEmpty : null}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.flatListContent}
        onEndReached={() => {
          if (hasMore && !loadingMore && !loading && coaches.length > 0) {
            fetchCoaches();
          }
        }}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={onRefresh}

        renderItem={({ item }) => {
          if (typeof item === 'number') {
            return <SkeletonCard themeColors={themeColors} />;
          }
          return (
            <CharacterCard
              name={item.name}
              specialization={item.specialization}
              description={item.advanced?.whoAmI || ''}
              likes={item.stats?.likes ?? (Array.isArray(item.likedBy) ? item.likedBy.length : (item.likes || 0))}
              followers={item.stats?.follows ?? (Array.isArray(item.follows) ? item.follows.length : (item.follows || item.followers || 0))}
              comments={item.stats?.chats ?? (item.chatCount || 0)}
              imageUrl={item.portraitUrl || 'https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=3000&auto=format&fit=crop'}
              isVerified={item.isVerified}
              width={cardWidth}
              height={cardWidth * 1.6}
              onPress={() => router.push({
                pathname: '/coach/[id]',
                params: {
                  id: item.id,
                  initialName: item.name,
                  initialPortrait: item.portraitUrl,
                  initialSpec: item.specialization,
                  initialVerified: item.isVerified ? 'true' : 'false'
                }
              })}
              onMessagePress={() => {
                if (!user) {
                  Alert.alert('Sign In', 'Please sign in to chat with this coach.');
                  return;
                }
                router.push({
                  pathname: '/message/[id]',
                  params: {
                    id: item.id,
                    initialName: item.name,
                    initialPortrait: item.portraitUrl
                  }
                });
              }}
            />
          );
        }}
      />

      {/* Sort Picker Modal */}
      <Modal visible={showSortPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortPicker(false)}
        >
          <View style={[styles.sortPickerContent, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <ThemedText style={[styles.modalTitle, { color: themeColors.text }]}>Sort By</ThemedText>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.sortOption, { borderBottomColor: themeColors.border }]}
                onPress={() => {
                  setActiveSort(option);
                  setShowSortPicker(false);
                }}
              >
                <ThemedText style={[styles.sortOptionText, { color: activeSort === option ? themeColors.text : themeColors.icon, fontWeight: activeSort === option ? 'bold' : 'normal' }]}>
                  {option}
                </ThemedText>
                {activeSort === option && <Ionicons name="checkmark" size={20} color={themeColors.text} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Specialization Picker Modal */}
      <Modal visible={showSpecPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSpecPicker(false)}
        >
          <View style={[styles.sortPickerContent, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <ThemedText style={[styles.modalTitle, { color: themeColors.text }]}>Specialization</ThemedText>
            <FlatList
              data={['All', ...FILTER_OPTIONS['Specialization']]}
              keyExtractor={(item) => item}
              style={{ maxHeight: 300 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.sortOption, { borderBottomColor: themeColors.border }]}
                  onPress={() => {
                    setActiveSpecialization(item);
                    setShowSpecPicker(false);
                  }}
                >
                  <ThemedText style={[styles.sortOptionText, { color: activeSpecialization === item ? themeColors.text : themeColors.icon, fontWeight: activeSpecialization === item ? 'bold' : 'normal' }]}>
                    {item}
                  </ThemedText>
                  {activeSpecialization === item && <Ionicons name="checkmark" size={20} color={themeColors.text} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Attribute Picker Modal */}
      <Modal visible={showAttributePicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAttributePicker(false)}
        >
          <View style={[styles.sortPickerContent, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <ThemedText style={[styles.modalTitle, { color: themeColors.text }]}>{activeAttribute}</ThemedText>
            <FlatList
              data={activeAttribute ? FILTER_OPTIONS[activeAttribute] : []}
              keyExtractor={(item) => item}
              style={{ maxHeight: 300 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.sortOption, { borderBottomColor: themeColors.border }]}
                  onPress={() => {
                    setActiveFilterValue(item);
                    setShowAttributePicker(false);
                  }}
                >
                  <ThemedText style={[styles.sortOptionText, { color: activeFilterValue === item ? themeColors.text : themeColors.icon, fontWeight: activeFilterValue === item ? 'bold' : 'normal' }]}>
                    {item}
                  </ThemedText>
                  {activeFilterValue === item && <Ionicons name="checkmark" size={20} color={themeColors.text} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a', // Or strictly themeColors.background via inline style
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 25,
    borderWidth: 0,
    // Add subtle shadow if needed, but keeping flat for now as requested
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts.body,
  },
  inlineSpecButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  inlineSpecText: {
    fontSize: 14,
    fontFamily: Fonts.body,
    fontWeight: '500',
  },
  categoriesScroll: {
    marginTop: 16,
    paddingLeft: 16,
    flexDirection: 'row',
    marginBottom: 8,
  },
  compactPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactPillText: {
    fontSize: 14,
    fontFamily: Fonts.body,
    fontWeight: '500',
  },
  // ... other styles maintained below if needed, or simplified
  loaderFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  subCategoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
  },
  subCategoryText: {
    fontSize: 13,
    fontFamily: Fonts.body,
  },
  // activeSubCategory styles removed as they are dynamic now mostly, 
  // but kept for compatibility if referenced elsewhere? No, I updated referencing.

  centeredLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flatListContent: {
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
    paddingHorizontal: 10,
    gap: 8,
    marginBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    paddingTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: Fonts.body,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortPickerContent: {
    width: '80%',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    marginBottom: 20,
    textAlign: 'center',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  sortOptionText: {
    fontSize: 18,
    fontFamily: Fonts.body,
  },
});
