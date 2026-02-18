import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '@/context/CartContext';
import { CartItem } from '@/types';
import { API_URL } from '@/utils/config';
import { colors, gradients, spacing, radii, glowShadow } from '@/utils/theme';
import { UnifiedProductCard, getBestPrice, type UnifiedFeedItem } from '@/components/UnifiedProductCard';
import { useUserLocation } from '@/hooks/useUserLocation';

function buildUnifiedFromCartAndApi(
  cartItem: CartItem,
  product: { imageUrl?: string | null; currentPrice?: number | null; storeName?: string | null; storeLogo?: string | null; communityStats?: { minPrice: number; maxPrice: number; submissionCount: number } | null },
  recent: { prices: Array<{ store_name?: string; location?: string; price: number; submitted_at: string }> }
): UnifiedFeedItem {
  const entries = (recent.prices || []).map((p) => ({
    store_name: p.store_name ?? '',
    location: p.location ?? '',
    price: p.price,
    submitted_at: p.submitted_at,
  }));
  const communityMin = product.communityStats?.minPrice ?? (entries.length ? Math.min(...entries.map((e) => e.price)) : null);
  const communityMax = product.communityStats?.maxPrice ?? (entries.length ? Math.max(...entries.map((e) => e.price)) : null);
  return {
    barcode: cartItem.barcode,
    name: cartItem.name,
    image: cartItem.image || product.imageUrl || null,
    kassalPrice: product.currentPrice ?? null,
    kassalStore: product.storeName ?? null,
    kassalStoreLogo: product.storeLogo ?? null,
    communityMin,
    communityMax,
    submissionCount: product.communityStats?.submissionCount ?? entries.length,
    currency: cartItem.currency,
    stores: [...new Set(entries.map((e) => e.store_name).filter(Boolean))],
    locations: [...new Set(entries.map((e) => e.location).filter(Boolean))],
    entries,
    latestSubmission: entries[0]?.submitted_at ?? null,
    brand: null,
  };
}

export default function CartScreen() {
  const router = useRouter();
  const { city: userCity } = useUserLocation();
  const { cart, removeFromCart, clearCart, cartCount } = useCart();
  const [resolvedItems, setResolvedItems] = useState<Record<string, UnifiedFeedItem>>({});
  const [loading, setLoading] = useState(true);
  const prevCartBarcodesRef = useRef<Set<string>>(new Set());

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
  }, []);

  useEffect(() => {
    if (cart.length === 0) {
      setResolvedItems({});
      setLoading(false);
      prevCartBarcodesRef.current = new Set();
      return;
    }
    const currentBarcodes = new Set(cart.map((item) => item.barcode));
    const prevBarcodes = prevCartBarcodesRef.current;
    const isOnlyRemovals = currentBarcodes.size <= prevBarcodes.size && [...currentBarcodes].every((b) => prevBarcodes.has(b));
    const allResolved = [...currentBarcodes].every((b) => resolvedItems[b]);

    if (isOnlyRemovals && allResolved) {
      setResolvedItems((prev) => {
        const next: Record<string, UnifiedFeedItem> = {};
        currentBarcodes.forEach((b) => {
          if (prev[b]) next[b] = prev[b];
        });
        return next;
      });
      prevCartBarcodesRef.current = currentBarcodes;
      setLoading(false);
      return;
    }

    setLoading(true);
    prevCartBarcodesRef.current = currentBarcodes;
    const controller = new AbortController();
    const done = async () => {
      const next: Record<string, UnifiedFeedItem> = {};
      for (const item of cart) {
        try {
          const [productRes, recentRes] = await Promise.all([
            fetch(`${API_URL}/api/product/${item.barcode}`, { signal: controller.signal }),
            fetch(`${API_URL}/api/prices/recent/${item.barcode}?limit=50`, { signal: controller.signal }),
          ]);
          const product = await productRes.json();
          const recent = await recentRes.json();
          next[item.barcode] = buildUnifiedFromCartAndApi(item, product, recent);
        } catch {
          next[item.barcode] = buildUnifiedFromCartAndApi(item, {}, { prices: [] });
        }
      }
      setResolvedItems(next);
    };
    done().finally(() => setLoading(false));
    return () => controller.abort();
  }, [cart]);

  const handleRemove = async (barcode: string) => {
    setResolvedItems((prev) => {
      const next = { ...prev };
      delete next[barcode];
      return next;
    });
    await removeFromCart(barcode);
  };

  const handleClearCart = () => {
    Alert.alert(
      'Tøm handleliste',
      'Er du sikker på at du vil fjerne alle produkter?',
      [
        { text: 'Avbryt', style: 'cancel' },
        { text: 'Tøm', style: 'destructive', onPress: () => clearCart() },
      ]
    );
  };

  const totalPrice = Object.values(resolvedItems).reduce(
    (sum, item) => sum + getBestPrice(item, item.kassalPrice),
    0
  );

  return (
    <LinearGradient colors={[...gradients.screenBg]} style={styles.container}>
      <LinearGradient colors={[...gradients.header]} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.white} />
          <Text style={styles.backButtonText}>Tilbake</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Ionicons name="cart-outline" size={28} color={colors.white} />
          <Text style={styles.title}>Handleliste</Text>
        </View>
        {cartCount > 0 && (
          <Text style={styles.itemCount}>
            {cartCount} {cartCount === 1 ? 'produkt' : 'produkter'}
          </Text>
        )}
      </LinearGradient>

      {cart.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Handlelisten er tom</Text>
          <Text style={styles.emptySubtitle}>
            Legg til produkter fra fellesskapet eller etter skanning
          </Text>
          <TouchableOpacity
            style={[styles.browseButton, glowShadow]}
            onPress={() => router.push('/community')}
          >
            <LinearGradient colors={[...gradients.primaryBtn]} style={styles.browseButtonGradient}>
              <Ionicons name="search-outline" size={18} color={colors.white} />
              <Text style={styles.browseButtonText}>Se produkter</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
          <Text style={styles.loadingText}>Laster priser...</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={cart}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const unified = resolvedItems[item.barcode];
              if (!unified) return <View style={styles.cardPlaceholder}><ActivityIndicator size="small" color={colors.primaryLight} /></View>;
              return (
                <UnifiedProductCard
                  item={unified}
                  formatDate={formatDate}
                  userCity={userCity}
                  mode="cart"
                  onRemove={() => handleRemove(item.barcode)}
                  onPress={() =>
                    router.push({
                      pathname: '/product-detail',
                      params: { barcode: item.barcode, name: encodeURIComponent(item.name) },
                    })
                  }
                />
              );
            }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          <View style={styles.footer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Estimert total</Text>
              <Text style={styles.totalPrice}>{totalPrice.toFixed(2)} kr</Text>
            </View>
            <TouchableOpacity style={styles.clearButton} onPress={handleClearCart}>
              <Ionicons name="trash-outline" size={16} color={colors.danger} />
              <Text style={styles.clearButtonText}>Tøm liste</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
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
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
  },
  itemCount: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.white,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  browseButton: {
    marginTop: spacing.xl,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  browseButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  browseButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  cardPlaceholder: {
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 180,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.glassBg,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  totalLabel: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
  },
});
