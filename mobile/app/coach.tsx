import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors, spacing, radii, glowShadow, gradients } from '@/utils/theme';
import { API_URL } from '@/utils/config';
import {
  getHasCoachAccess,
  setHasCoachAccess,
  getHasSeenOnboarding,
  setHasSeenOnboarding,
  getCoachGoals,
  setCoachGoals,
  getTodayLog,
  removeLogEntry,
  getTipsCache,
  setTipsCache,
  type CoachGoals as CoachGoalsType,
  type CoachGoalType,
  type CoachLogEntry,
  type CoachGender,
} from '@/services/coachStorage';

const GOAL_LABELS: Record<CoachGoalType, string> = {
  lose_weight: 'Gå ned i vekt',
  maintain: 'Behold vekt',
  gain_weight: 'Gå opp i vekt',
  build_muscle: 'Bygg muskler',
};

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Frokost',
  lunch: 'Lunsj',
  dinner: 'Middag',
  snack: 'Snack',
};

export default function CoachScreen() {
  const router = useRouter();
  const [hasAccess, setHasAccessState] = useState<boolean | null>(null);
  const [seenOnboarding, setSeenOnboardingState] = useState<boolean | null>(null);
  const [goals, setGoalsState] = useState<CoachGoalsType | null>(null);
  const [log, setLog] = useState<CoachLogEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [tipsText, setTipsText] = useState<string | null>(null);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsError, setTipsError] = useState<string | null>(null);
  const [targets, setTargets] = useState<{ dailyCalories: number; dailyProtein: number; dailyFat: number } | null>(null);
  const [targetsLoading, setTargetsLoading] = useState(false);

  const fetchTips = useCallback(async () => {
    setTipsError(null);
    setTipsLoading(true);
    try {
      const g = goals ?? { goalType: 'maintain' };
      const res = await fetch(`${API_URL}/api/coach/advice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals: {
            goalType: g.goalType,
            heightCm: g.heightCm,
            weightKg: g.weightKg,
            age: g.age,
            gender: g.gender,
            targetWeightKg: g.targetWeightKg,
          },
          logEntries: log.map((e) => ({ name: e.name, calories: e.calories, protein: e.protein })),
        }),
      });
      const data = (await res.json()) as { advice?: string; error?: string };
      if (!res.ok) {
        setTipsError(data.error ?? 'Kunne ikke hente tips');
        return;
      }
      const advice = data.advice ?? null;
      setTipsText(advice);
      if (advice) await setTipsCache(advice);
    } catch {
      setTipsError('Sjekk internett og prøv igjen.');
    } finally {
      setTipsLoading(false);
    }
  }, [goals, log]);

  const fetchTargets = useCallback(async (g: CoachGoalsType | null) => {
    if (!g) return;
    setTargetsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/coach/targets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals: {
            goalType: g.goalType,
            heightCm: g.heightCm,
            weightKg: g.weightKg,
            age: g.age,
            gender: g.gender,
            targetWeightKg: g.targetWeightKg,
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
    } finally {
      setTargetsLoading(false);
    }
  }, []);

  const load = async (): Promise<{ access: boolean; seen: boolean; goals: CoachGoalsType | null; log: CoachLogEntry[] }> => {
    const [access, seen, g, todayLog, tipsCache] = await Promise.all([
      getHasCoachAccess(),
      getHasSeenOnboarding(),
      getCoachGoals(),
      getTodayLog(),
      getTipsCache(),
    ]);
    setHasAccessState(access);
    setSeenOnboardingState(seen);
    setGoalsState(g);
    setLog(todayLog);
    if (tipsCache?.text) setTipsText(tipsCache.text);
    if (g) fetchTargets(g);
    else setTargets(null);
    return { access, seen, goals: g, log: todayLog };
  };

  useEffect(() => {
    load();
  }, []);

  useFocusEffect(() => {
    getTodayLog().then(setLog);
  });

  const onRefresh = async () => {
    setRefreshing(true);
    const data = await load();
    if (data.access && data.seen) {
      setTipsLoading(true);
      setTipsError(null);
      try {
        const g = data.goals ?? { goalType: 'maintain' };
        const res = await fetch(`${API_URL}/api/coach/advice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            goals: {
              goalType: g.goalType,
              heightCm: g.heightCm,
              weightKg: g.weightKg,
              age: g.age,
              gender: g.gender,
              targetWeightKg: g.targetWeightKg,
            },
            logEntries: data.log.map((e) => ({ name: e.name, calories: e.calories, protein: e.protein })),
          }),
        });
        const json = (await res.json()) as { advice?: string; error?: string };
        if (res.ok) setTipsText(json.advice ?? null);
        else setTipsError(json.error ?? 'Kunne ikke hente tips');
      } catch {
        setTipsError('Sjekk internett og prøv igjen.');
      } finally {
        setTipsLoading(false);
      }
    }
    setRefreshing(false);
  };

  if (hasAccess === null || seenOnboarding === null) {
    return (
      <LinearGradient colors={['#1A1128', '#251A3A']} style={styles.container}>
        <LinearGradient colors={[...gradients.header]} style={styles.appHeader}>
          <TouchableOpacity style={styles.appBackButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
            <Text style={styles.appBackButtonText}>Tilbake</Text>
          </TouchableOpacity>
          <View style={styles.appHeaderTitleRow}>
            <Text style={styles.appTitle}>AI mat coach</Text>
          </View>
        </LinearGradient>
        <View style={[styles.centerBox, { paddingTop: 60 }]}>
          <Text style={styles.body}>Laster...</Text>
        </View>
      </LinearGradient>
    );
  }

  // Paywall placeholder
  if (hasAccess === false) {
    return (
      <LinearGradient colors={['#1A1128', '#251A3A']} style={styles.container}>
        <LinearGradient colors={[...gradients.header]} style={styles.appHeader}>
          <TouchableOpacity style={styles.appBackButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
            <Text style={styles.appBackButtonText}>Tilbake</Text>
          </TouchableOpacity>
          <View style={styles.appHeaderTitleRow}>
            <Text style={styles.appTitle}>AI mat coach</Text>
          </View>
        </LinearGradient>
        <View style={styles.centerBox}>
          <Ionicons name="lock-closed" size={48} color={colors.primaryLight} />
          <Text style={styles.title}>AI mat coach</Text>
          <Text style={styles.body}>
            AI mat coach er en betalt funksjon. Du kan sette mål, logge mat og få personlige råd basert på ditt inntak.
          </Text>
          <Text style={styles.comingSoon}>Kommer snart</Text>
          <TouchableOpacity
            style={styles.unlockBtn}
            onPress={async () => {
              await setHasCoachAccess(true);
              setHasAccessState(true);
              load();
            }}
          >
            <Text style={styles.unlockBtnText}>Åpne for testing</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // Onboarding (first time, has access)
  if (hasAccess === true && seenOnboarding === false) {
    return (
      <LinearGradient colors={['#0F0A1A', '#1A1128', '#251A3A']} style={styles.container}>
        <LinearGradient colors={[...gradients.header]} style={styles.appHeader}>
          <TouchableOpacity style={styles.appBackButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
            <Text style={styles.appBackButtonText}>Tilbake</Text>
          </TouchableOpacity>
          <View style={styles.appHeaderTitleRow}>
            <Text style={styles.appTitle}>AI mat coach</Text>
          </View>
        </LinearGradient>
        <OnboardingScreen
          initialGoals={goals}
          onSave={async (g) => {
            await setCoachGoals(g);
            await setHasSeenOnboarding();
            setGoalsState(g);
            setSeenOnboardingState(true);
            load();
          }}
          onBack={() => router.back()}
        />
      </LinearGradient>
    );
  }

  // Main coach screen
  const totalCal = log.reduce((s, e) => s + (e.calories || 0), 0);
  const totalProtein = log.reduce((s, e) => s + (e.protein || 0), 0);
  const totalFat = log.reduce((s, e) => s + (e.fat ?? 0), 0);

  return (
    <LinearGradient colors={['#0F0A1A', '#1A1128', '#251A3A']} style={styles.container}>
      <LinearGradient colors={[...gradients.header]} style={styles.appHeader}>
        <TouchableOpacity style={styles.appBackButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.white} />
          <Text style={styles.appBackButtonText}>Tilbake</Text>
        </TouchableOpacity>
        <View style={styles.appHeaderTitleRow}>
          <View>
            <Text style={styles.appTitle}>AI mat coach</Text>
            <Text style={styles.appSubtitle}>Dagens logg og tips</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.push('/coach-meals')} style={styles.mealsBtn} activeOpacity={0.7}>
              <Ionicons name="restaurant-outline" size={18} color={colors.primaryLight} />
              <Text style={styles.mealsBtnText}>Mine måltider</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/coach-settings')} style={styles.iconBtn} activeOpacity={0.7}>
              <Ionicons name="settings-outline" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryLight} />}
      >
        <Text style={styles.screenTitle}>Dagens logg</Text>

        {goals && (
          <View style={styles.goalsPill}>
            <Text style={styles.goalsPillText}>{GOAL_LABELS[goals.goalType]}</Text>
          </View>
        )}

        {targetsLoading ? (
          <View style={[styles.targetsRow, styles.targetsRowLoading]}>
            <ActivityIndicator size="small" color={colors.primaryLight} />
            <Text style={styles.targetsRowText}>Henter dagsmål…</Text>
          </View>
        ) : targets ? (
          <View style={styles.targetsRow}>
            <View style={styles.targetsRowInner}>
              <Text style={styles.targetsRowLabel}>Mål i dag</Text>
              <Text style={styles.targetsRowValue}>
                {targets.dailyCalories} kcal · {targets.dailyProtein} g protein · {targets.dailyFat} g fett
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.totalsRow}>
          <View style={styles.totalsPill}>
            <Text style={styles.totalsPillValue}>
              {totalCal}
              {targets ? ` / ${targets.dailyCalories}` : ''}
            </Text>
            <Text style={styles.totalsPillLabel}>kcal</Text>
            {targets ? (
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, (totalCal / targets.dailyCalories) * 100)}%` },
                  ]}
                />
              </View>
            ) : null}
          </View>
          <View style={styles.totalsPill}>
            <Text style={styles.totalsPillValue}>
              {totalProtein}
              {targets ? ` / ${targets.dailyProtein}` : ''}
            </Text>
            <Text style={styles.totalsPillLabel}>protein (g)</Text>
            {targets ? (
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, (totalProtein / targets.dailyProtein) * 100)}%` },
                  ]}
                />
              </View>
            ) : null}
          </View>
          <View style={styles.totalsPill}>
            <Text style={styles.totalsPillValue}>
              {totalFat}
              {targets ? ` / ${targets.dailyFat}` : ''}
            </Text>
            <Text style={styles.totalsPillLabel}>fett (g)</Text>
            {targets ? (
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, (totalFat / targets.dailyFat) * 100)}%` },
                  ]}
                />
              </View>
            ) : null}
          </View>
        </View>

        <TouchableOpacity
          style={styles.navRow}
          onPress={() => router.push('/coach-history')}
          activeOpacity={0.6}
        >
          <Ionicons name="calendar-outline" size={22} color={colors.textPrimary} />
          <Text style={styles.navRowText}>Tidligere dager</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ opacity: 0.6 }} />
        </TouchableOpacity>

        <View style={styles.tipsSection}>
          <Text style={styles.tipsSectionTitle}>Dagens tips</Text>
          {tipsLoading ? (
            <ActivityIndicator color={colors.primaryLight} style={{ marginVertical: spacing.md }} />
          ) : tipsError ? (
            <>
              <Text style={styles.tipsError}>{tipsError}</Text>
              <TouchableOpacity onPress={fetchTips} style={styles.tipsRetry}>
                <Text style={styles.tipsRetryText}>Prøv igjen</Text>
              </TouchableOpacity>
            </>
          ) : tipsText ? (
            <Text style={styles.tipsBody}>{tipsText}</Text>
          ) : (
            <TouchableOpacity onPress={fetchTips} style={styles.tipsFetchBtn} activeOpacity={0.7}>
              <Ionicons name="sparkles-outline" size={20} color={colors.primaryLight} />
              <Text style={styles.tipsFetchBtnText}>Hent dagens tips</Text>
            </TouchableOpacity>
          )}
        </View>

        {log.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIconWrap}>
              <Ionicons name="nutrition-outline" size={36} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyStateTitle}>Ingen mat logget i dag</Text>
            <Text style={styles.emptyStateSubtitle}>Legg til mat for å holde oversikt over kalorier og protein.</Text>
          </View>
        ) : (
          log.map((entry) => (
            <View key={entry.id} style={styles.logRow}>
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
              <TouchableOpacity
                onPress={async () => {
                  await removeLogEntry(entry.id);
                  setLog(await getTodayLog());
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.6}
              >
                <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/coach-add-food')}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.addButtonGradient}>
            <Ionicons name="add-circle-outline" size={22} color={colors.white} />
            <Text style={styles.addButtonText}>Legg til mat</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.askCoachRow}
          onPress={() => router.push('/coach-ask')}
          activeOpacity={0.6}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.textPrimary} />
          <Text style={styles.askCoachRowText}>Still coach et spørsmål</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ opacity: 0.6 }} />
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const GOAL_OPTIONS_ONBOARD: { value: CoachGoalType; label: string }[] = [
  { value: 'lose_weight', label: 'Gå ned i vekt' },
  { value: 'maintain', label: 'Behold vekt' },
  { value: 'gain_weight', label: 'Gå opp i vekt' },
  { value: 'build_muscle', label: 'Bygg muskler' },
];

const GENDER_OPTIONS: { value: CoachGender; label: string }[] = [
  { value: 'male', label: 'Mann' },
  { value: 'female', label: 'Kvinne' },
  { value: 'other', label: 'Annet' },
];

function OnboardingScreen({
  initialGoals,
  onSave,
  onBack,
}: {
  initialGoals: CoachGoalsType | null;
  onSave: (g: CoachGoalsType) => Promise<void>;
  onBack: () => void;
}) {
  const [step, setStep] = useState(1);
  const [goalType, setGoalType] = useState<CoachGoalType>(initialGoals?.goalType ?? 'maintain');
  const [heightCm, setHeightCm] = useState(initialGoals?.heightCm ? String(initialGoals.heightCm) : '');
  const [weightKg, setWeightKg] = useState(initialGoals?.weightKg ? String(initialGoals.weightKg) : '');
  const [targetWeightKg, setTargetWeightKg] = useState(initialGoals?.targetWeightKg ? String(initialGoals.targetWeightKg) : '');
  const [age, setAge] = useState(initialGoals?.age ? String(initialGoals.age) : '');
  const [gender, setGender] = useState<CoachGender | undefined>(initialGoals?.gender);

  const handleNext = () => {
    if (step === 1) setStep(2);
    else {
      onSave({
        goalType,
        heightCm: heightCm ? parseInt(heightCm, 10) || undefined : undefined,
        weightKg: weightKg ? parseFloat(weightKg) || undefined : undefined,
        targetWeightKg: targetWeightKg ? parseFloat(targetWeightKg) || undefined : undefined,
        age: age ? parseInt(age, 10) || undefined : undefined,
        gender,
      });
    }
  };

  return (
    <LinearGradient colors={['#0F0A1A', '#1A1128', '#251A3A']} style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.onboardingContent} showsVerticalScrollIndicator={false}>
          {step === 1 ? (
            <>
              <Text style={styles.title}>Sett dine mål</Text>
              <Text style={styles.body}>Velg hva du vil oppnå. Du kan endre dette senere.</Text>
              {GOAL_OPTIONS_ONBOARD.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.optionBtn, goalType === opt.value && styles.optionBtnActive]}
                  onPress={() => setGoalType(opt.value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.optionBtnText, goalType === opt.value && styles.optionBtnTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.primarySaveBtn, glowShadow]} onPress={handleNext} activeOpacity={0.85}>
                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.primarySaveBtnGradient}>
                  <Text style={styles.primarySaveBtnText}>Neste</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Om deg</Text>
              <Text style={styles.body}>
                Valgfritt – jo mer du fyller inn, jo mer personlige råd får du fra coach.
              </Text>
              <View style={styles.onboardingGlassCard}>
                <Text style={styles.inputLabel}>Høyde (cm)</Text>
                <TextInput
                  style={styles.onboardingInput}
                  placeholder="f.eks. 175"
                  placeholderTextColor={colors.textMuted}
                  value={heightCm}
                  onChangeText={setHeightCm}
                  keyboardType="numeric"
                />
                <Text style={styles.inputLabel}>Vekt (kg)</Text>
                <TextInput
                  style={styles.onboardingInput}
                  placeholder="f.eks. 72"
                  placeholderTextColor={colors.textMuted}
                  value={weightKg}
                  onChangeText={setWeightKg}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.inputLabel}>Målvekt (kg)</Text>
                <TextInput
                  style={styles.onboardingInput}
                  placeholder="valgfritt"
                  placeholderTextColor={colors.textMuted}
                  value={targetWeightKg}
                  onChangeText={setTargetWeightKg}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.inputLabel}>Alder</Text>
                <TextInput
                  style={styles.onboardingInput}
                  placeholder="valgfritt"
                  placeholderTextColor={colors.textMuted}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                />
                <Text style={styles.inputLabel}>Kjønn</Text>
                <View style={styles.genderRow}>
                  {GENDER_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.genderBtn, gender === opt.value && styles.genderBtnActive]}
                      onPress={() => setGender(opt.value)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.genderBtnText, gender === opt.value && styles.genderBtnTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TouchableOpacity style={[styles.primarySaveBtn, glowShadow]} onPress={handleNext} activeOpacity={0.85}>
                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.primarySaveBtnGradient}>
                  <Text style={styles.primarySaveBtnText}>Start</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
                <Text style={styles.backBtnText}>Tilbake</Text>
              </TouchableOpacity>
            </>
          )}
          {step === 1 && (
            <TouchableOpacity style={styles.backBtn} onPress={onBack}>
              <Text style={styles.backBtnText}>Avbryt</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  body: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg, lineHeight: 22 },
  comingSoon: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.lg },
  unlockBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
  },
  unlockBtnText: { 
    color: colors.white, 
    fontWeight: '600', 
    fontSize: 16 
  },
  backBtn: { 
    marginTop: spacing.md },
  backBtnText: { 
    color: colors.primaryLight, 
    fontSize: 16 
  },
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
  appBackButtonText: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
  },
  appHeaderTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
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
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mealsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  mealsBtnText: {
    fontSize: 13,
    color: colors.white,
    fontWeight: '500',
  },
  iconBtn: {
    padding: spacing.sm,
  },
  goalsPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    marginBottom: spacing.md,
  },
  goalsPillText: { color: colors.primaryLight, fontWeight: '600', fontSize: 13 },
  targetsRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: 0,
    marginBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  targetsRowLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  targetsRowInner: {},
  targetsRowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 2,
  },
  targetsRowText: { fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
  targetsRowValue: { fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
  totalsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  totalsPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  totalsPillValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  totalsPillLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: spacing.sm,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.primaryLight,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: 0,
    marginBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    gap: spacing.sm,
  },
  navRowText: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  logInfo: { flex: 1 },
  logTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  logMealBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryLight,
    textTransform: 'uppercase',
  },
  logName: { fontSize: 16, fontWeight: '500', color: colors.textPrimary },
  logMacros: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  emptyStateIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  addButton: { borderRadius: radii.lg, marginTop: spacing.md, overflow: 'hidden' },
  addButtonText: { color: colors.white, fontWeight: '600', fontSize: 16 },
  askCoachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: 0,
    marginTop: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    gap: spacing.sm,
  },
  askCoachRowText: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  tipsSection: {
    paddingVertical: spacing.md,
    marginBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  tipsSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tipsCardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  tipsBody: { fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
  tipsError: { fontSize: 14, color: colors.expensive, marginBottom: spacing.sm },
  tipsRetry: { alignSelf: 'flex-start', paddingVertical: spacing.sm, marginTop: spacing.sm },
  tipsRetryText: { fontSize: 14, color: colors.primaryLight, fontWeight: '600' },
  tipsFetchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  tipsFetchBtnText: { fontSize: 15, color: colors.primaryLight, fontWeight: '600' },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  onboardingContent: { padding: spacing.xl, paddingTop: 32, paddingBottom: 40 },
  optionBtn: {
    backgroundColor: colors.glassBg,
    padding: spacing.md,
    borderRadius: radii.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  optionBtnActive: { borderColor: colors.primaryLight, backgroundColor: 'rgba(124, 58, 237, 0.25)' },
  optionBtnText: { color: colors.textSecondary, fontSize: 16 },
  optionBtnTextActive: { color: colors.textPrimary, fontWeight: '600' },
  primarySaveBtn: { borderRadius: radii.lg, marginTop: spacing.lg, overflow: 'hidden' },
  primarySaveBtnGradient: { padding: spacing.md, alignItems: 'center' },
  primarySaveBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  onboardingGlassCard: {
    backgroundColor: colors.glassBg,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  inputLabel: { fontSize: 13, color: colors.textMuted, marginBottom: 6, marginTop: spacing.sm },
  onboardingInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  genderRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  genderBtn: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radii.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  genderBtnActive: { borderColor: colors.primaryLight, backgroundColor: 'rgba(124, 58, 237, 0.2)' },
  genderBtnText: { fontSize: 14, color: colors.textSecondary },
  genderBtnTextActive: { color: colors.textPrimary, fontWeight: '600' },
});
