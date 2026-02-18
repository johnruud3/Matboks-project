import { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { evaluatePrice, submitPrice } from '@/services/api';
import { saveToHistory } from '@/services/storage';
import { PriceEvaluation } from '@/types';
import { API_URL } from '@/utils/config';
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

  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<PriceEvaluation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [contributed, setContributed] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!barcode) return;
    let cancelled = false;
    fetch(`${API_URL}/api/product/${barcode}`)
      .then((res) => res.json())
      .then((data: { imageUrl?: string | null }) => {
        if (!cancelled && data.imageUrl) setImageUrl(data.imageUrl);
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
      await submitPrice({
        barcode: barcode || '',
        product_name: evaluation.product.name,
        price: evaluation.price,
        currency: 'NOK',
        store_name: storeName || undefined,
        location: location || undefined,
      });

      setContributed(true);
      Alert.alert(
        'Takk!',
        'Prisen din er lagt til i databasen og vil hjelpe andre brukere.'
      );
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

                <TextInput
                  style={styles.input}
                  placeholder="Butikk (valgfritt)"
                  placeholderTextColor={colors.textMuted}
                  value={storeName}
                  onChangeText={setStoreName}
                />

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
          </View>
        )}
      </ScrollView>
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
});
