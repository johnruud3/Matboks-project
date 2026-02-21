import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii, gradients } from '@/utils/theme';
import { getAvailableLogDates } from '@/services/coachStorage';

const WEEKDAYS = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

function formatDateParts(dateStr: string): { weekday: string; day: number; month: string } {
  const d = new Date(dateStr + 'T12:00:00');
  return {
    weekday: WEEKDAYS[d.getDay()],
    day: d.getDate(),
    month: MONTHS[d.getMonth()],
  };
}

function isToday(dateStr: string): boolean {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return dateStr === `${y}-${m}-${day}`;
}

export default function CoachHistoryScreen() {
  const router = useRouter();
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getAvailableLogDates().then((list) => {
        if (!cancelled) setDates(list);
      }).finally(() => {
        if (!cancelled) setLoading(false);
      });
      return () => { cancelled = true; };
    }, [])
  );

  return (
    <LinearGradient colors={['#0F0A1A', '#1A1128', '#251A3A']} style={styles.container}>
      <LinearGradient colors={[...gradients.header]} style={styles.appHeader}>
        <TouchableOpacity style={styles.appBackButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.white} />
          <Text style={styles.appBackButtonText}>Tilbake</Text>
        </TouchableOpacity>
        <View style={styles.appHeaderTitleRow}>
          <View style={styles.appHeaderTitleBlock}>
            <Text style={styles.appTitle}>Tidligere dager</Text>
            <Text style={styles.appSubtitle}>Trykk på en dag for å se logg og mål</Text>
          </View>
        </View>
      </LinearGradient>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
        </View>
      ) : dates.length === 0 ? (
        <View style={styles.centered}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>Ingen dager med logg</Text>
          <Text style={styles.emptySubtitle}>Mat du legger til i dagens logg vises her når du har logget noe.</Text>
        </View>
      ) : (
        <FlatList
          data={dates}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const { weekday, day, month } = formatDateParts(item);
            const today = isToday(item);
            return (
              <TouchableOpacity
                style={styles.dayRow}
                onPress={() => router.push({ pathname: '/coach-day-detail', params: { date: item } })}
                activeOpacity={0.6}
              >
                <View style={styles.dayLeft}>
                  <View style={styles.dayPill}>
                    <Text style={styles.dayNum}>{day}</Text>
                    <Text style={styles.dayMonth}>{month}</Text>
                  </View>
                  <View style={styles.dayTextWrap}>
                    <Text style={[styles.dayWeekday, today && styles.dayWeekdayToday]}>{weekday}</Text>
                    {today && <Text style={styles.dayTodayBadge}>I dag</Text>}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ opacity: 0.6 }} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  appHeader: {
    padding: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.lg,
  },
  appBackButton: {
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
  appBackButtonText: { fontSize: 16, color: colors.white, fontWeight: '600' },
  appHeaderTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  appHeaderTitleBlock: { flex: 1 },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 0,
    lineHeight: 20,
  },
  listContent: { padding: spacing.lg, paddingBottom: 48 },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  dayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dayPill: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  dayMonth: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'lowercase',
  },
  dayTextWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayWeekday: {
    fontSize: 17,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  dayWeekdayToday: { color: colors.primaryLight },
  dayTodayBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryLight,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});
