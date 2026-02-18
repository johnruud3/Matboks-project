import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getHistory, clearHistory } from '@/services/storage';
import { ScanHistoryItem } from '@/types';
import { API_URL } from '@/utils/config';
import { colors, gradients, spacing, radii, glowShadow } from '@/utils/theme';

function HistoryItemImage({ barcode }: { barcode: string }) {
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

  if (imageUrl) {
    return <Image source={{ uri: imageUrl }} style={styles.productImage} resizeMode="cover" />;
  }

  return (
    <View style={styles.productImagePlaceholder}>
      <Ionicons name="image-outline" size={22} color={colors.textMuted} />
    </View>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'day' | 'week' | 'month'>('all');

  const loadHistory = async () => {
    const data = await getHistory();
    setHistory(data);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Slett historikk',
      'Er du sikker på at du vil slette all historikk?',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Slett',
          style: 'destructive',
          onPress: async () => {
            await clearHistory();
            setHistory([]);
          },
        },
      ]
    );
  };

  const getEvaluationColor = (evaluation: string) => {
    switch (evaluation) {
      case 'good': return colors.good;
      case 'average': return colors.average;
      case 'expensive': return colors.expensive;
      default: return colors.textMuted;
    }
  };

  const getEvaluationIcon = (evaluation: string) => {
    switch (evaluation) {
      case 'good': return 'checkmark-circle';
      case 'average': return 'alert-circle';
      case 'expensive': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const getEvaluationLabel = (evaluation: string) => {
    switch (evaluation) {
      case 'good': return 'Bra';
      case 'average': return 'Gjennomsnittlig';
      case 'expensive': return 'Dyrt';
      default: return evaluation;
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFilteredHistory = () => {
    const now = new Date();
    const filterDate = new Date();

    switch (filterPeriod) {
      case 'day':
        filterDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        filterDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        filterDate.setMonth(now.getMonth() - 1);
        break;
      default:
        return history;
    }

    return history.filter(item => new Date(item.timestamp) >= filterDate);
  };

  const calculateTotalSpent = () => {
    const filteredHistory = getFilteredHistory();
    return filteredHistory.reduce((total, item) => total + item.price, 0);
  };

  const getFilterLabel = () => {
    switch (filterPeriod) {
      case 'day': return 'I dag';
      case 'week': return 'Denne uken';
      case 'month': return 'Denne måneden';
      default: return 'Totalt';
    }
  };

  const renderItem = ({ item }: { item: ScanHistoryItem }) => (
    <View style={styles.historyItem}>
      <View style={styles.itemRow}>
        <HistoryItemImage barcode={item.barcode} />
        <View style={styles.itemDetails}>
          <View style={styles.itemHeader}>
            <Text style={styles.productName} numberOfLines={1}>{item.product.name}</Text>
            <Text style={styles.timestamp}>{formatDate(item.timestamp)}</Text>
          </View>

          <View style={styles.itemContent}>
            <View style={styles.priceSection}>
              <Text style={styles.price}>{item.price} NOK</Text>
              <View style={styles.evalBadge}>
                <Ionicons
                  name={getEvaluationIcon(item.evaluation) as any}
                  size={16}
                  color={getEvaluationColor(item.evaluation)}
                />
                <Text
                  style={[
                    styles.evaluation,
                    { color: getEvaluationColor(item.evaluation) },
                  ]}
                >
                  {getEvaluationLabel(item.evaluation)}
                </Text>
              </View>
            </View>
          </View>

          {item.product.brand && (
            <Text style={styles.brand}>{item.product.brand}</Text>
          )}
        </View>
      </View>
    </View>
  );

  const filteredHistory = getFilteredHistory();
  const totalSpent = calculateTotalSpent();

  return (
    <LinearGradient colors={[...gradients.screenBg]} style={styles.container}>
      {history.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="analytics-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyText}>Ingen skanninger ennå</Text>
          <Text style={styles.emptySubtext}>
            Skann ditt første produkt for å se historikk
          </Text>
          <TouchableOpacity
            style={[styles.scanButton, glowShadow]}
            onPress={() => router.push('/scanner')}
          >
            <LinearGradient
              colors={[...gradients.primaryBtn]}
              style={styles.scanButtonGradient}
            >
              <Ionicons name="camera-outline" size={20} color={colors.white} />
              <Text style={styles.scanButtonText}>Skann produkt</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Spending summary glass card */}
          <View style={[styles.spendingSummary, glowShadow]}>
            <View style={styles.spendingHeader}>
              <Text style={styles.spendingTitle}>Varer skannet:</Text>
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => {
                  const periods: Array<'all' | 'day' | 'week' | 'month'> = ['all', 'day', 'week', 'month'];
                  const currentIndex = periods.indexOf(filterPeriod);
                  const nextIndex = (currentIndex + 1) % periods.length;
                  setFilterPeriod(periods[nextIndex]);
                }}
              >
                <Text style={styles.filterText}>{getFilterLabel()}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.primaryLight} />
              </TouchableOpacity>
            </View>
            <Text style={styles.spendingAmount}>{totalSpent.toFixed(2)} NOK</Text>
            <Text style={styles.spendingSubtitle}>
              {filteredHistory.length} {filteredHistory.length === 1 ? 'vare' : 'varer'}
            </Text>
          </View>

          <FlatList
            data={filteredHistory}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearHistory}
            >
              <Ionicons name="trash-outline" size={18} color={colors.white} />
              <Text style={styles.clearButtonText}>Slett historikk</Text>
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
  listContent: {
    padding: spacing.md,
  },
  historyItem: {
    backgroundColor: colors.glassBg,
    padding: spacing.md,
    borderRadius: radii.lg,
    marginBottom: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  productImage: {
    width: 56,
    height: 56,
    borderRadius: radii.sm,
    marginRight: spacing.sm + 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  productImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: radii.sm,
    marginRight: spacing.sm + 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  itemDetails: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
    color: colors.white,
  },
  timestamp: {
    fontSize: 12,
    color: colors.textMuted,
  },
  itemContent: {
    marginBottom: 4,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  evalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  evaluation: {
    fontSize: 14,
    fontWeight: '600',
  },
  brand: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  emptySubtext: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  scanButton: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  scanButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
  },
  scanButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  clearButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: spacing.md,
    borderRadius: radii.lg,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  clearButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  spendingSummary: {
    backgroundColor: colors.glassBg,
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  spendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  spendingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  filterText: {
    fontSize: 14,
    color: colors.primaryLight,
    fontWeight: '600',
  },
  spendingAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.accentGlow,
    marginBottom: 4,
  },
  spendingSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
