import CharacterCard from '@/components/CharacterCard';
import Header from '@/components/Header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/Fonts';
import { Ionicons } from '@expo/vector-icons';
import firestore from '@react-native-firebase/firestore';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const cardWidth = (width - 28) / 2;

const SORT_OPTIONS = ["Latest", "Popular", "Followers", "Chats"];

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
  setActiveFilterValue
}: any) => (
  <View style={{ backgroundColor: '#0a0a0a' }}>
    <Header />

    {/* Search */}
    <ThemedView style={styles.searchContainer}>
      <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        placeholder="Enter name of the coach"
        placeholderTextColor="#666"
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSubmitEditing={handleSearch}
        returnKeyType="search"
      />
      {searchQuery.length > 0 ? (
        <TouchableOpacity onPress={() => setSearchQuery('')}>
          <Ionicons name="close-circle" size={20} color="#666" />
        </TouchableOpacity>
      ) : null}
    </ThemedView>

    {/* Specialization Filter (Primary) */}
    <View style={{ paddingLeft: 10, marginTop: 12 }}>
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => setShowSpecPicker(true)}
      >
        <ThemedText style={styles.filterLabel}>
          Specialization: <ThemedText style={styles.filterValue}>{activeSpecialization}</ThemedText>
        </ThemedText>
        <Ionicons name="chevron-down" size={16} color="#666" />
      </TouchableOpacity>
    </View>

    {/* Attribute Tabs (Includes Sort as first item) */}
    <View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScroll}
        data={FILTER_ATTRIBUTES}
        keyExtractor={(item) => item}
        renderItem={({ item }) => {
          if (item === 'Sort') {
            return (
              <TouchableOpacity
                style={[styles.categoryPill, { borderColor: '#aa48b7', borderWidth: 1 }]}
                onPress={() => setShowSortPicker(true)}
              >
                <ThemedText style={[styles.categoryText, { color: '#aa48b7' }]}>
                  Sort: <ThemedText style={{ color: '#fff' }}>{activeSort}</ThemedText>
                </ThemedText>
              </TouchableOpacity>
            );
          }
          return (
            <TouchableOpacity
              key={item}
              style={[styles.categoryPill, activeAttribute === item && styles.activeCategory]}
              onPress={() => {
                setActiveAttribute(activeAttribute === item ? null : item);
                setActiveFilterValue(null);
              }}
            >
              <ThemedText style={[styles.categoryText, activeAttribute === item && styles.activeCategoryText]}>
                {item}
              </ThemedText>
            </TouchableOpacity>
          );
        }}
      />
    </View>

    {/* Attribute Values (Sub-filter) */}
    {activeAttribute && (
      <View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.categoriesScroll, { marginTop: 0 }]}
          data={FILTER_OPTIONS[activeAttribute]}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              key={item}
              style={[styles.subCategoryPill, activeFilterValue === item && styles.activeSubCategory]}
              onPress={() => setActiveFilterValue(item === activeFilterValue ? null : item)}
            >
              <ThemedText style={[styles.subCategoryText, activeFilterValue === item && styles.activeSubCategoryText]}>
                {item}
              </ThemedText>
            </TouchableOpacity>
          )}
        />
      </View>
    )}
  </View>
);

export default function ExploreScreen() {
  const router = useRouter();
  const [coaches, setCoaches] = useState<any[]>([]);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSpecialization, setActiveSpecialization] = useState('All');
  const [showSpecPicker, setShowSpecPicker] = useState(false);

  const [activeSort, setActiveSort] = useState('Latest');
  const [showSortPicker, setShowSortPicker] = useState(false);

  const [activeAttribute, setActiveAttribute] = useState<string | null>(null);
  const [activeFilterValue, setActiveFilterValue] = useState<string | null>(null);

  const fetchCoaches = useCallback(async (isRefreshing = false) => {
    if (loading || (loadingMore && !isRefreshing)) return;

    if (isRefreshing) {
      setRefreshing(true);
    } else if (coaches.length === 0) {
      setLoading(true);
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
          case 'Followers':
            query = query.orderBy('followers', 'desc');
            break;
          case 'Chats':
            query = query.orderBy('chatCount', 'desc');
            break;
          default: // Latest
            query = query.orderBy('createdAt', 'desc');
        }
      }

      query = query.limit(PAGE_SIZE);

      if (!isRefreshing && lastVisible) {
        query = query.startAfter(lastVisible);
      }

      const snapshot = await query.get();

      const fetchedCoaches = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      }));

      if (isRefreshing) {
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
    }
  }, [lastVisible, loading, loadingMore, coaches.length, activeSpecialization, activeAttribute, activeFilterValue, activeSort, searchQuery]);

  const handleSearch = () => {
    setLastVisible(null);
    setHasMore(true);
    setCoaches([]);
    fetchCoaches(true);
  };

  // Trigger refresh when filters change (not search text)
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
    setLastVisible(null);
    setHasMore(true);
    fetchCoaches(true);
  };

  /* 
    Memoize the header element to prevent re-renders from dismissing the keyboard.
  */
  const headerElement = React.useMemo(() => (
    <View style={{ backgroundColor: '#0a0a0a' }}>
      <Header />

      {/* Search */}
      <ThemedView style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Enter name of the coach"
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity onPress={() => {
            setSearchQuery('');
            // Optional: Auto-reset list when clearing? 
            // setLastVisible(null); setHasMore(true); fetchCoaches(true);
          }}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}
      </ThemedView>

      {/* Specialization Filter (Primary) */}
      <View style={{ paddingLeft: 10, marginTop: 12 }}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowSpecPicker(true)}
        >
          <ThemedText style={styles.filterLabel}>
            Specialization: <ThemedText style={styles.filterValue}>{activeSpecialization}</ThemedText>
          </ThemedText>
          <Ionicons name="chevron-down" size={16} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Attribute Tabs (Includes Sort as first item) */}
      <View>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          data={FILTER_ATTRIBUTES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            if (item === 'Sort') {
              return (
                <TouchableOpacity
                  style={[styles.categoryPill, { borderColor: '#aa48b7', borderWidth: 1 }]}
                  onPress={() => setShowSortPicker(true)}
                >
                  <ThemedText style={[styles.categoryText, { color: '#aa48b7' }]}>
                    Sort: <ThemedText style={{ color: '#fff' }}>{activeSort}</ThemedText>
                  </ThemedText>

                </TouchableOpacity>
              );
            }
            return (
              <TouchableOpacity
                key={item}
                style={[styles.categoryPill, activeAttribute === item && styles.activeCategory]}
                onPress={() => {
                  setActiveAttribute(activeAttribute === item ? null : item);
                  setActiveFilterValue(null);
                }}
              >
                <ThemedText style={[styles.categoryText, activeAttribute === item && styles.activeCategoryText]}>
                  {item}
                </ThemedText>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Attribute Values (Sub-filter) */}
      {activeAttribute && (
        <View>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.categoriesScroll, { marginTop: 0 }]}
            data={FILTER_OPTIONS[activeAttribute]}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                key={item}
                style={[styles.subCategoryPill, activeFilterValue === item && styles.activeSubCategory]}
                onPress={() => setActiveFilterValue(item === activeFilterValue ? null : item)}
              >
                <ThemedText style={[styles.subCategoryText, activeFilterValue === item && styles.activeSubCategoryText]}>
                  {item}
                </ThemedText>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  ), [searchQuery, activeSpecialization, activeSort, activeAttribute, activeFilterValue]);

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 40 }} />;
    return (
      <View style={styles.loaderFooter}>
        <ActivityIndicator size="small" color="#aa48b7" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="search-outline" size={48} color="#333" style={{ marginBottom: 16 }} />
        <ThemedText style={styles.emptyText}>No coaches found matching your criteria.</ThemedText>
        <ThemedText style={{ color: '#666', marginTop: 8, textAlign: 'center' }}>
          Try adjusting your filters or search terms.
        </ThemedText>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {loading && coaches.length === 0 ? (
        <View style={styles.centeredLoader}>
          <ActivityIndicator size="large" color="#aa48b7" />
        </View>
      ) : (
        <FlatList
          data={coaches}
          numColumns={2}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={headerElement}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.flatListContent}
          onEndReached={() => {
            if (hasMore && !loadingMore && !loading) {
              fetchCoaches();
            }
          }}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#aa48b7"
              colors={["#aa48b7"]}
            />
          }
          renderItem={({ item }) => (
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
              onPress={() => router.push({ pathname: '/coach/[id]', params: { id: item.id } })}
            />
          )}
        />
      )}

      {/* Sort Picker Modal */}
      <Modal visible={showSortPicker} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortPicker(false)}
        >
          <View style={styles.sortPickerContent}>
            <ThemedText style={styles.modalTitle}>Sort By</ThemedText>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.sortOption}
                onPress={() => {
                  setActiveSort(option);
                  setShowSortPicker(false);
                }}
              >
                <ThemedText style={[styles.sortOptionText, activeSort === option && { color: '#aa48b7' }]}>
                  {option}
                </ThemedText>
                {activeSort === option && <Ionicons name="checkmark" size={20} color="#aa48b7" />}
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
          <View style={styles.sortPickerContent}>
            <ThemedText style={styles.modalTitle}>Select Specialization</ThemedText>
            <FlatList
              data={['All', ...FILTER_OPTIONS['Specialization']]}
              keyExtractor={(item) => item}
              style={{ maxHeight: 300 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.sortOption}
                  onPress={() => {
                    setActiveSpecialization(item);
                    setShowSpecPicker(false);
                  }}
                >
                  <ThemedText style={[styles.sortOptionText, activeSpecialization === item && { color: '#aa48b7' }]}>
                    {item}
                  </ThemedText>
                  {activeSpecialization === item && <Ionicons name="checkmark" size={20} color="#aa48b7" />}
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
    backgroundColor: '#0a0a0a',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 10,
    marginTop: 16,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontFamily: Fonts.body,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
    height: 36,
  },
  tagLabel: {
    color: '#888',
    fontSize: 12,
    fontFamily: Fonts.body,
    textTransform: 'capitalize',
  },
  filterLabel: {
    color: '#777',
    fontSize: 16,
    fontFamily: Fonts.body,
  },
  filterValue: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.bold,
  },

  categoriesScroll: {
    marginTop: 12,
    paddingLeft: 10,
    flexDirection: 'row',
    marginBottom: 10,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginRight: 8,
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
  },
  activeCategory: {
    backgroundColor: '#aa48b7',
  },
  categoryText: {
    color: '#888',
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  activeCategoryText: {
    color: '#fff',
  },
  loaderFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  subCategoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    height: 32,
    justifyContent: 'center',
  },
  activeSubCategory: {
    backgroundColor: '#333',
    borderColor: '#aa48b7',
  },
  subCategoryText: {
    color: '#888',
    fontSize: 13,
    fontFamily: Fonts.body,
  },
  activeSubCategoryText: {
    color: '#fff',
    fontFamily: Fonts.bold,
  },

  centeredLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
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
    color: '#666',
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
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#aa48b7',
    fontFamily: Fonts.body,
    marginBottom: 24,
    fontWeight: '500',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    marginBottom: 20,
    color: '#fff',
    textAlign: 'center',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sortOptionText: {
    fontSize: 18,
    color: '#fff',
    fontFamily: Fonts.body,
  },
});
