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
import { SvgUri } from 'react-native-svg';
import { API_URL } from '@/utils/config';
import { colors, gradients, spacing, radii, subtleShadow } from '@/utils/theme';

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
  store_logo: string | null;
}

interface UnifiedFeedItem {
  barcode: string;
  name: string;
  image: string | null;
  kassalPrice: number | null;
  kassalStore: string | null;
  kassalStoreLogo: string | null;
  communityMin: number | null;
  communityMax: number | null;
  submissionCount: number;
  currency: string;
  stores: string[];
  locations: string[];
  latestSubmission: string | null;
  brand: string | null;
}

function UnifiedProductCard({
  item,
  formatDate,
  onPress,
}: {
  item: UnifiedFeedItem;
  formatDate: (dateString: string) => string;
  onPress: () => void;
}) {
  const [fetchedImage, setFetchedImage] = useState<string | null>(null);
  const [fetchedStorePrice, setFetchedStorePrice] = useState<number | null>(null);
  const [fetchedStoreName, setFetchedStoreName] = useState<string | null>(null);
  const [fetchedStoreLogo, setFetchedStoreLogo] = useState<string | null>(null);

  const needsLookup = !item.image || item.kassalPrice == null;
  useEffect(() => {
    if (!needsLookup) return;
    let cancelled = false;
    fetch(`${API_URL}/api/product/${item.barcode}`)
      .then((res) => res.json())
      .then((data: { imageUrl?: string | null; currentPrice?: number | null; storeName?: string | null; storeLogo?: string | null }) => {
        if (cancelled) return;
        if (!item.image && data.imageUrl) setFetchedImage(data.imageUrl);
        if (item.kassalPrice == null && data.currentPrice) setFetchedStorePrice(data.currentPrice);
        if (data.storeName) setFetchedStoreName(data.storeName);
        if (data.storeLogo) setFetchedStoreLogo(data.storeLogo);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [item.barcode, needsLookup]);

  const displayImage = item.image || fetchedImage;
  const storePrice = item.kassalPrice ?? fetchedStorePrice;
  const storeName = item.kassalStore ?? fetchedStoreName;
  const storeLogo = item.kassalStoreLogo ?? fetchedStoreLogo;

  const hasCommunity = item.communityMin != null;
  const hasKassal = storePrice != null;

  const communityIsCheaper =
    hasKassal && hasCommunity && item.communityMin! < storePrice!;

  const bestPrice = hasCommunity && hasKassal
    ? Math.min(item.communityMin!, storePrice!)
    : storePrice ?? item.communityMin ?? 0;

  const priceSpread = hasCommunity ? (item.communityMax! - item.communityMin!) : 0;
  const isStablePrice = item.submissionCount >= 2 && priceSpread <= 1;
  const isPopular = item.submissionCount >= 5;

  return (
    <TouchableOpacity
      style={[styles.card, subtleShadow]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardRow}>
        {displayImage ? (
          <Image source={{ uri: displayImage }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="image-outline" size={24} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
            <Text style={styles.bestPrice}>{bestPrice} {item.currency}</Text>
          </View>

          {/* Price rows */}
          <View style={styles.priceSection}>
            {hasKassal && (
              <View style={styles.kassalRow}>
                {storeLogo ? (
                  <SvgUri uri={storeLogo} width={18} height={18} />
                ) : (
                  <Ionicons name="pricetag" size={13} color={colors.primaryLight} />
                )}
                <Text style={styles.kassalLabel}>Billigste butikkpris</Text>
                <Text style={styles.kassalValue}>{storePrice} {item.currency}</Text>
                {storeName && (
                  <Text style={styles.kassalStore}>{storeName}</Text>
                )}
              </View>
            )}

            {hasCommunity && (
              <View style={styles.communityRow}>
                <Ionicons name="people" size={13} color={colors.textSecondary} />
                <Text style={styles.communityLabel}>Brukerpris</Text>
                <Text style={styles.communityValue}>
                  {item.communityMin === item.communityMax
                    ? `${item.communityMin} ${item.currency}`
                    : `${item.communityMin} - ${item.communityMax} ${item.currency}`}
                </Text>
                <Text style={styles.submissionCount}>({item.submissionCount})</Text>
              </View>
            )}

            {communityIsCheaper && (
              <View style={styles.cheaperBadge}>
                <Ionicons name="trending-down" size={13} color={colors.good} />
                <Text style={styles.cheaperText}>
                  Billigere! {(storePrice! - item.communityMin!).toFixed(0)} kr under butikkpris
                </Text>
              </View>
            )}
          </View>

          {/* Badges */}
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

          {/* Details */}
          <View style={styles.cardDetails}>
            {item.stores.length > 0 && (
              <View style={styles.detailRow}>
                <Ionicons name="storefront-outline" size={14} color={colors.textMuted} />
                <Text style={styles.detailText} numberOfLines={1}>{item.stores.join(', ')}</Text>
              </View>
            )}
            {item.locations.length > 0 && (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={styles.detailText} numberOfLines={1}>{item.locations.join(', ')}</Text>
              </View>
            )}
            {item.latestSubmission && (
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                <Text style={styles.detailText}>{formatDate(item.latestSubmission)}</Text>
              </View>
            )}
          </View>
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
      if (append) setLoadingMore(true);

      const currentCount = append ? submissions.length : 0;
      const response = await fetch(`${API_URL}/api/prices/grouped?limit=${50 + currentCount}`);

      if (!response.ok) throw new Error('Failed to fetch submissions');

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

  const buildUnifiedFeed = (): UnifiedFeedItem[] => {
    const map = new Map<string, UnifiedFeedItem>();

    for (const s of filteredSubmissions) {
      map.set(s.barcode, {
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
        stores: [...s.stores],
        locations: [...s.locations],
        latestSubmission: s.latest_submission,
        brand: null,
      });
    }

    for (const kp of kassalProducts) {
      const ean = kp.ean;
      if (!ean) continue;

      const existing = map.get(ean);
      if (existing) {
        if (existing.kassalPrice == null || kp.current_price < existing.kassalPrice) {
          existing.kassalPrice = kp.current_price;
          existing.kassalStore = kp.store_name;
          existing.kassalStoreLogo = kp.store_logo;
        }
        if (!existing.image && kp.image) existing.image = kp.image;
        if (!existing.brand && kp.brand) existing.brand = kp.brand;
      } else {
        map.set(ean, {
          barcode: ean,
          name: kp.name,
          image: kp.image,
          kassalPrice: kp.current_price,
          kassalStore: kp.store_name,
          kassalStoreLogo: kp.store_logo,
          communityMin: null,
          communityMax: null,
          submissionCount: 0,
          currency: 'NOK',
          stores: kp.store_name ? [kp.store_name] : [],
          locations: [],
          latestSubmission: null,
          brand: kp.brand,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const aHasBoth = a.kassalPrice != null && a.communityMin != null;
      const bHasBoth = b.kassalPrice != null && b.communityMin != null;
      if (aHasBoth !== bHasBoth) return aHasBoth ? -1 : 1;

      const aTime = a.latestSubmission ? new Date(a.latestSubmission).getTime() : 0;
      const bTime = b.latestSubmission ? new Date(b.latestSubmission).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;

      return (b.submissionCount || 0) - (a.submissionCount || 0);
    });
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

  const feed = buildUnifiedFeed();

  const renderFeedItem = ({ item }: { item: UnifiedFeedItem }) => (
    <UnifiedProductCard
      item={item}
      formatDate={formatDate}
      onPress={() =>
        router.push(
          `/product-detail?barcode=${item.barcode}&name=${encodeURIComponent(item.name)}`
        )
      }
    />
  );

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
        keyExtractor={(item) => item.barcode}
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

  // Card
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
    marginBottom: spacing.sm,
  },
  productName: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.white,
    marginRight: spacing.sm + 4,
  },
  bestPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.accentGlow,
  },

  // Price section
  priceSection: {
    gap: 6,
    marginBottom: spacing.sm + 2,
  },
  kassalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(167, 139, 250, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
  },
  kassalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  kassalValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryLight,
    marginLeft: 'auto',
  },
  kassalStore: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 4,
  },
  communityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  communityLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  communityValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 'auto',
  },
  submissionCount: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 4,
  },
  cheaperBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.2)',
  },
  cheaperText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.good,
  },

  // Badges
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

  // Details
  cardDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },

  // Empty / footer
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
