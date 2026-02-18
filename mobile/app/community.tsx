import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '@/utils/config';
import { colors, gradients, spacing, radii, glowShadow, subtleShadow } from '@/utils/theme';

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
}

interface KassalProduct {
  name: string;
  brand: string | null;
  ean: string | null;
  image: string | null;
  current_price: number;
  store_name: string | null;
}

type FeedItem =
  | { type: 'community'; data: GroupedPrice }
  | { type: 'kassal'; data: KassalProduct };

function CommunityCard({
  item,
  formatDate,
  onPress,
}: {
  item: GroupedPrice;
  formatDate: (dateString: string) => string;
  onPress: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [storePrice, setStorePrice] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/product/${item.barcode}`)
      .then((res) => res.json())
      .then((data: { imageUrl?: string | null; currentPrice?: number | null }) => {
        if (cancelled) return;
        if (data.imageUrl) setImageUrl(data.imageUrl);
        if (data.currentPrice) setStorePrice(data.currentPrice);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [item.barcode]);

  const priceDisplay = item.min_price === item.max_price
    ? `${item.min_price} ${item.currency}`
    : `${item.min_price} - ${item.max_price} ${item.currency}`;

  const priceSpread = item.max_price - item.min_price;
  const isStablePrice = item.submission_count >= 2 && priceSpread <= 1;
  const isPopular = item.submission_count >= 5;

  return (
    <TouchableOpacity
      style={[styles.card, subtleShadow]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardRow}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="image-outline" size={24} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.productName} numberOfLines={2}>{item.product_name}</Text>
            <View style={styles.priceColumn}>
              <Text style={styles.price}>{priceDisplay}</Text>
              {item.submission_count > 1 && (
                <Text style={styles.countBadge}>{item.submission_count} bidrag</Text>
              )}
            </View>
          </View>

          {storePrice && (
            <View style={styles.storePriceRow}>
              <Ionicons name="pricetag-outline" size={13} color={colors.primaryLight} />
              <Text style={styles.storePriceText}>
                Butikkpris: {storePrice} {item.currency}
              </Text>
            </View>
          )}

          {(isStablePrice || isPopular) && (
            <View style={styles.badgeRow}>
              {isStablePrice && (
                <View style={styles.goodBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.good} />
                  <Text style={styles.goodBadgeText}>God pris</Text>
                </View>
              )}
              {isPopular && (
                <View style={styles.popularBadge}>
                  <Ionicons name="flame" size={14} color="#FB923C" />
                  <Text style={styles.popularBadgeText}>Populær</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.cardDetails}>
            {item.stores.length > 0 && (
              <View style={styles.detailRow}>
                <Ionicons name="storefront-outline" size={14} color={colors.textMuted} />
                <Text style={styles.detailText}>{item.stores.join(', ')}</Text>
              </View>
            )}
            {item.locations.length > 0 && (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={styles.detailText}>{item.locations.join(', ')}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={14} color={colors.textMuted} />
              <Text style={styles.detailText}>{formatDate(item.latest_submission)}</Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function KassalCard({
  item,
  onPress,
}: {
  item: KassalProduct;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, subtleShadow]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardRow}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="image-outline" size={24} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
            <View style={styles.priceColumn}>
              <Text style={styles.price}>{item.current_price} NOK</Text>
            </View>
          </View>

          <View style={styles.kassalBadge}>
            <Ionicons name="pricetag" size={13} color={colors.primaryLight} />
            <Text style={styles.kassalBadgeText}>Butikkpris</Text>
          </View>

          <View style={styles.cardDetails}>
            {item.brand && (
              <View style={styles.detailRow}>
                <Ionicons name="bookmark-outline" size={14} color={colors.textMuted} />
                <Text style={styles.detailText}>{item.brand}</Text>
              </View>
            )}
            {item.store_name && (
              <View style={styles.detailRow}>
                <Ionicons name="storefront-outline" size={14} color={colors.textMuted} />
                <Text style={styles.detailText}>{item.store_name}</Text>
              </View>
            )}
          </View>

          {item.ean && (
            <Text style={styles.barcode}>{item.ean}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function CommunityScreen() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<GroupedPrice[]>([]);
  const [kassalProducts, setKassalProducts] = useState<KassalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [kassalLoading, setKassalLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSubmissions = async (append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      }

      const currentCount = append ? submissions.length : 0;
      const response = await fetch(`${API_URL}/api/prices/grouped?limit=${50 + currentCount}`);

      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }

      const data = await response.json();
      const newPrices = data.prices || [];

      if (append) {
        if (newPrices.length <= submissions.length) {
          setHasMore(false);
        } else {
          setSubmissions(newPrices);
        }
      } else {
        setSubmissions(newPrices);
        setHasMore(newPrices.length >= 50);
      }
    } catch (error) {
      console.error('Failed to fetch community prices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const fetchKassalProducts = useCallback(async (query?: string) => {
    try {
      setKassalLoading(true);
      const url = query
        ? `${API_URL}/api/products/search?q=${encodeURIComponent(query)}`
        : `${API_URL}/api/products/search`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch Kassal products');
      const data = await response.json();
      setKassalProducts(data.products || []);
    } catch (error) {
      console.error('Failed to fetch Kassal products:', error);
    } finally {
      setKassalLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubmissions();
    fetchKassalProducts();
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (searchQuery.length >= 2) {
      searchTimer.current = setTimeout(() => {
        fetchKassalProducts(searchQuery);
      }, 500);
    } else if (searchQuery.length === 0) {
      fetchKassalProducts();
    }

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubmissions();
    fetchKassalProducts(searchQuery || undefined);
  };

  const filteredSubmissions = submissions.filter((item) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      item.product_name.toLowerCase().includes(query) ||
      item.stores.some((store) => store.toLowerCase().includes(query)) ||
      item.locations.some((loc) => loc.toLowerCase().includes(query)) ||
      item.barcode.includes(query)
    );
  });

  const getMergedFeed = (): FeedItem[] => {
    const communityBarcodes = new Set(filteredSubmissions.map((s) => s.barcode));

    const dedupedKassal = kassalProducts.filter(
      (kp) => !kp.ean || !communityBarcodes.has(kp.ean)
    );

    const communityItems: FeedItem[] = filteredSubmissions.map((data) => ({
      type: 'community' as const,
      data,
    }));

    const kassalItems: FeedItem[] = dedupedKassal.map((data) => ({
      type: 'kassal' as const,
      data,
    }));

    const merged: FeedItem[] = [];
    let ci = 0;
    let ki = 0;

    while (ci < communityItems.length || ki < kassalItems.length) {
      if (ci < communityItems.length) {
        merged.push(communityItems[ci++]);
        if (ci < communityItems.length) merged.push(communityItems[ci++]);
      }
      if (ki < kassalItems.length) {
        merged.push(kassalItems[ki++]);
      }
    }

    return merged;
  };

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

  const feed = getMergedFeed();

  const renderFeedItem = ({ item }: { item: FeedItem }) => {
    if (item.type === 'community') {
      return (
        <CommunityCard
          item={item.data}
          formatDate={formatDate}
          onPress={() =>
            router.push(
              `/product-detail?barcode=${item.data.barcode}&name=${encodeURIComponent(item.data.product_name)}`
            )
          }
        />
      );
    }

    return (
      <KassalCard
        item={item.data}
        onPress={() => {
          if (item.data.ean) {
            router.push(
              `/product-detail?barcode=${item.data.ean}&name=${encodeURIComponent(item.data.name)}`
            );
          }
        }}
      />
    );
  };

  const getFeedKey = (item: FeedItem, index: number) => {
    if (item.type === 'community') {
      return `community-${item.data.barcode}-${item.data.min_price}-${index}`;
    }
    return `kassal-${item.data.ean || item.data.name}-${index}`;
  };

  if (loading) {
    return (
      <LinearGradient colors={[...gradients.screenBg]} style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primaryLight} />
        <Text style={styles.loadingText}>Laster fellesskapspriser...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[...gradients.screenBg]} style={styles.container}>
      <LinearGradient colors={[...gradients.header]} style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color={colors.white} />
          <Text style={styles.backButtonText}>Tilbake</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Fellesskapspriser</Text>
        <Text style={styles.subtitle}>
          {submissions.length} bidrag fra brukere
        </Text>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Søk produkt, butikk eller sted..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {kassalLoading && searchQuery.length >= 2 && (
            <ActivityIndicator size="small" color={colors.primaryLight} style={styles.searchSpinner} />
          )}
        </View>
      </LinearGradient>

      <FlatList
        data={feed}
        renderItem={renderFeedItem}
        keyExtractor={getFeedKey}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primaryLight}
          />
        }
        onEndReached={() => {
          if (!loadingMore && hasMore && !searchQuery) {
            fetchSubmissions(true);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color={colors.primaryLight} />
              <Text style={styles.loadingFooterText}>Laster flere...</Text>
            </View>
          ) : !hasMore && feed.length > 0 ? (
            <View style={styles.loadingFooter}>
              <Text style={styles.endText}>Du har nådd slutten</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name={searchQuery ? 'search' : 'cube-outline'}
              size={64}
              color={colors.textMuted}
            />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Ingen resultater' : 'Ingen priser ennå'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Prøv et annet søk' : 'Vær den første til å bidra!'}
            </Text>
          </View>
        }
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
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
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  searchIcon: {
    marginLeft: spacing.md,
  },
  searchInput: {
    flex: 1,
    padding: spacing.md - 2,
    fontSize: 16,
    color: colors.white,
  },
  searchSpinner: {
    marginRight: spacing.md,
  },
  list: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.glassBg,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: radii.sm,
    marginRight: spacing.sm + 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  productImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: radii.sm,
    marginRight: spacing.sm + 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm + 4,
  },
  productName: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
    marginRight: spacing.sm + 4,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.accentGlow,
  },
  priceColumn: {
    alignItems: 'flex-end',
  },
  countBadge: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'right',
  },
  storePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.15)',
  },
  storePriceText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  kassalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.25)',
  },
  kassalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm + 2,
  },
  goodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
  },
  goodBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.good,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.25)',
  },
  popularBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FB923C',
  },
  cardDetails: {
    gap: 6,
    marginBottom: spacing.sm + 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  barcode: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: 'monospace',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 16,
    color: colors.textMuted,
  },
  loadingFooter: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  loadingFooterText: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.textMuted,
  },
  endText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
