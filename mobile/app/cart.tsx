import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SvgUri } from 'react-native-svg';
import { useCart } from '@/context/CartContext';
import { CartItem } from '@/types';
import { colors, gradients, spacing, radii, glowShadow } from '@/utils/theme';

function CartItemCard({
  item,
  onRemove,
  onPress,
}: {
  item: CartItem;
  onRemove: () => void;
  onPress: () => void;
}) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardContent}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.productImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="cube-outline" size={28} color={colors.textMuted} />
          </View>
        )}

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>

          <View style={styles.storeRow}>
            {item.storeLogo ? (
              <SvgUri uri={item.storeLogo} width={16} height={16} />
            ) : (
              <Ionicons name="storefront-outline" size={14} color={colors.textMuted} />
            )}
            <Text style={styles.storeName}>{item.storeName}</Text>
          </View>

          {item.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
              <Text style={styles.locationText}>{item.location}</Text>
            </View>
          )}

          <Text style={styles.addedDate}>Lagt til {formatDate(item.addedAt)}</Text>
        </View>

        <View style={styles.priceSection}>
          <Text style={styles.price}>{item.price} {item.currency}</Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={onRemove}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function CartScreen() {
  const router = useRouter();
  const { cart, removeFromCart, clearCart, cartCount } = useCart();
  const [removing, setRemoving] = useState<string | null>(null);

  const handleRemove = async (barcode: string) => {
    setRemoving(barcode);
    await removeFromCart(barcode);
    setRemoving(null);
  };

  const handleClearCart = () => {
    Alert.alert(
      'Tøm handleliste',
      'Er du sikker på at du vil fjerne alle produkter?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Tøm',
          style: 'destructive',
          onPress: () => clearCart(),
        },
      ]
    );
  };

  const handleProductPress = (item: CartItem) => {
    router.push({
      pathname: '/product-detail',
      params: { barcode: item.barcode, name: encodeURIComponent(item.name) },
    });
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.price, 0);

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
      ) : (
        <>
          <FlatList
            data={cart}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CartItemCard
                item={item}
                onRemove={() => handleRemove(item.barcode)}
                onPress={() => handleProductPress(item)}
              />
            )}
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
  listContent: {
    padding: spacing.md,
    paddingBottom: 180,
  },
  card: {
    backgroundColor: colors.glassBg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.md,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
    lineHeight: 20,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  storeName: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  addedDate: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  priceSection: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.accentGlow,
  },
  removeButton: {
    padding: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: radii.sm,
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
