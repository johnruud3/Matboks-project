import { useCallback, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii, glowShadow, gradients } from '@/utils/theme';
import { API_URL } from '@/utils/config';
import { getLogForDate, getCoachGoals, type CoachLogEntry } from '@/services/coachStorage';

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Frokost',
  lunch: 'Lunsj',
  dinner: 'Middag',
  snack: 'Snack',
};

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function CoachDayDetailScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date: string }>();
  const [entries, setEntries] = useState<CoachLogEntry[]>([]);
  const [targets, setTargets] = useState<{ dailyCalories: number; dailyProtein: number; dailyFat: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!date) return;
    const [log, goals] = await Promise.all([getLogForDate(date), getCoachGoals()]);
    setEntries(log);
    if (goals) {
      try {
        const res = await fetch(`${API_URL}/api/coach/targets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goals: {
              goalType: goals.goalType,
              heightCm: goals.heightCm,
              weightKg: goals.weightKg,
              age: goals.age,
              gender: goals.gender,
              targetWeightKg: goals.targetWeightKg,
            },
          }),
        });
        const data = (await res.json()) as { dailyCalories?: number; dailyProtein?: number; dailyFat?: number };
        if (res.ok && typeof data.dailyCalories === 'number' && typeof data.dailyProtein === 'number') {
          const fat = typeof data.dailyFat === 'number' ? data.dailyFat : 65;
          setTargets({ dailyCalories: data.dailyCalories, dailyProtein: data.dailyProtein, dailyFat: fat });
        } else {
          setTargets(null);
        }
      } catch {
        setTargets(null);
      }
    } else {
      setTargets(null);
    }
    setLoading(false);
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  if (!date) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Mangler dato</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Tilbake</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalCal = entries.reduce((s, e) => s + (e.calories || 0), 0);
  const totalProtein = entries.reduce((s, e) => s + (e.protein || 0), 0);
  const totalFat = entries.reduce((s, e) => s + (e.fat ?? 0), 0);

  return (
    <LinearGradient colors={['#0F0A1A', '#1A1128', '#251A3A']} style={styles.container}>
      <LinearGradient colors={[...gradients.header]} style={styles.appHeader}>
        <TouchableOpacity style={styles.appBackButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.white} />
          <Text style={styles.appBackButtonText}>Tilbake</Text>
        </TouchableOpacity>
        <View style={styles.appHeaderTitleRow}>
          <View style={styles.appHeaderTitleBlock}>
            <Text style={styles.appTitle}>{formatDateLabel(date)}</Text>
            <Text style={styles.appSubtitle}>Logg og mål for denne dagen</Text>
          </View>
        </View>
      </LinearGradient>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primaryLight} />
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {targets && (
            <View style={[styles.targetsCard, glowShadow]}>
              <Text style={styles.targetsCardTitle}>Mål denne dagen</Text>
              <Text style={styles.targetsCardText}>
                {targets.dailyCalories} kcal · {targets.dailyProtein} g protein · {targets.dailyFat} g fett
              </Text>
            </View>
          )}
          <View style={styles.totalsRow}>
            <View style={[styles.totalsBox, glowShadow]}>
              <Text style={styles.totalsLabel}>Kalorier</Text>
              <Text style={styles.totalsValue}>
                {totalCal}
                {targets ? ` / ${targets.dailyCalories}` : ''}
              </Text>
            </View>
            <View style={[styles.totalsBox, glowShadow]}>
              <Text style={styles.totalsLabel}>Protein (g)</Text>
              <Text style={styles.totalsValue}>
                {totalProtein}
                {targets ? ` / ${targets.dailyProtein}` : ''}
              </Text>
            </View>
            <View style={[styles.totalsBox, glowShadow]}>
              <Text style={styles.totalsLabel}>Fett (g)</Text>
              <Text style={styles.totalsValue}>
                {totalFat}
                {targets ? ` / ${targets.dailyFat}` : ''}
              </Text>
            </View>
          </View>
          {entries.length === 0 ? (
            <View style={[styles.emptyCard, glowShadow]}>
              <Text style={styles.emptyText}>Ingen mat logget denne dagen</Text>
            </View>
          ) : (
            entries.map((entry) => (
              <View key={entry.id} style={[styles.logRow, glowShadow]}>
                <View style={styles.logInfo}>
                  <View style={styles.logTitleRow}>
                    {entry.mealType ? (
                      <Text style={styles.logMealBadge}>{MEAL_LABELS[entry.mealType] ?? entry.mealType}</Text>
                    ) : null}
                    <Text style={styles.logName}>{entry.name}</Text>
                  </View>
                  <Text style={styles.logMacros}>
                    {entry.calories} kcal · {entry.protein}g protein
                    {entry.fat != null ? ` · ${entry.fat}g fett` : ''}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
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
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 40 },
  targetsCard: {
    backgroundColor: colors.glassBg,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: spacing.md,
  },
  targetsCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 2,
  },
  targetsCardText: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  totalsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  totalsBox: {
    flex: 1,
    backgroundColor: colors.glassBg,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  totalsLabel: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  totalsValue: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.glassBg,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: spacing.sm,
  },
  logInfo: { flex: 1 },
  logTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  logMealBadge: { fontSize: 11, fontWeight: '600', color: colors.primaryLight, textTransform: 'uppercase' },
  logName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  logMacros: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  emptyCard: {
    backgroundColor: colors.glassBg,
    padding: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
  },
  emptyText: { fontSize: 15, color: colors.textMuted },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  backBtn: { marginTop: spacing.md },
  backBtnText: { color: colors.primaryLight, fontSize: 16 },
});
