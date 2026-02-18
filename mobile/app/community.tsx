import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SvgUri } from 'react-native-svg';
import { API_URL } from '@/utils/config';
import { colors, gradients, spacing, radii, subtleShadow } from '@/utils/theme';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useCart } from '@/context/CartContext';

// Store name to logo URL mapping
const STORE_LOGOS: Record<string, string> = {
  'KIWI': 'https://kassal.app/logos/Kiwi.svg',
  'Meny': 'https://kassal.app/logos/Meny.svg',
  'SPAR': 'https://kassal.app/logos/Spar.svg',
  'Coop Extra': 'https://kassal.app/logos/Coop%20Extra.svg',
  'Coop Prix': 'https://kassal.app/logos/Coop%20Prix.svg',
  'Coop Mega': 'https://kassal.app/logos/Coop%20Mega.svg',
  'Coop Obs': 'https://kassal.app/logos/Coop%20Obs.svg',
  'Joker': 'https://kassal.app/logos/Joker.svg',
  'Bunnpris': 'https://kassal.app/logos/Bunnpris.svg',
  'Europris': 'https://kassal.app/logos/Europris.svg',
  'Oda': 'https://kassal.app/logos/Oda.svg',
};

// Get logo URL for a store name (case-insensitive partial match)
function getStoreLogo(storeName: string | null): string | null {
  if (!storeName) return null;
  const lower = storeName.toLowerCase();
  for (const [key, url] of Object.entries(STORE_LOGOS)) {
    if (lower.includes(key.toLowerCase())) {
      return url;
    }
  }
  return null;
}

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
  entries: StoreEntry[];
  latestSubmission: string | null;
  brand: string | null;
}

function matchesCity(entryLocation: string, userCity: string): boolean {
  if (!entryLocation || !userCity) return false;
  return entryLocation.toLowerCase().includes(userCity.toLowerCase());
}

function UnifiedProductCard({
  item,
  formatDate,
  onPress,
  userCity,
  isInCart,
  onAddToCart,
}: {
  item: UnifiedFeedItem;
  formatDate: (dateString: string) => string;
  onPress: () => void;
  userCity: string | null;
  isInCart: boolean;
  onAddToCart: () => void;
}) {
  const [fetchedImage, setFetchedImage] = useState<string | null>(null);
  const [fetchedStorePrice, setFetchedStorePrice] = useState<number | null>(null);
  const [fetchedStoreName, setFetchedStoreName] = useState<string | null>(null);
  const [fetchedStoreLogo, setFetchedStoreLogo] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

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

  const sortedEntries = [...item.entries].sort((a, b) => {
    const aMatch = userCity ? matchesCity(a.location, userCity) : false;
    const bMatch = userCity ? matchesCity(b.location, userCity) : false;
    if (aMatch !== bMatch) return aMatch ? -1 : 1;
    return a.price - b.price;
  });

  const nearbyEntry = userCity
    ? sortedEntries.find((e) => matchesCity(e.location, userCity))
    : null;
  const bestEntry = nearbyEntry || sortedEntries[0] || null;

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
            <View style={styles.cardHeaderRight}>
              <Text style={styles.bestPrice}>{bestPrice} {item.currency}</Text>
              <TouchableOpacity
                style={[styles.cartButton, isInCart && styles.cartButtonActive]}
                onPress={(e) => {
                  e.stopPropagation();
                  onAddToCart();
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={isInCart ? 'checkmark-circle' : 'cart-outline'}
                  size={20}
                  color={isInCart ? colors.good : colors.primaryLight}
                />
              </TouchableOpacity>
            </View>
          </View>

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
              <View style={styles.communitySection}>
                <View style={styles.communityHeader}>
                  <Ionicons name="people" size={12} color={colors.textSecondary} />
                  <Text style={styles.communityLabel}>Brukerpris</Text>
                </View>

                {bestEntry && (
                  <View style={styles.communityEntryCompact}>
                    <View style={styles.entryStoreRow}>
                      {(() => {
                        const logo = getStoreLogo(bestEntry.store_name);
                        return logo ? (
                          <SvgUri uri={logo} width={18} height={18} />
                        ) : (
                          <Ionicons name="storefront-outline" size={16} color={colors.textMuted} />
                        );
                      })()}
                      <Text style={styles.entryStoreCompact}>
                        {bestEntry.store_name || 'Ukjent butikk'}
                      </Text>
                      {bestEntry.location ? (
                        <Text style={styles.entryLocationCompact}>{bestEntry.location}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.entryPriceCompact}>{bestEntry.price} kr</Text>
                  </View>
                )}

                {communityIsCheaper && (
                  <View style={styles.cheaperRowCompact}>
                    <Ionicons name="trending-down" size={12} color={colors.good} />
                    <Text style={styles.cheaperTextCompact}>
                      {(storePrice! - item.communityMin!).toFixed(0)} kr billigere
                    </Text>
                  </View>
                )}

                {sortedEntries.length > 1 && (
                  <>
                    <TouchableOpacity
                      style={styles.expandButtonCompact}
                      onPress={() => setExpanded(!expanded)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.expandTextCompact}>
                        {expanded ? 'Skjul' : `+${sortedEntries.length - 1} butikker`}
                      </Text>
                      <Ionicons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={12}
                        color={colors.textMuted}
                      />
                    </TouchableOpacity>

                    {expanded && (
                      <View style={styles.entryListCompact}>
                        {sortedEntries.slice(1).map((entry, i) => (
                          <View
                            key={`${entry.store_name}-${entry.location}-${i}`}
                            style={styles.entryListItemCompact}
                          >
                            {(() => {
                              const logo = getStoreLogo(entry.store_name);
                              return logo ? (
                                <SvgUri uri={logo} width={14} height={14} />
                              ) : (
                                <Ionicons name="storefront-outline" size={14} color={colors.textMuted} />
                              );
                            })()}
                            <Text style={styles.entryListStoreCompact} numberOfLines={1}>
                              {entry.store_name || 'Ukjent'}
                            </Text>
                            {entry.location && (
                              <Text style={styles.entryListLocationCompact} numberOfLines={1}>
                                {entry.location}
                              </Text>
                            )}
                            <Text style={styles.entryListPriceCompact}>{entry.price} kr</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                )}
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
  const { city: userCity, setManualCity, loading: locationLoading } = useUserLocation();
  const { addToCart, isInCart } = useCart();
  const [submissions, setSubmissions] = useState<GroupedPrice[]>([]);
  const [kassalProducts, setKassalProducts] = useState<KassalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [kassalLoading, setKassalLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [kassalPage, setKassalPage] = useState(1);
  const [kassalHasMore, setKassalHasMore] = useState(true);
  const [extraFeedItems, setExtraFeedItems] = useState<UnifiedFeedItem[]>([]);
  const kassalLoadingRef = useRef(false);
  const kassalPageRef = useRef(1);
  const kassalHasMoreRef = useRef(true);
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

  const fetchKassalProducts = useCallback(async (query?: string, page: number = 1) => {
    console.log('[Kassal] fetchKassalProducts called, page:', page, 'loadingRef:', kassalLoadingRef.current);
    if (kassalLoadingRef.current) {
      console.log('[Kassal] BLOCKED - already loading');
      return;
    }
    kassalLoadingRef.current = true;

    try {
      if (page === 1) {
        setKassalLoading(true);
      }

      const url = `${API_URL}/api/products/search?page=${page}&size=30${query ? `&q=${encodeURIComponent(query)}` : ''}`;
      console.log('[Kassal] Fetching:', url);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch Kassal products');
      const data = await response.json();
      const newProducts: KassalProduct[] = data.products || [];
      console.log('[Kassal] Got', newProducts.length, 'products, hasMore:', data.hasMore);

      const more = data.hasMore ?? newProducts.length >= 30;
      kassalPageRef.current = page;
      kassalHasMoreRef.current = more;
      setKassalPage(page);
      setKassalHasMore(more);

      if (page === 1) {
        setKassalProducts(newProducts);
        setExtraFeedItems([]);
      } else {
        setExtraFeedItems((prev) => {
          // Get existing barcodes from baseFeed and previous extraFeedItems
          const existingBarcodes = new Set([
            ...submissions.map((s) => s.barcode),
            ...kassalProducts.map((kp) => kp.ean).filter(Boolean),
            ...prev.map((item) => item.barcode),
          ]);

          const newItems: UnifiedFeedItem[] = newProducts
            .filter((kp) => kp.ean && !existingBarcodes.has(kp.ean))
            .map((kp) => ({
              barcode: kp.ean!,
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
              entries: [],
              latestSubmission: null,
              brand: kp.brand,
            }));

          console.log('[Kassal] Adding', newItems.length, 'unique items (filtered from', newProducts.length, ')');
          return newItems.length > 0 ? [...prev, ...newItems] : prev;
        });
      }
    } catch (error) {
      console.error('[Kassal] Fetch failed:', error);
    } finally {
      console.log('[Kassal] Done, resetting loadingRef');
      kassalLoadingRef.current = false;
      setKassalLoading(false);
    }
  }, [submissions, kassalProducts]);

  useEffect(() => {
    fetchSubmissions();
    fetchKassalProducts();
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);

    if (searchQuery.length >= 2) {
      searchTimer.current = setTimeout(() => {
        fetchKassalProducts(searchQuery, 1);
      }, 500);
    } else if (searchQuery.length === 0) {
      // When clearing search, reload fresh products
      kassalPageRef.current = 1;
      kassalHasMoreRef.current = true;
      setKassalPage(1);
      setKassalHasMore(true);
      setExtraFeedItems([]);
      fetchKassalProducts(undefined, 1);
    }

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQuery]);

  const onRefresh = () => {
    setRefreshing(true);
    kassalPageRef.current = 1;
    kassalHasMoreRef.current = true;
    setKassalPage(1);
    setKassalHasMore(true);
    setExtraFeedItems([]);
    fetchSubmissions();
    fetchKassalProducts(searchQuery || undefined, 1);
  };

  const filteredSubmissions = useMemo(() => submissions.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.product_name.toLowerCase().includes(query) ||
      item.stores.some((store) => store.toLowerCase().includes(query)) ||
      item.locations.some((loc) => loc.toLowerCase().includes(query)) ||
      item.barcode.includes(query)
    );
  }), [submissions, searchQuery]);

  const buildUnifiedFeed = (): UnifiedFeedItem[] => {
    const seen = new Set<string>();

    const communityItems: UnifiedFeedItem[] = filteredSubmissions.map((s) => {
      seen.add(s.barcode);
      return {
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
        entries: s.entries || [],
        latestSubmission: s.latest_submission,
        brand: null,
      };
    });

    const communityMap = new Map(communityItems.map((c) => [c.barcode, c]));
    const kassalOnlyItems: UnifiedFeedItem[] = [];

    for (const kp of kassalProducts) {
      const ean = kp.ean;
      if (!ean) continue;

      const existing = communityMap.get(ean);
      if (existing) {
        if (existing.kassalPrice == null || kp.current_price < existing.kassalPrice) {
          existing.kassalPrice = kp.current_price;
          existing.kassalStore = kp.store_name;
          existing.kassalStoreLogo = kp.store_logo;
        }
        if (!existing.image && kp.image) existing.image = kp.image;
        if (!existing.brand && kp.brand) existing.brand = kp.brand;
      } else if (!seen.has(ean)) {
        seen.add(ean);
        kassalOnlyItems.push({
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
          entries: [],
          latestSubmission: null,
          brand: kp.brand,
        });
      }
    }

    communityItems.sort((a, b) => {
      const aHasBoth = a.kassalPrice != null && a.communityMin != null;
      const bHasBoth = b.kassalPrice != null && b.communityMin != null;
      if (aHasBoth !== bHasBoth) return aHasBoth ? -1 : 1;

      const aTime = a.latestSubmission ? new Date(a.latestSubmission).getTime() : 0;
      const bTime = b.latestSubmission ? new Date(b.latestSubmission).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;

      return (b.submissionCount || 0) - (a.submissionCount || 0);
    });

    return [...communityItems, ...kassalOnlyItems];
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

  const baseFeed = useMemo(() => buildUnifiedFeed(), [filteredSubmissions, kassalProducts]);
  const feed = useMemo(() => {
    const allItems = extraFeedItems.length > 0 ? [...baseFeed, ...extraFeedItems] : baseFeed;
    
    if (!searchQuery) return allItems;
    
    const query = searchQuery.toLowerCase();
    return allItems.filter((item) =>
      item.name?.toLowerCase().includes(query) ||
      item.kassalStore?.toLowerCase().includes(query) ||
      item.stores?.some((s) => s.toLowerCase().includes(query)) ||
      item.barcode?.includes(query)
    );
  }, [baseFeed, extraFeedItems, searchQuery]);

  const handleAddToCart = useCallback((item: UnifiedFeedItem) => {
    const bestEntry = item.entries[0];
    const storePrice = item.kassalPrice;
    const communityPrice = item.communityMin;
    
    let price: number;
    let storeName: string;
    let storeLogo: string | null = null;
    let location: string | null = null;

    if (communityPrice != null && (storePrice == null || communityPrice <= storePrice)) {
      price = communityPrice;
      storeName = bestEntry?.store_name || 'Brukerrapportert';
      location = bestEntry?.location || null;
    } else if (storePrice != null) {
      price = storePrice;
      storeName = item.kassalStore || 'Butikk';
      storeLogo = item.kassalStoreLogo;
    } else {
      price = 0;
      storeName = 'Ukjent';
    }

    addToCart({
      barcode: item.barcode,
      name: item.name,
      image: item.image,
      price,
      currency: item.currency,
      storeName,
      storeLogo,
      location,
    });
  }, [addToCart]);

  const renderFeedItem = ({ item }: { item: UnifiedFeedItem }) => (
    <UnifiedProductCard
      item={item}
      formatDate={formatDate}
      userCity={userCity}
      isInCart={isInCart(item.barcode)}
      onAddToCart={() => handleAddToCart(item)}
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
            Fellesskapets priser
        </Text>

        <TouchableOpacity
          style={styles.locationChip}
          onPress={() => {
            setLocationInput(userCity || '');
            setShowLocationModal(true);
          }}
        >
          <Ionicons name="location" size={14} color={userCity ? colors.primaryLight : colors.textMuted} />
          <Text style={[styles.locationChipText, userCity && { color: colors.primaryLight }]}>
            {locationLoading ? 'Finner sted...' : userCity || 'Velg ditt sted'}
          </Text>
          <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
        </TouchableOpacity>

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
        ListFooterComponent={
          kassalHasMore && feed.length > 0 ? (
            <TouchableOpacity
              style={styles.loadMoreButton}
              onPress={() => {
                console.log('[Button] Pressed! loadingRef:', kassalLoadingRef.current, 'pageRef:', kassalPageRef.current);
                if (!kassalLoadingRef.current) {
                  fetchKassalProducts(searchQuery || undefined, kassalPageRef.current + 1);
                } else {
                  console.log('[Button] BLOCKED by loadingRef');
                }
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.white} />
              <Text style={styles.loadMoreButtonText}>Vis flere produkter</Text>
            </TouchableOpacity>
          ) : !kassalHasMore && feed.length > 0 ? (
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

      <Modal
        visible={showLocationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLocationModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ditt sted</Text>
            <Text style={styles.modalSubtitle}>
              Vi viser deg de beste prisene nær deg
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="f.eks. Oslo, Bergen, Trondheim..."
              placeholderTextColor={colors.textMuted}
              value={locationInput}
              onChangeText={setLocationInput}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowLocationModal(false)}
              >
                <Text style={styles.modalCancelText}>Avbryt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={() => {
                  if (locationInput.trim()) {
                    setManualCity(locationInput.trim());
                  }
                  setShowLocationModal(false);
                }}
              >
                <Text style={styles.modalSaveText}>Lagre</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cartButton: {
    padding: 6,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
  },
  cartButtonActive: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderColor: 'rgba(52, 211, 153, 0.3)',
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
  communitySection: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
    gap: 4,
  },
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  communityLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  communityEntryCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  entryStoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  entryStoreCompact: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.white,
  },
  entryLocationCompact: {
    fontSize: 11,
    color: colors.textMuted,
  },
  entryPriceCompact: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  cheaperRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cheaperTextCompact: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.good,
  },
  expandButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  expandTextCompact: {
    fontSize: 11,
    color: colors.textMuted,
  },
  entryListCompact: {
    gap: 2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 6,
  },
  entryListItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
  },
  entryListStoreCompact: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
  },
  entryListLocationCompact: {
    fontSize: 10,
    color: colors.textMuted,
  },
  entryListPriceCompact: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  communityValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 'auto',
  },
  cheaperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cheaperText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.good,
  },
  communityBadges: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  communityDetails: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 6,
  },
  nearbyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nearbyLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  entryPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  entryStore: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  entryLocation: {
    fontSize: 12,
    color: colors.textMuted,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  expandText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryLight,
  },
  entryList: {
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 6,
  },
  entryListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: radii.sm - 2,
    gap: 6,
  },
  entryListItemNearby: {
    backgroundColor: 'rgba(167, 139, 250, 0.08)',
  },
  entryListPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    minWidth: 42,
  },
  entryListInfo: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    minWidth: 0,
  },
  entryListStore: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  entryListLocation: {
    fontSize: 11,
    color: colors.textMuted,
  },
  entryListDate: {
    fontSize: 10,
    color: colors.textMuted,
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

  // Location chip
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  locationChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },

  // Location modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: '#1E1B2E',
    borderRadius: radii.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.white,
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  modalCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  modalCancelText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalSave: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
  },
  modalSaveText: {
    fontSize: 15,
    color: colors.white,
    fontWeight: '700',
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
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    marginHorizontal: spacing.md,
    marginVertical: spacing.lg,
    paddingVertical: 14,
    borderRadius: radii.md,
  },
  loadMoreButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
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
