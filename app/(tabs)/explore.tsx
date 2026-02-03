import CharacterCard from '@/components/CharacterCard';
import Header from '@/components/Header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/Fonts';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useNavigation } from 'expo-router';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const cardWidth = (width - 28) / 2; // Adjusted for 10px padding on sides and 8px gap between cards

const CATEGORIES = ['All', 'Expert', 'Profecient', 'Competent', 'Novice'];

const FEATURED_CARDS = [
  {
    id: '1',
    name: 'Benjamin White',
    age: 28,
    description: 'Your best friend Olivia is getting married at a luxury resort in...',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=3000&auto=format&fit=crop',
    likes: 197,
    comments: '336.5k',
    username: '@ollie226'
  },
  {
    id: '2',
    name: 'Bryce Conner',
    age: 19,
    description: 'Your freshman roommate, Bryce Conner, is equal parts charm and...',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=3000&auto=format&fit=crop',
    likes: 120,
    comments: '129.4k'
  },
  {
    id: '3',
    name: 'Evan Carter',
    age: 26,
    description: 'Officer Evan Carter is the kind of cop who knows exactly how he...',
    image: 'https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=3000&auto=format&fit=crop',
    likes: 133,
    comments: '112.1k',
    username: '@valentinehea...'
  },
  {
    id: '4',
    name: 'Valentine Sale',
    image: 'https://plus.unsplash.com/premium_photo-1673830185613-2346cf98cb47?q=80&w=3000&auto=format&fit=crop',
    isAd: true
  }
];

export default function ExploreScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <Header />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>



        {/* Search */}
        <ThemedView style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Try 'Gym coach' or 'Finance coach'"
            placeholderTextColor="#666"
          />
        </ThemedView>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          <TouchableOpacity style={styles.filterButton}>
            <ThemedText style={styles.filterText}>Sort: Popular</ThemedText>
            <Ionicons name="chevron-down" size={16} color="#ccc" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <ThemedText style={styles.filterText}>Followers: Male</ThemedText>
            <Ionicons name="chevron-down" size={16} color="#ccc" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <ThemedText style={styles.filterText}>Likes: Any</ThemedText>
            <Ionicons name="chevron-down" size={16} color="#ccc" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterButton}>
            <ThemedText style={styles.filterText}>Chats: Any</ThemedText>
            <Ionicons name="chevron-down" size={16} color="#ccc" />
          </TouchableOpacity>
        </ScrollView>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
          {CATEGORIES.map((cat, index) => (
            <TouchableOpacity key={cat} style={[styles.categoryPill, index === 0 && styles.activeCategory]}>
              <ThemedText style={[styles.categoryText, index === 0 && styles.activeCategoryText]}>{cat}</ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Grid */}
        <ThemedView style={styles.grid}>
          {FEATURED_CARDS.map((item) => (
            !item.isAd ? (
              <CharacterCard
                key={item.id}
                name={item.name}
                description={item.description || ''}
                likes={item.likes || 0}
                comments={item.comments || ''}
                imageUrl={item.image}
                width={cardWidth}
                height={cardWidth * 2}
              />
            ) : (
              <TouchableOpacity key={item.id} style={[styles.card, { width: cardWidth, height: cardWidth * 2 }]}>
                <Image source={{ uri: item.image }} style={styles.cardImage} contentFit="cover" />
                <ThemedView style={styles.cardGradientOverlay} />
                <ThemedView style={styles.adContent}>
                  <ThemedText style={styles.adTitle}>75% OFF</ThemedText>
                  <ThemedText style={styles.adSubtitle}>VALENTINES SALE</ThemedText>
                  <TouchableOpacity style={styles.adButton}>
                    <ThemedText style={styles.adButtonText}>Join Now</ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              </TouchableOpacity>
            )
          ))}
        </ThemedView>

      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0a0a0a',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  loginButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#817299',
  },
  loginText: {
    color: '#817299',
    fontWeight: '600',
  },
  joinButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#817299',
  },
  joinText: {
    color: '#fff',
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  bannerContainer: {
    height: 120,
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    fontStyle: 'italic',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10
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
    fontSize: 16,
    fontFamily: Fonts.body,
  },
  filtersScroll: {
    marginTop: 12,
    paddingLeft: 10,
    flexDirection: 'row',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
  },
  filterText: {
    color: '#ccc',
    fontSize: 13,
    marginRight: 4,
  },
  categoriesScroll: {
    marginTop: 12,
    paddingLeft: 10,
    flexDirection: 'row',
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 4,
    borderRadius: 8,
  },
  activeCategory: {
    backgroundColor: '#333',
  },
  categoryText: {
    color: '#888',
    fontWeight: '600',
  },
  activeCategoryText: {
    color: '#fff',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  card: {
    width: cardWidth,
    height: cardWidth * 2.2, // Made significantly taller (longer)
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    // Should be a linear gradient but simply using semi-transparent black for now
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  cardName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardAge: {
    fontWeight: 'normal',
    opacity: 0.8,
    fontSize: 14,
  },
  cardDesc: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  cardShowInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  cardStat: {
    color: '#ccc',
    fontSize: 12,
    marginLeft: 4,
  },
  adContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(180, 20, 100, 0.8)' // pink tint
  },
  adTitle: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '900',
  },
  adSubtitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: -4,
  },
  adButton: {
    backgroundColor: '#817299',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  adButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
