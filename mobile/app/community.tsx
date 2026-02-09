import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';

interface GroupedPrice {
  barcode: string;
  product_name: string;
  min_price: number;
  max_price: number;
  submission_count: number;
  currency: string;
  stores: string[];
  locations: string[];
  latest_submission: string;
}

export default function CommunityScreen() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<GroupedPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchSubmissions = async (append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      }

      const API_URL = 'https://1price-project-production.up.railway.app';
      const currentCount = append ? submissions.length : 0;
      const response = await fetch(`${API_URL}/api/prices/grouped?limit=${50 + currentCount}`);

      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }

      const data = await response.json();
      const newPrices = data.prices || [];

      if (append) {
        // Check if we got new items
        if (newPrices.length <= submissions.length) {
          setHasMore(false);
        } else {
          setSubmissions(newPrices);
        }
      } else {
        setSubmissions(newPrices);
        setHasMore(newPrices.length >= 50);
      }
    } catch (error) {
      console.error('Failed to fetch community prices:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubmissions();
  };

  const filteredSubmissions = submissions.filter((item) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      item.product_name.toLowerCase().includes(query) ||
      item.stores.some((store) => store.toLowerCase().includes(query)) ||
      item.locations.some((loc) => loc.toLowerCase().includes(query)) ||
      item.barcode.includes(query)
    );
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Akkurat nå';
    if (diffMins < 60) return `${diffMins} min siden`;
    if (diffHours < 24) return `${diffHours} timer siden`;
    if (diffDays === 1) return 'I går';
    if (diffDays < 7) return `${diffDays} dager siden`;

    return date.toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const renderItem = ({ item }: { item: GroupedPrice }) => {
    const priceDisplay = item.min_price === item.max_price
      ? `${item.min_price} ${item.currency}`
      : `${item.min_price} - ${item.max_price} ${item.currency}`;

    const countText = item.submission_count > 1 ? ` (${item.submission_count} bidrag)` : '';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/product-detail?barcode=${item.barcode}&name=${encodeURIComponent(item.product_name)}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.product_name}
          </Text>
          <View>
            <Text style={styles.price}>{priceDisplay}</Text>
            {item.submission_count > 1 && (
              <Text style={styles.countBadge}>{item.submission_count} bidrag</Text>
            )}
          </View>
        </View>

        <View style={styles.cardDetails}>
          {item.stores.length > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>🏪</Text>
              <Text style={styles.detailText}>{item.stores.join(', ')}</Text>
            </View>
          )}
          {item.locations.length > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailIcon}>📍</Text>
              <Text style={styles.detailText}>{item.locations.join(', ')}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🕐</Text>
            <Text style={styles.detailText}>{formatDate(item.latest_submission)}</Text>
          </View>
        </View>

        <Text style={styles.barcode}>Strekkode: {item.barcode}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Laster fellesskapspriser...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Tilbake</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Fellesskapspriser 🤝</Text>
        <Text style={styles.subtitle}>
          {submissions.length} bidrag fra brukere
        </Text>

        <TextInput
          style={styles.searchInput}
          placeholder="Søk etter produkt, butikk eller sted..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
      </View>

      <FlatList
        data={filteredSubmissions}
        renderItem={renderItem}
        keyExtractor={(item) => item.barcode}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={() => {
          if (!loadingMore && hasMore && !searchQuery) {
            fetchSubmissions(true);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingFooterText}>Laster flere...</Text>
            </View>
          ) : !hasMore && submissions.length > 0 ? (
            <View style={styles.loadingFooter}>
              <Text style={styles.endText}>Du har nådd slutten 🎉</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>{searchQuery ? '🔍' : '📦'}</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Ingen resultater' : 'Ingen priser ennå'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Prøv et annet søk' : 'Vær den første til å bidra!'}
            </Text>
          </View>
        }
      />
    </View>
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#8966d8',
    padding: 20,
    paddingTop: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productName: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 12,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#d9c8f8',
  },
  countBadge: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
    textAlign: 'right',
  },
  cardDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#666',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  barcode: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    padding: 6,
    borderRadius: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
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
  },
  loadingFooter: {
    padding: 20,
    alignItems: 'center',
  },
  loadingFooterText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  endText: {
    fontSize: 14,
    color: '#999',
  },
});
