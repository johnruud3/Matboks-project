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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { evaluatePrice, submitPrice } from '@/services/api';
import { saveToHistory } from '@/services/storage';
import { PriceEvaluation } from '@/types';

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

  const getEvaluationColor = (evaluation: string) => {
    switch (evaluation) {
      case 'good':
        return '#34C759';
      case 'average':
        return '#FF9500';
      case 'expensive':
        return '#FF3B30';
      default:
        return '#999';
    }
  };

  const getEvaluationEmoji = (evaluation: string) => {
    switch (evaluation) {
      case 'good':
        return '✅';
      case 'average':
        return '⚠️';
      case 'expensive':
        return '❌';
      default:
        return '❓';
    }
  };

  const getEvaluationLabel = (evaluation: string) => {
    switch (evaluation) {
      case 'good':
        return 'God pris';
      case 'average':
        return 'Gjennomsnittlig';
      case 'expensive':
        return 'Dyr';
      default:
        return 'Ukjent';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return '#34C759';
      case 'medium':
        return '#FF9500';
      case 'low':
        return '#FF3B30';
      default:
        return '#999';
    }
  };

  const getConfidenceLabel = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'Mye data';
      case 'medium':
        return 'Noe data';
      case 'low':
        return 'Lite data';
      default:
        return 'Ukjent';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.barcodeSection}>
          <Text style={styles.label}>Strekkode</Text>
          <Text style={styles.barcode}>{barcode}</Text>
        </View>

        {!evaluation && (
          <View style={styles.inputSection}>
            <Text style={styles.label}>Pris (NOK)</Text>
            <TextInput
              style={styles.input}
              placeholder="f.eks. 29.90"
              keyboardType="decimal-pad"
              value={price}
              onChangeText={setPrice}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.evaluateButton, loading && styles.buttonDisabled]}
              onPress={handleEvaluate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.evaluateButtonText}>Evaluer pris</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {evaluation && (
          <View style={styles.resultSection}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{evaluation.product.name}</Text>
              {evaluation.product.brand && (
                <Text style={styles.productBrand}>{evaluation.product.brand}</Text>
              )}
              {evaluation.product.category && (
                <Text style={styles.productCategory}>{evaluation.product.category}</Text>
              )}
            </View>

            <View
              style={[
                styles.evaluationCard,
                { borderColor: getEvaluationColor(evaluation.evaluation) },
              ]}
            >
              <Text style={styles.evaluationEmoji}>
                {getEvaluationEmoji(evaluation.evaluation)}
              </Text>
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

            <View style={styles.explanationCard}>
              <View style={styles.explanationHeader}>
                <Text style={styles.explanationTitle}>Vurdering</Text>
                <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor(evaluation.confidence) }]}>
                  <Text style={styles.confidenceText}>{getConfidenceLabel(evaluation.confidence)}</Text>
                </View>
              </View>
              <Text style={styles.explanationText}>{evaluation.explanation}</Text>
              {evaluation.confidence === 'low' && (
                <Text style={styles.disclaimerText}>
                  ⚠️ Begrenset data tilgjengelig. Evalueringen er basert på estimater.
                </Text>
              )}
            </View>

            {!contributed && (
              <View style={styles.contributeSection}>
                <Text style={styles.contributeTitle}>Bidra til fellesskapet 🤝</Text>
                <Text style={styles.contributeDescription}>
                  Hjelp andre ved å dele denne prisen. Jo flere som bidrar, jo bedre blir evalueringene!
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Butikk (valgfritt)"
                  value={storeName}
                  onChangeText={setStoreName}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Sted (valgfritt)"
                  value={location}
                  onChangeText={setLocation}
                />

                <TouchableOpacity
                  style={[styles.contributeButton, submitting && styles.buttonDisabled]}
                  onPress={handleContribute}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.contributeButtonText}>Bidra med pris</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {contributed && (
              <View style={styles.thanksCard}>
                <Text style={styles.thanksEmoji}>🎉</Text>
                <Text style={styles.thanksText}>Takk for ditt bidrag!</Text>
                <Text style={styles.thanksSubtext}>Du hjelper andre med å ta bedre kjøpsbeslutninger.</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.newScanButton}
              onPress={() => router.push('/scanner')}
            >
              <Text style={styles.newScanButtonText}>Skann nytt produkt</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.homeButton}
              onPress={() => router.push('/scanner')}
            >
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    padding: 20,
  },
  barcodeSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  barcode: {
    fontSize: 18,
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  inputSection: {
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    marginBottom: 16,
  },
  evaluateButton: {
    backgroundColor: '#8966d8',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#8966d8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  evaluateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  resultSection: {
    marginTop: 24,
  },
  productInfo: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 16,
    color: '#666',
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 14,
    color: '#999',
  },
  evaluationCard: {
    backgroundColor: '#fff',
    padding: 28,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  evaluationEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  evaluationLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  priceText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  explanationCard: {
    backgroundColor: '#fff',
    padding: 22,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  explanationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  explanationText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
  },
  disclaimerText: {
    fontSize: 13,
    color: '#FF9500',
    marginTop: 12,
    fontStyle: 'italic',
  },
  newScanButton: {
    backgroundColor: '#d9c8f8',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#d9c8f8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  newScanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  homeButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  homeButtonText: {
    color: '#d9c8f8',
    fontSize: 16,
    fontWeight: '600',
  },
  contributeSection: {
    backgroundColor: '#f0f8ff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  contributeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#007AFF',
  },
  contributeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  contributeButton: {
    backgroundColor: '#10B981',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  contributeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  thanksCard: {
    backgroundColor: '#f0fff4',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#34C759',
  },
  thanksEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  thanksText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 4,
  },
  thanksSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
