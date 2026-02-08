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
import { evaluatePrice } from '@/services/api';
import { saveToHistory } from '@/services/storage';
import { PriceEvaluation } from '@/types';

export default function ResultScreen() {
  const router = useRouter();
  const { barcode } = useLocalSearchParams<{ barcode: string }>();

  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState<PriceEvaluation | null>(null);

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
        return 'Gjennomsnittlig pris';
      case 'expensive':
        return 'Dyr pris';
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
              <Text style={styles.explanationTitle}>Vurdering</Text>
              <Text style={styles.explanationText}>{evaluation.explanation}</Text>
            </View>

            <TouchableOpacity
              style={styles.newScanButton}
              onPress={() => router.push('/scanner')}
            >
              <Text style={styles.newScanButtonText}>Skann nytt produkt</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.homeButton}
              onPress={() => router.push('/')}
            >
              <Text style={styles.homeButtonText}>Tilbake til hjem</Text>
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
    backgroundColor: '#fff',
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
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  evaluateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  resultSection: {
    gap: 16,
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
    borderWidth: 3,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
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
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 12,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  explanationText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
  },
  newScanButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  newScanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  homeButton: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  homeButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
