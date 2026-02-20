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
import { UnifiedProductCard, type UnifiedFeedItem } from '@/components/UnifiedProductCard';
import { getFavoriteStores, setFavoriteStores } from '@/services/storage';
import { STORES } from '@/constants/stores';
import { getExpoPushTokenAsync, registerPushWithBackend } from '@/services/pushNotifications';

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

export default function CommunityScreen() {
  const router = useRouter();
  const { locationLabel: userCity, setManualCity, loading: locationLoading, permissionStatus, openSettings, isManualOverride, refresh: refreshLocation } = useUserLocation();
  const { addToCart, removeFromCart, isInCart, cartCount } = useCart();
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
  const [showFavoriteStoresModal, setShowFavoriteStoresModal] = useState(false);
  const [favoriteStores, setFavoriteStoresState] = useState<string[]>([]);
  const kassalLoadingRef = useRef(false);
  const kassalPageRef = useRef(1);
  const kassalHasMoreRef = useRef(true);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getFavoriteStores().then(setFavoriteStoresState);
  }, []);

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
      mode="feed"
      isInCart={isInCart(item.barcode)}
      onAddToCart={() => {
        if (isInCart(item.barcode)) removeFromCart(item.barcode);
        else handleAddToCart(item);
      }}
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
        <View style={styles.headerTitleRow}>
          <View>
            <Text style={styles.title}>Fellesskapspriser</Text>
            <Text style={styles.subtitle}>Fellesskapets priser</Text>
          </View>
          <TouchableOpacity
            style={styles.headerCartButton}
            onPress={() => router.push('/cart')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="cart-outline" size={26} color={colors.white} />
            {cartCount > 0 && (
              <View style={styles.headerCartBadge}>
                <Text style={styles.headerCartBadgeText}>
                  {cartCount > 99 ? '99+' : cartCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.locationChip}
          onPress={() => {
            setLocationInput('');
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

        <View style={styles.favoriteRow}>
          <TouchableOpacity
            style={styles.favoriteChip}
            onPress={() => router.push('/favorite-deals')}
          >
            <Ionicons name="pricetag" size={16} color={colors.primaryLight} />
            <Text style={styles.favoriteChipText}>Tilbud fra favorittbutikker</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.favoriteChip}
            onPress={() => setShowFavoriteStoresModal(true)}
          >
            <Ionicons name="heart-outline" size={16} color={colors.white} />
            <Text style={styles.favoriteChipText}>
              {favoriteStores.length > 0 ? `${favoriteStores.length} valgt` : 'Velg favorittbutikker'}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <Modal
        visible={showFavoriteStoresModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFavoriteStoresModal(false)}
      >
        <View style={styles.favoriteStoresModalOverlay}>
          <View style={styles.favoriteStoresModal}>
            <View style={styles.favoriteStoresModalHeader}>
              <Text style={styles.favoriteStoresModalTitle}>Favorittbutikker</Text>
              <TouchableOpacity onPress={() => setShowFavoriteStoresModal(false)} hitSlop={12}>
                <Ionicons name="close" size={28} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.favoriteStoresModalSubtitle}>
              Velg butikker du vil få varsler fra når det kommer nye priser. Du kan åpne «Tilbud fra favorittbutikker» når som helst.
            </Text>
            <FlatList
              data={STORES.filter((s) => s.code !== 'OTHER')}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const isSelected = favoriteStores.includes(item.name);
                return (
                  <TouchableOpacity
                    style={[styles.favoriteStoreOption, isSelected && styles.favoriteStoreOptionSelected]}
                    onPress={() => {
                      const next = isSelected
                        ? favoriteStores.filter((x) => x !== item.name)
                        : [...favoriteStores, item.name];
                      setFavoriteStoresState(next);
                    }}
                  >
                    {item.logo ? (
                      <SvgUri uri={item.logo} width={24} height={24} />
                    ) : (
                      <Ionicons name="storefront-outline" size={24} color={colors.textMuted} />
                    )}
                    <Text style={styles.favoriteStoreOptionText}>{item.name}</Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.primaryLight} />}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={styles.favoriteStoresDoneButton}
              onPress={async () => {
                await setFavoriteStores(favoriteStores);
                setShowFavoriteStoresModal(false);
                try {
                  const token = await getExpoPushTokenAsync();
                  if (token) await registerPushWithBackend(token, favoriteStores);
                } catch (_) {
                  // ignore
                }
              }}
            >
              <Text style={styles.favoriteStoresDoneButtonText}>Lagre</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
            {permissionStatus === 'granted' && !isManualOverride && (
              <View style={styles.permissionEnabledBlock}>
                <View style={styles.permissionEnabledRow}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.good} />
                  <Text style={styles.permissionEnabledText}>Posisjon er tillatt</Text>
                </View>
                {userCity ? (
                  <Text style={styles.permissionLocationSubtext}>Din posisjon: {userCity}</Text>
                ) : null}
              </View>
            )}
            {permissionStatus === 'granted' && isManualOverride && userCity && (
              <TouchableOpacity
                style={styles.useMyPositionButton}
                onPress={() => refreshLocation()}
              >
                <Ionicons name="locate" size={18} color={colors.primaryLight} />
                <Text style={styles.useMyPositionButtonText}>Bruk min posisjon (GPS)</Text>
              </TouchableOpacity>
            )}
            {permissionStatus === 'granted' && isManualOverride && userCity && (
              <Text style={styles.manualOverrideHint}>Viser priser for: {userCity}</Text>
            )}
            {permissionStatus === 'denied' && (
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={openSettings}
              >
                <Ionicons name="settings-outline" size={18} color={colors.primaryLight} />
                <Text style={styles.settingsButtonText}>Åpne innstillinger for å tillate posisjon</Text>
              </TouchableOpacity>
            )}
            <TextInput
              style={styles.modalInput}
              placeholder={permissionStatus === 'granted' && !isManualOverride ? 'Eller velg et annet sted (f.eks. Oslo)...' : 'f.eks. Oslo, Bergen, Trondheim...'}
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
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerCartButton: {
    position: 'relative',
    padding: spacing.sm,
  },
  headerCartBadge: {
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
  headerCartBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: 'bold',
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
    marginBottom: 0,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: spacing.md,
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
  favoriteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 5,
  },
  favoriteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  favoriteChipText: {
    fontSize: 13,
    color: colors.white,
    fontWeight: '500',
  },
  favoriteStoresModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  favoriteStoresModal: {
    backgroundColor: colors.darkBg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 32,
  },
  favoriteStoresModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  favoriteStoresModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  favoriteStoresModalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  favoriteStoreOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  favoriteStoreOptionSelected: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
  },
  favoriteStoreOptionText: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
  },
  favoriteStoresDoneButton: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radii.lg,
    alignItems: 'center',
  },
  favoriteStoresDoneButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  pushPermissionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pushPermissionCard: {
    backgroundColor: colors.darkBg,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  pushPermissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  pushPermissionSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  pushPermissionButtons: {
    gap: 12,
  },
  pushPermissionSecondaryButton: {
    paddingVertical: 14,
    borderRadius: radii.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  pushPermissionSecondaryText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  pushPermissionPrimaryButton: {
    paddingVertical: 14,
    borderRadius: radii.lg,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  pushPermissionPrimaryText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
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
  permissionEnabledBlock: {
    marginBottom: spacing.md,
  },
  permissionEnabledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  permissionEnabledText: {
    fontSize: 14,
    color: colors.good,
    fontWeight: '500',
  },
  permissionLocationSubtext: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
    marginLeft: 26,
  },
  useMyPositionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  useMyPositionButtonText: {
    fontSize: 14,
    color: colors.primaryLight,
    fontWeight: '600',
  },
  manualOverrideHint: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  settingsButtonText: {
    fontSize: 14,
    color: colors.primaryLight,
    fontWeight: '600',
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
