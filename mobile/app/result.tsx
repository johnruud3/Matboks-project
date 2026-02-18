import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  ViewStyle,
  Image,
  Dimensions,
  Modal,
  FlatList,
} from 'react-native';

// Predefined stores with logos
const STORES = [
  { name: 'KIWI', code: 'KIWI', logo: 'https://kassal.app/logos/Kiwi.svg' },
  { name: 'Rema 1000', code: 'REMA_1000', logo: null }, // TODO: Find correct logo URL
  { name: 'Meny', code: 'MENY_NO', logo: 'https://kassal.app/logos/Meny.svg' },
  { name: 'SPAR', code: 'SPAR_NO', logo: 'https://kassal.app/logos/Spar.svg' },
  { name: 'Coop Extra', code: 'COOP_EXTRA', logo: 'https://kassal.app/logos/Coop%20Extra.svg' },
  { name: 'Coop Prix', code: 'COOP_PRIX', logo: 'https://kassal.app/logos/Coop%20Prix.svg' },
  { name: 'Coop Mega', code: 'COOP_MEGA', logo: 'https://kassal.app/logos/Coop%20Mega.svg' },
  { name: 'Coop Obs', code: 'COOP_OBS', logo: 'https://kassal.app/logos/Coop%20Obs.svg' },
  { name: 'Joker', code: 'JOKER_NO', logo: 'https://kassal.app/logos/Joker.svg' },
  { name: 'Bunnpris', code: 'BUNNPRIS', logo: 'https://kassal.app/logos/Bunnpris.svg' },
  { name: 'Europris', code: 'EUROPRIS_NO', logo: 'https://kassal.app/logos/Europris.svg' },
  { name: 'Oda', code: 'ODA_NO', logo: 'https://kassal.app/logos/Oda.svg' },
  { name: 'Annen butikk', code: 'OTHER', logo: null },
];
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ConfettiCannon from 'react-native-confetti-cannon';
import { SvgUri } from 'react-native-svg';
import { evaluatePrice, submitPrice } from '@/services/api';
import { saveToHistory } from '@/services/storage';
import { PriceEvaluation } from '@/types';
import { API_URL } from '@/utils/config';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useCart } from '@/context/CartContext';
import {
  colors,
  gradients,
  spacing,
  radii,
  glowShadow,
  glowShadowGood,
  glowShadowAverage,
  glowShadowExpensive,
} from '@/utils/theme';

export default function ResultScreen() {
  const router = useRouter();
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const { addToCart, isInCart } = useCart();

  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<PriceEvaluation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [contributed, setContributed] = useState(false);
  const [selectedStore, setSelectedStore] = useState<typeof STORES[0] | null>(null);
  const [customStoreName, setCustomStoreName] = useState('');
  const [showStorePicker, setShowStorePicker] = useState(false);
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [storePrice, setStorePrice] = useState<number | null>(null);
  const [kassalStoreName, setKassalStoreName] = useState<string | null>(null);
  const [kassalStoreLogo, setKassalStoreLogo] = useState<string | null>(null);
  const [communityStats, setCommunityStats] = useState<{
    submissionCount: number;
    minPrice: number;
    maxPrice: number;
  } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const { city: detectedCity } = useUserLocation();

  useEffect(() => {
    if (detectedCity && !location) {
      setLocation(detectedCity);
    }
  }, [detectedCity]);

  useEffect(() => {
    if (!barcode) return;
    let cancelled = false;
    fetch(`${API_URL}/api/product/${barcode}`)
      .then((res) => res.json())
      .then((data: any) => {
        if (cancelled) return;
        if (data.imageUrl) setImageUrl(data.imageUrl);
        if (data.currentPrice) setStorePrice(data.currentPrice);
        if (data.storeName) setKassalStoreName(data.storeName);
        if (data.storeLogo) setKassalStoreLogo(data.storeLogo);
        if (data.communityStats) setCommunityStats(data.communityStats);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [barcode]);

  const handleEvaluate = async () => {
    if (!price || parseFloat(price) <= 0) {
      Alert.alert('Ugyldig pris', 'Vennligst skriv inn en gyldig pris');
      return;
    }

    setLoading(true);
    try {
      const result = await evaluatePrice({
        barcode: barcode || '',
        price: parseFloat(price),
        currency: 'NOK',
      });

      setEvaluation(result);
      await saveToHistory(result);
    } catch (error) {
      Alert.alert(
        'Feil',
        'Kunne ikke evaluere prisen. Sjekk internettforbindelsen og prøv igjen.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleContribute = async () => {
    if (!evaluation) return;

    setSubmitting(true);
    try {
      const finalStoreName = selectedStore?.code === 'OTHER' 
        ? customStoreName 
        : selectedStore?.name;
      
      await submitPrice({
        barcode: barcode || '',
        product_name: evaluation.product.name,
        price: evaluation.price,
        currency: 'NOK',
        store_name: finalStoreName || undefined,
        location: location || undefined,
      });

      setContributed(true);
      setShowConfetti(true);
    } catch (error) {
      Alert.alert(
        'Feil',
        'Kunne ikke sende inn prisen. Prøv igjen senere.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getEvaluationColor = (eval_: string) => {
    switch (eval_) {
      case 'good': return colors.good;
      case 'average': return colors.average;
      case 'expensive': return colors.expensive;
      default: return colors.textMuted;
    }
  };

  const getEvaluationGlow = (eval_: string): ViewStyle => {
    switch (eval_) {
      case 'good': return glowShadowGood;
      case 'average': return glowShadowAverage;
      case 'expensive': return glowShadowExpensive;
      default: return {};
    }
  };

  const getEvaluationEmoji = (eval_: string) => {
    switch (eval_) {
      case 'good': return 'checkmark-circle';
      case 'average': return 'alert-circle';
      case 'expensive': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const getEvaluationLabel = (eval_: string) => {
    switch (eval_) {
      case 'good': return 'God pris';
      case 'average': return 'Gjennomsnittlig';
      case 'expensive': return 'Dyr';
      default: return 'Ukjent';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return colors.good;
      case 'medium': return colors.average;
      case 'low': return colors.expensive;
      default: return colors.textMuted;
    }
  };

  const getConfidenceLabel = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'Mye data';
      case 'medium': return 'Noe data';
      case 'low': return 'Lite data';
      default: return 'Ukjent';
    }
  };

  return (
    <LinearGradient colors={[...gradients.screenBg]} style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Barcode section */}
        <View style={styles.glassCard}>
          <Text style={styles.label}>Strekkode</Text>
          <Text style={styles.barcode}>{barcode}</Text>
        </View>

        {!evaluation && (
          <View style={styles.inputSection}>
            <Text style={styles.label}>Pris (NOK)</Text>
            <TextInput
              style={styles.input}
              placeholder="f.eks. 29.90"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              value={price}
              onChangeText={setPrice}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.evaluateButton, glowShadow, loading && styles.buttonDisabled]}
              onPress={handleEvaluate}
              disabled={loading}
            >
              <LinearGradient
                colors={[...gradients.primaryBtn]}
                style={styles.evaluateButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.evaluateButtonText}>Evaluer pris</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {evaluation && (
          <View style={styles.resultSection}>
            {/* Product info with image */}
            <View style={styles.glassCard}>
              <View style={styles.productRow}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />
                ) : (
                  <View style={styles.productImagePlaceholder}>
                    <Ionicons name="image-outline" size={28} color={colors.textMuted} />
                  </View>
                )}
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{evaluation.product.name}</Text>
                  {evaluation.product.brand && (
                    <Text style={styles.productBrand}>{evaluation.product.brand}</Text>
                  )}
                  {evaluation.product.category && (
                    <Text style={styles.productCategory}>{evaluation.product.category}</Text>
                  )}
                </View>
              </View>

              {/* Badges */}
              {(storePrice || (communityStats && communityStats.submissionCount >= 2)) && (
                <View style={styles.badgeSection}>
                  {storePrice && (
                    <View style={styles.storePriceBadge}>
                      {kassalStoreLogo ? (
                        <SvgUri uri={kassalStoreLogo} width={16} height={16} />
                      ) : (
                        <Ionicons name="pricetag" size={13} color={colors.primaryLight} />
                      )}
                      <Text style={styles.storePriceText}>
                        Butikkpris: {storePrice} NOK
                      </Text>
                      {kassalStoreName && (
                        <Text style={styles.storeNameText}>({kassalStoreName})</Text>
                      )}
                    </View>
                  )}
                  {communityStats && communityStats.submissionCount >= 2 &&
                    (communityStats.maxPrice - communityStats.minPrice) <= 1 && (
                    <View style={styles.goodPriceBadge}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.good} />
                      <Text style={styles.goodPriceText}>God pris</Text>
                    </View>
                  )}
                  {communityStats && communityStats.submissionCount >= 5 && (
                    <View style={styles.popularBadge}>
                      <Ionicons name="flame" size={14} color="#FB923C" />
                      <Text style={styles.popularBadgeText}>Populær</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Evaluation card with glow */}
            <View
              style={[
                styles.evaluationCard,
                getEvaluationGlow(evaluation.evaluation),
                { borderColor: getEvaluationColor(evaluation.evaluation) },
              ]}
            >
              <Ionicons
                name={getEvaluationEmoji(evaluation.evaluation) as any}
                size={56}
                color={getEvaluationColor(evaluation.evaluation)}
              />
              <Text
                style={[
                  styles.evaluationLabel,
                  { color: getEvaluationColor(evaluation.evaluation) },
                ]}
              >
                {getEvaluationLabel(evaluation.evaluation)}
              </Text>
              <Text style={styles.priceText}>{evaluation.price} NOK</Text>
            </View>

            {/* Explanation card */}
            <View style={styles.glassCard}>
              <View style={styles.explanationHeader}>
                <Text style={styles.explanationTitle}>Vurdering</Text>
                <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(evaluation.confidence) }]}>
                  <Text style={styles.confidenceText}>{getConfidenceLabel(evaluation.confidence)}</Text>
                </View>
              </View>
              <Text style={styles.explanationText}>{evaluation.explanation}</Text>
              {evaluation.confidence === 'low' && (
                <Text style={styles.disclaimerText}>
                  Begrenset data tilgjengelig. Evalueringen er basert på estimater.
                </Text>
              )}
            </View>

            {/* Contribute section */}
            {!contributed && (
              <View style={[styles.glassCard, styles.contributeCard]}>
                <Ionicons name="people" size={24} color={colors.primaryLight} />
                <Text style={styles.contributeTitle}>Bidra til fellesskapet</Text>
                <Text style={styles.contributeDescription}>
                  Hjelp andre ved å dele denne prisen. Jo flere som bidrar, jo bedre blir evalueringene!
                </Text>

                <TouchableOpacity
                  style={styles.storePickerButton}
                  onPress={() => setShowStorePicker(true)}
                >
                  {selectedStore ? (
                    <View style={styles.selectedStoreRow}>
                      {selectedStore.logo ? (
                        <SvgUri uri={selectedStore.logo} width={20} height={20} />
                      ) : (
                        <Ionicons name="storefront" size={20} color={colors.primaryLight} />
                      )}
                      <Text style={styles.selectedStoreText}>
                        {selectedStore.code === 'OTHER' ? customStoreName || 'Annen butikk' : selectedStore.name}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.storePickerPlaceholder}>Velg butikk (valgfritt)</Text>
                  )}
                  <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                </TouchableOpacity>

                {selectedStore?.code === 'OTHER' && (
                  <TextInput
                    style={styles.input}
                    placeholder="Skriv butikknavn..."
                    placeholderTextColor={colors.textMuted}
                    value={customStoreName}
                    onChangeText={setCustomStoreName}
                  />
                )}

                <TextInput
                  style={styles.input}
                  placeholder="Sted (valgfritt)"
                  placeholderTextColor={colors.textMuted}
                  value={location}
                  onChangeText={setLocation}
                />

                <TouchableOpacity
                  style={[styles.contributeButton, submitting && styles.buttonDisabled]}
                  onPress={handleContribute}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.contributeButtonText}>Bidra med pris</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {contributed && (
              <View style={[styles.glassCard, styles.thanksCard]}>
                <Ionicons name="checkmark-circle" size={48} color={colors.good} />
                <Text style={styles.thanksText}>Takk for ditt bidrag!</Text>
                <Text style={styles.thanksSubtext}>Du hjelper andre med å ta bedre kjøpsbeslutninger.</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.newScanButton, glowShadow]}
              onPress={() => router.push('/scanner')}
            >
              <LinearGradient
                colors={[...gradients.primaryBtn]}
                style={styles.newScanGradient}
              >
                <Ionicons name="camera-outline" size={20} color={colors.white} />
                <Text style={styles.newScanButtonText}>Skann nytt produkt</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.communityButton}
              onPress={() => router.push('/community')}
            >
              <Ionicons name="people-outline" size={20} color={colors.primaryLight} />
              <Text style={styles.communityButtonText}>Se fellesskapets priser</Text>
            </TouchableOpacity>

            {evaluation && barcode && (
              <TouchableOpacity
                style={[
                  styles.cartButton,
                  isInCart(barcode) && styles.cartButtonActive,
                ]}
                onPress={() => {
                  const productPrice = communityStats?.minPrice || storePrice || evaluation.price || 0;
                  const store = kassalStoreName || selectedStore?.name || customStoreName || 'Ukjent butikk';
                  addToCart({
                    barcode,
                    name: evaluation.product.name,
                    image: imageUrl,
                    price: productPrice,
                    currency: evaluation.currency,
                    storeName: store,
                    storeLogo: kassalStoreLogo || selectedStore?.logo || null,
                    location: location || null,
                  });
                }}
              >
                <Ionicons
                  name={isInCart(barcode) ? 'checkmark-circle' : 'cart-outline'}
                  size={20}
                  color={isInCart(barcode) ? colors.good : colors.primaryLight}
                />
                <Text style={[
                  styles.cartButtonText,
                  isInCart(barcode) && styles.cartButtonTextActive,
                ]}>
                  {isInCart(barcode) ? 'Lagt til i handleliste' : 'Legg til i handleliste'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {showConfetti && (
        <ConfettiCannon
          count={150}
          origin={{ x: Dimensions.get('window').width / 2, y: -20 }}
          autoStart
          fadeOut
          fallSpeed={2500}
          colors={[colors.primary, colors.primaryLight, colors.accentGlow, colors.good, '#FBBF24', '#FB923C']}
          onAnimationEnd={() => setShowConfetti(false)}
        />
      )}

      <Modal
        visible={showStorePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStorePicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStorePicker(false)}
        >
          <View style={styles.storePickerModal}>
            <View style={styles.storePickerHeader}>
              <Text style={styles.storePickerTitle}>Velg butikk</Text>
              <TouchableOpacity onPress={() => setShowStorePicker(false)}>
                <Ionicons name="close" size={24} color={colors.white} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={STORES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.storeOption,
                    selectedStore?.code === item.code && styles.storeOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedStore(item);
                    if (item.code !== 'OTHER') {
                      setShowStorePicker(false);
                    }
                  }}
                >
                  {item.logo ? (
                    <SvgUri uri={item.logo} width={24} height={24} />
                  ) : (
                    <Ionicons name="storefront-outline" size={24} color={colors.textMuted} />
                  )}
                  <Text style={styles.storeOptionText}>{item.name}</Text>
                  {selectedStore?.code === item.code && (
                    <Ionicons name="checkmark" size={20} color={colors.primaryLight} />
                  )}
                </TouchableOpacity>
              )}
              style={styles.storeList}
            />
            {selectedStore && (
              <TouchableOpacity
                style={styles.clearStoreButton}
                onPress={() => {
                  setSelectedStore(null);
                  setCustomStoreName('');
                  setShowStorePicker(false);
                }}
              >
                <Text style={styles.clearStoreText}>Fjern valg</Text>
              </TouchableOpacity>
            )}
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
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  glassCard: {
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  barcode: {
    fontSize: 18,
    fontFamily: 'monospace',
    color: colors.white,
  },
  inputSection: {
    marginBottom: spacing.lg,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: 20,
    color: colors.white,
    marginBottom: spacing.md,
  },
  evaluateButton: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  evaluateButtonGradient: {
    padding: 18,
    alignItems: 'center',
    borderRadius: radii.lg,
  },
  evaluateButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  resultSection: {
    marginTop: spacing.sm,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
    marginRight: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  productImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
    marginRight: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 14,
    color: colors.textMuted,
  },
  badgeSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  storePriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(167, 139, 250, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
  },
  storePriceText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  storeNameText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  goodPriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
  },
  goodPriceText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.good,
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 146, 60, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.25)',
  },
  popularBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FB923C',
  },
  evaluationCard: {
    backgroundColor: colors.glassBg,
    padding: spacing.xl,
    borderRadius: radii.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
  },
  evaluationLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  priceText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.white,
  },
  explanationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
  },
  explanationText: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  disclaimerText: {
    fontSize: 13,
    color: colors.average,
    marginTop: spacing.sm + 4,
    fontStyle: 'italic',
  },
  contributeCard: {
    alignItems: 'center',
    borderColor: 'rgba(124, 58, 237, 0.3)',
  },
  contributeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    color: colors.primaryLight,
  },
  contributeDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
    textAlign: 'center',
  },
  contributeButton: {
    backgroundColor: colors.success,
    padding: 18,
    borderRadius: radii.lg,
    alignItems: 'center',
    width: '100%',
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  contributeButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  thanksCard: {
    alignItems: 'center',
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  thanksText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.good,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  thanksSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  newScanButton: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  newScanGradient: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
  },
  newScanButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  communityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  communityButtonText: {
    color: colors.primaryLight,
    fontSize: 15,
    fontWeight: '600',
  },
  cartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    backgroundColor: 'rgba(167, 139, 250, 0.1)',
  },
  cartButtonActive: {
    borderColor: 'rgba(52, 211, 153, 0.3)',
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
  },
  cartButtonText: {
    color: colors.primaryLight,
    fontSize: 15,
    fontWeight: '600',
  },
  cartButtonTextActive: {
    color: colors.good,
  },
  storePickerButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedStoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  selectedStoreText: {
    fontSize: 16,
    color: colors.white,
  },
  storePickerPlaceholder: {
    fontSize: 16,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  storePickerModal: {
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.lg,
    width: '100%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  storePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  storePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  storeList: {
    maxHeight: 400,
  },
  storeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  storeOptionSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  storeOptionText: {
    flex: 1,
    fontSize: 16,
    color: colors.white,
  },
  clearStoreButton: {
    padding: spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  clearStoreText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
