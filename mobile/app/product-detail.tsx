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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { colors, gradients, spacing, radii, glowShadow } from '@/utils/theme';

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
      const response = await fetch(`${API_URL}/api/prices/history/${barcode}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch price history: ${response.status}`);
      }

      const data: PriceHistoryResponse = await response.json();
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
    if (history.length === 0) return null;

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
          color: (opacity = 1) => `rgba(167, 139, 250, ${opacity})`,
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
      <LinearGradient colors={[...gradients.screenBg]} style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primaryLight} />
        <Text style={styles.loadingText}>Laster prishistorikk...</Text>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={[...gradients.screenBg]} style={styles.centerContainer}>
        <Ionicons name="sad-outline" size={64} color={colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchPriceHistory}>
          <Text style={styles.retryButtonText}>Prøv igjen</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButtonAlt} onPress={() => router.back()}>
          <Text style={styles.backButtonAltText}>Tilbake</Text>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  const chartData = getChartData();
  const stats = getStats();
  const screenWidth = Dimensions.get('window').width;

  return (
    <LinearGradient colors={[...gradients.screenBg]} style={styles.outerContainer}>
      <ScrollView style={styles.container}>
        {/* Gradient header */}
        <LinearGradient colors={[...gradients.header]} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
            <Text style={styles.backButtonText}>Tilbake</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={2}>
            {productName}
          </Text>
          <Text style={styles.barcode}>Strekkode: {barcode}</Text>
        </LinearGradient>

        {history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="analytics-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyText}>Ingen prishistorikk ennå</Text>
            <Text style={styles.emptySubtext}>
              Vær den første til å bidra med en pris!
            </Text>
          </View>
        ) : (
          <>
            {/* Stats grid - glass cards */}
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
                  <Text style={[styles.statValue, { color: colors.good }]}>{stats.min.toFixed(2)} kr</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Høyest</Text>
                  <Text style={[styles.statValue, { color: colors.expensive }]}>{stats.max.toFixed(2)} kr</Text>
                </View>
              </View>
            )}

            {/* Chart - glass card */}
            {chartData && (
              <View style={[styles.chartContainer, glowShadow]}>
                <Text style={styles.chartTitle}>Prisutvikling</Text>
                <LineChart
                  data={chartData}
                  width={screenWidth - 64}
                  height={220}
                  chartConfig={{
                    backgroundColor: 'transparent',
                    backgroundGradientFrom: 'rgba(255,255,255,0.03)',
                    backgroundGradientTo: 'rgba(255,255,255,0.01)',
                    decimalPlaces: 2,
                    color: (opacity = 1) => `rgba(167, 139, 250, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.5})`,
                    style: {
                      borderRadius: 16,
                    },
                    propsForDots: {
                      r: '5',
                      strokeWidth: '2',
                      stroke: colors.primary,
                    },
                    propsForBackgroundLines: {
                      stroke: 'rgba(255,255,255,0.06)',
                    },
                  }}
                  bezier
                  style={styles.chart}
                />
              </View>
            )}

            {/* History list */}
            <View style={styles.historyContainer}>
              <Text style={styles.historyTitle}>
                Alle bidrag ({history.length})
              </Text>
              {history.map((item) => (
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
                        <View style={styles.detailRow}>
                          <Ionicons name="storefront-outline" size={14} color={colors.textMuted} />
                          <Text style={styles.historyDetail}>{item.store_name}</Text>
                        </View>
                      )}
                      {item.location && (
                        <View style={styles.detailRow}>
                          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                          <Text style={styles.historyDetail}>{item.location}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.glassBg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: radii.sm,
    marginBottom: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonAlt: {
    paddingVertical: spacing.sm,
  },
  backButtonAltText: {
    color: colors.primaryLight,
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: spacing.sm,
  },
  barcode: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    gap: spacing.sm + 4,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.glassBg,
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.accentGlow,
  },
  chartContainer: {
    backgroundColor: colors.glassBg,
    margin: spacing.md,
    marginTop: 0,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: spacing.md,
  },
  chart: {
    marginVertical: spacing.sm,
    borderRadius: radii.lg,
  },
  historyContainer: {
    padding: spacing.md,
    paddingTop: 0,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: spacing.sm + 4,
  },
  historyItem: {
    backgroundColor: colors.glassBg,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  historyPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.accentGlow,
  },
  historyDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  historyDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyDetail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
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
    textAlign: 'center',
  },
});
