import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SvgUri } from 'react-native-svg';
import { API_URL } from '@/utils/config';
import { colors, spacing, radii, subtleShadow } from '@/utils/theme';

export interface StoreEntry {
  store_name: string;
  location: string;
  price: number;
  submitted_at: string;
}

export interface UnifiedFeedItem {
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

function getStoreLogo(storeName: string | null): string | null {
  if (!storeName) return null;
  const lower = storeName.toLowerCase();
  for (const [key, url] of Object.entries(STORE_LOGOS)) {
    if (lower.includes(key.toLowerCase())) return url;
  }
  return null;
}

function matchesCity(entryLocation: string, userCity: string): boolean {
  if (!entryLocation || !userCity) return false;
  const cityPart = (s: string) => s.split(',')[0].trim().toLowerCase();
  return cityPart(entryLocation) === cityPart(userCity);
}

export function getBestPrice(item: UnifiedFeedItem, storePrice: number | null): number {
  const hasCommunity = item.communityMin != null;
  const hasKassal = storePrice != null;
  return hasCommunity && hasKassal
    ? Math.min(item.communityMin!, storePrice!)
    : storePrice ?? item.communityMin ?? 0;
}

type Props = {
  item: UnifiedFeedItem;
  formatDate: (dateString: string) => string;
  onPress: () => void;
  userCity: string | null;
} & (
  | { mode: 'feed'; isInCart: boolean; onAddToCart: () => void }
  | { mode: 'cart'; onRemove: () => void }
  | { mode: 'result' }
);

export function UnifiedProductCard(props: Props) {
  const { item, formatDate, onPress, userCity } = props;
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
  const communityIsCheaper = hasKassal && hasCommunity && item.communityMin! < storePrice!;
  const bestPrice = getBestPrice(item, storePrice);

  const sortedEntries = [...item.entries].sort((a, b) => {
    const aMatch = userCity ? matchesCity(a.location, userCity) : false;
    const bMatch = userCity ? matchesCity(b.location, userCity) : false;
    if (aMatch !== bMatch) return aMatch ? -1 : 1;
    return a.price - b.price;
  });
  const nearbyEntry = userCity ? sortedEntries.find((e) => matchesCity(e.location, userCity)) : null;
  const bestEntry = nearbyEntry || sortedEntries[0] || null;

  const headerAction =
    props.mode === 'feed' ? (
      <TouchableOpacity
        style={[styles.cartButton, props.isInCart && styles.cartButtonActive]}
        onPress={(e) => { e.stopPropagation(); props.onAddToCart(); }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name={props.isInCart ? 'checkmark-circle' : 'cart-outline'} size={20} color={props.isInCart ? colors.good : colors.primaryLight} />
      </TouchableOpacity>
    ) : props.mode === 'cart' ? (
      <TouchableOpacity
        style={styles.removeButton}
        onPress={(e) => { e.stopPropagation(); props.onRemove(); }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={20} color={colors.danger} />
      </TouchableOpacity>
    ) : null;

  return (
    <TouchableOpacity style={[styles.card, subtleShadow]} onPress={onPress} activeOpacity={0.7}>
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
              {headerAction}
            </View>
          </View>

          <View style={styles.priceSection}>
            {hasKassal && (
              <View style={styles.kassalRow}>
                {storeLogo ? <SvgUri uri={storeLogo} width={18} height={18} /> : <Ionicons name="pricetag" size={13} color={colors.primaryLight} />}
                <Text style={styles.kassalLabel}>Billigste butikkpris</Text>
                <Text style={styles.kassalValue}>{storePrice} {item.currency}</Text>
                {storeName && <Text style={styles.kassalStore}>{storeName}</Text>}
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
                      {getStoreLogo(bestEntry.store_name) ? (
                        <SvgUri uri={getStoreLogo(bestEntry.store_name)!} width={18} height={18} />
                      ) : (
                        <Ionicons name="storefront-outline" size={16} color={colors.textMuted} />
                      )}
                      <Text style={styles.entryStoreCompact}>{bestEntry.store_name || 'Ukjent butikk'}</Text>
                      {bestEntry.location ? <Text style={styles.entryLocationCompact}>{bestEntry.location}</Text> : null}
                    </View>
                    <Text style={styles.entryPriceCompact}>{bestEntry.price} kr</Text>
                  </View>
                )}
                {communityIsCheaper && (
                  <View style={styles.cheaperRowCompact}>
                    <Ionicons name="trending-down" size={12} color={colors.good} />
                    <Text style={styles.cheaperTextCompact}>{(storePrice! - item.communityMin!).toFixed(0)} kr billigere</Text>
                  </View>
                )}
                {sortedEntries.length > 1 && (
                  <>
                    <TouchableOpacity style={styles.expandButtonCompact} onPress={() => setExpanded(!expanded)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={styles.expandTextCompact}>{expanded ? 'Skjul' : `+${sortedEntries.length - 1} butikker`}</Text>
                      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={colors.textMuted} />
                    </TouchableOpacity>
                    {expanded && (
                      <View style={styles.entryListCompact}>
                        {sortedEntries.slice(1).map((entry, i) => (
                          <View key={`${entry.store_name}-${entry.location}-${i}`} style={styles.entryListItemCompact}>
                            {getStoreLogo(entry.store_name) ? (
                              <SvgUri uri={getStoreLogo(entry.store_name)!} width={14} height={14} />
                            ) : (
                              <Ionicons name="storefront-outline" size={14} color={colors.textMuted} />
                            )}
                            <Text style={styles.entryListStoreCompact} numberOfLines={1}>{entry.store_name || 'Ukjent'}</Text>
                            {entry.location && <Text style={styles.entryListLocationCompact} numberOfLines={1}>{entry.location}</Text>}
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.glassBg,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
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
  cardContent: { flex: 1, minWidth: 0 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cartButton: {
    padding: 6,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
  },
  cartButtonActive: { backgroundColor: 'rgba(52, 211, 153, 0.15)', borderColor: 'rgba(52, 211, 153, 0.3)' },
  removeButton: {
    padding: 6,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  productName: { flex: 1, fontSize: 16, fontWeight: 'bold', color: colors.white, marginRight: spacing.sm + 4 },
  bestPrice: { fontSize: 18, fontWeight: 'bold', color: colors.accentGlow },
  priceSection: { gap: 6, marginBottom: spacing.sm + 2 },
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
  kassalLabel: { fontSize: 12, fontWeight: '700', color: colors.primaryLight },
  kassalValue: { fontSize: 12, fontWeight: '600', color: colors.primaryLight, marginLeft: 'auto' },
  kassalStore: { fontSize: 11, color: colors.textMuted, marginLeft: 4 },
  communitySection: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
    gap: 4,
  },
  communityHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  communityLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  communityEntryCompact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  entryStoreRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  entryStoreCompact: { fontSize: 13, fontWeight: '600', color: colors.white },
  entryLocationCompact: { fontSize: 11, color: colors.textMuted },
  entryPriceCompact: { fontSize: 14, fontWeight: '700', color: colors.white },
  cheaperRowCompact: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cheaperTextCompact: { fontSize: 10, fontWeight: '600', color: colors.good },
  expandButtonCompact: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 4 },
  expandTextCompact: { fontSize: 11, color: colors.textMuted },
  entryListCompact: { gap: 2, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.05)', paddingTop: 6 },
  entryListItemCompact: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  entryListStoreCompact: { fontSize: 11, color: colors.textSecondary, flex: 1 },
  entryListLocationCompact: { fontSize: 10, color: colors.textMuted },
  entryListPriceCompact: { fontSize: 12, fontWeight: '600', color: colors.white },
});
