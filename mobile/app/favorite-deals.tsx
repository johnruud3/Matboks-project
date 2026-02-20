import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '@/utils/config';
import { colors, gradients, spacing, radii } from '@/utils/theme';
import { getFavoriteStores } from '@/services/storage';
import { storeMatchesFavorites } from '@/constants/stores';
import { useCart } from '@/context/CartContext';
import { useUserLocation } from '@/hooks/useUserLocation';
import { UnifiedProductCard, type UnifiedFeedItem } from '@/components/UnifiedProductCard';

interface StoreEntry {
  store_name: string;
  location: string;
  price: number;
  submitted_at: string;
}

interface GroupedPrice {
  barcode: string;
  product_name: string;
  min_price: number;
  max_price: number;
  submission_count: number;
  currency: string;
  stores: string[];
  locations: string[];
  latest_submission: string;
  entries: StoreEntry[];
}

export default function FavoriteDealsScreen() {
  const router = useRouter();
  const { locationLabel: userCity } = useUserLocation();
  const { addToCart, removeFromCart, isInCart, cartCount } = useCart();
  const [favoriteStores, setFavoriteStores] = useState<string[]>([]);
  const [submissions, setSubmissions] = useState<GroupedPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = useCallback(async () => {
    const stores = await getFavoriteStores();
    setFavoriteStores(stores);
  }, []);

  const fetchSubmissions = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/prices/grouped?limit=200`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setSubmissions(data.prices || []);
    } catch (error) {
      console.error('Failed to fetch favorite deals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFavorites().then(() => fetchSubmissions());
  }, [loadFavorites, fetchSubmissions]);

  const feed: UnifiedFeedItem[] = submissions
    .filter((s) => s.stores?.some((store) => storeMatchesFavorites(store, favoriteStores)))
    .map((s) => ({
      barcode: s.barcode,
      name: s.product_name,
      image: null,
      kassalPrice: null,
      kassalStore: null,
      kassalStoreLogo: null,
      communityMin: s.min_price,
      communityMax: s.max_price,
      submissionCount: s.submission_count,
      currency: s.currency,
      stores: [...(s.stores || [])],
      locations: [...(s.locations || [])],
      entries: s.entries || [],
      latestSubmission: s.latest_submission,
      brand: null,
    }))
    .sort((a, b) => {
      const aTime = a.latestSubmission ? new Date(a.latestSubmission).getTime() : 0;
      const bTime = b.latestSubmission ? new Date(b.latestSubmission).getTime() : 0;
      return bTime - aTime;
    });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Akkurat nå';
    if (diffMins < 60) return `${diffMins} min siden`;
    if (diffHours < 24) return `${diffHours} timer siden`;
    if (diffDays === 1) return 'I går';
    if (diffDays < 7) return `${diffDays} dager siden`;
    return date.toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const handleAddToCart = useCallback(
    (item: UnifiedFeedItem) => {
      const bestEntry = item.entries?.[0];
      const price = item.communityMin ?? 0;
      const storeName = bestEntry?.store_name || 'Brukerrapportert';
      addToCart({
        barcode: item.barcode,
        name: item.name,
        image: item.image,
        price,
        currency: item.currency,
        storeName,
        storeLogo: null,
        location: bestEntry?.location ?? null,
      });
    },
    [addToCart]
  );

  const renderItem = ({ item }: { item: UnifiedFeedItem }) => (
    <UnifiedProductCard
      item={item}
      formatDate={formatDate}
      userCity={userCity}
      mode="feed"
      isInCart={isInCart(item.barcode)}
      onAddToCart={() => {
        if (isInCart(item.barcode)) removeFromCart(item.barcode);
        else handleAddToCart(item);
      }}
      onPress={() =>
        router.push(`/product-detail?barcode=${item.barcode}&name=${encodeURIComponent(item.name ?? '')}`)
      }
    />
  );

  if (loading) {
    return (
      <LinearGradient colors={[...gradients.screenBg]} style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primaryLight} />
        <Text style={styles.loadingText}>Laster tilbud...</Text>
      </LinearGradient>
    );
  }

  if (favoriteStores.length === 0) {
    return (
      <LinearGradient colors={[...gradients.screenBg]} style={styles.container}>
        <LinearGradient colors={[...gradients.header]} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
            <Text style={styles.backButtonText}>Tilbake</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Tilbud fra favorittbutikker</Text>
        </LinearGradient>
        <View style={styles.emptyState}>
          <Ionicons name="storefront-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Ingen favorittbutikker valgt</Text>
          <Text style={styles.emptySubtitle}>
            Gå til Fellesskapspriser og velg favorittbutikker for å se tilbud her og få varsler.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.replace('/community')}>
            <Text style={styles.primaryButtonText}>Gå til Fellesskapspriser</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[...gradients.screenBg]} style={styles.container}>
      <LinearGradient colors={[...gradients.header]} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={colors.white} />
          <Text style={styles.backButtonText}>Tilbake</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Tilbud fra favorittbutikker</Text>
          <TouchableOpacity style={styles.cartButton} onPress={() => router.push('/cart')}>
            <Ionicons name="cart-outline" size={24} color={colors.white} />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {feed.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptySubtitle}>Ingen nye priser fra favorittbutikkene dine akkurat nå.</Text>
        </View>
      ) : (
        <FlatList
          data={feed}
          keyExtractor={(item) => item.barcode}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />
          }
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  centerContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: 12, 
    color: colors.textSecondary 
  },
  header: {
    padding: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
    marginTop: spacing.sm + 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButtonText: { 
    fontSize: 16, 
    color: colors.white, 
    fontWeight: '600' 
  },
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  title: { 
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  cartButton: { 
    position: 'relative',
    padding: spacing.sm,
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: { 
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  listContent: { 
    paddingTop: spacing.md, 
    paddingHorizontal: spacing.md, 
    paddingBottom: 24 
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: { 
    fontSize: 18, 
    fontWeight: '600', 
    color: colors.textPrimary, 
    marginTop: 16, 
    textAlign: 'center' 
  },
  emptySubtitle: { 
    fontSize: 14, 
    color: colors.textSecondary, 
    marginTop: 8, 
    textAlign: 'center' 
  },
  primaryButton: {
    marginTop: 24,
    backgroundColor: colors.primaryLight,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  primaryButtonText: { 
    color: colors.white, 
    fontWeight: '600', 
    fontSize: 16 
  },
});
