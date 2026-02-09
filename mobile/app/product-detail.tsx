import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';

interface PriceHistoryItem {
  id: string;
  barcode: string;
  product_name: string;
  price: number;
  currency: string;
  store_name?: string;
  location?: string;
  submitted_at: string;
}

interface PriceHistoryResponse {
  barcode: string;
  count: number;
  history: PriceHistoryItem[];
}

export default function ProductDetailScreen() {
  const router = useRouter();
  const { barcode, name } = useLocalSearchParams();
  const [history, setHistory] = useState<PriceHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const productName = typeof name === 'string' ? decodeURIComponent(name) : 'Produkt';

  useEffect(() => {
    fetchPriceHistory();
  }, [barcode]);

  const fetchPriceHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const API_URL = 'https://1price-project-production.up.railway.app';
      console.log('Fetching price history for barcode:', barcode);
      const response = await fetch(`${API_URL}/api/prices/history/${barcode}`);

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to fetch price history: ${response.status}`);
      }

      const data: PriceHistoryResponse = await response.json();
      console.log('Price history data:', data);
      setHistory(data.history || []);
    } catch (err) {
      console.error('Failed to fetch price history:', err);
      setError('Kunne ikke laste prishistorikk');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getChartData = () => {
    if (history.length === 0) {
      return null;
    }

    const labels = history.map((item) => formatDate(item.submitted_at));
    const data = history.map((item) => item.price);

    const uniqueLabels: string[] = [];
    const uniqueData: number[] = [];

    labels.forEach((label, index) => {
      if (!uniqueLabels.includes(label)) {
        uniqueLabels.push(label);
        uniqueData.push(data[index]);
      } else {
        const existingIndex = uniqueLabels.indexOf(label);
        uniqueData[existingIndex] = (uniqueData[existingIndex] + data[index]) / 2;
      }
    });

    const maxPoints = 10;
    const step = Math.ceil(uniqueLabels.length / maxPoints);
    const sampledLabels = uniqueLabels.filter((_, index) => index % step === 0);
    const sampledData = uniqueData.filter((_, index) => index % step === 0);

    return {
      labels: sampledLabels,
      datasets: [
        {
          data: sampledData,
          color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };
  };

  const getStats = () => {
    if (history.length === 0) return null;

    const prices = history.map((item) => item.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const latest = prices[prices.length - 1];

    return { min, max, avg, latest };
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8966d8" />
        <Text style={styles.loadingText}>Laster prishistorikk...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorEmoji}>😕</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchPriceHistory}>
          <Text style={styles.retryButtonText}>Prøv igjen</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButtonAlt} onPress={() => router.back()}>
          <Text style={styles.backButtonAltText}>← Tilbake</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const chartData = getChartData();
  const stats = getStats();
  const screenWidth = Dimensions.get('window').width;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Tilbake</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={2}>
          {productName}
        </Text>
        <Text style={styles.barcode}>Strekkode: {barcode}</Text>
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>📊</Text>
          <Text style={styles.emptyText}>Ingen prishistorikk ennå</Text>
          <Text style={styles.emptySubtext}>
            Vær den første til å bidra med en pris!
          </Text>
        </View>
      ) : (
        <>
          {stats && (
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Nåværende</Text>
                <Text style={styles.statValue}>{stats.latest.toFixed(2)} kr</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Gjennomsnitt</Text>
                <Text style={styles.statValue}>{stats.avg.toFixed(2)} kr</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Lavest</Text>
                <Text style={styles.statValue}>{stats.min.toFixed(2)} kr</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Høyest</Text>
                <Text style={styles.statValue}>{stats.max.toFixed(2)} kr</Text>
              </View>
            </View>
          )}

          {chartData && (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Prisutvikling 📈</Text>
              <LineChart
                data={chartData}
                width={screenWidth - 32}
                height={220}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 2,
                  color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: '6',
                    strokeWidth: '2',
                    stroke: '#d9c8f8',
                  },
                }}
                bezier
                style={styles.chart}
              />
            </View>
          )}

          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>
              Alle bidrag ({history.length})
            </Text>
            {history.map((item, index) => (
              <View key={item.id} style={styles.historyItem}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyPrice}>
                    {item.price.toFixed(2)} {item.currency}
                  </Text>
                  <Text style={styles.historyDate}>
                    {formatDateTime(item.submitted_at)}
                  </Text>
                </View>
                {(item.store_name || item.location) && (
                  <View style={styles.historyDetails}>
                    {item.store_name && (
                      <Text style={styles.historyDetail}>🏪 {item.store_name}</Text>
                    )}
                    {item.location && (
                      <Text style={styles.historyDetail}>📍 {item.location}</Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#d9c8f8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonAlt: {
    paddingVertical: 8,
  },
  backButtonAltText: {
    color: '#d9c8f8',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#d9c8f8',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 24,
  },
  backButton: {
    marginBottom: 16,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  barcode: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    fontFamily: 'monospace',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d9c8f8',
  },
  chartContainer: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  historyContainer: {
    padding: 16,
    paddingTop: 0,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  historyItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d9c8f8',
  },
  historyDate: {
    fontSize: 12,
    color: '#999',
  },
  historyDetails: {
    gap: 4,
  },
  historyDetail: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
