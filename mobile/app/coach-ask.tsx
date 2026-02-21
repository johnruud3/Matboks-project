import { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii, gradients } from '@/utils/theme';
import { API_URL } from '@/utils/config';
import { getCoachGoals, getTodayLog, addSavedMeal, type CoachGoals as CoachGoalsType, type CoachLogEntry } from '@/services/coachStorage';

export default function CoachAskScreen() {
  const router = useRouter();
  const [goals, setGoals] = useState<CoachGoalsType | null>(null);
  const [log, setLog] = useState<CoachLogEntry[]>([]);
  const [askQuestion, setAskQuestion] = useState('');
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [adviceError, setAdviceError] = useState<string | null>(null);
  const [adviceText, setAdviceText] = useState<string | null>(null);
  const [adviceRecipe, setAdviceRecipe] = useState<{
    name: string;
    steps: string[];
    calories?: number;
    protein?: number;
    fat?: number;
  } | null>(null);
  const [recipeSaved, setRecipeSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([getCoachGoals(), getTodayLog()]).then(([g, todayLog]) => {
        if (!cancelled) {
          setGoals(g);
          setLog(todayLog);
        }
      });
      return () => { cancelled = true; };
    }, [])
  );

  const sendQuestion = useCallback(async () => {
    const q = askQuestion.trim();
    if (!q) return;
    setAdviceError(null);
    setAdviceText(null);
    setAdviceRecipe(null);
    setAdviceLoading(true);
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
          question: q,
        }),
      });
      const data = (await res.json()) as {
        advice?: string;
        error?: string;
        recipe?: { name: string; steps: string[]; calories?: number; protein?: number; fat?: number };
      };
      if (!res.ok) {
        setAdviceError(data.error ?? 'Noe gikk galt');
        return;
      }
      setAdviceText(data.advice ?? '');
      setAdviceRecipe(data.recipe ?? null);
      setRecipeSaved(false);
    } catch {
      setAdviceError('Sjekk internettforbindelsen og prøv igjen.');
    } finally {
      setAdviceLoading(false);
    }
  }, [goals, log, askQuestion]);

  return (
    <LinearGradient colors={['#0F0A1A', '#1A1128', '#251A3A']} style={styles.container}>
      <LinearGradient colors={[...gradients.header]} style={styles.appHeader}>
        <TouchableOpacity style={styles.appBackButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.white} />
          <Text style={styles.appBackButtonText}>Tilbake</Text>
        </TouchableOpacity>
        <View style={styles.appHeaderTitleRow}>
          <View style={styles.appHeaderTitleBlock}>
            <Text style={styles.appTitle}>Still coach et spørsmål</Text>
            <Text style={styles.appSubtitle}>Få råd eller oppskrifter basert på ditt mål og inntak</Text>
          </View>
        </View>
      </LinearGradient>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Spørsmålet ditt</Text>
            <Text style={styles.hint}>
              F.eks. «Er dette nok protein til treningsdag?» eller «Hva bør jeg spise til kvelds?»
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Skriv spørsmålet ditt..."
              placeholderTextColor={colors.textMuted}
              value={askQuestion}
              onChangeText={setAskQuestion}
              multiline
              editable={!adviceLoading}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!askQuestion.trim() || adviceLoading) && styles.sendBtnDisabled]}
              onPress={sendQuestion}
              disabled={adviceLoading || !askQuestion.trim()}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={askQuestion.trim() && !adviceLoading ? [colors.primary, colors.primaryDark] : [colors.textMuted, colors.textMuted]}
                style={styles.sendBtnGradient}
              >
                {adviceLoading ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color={colors.white} />
                    <Text style={styles.sendBtnText}>Send</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {adviceError ? (
            <View style={styles.section}>
              <Text style={styles.errorText}>{adviceError}</Text>
            </View>
          ) : null}

          {adviceText ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Coach svar</Text>
              <Text style={styles.answerBody}>{adviceText}</Text>
            </View>
          ) : null}

          {adviceRecipe ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Oppskrift</Text>
              <View style={styles.recipeCard}>
                <Text style={styles.recipeTitle}>{adviceRecipe.name}</Text>
                {(adviceRecipe.calories != null || adviceRecipe.protein != null || adviceRecipe.fat != null) && (
                  <Text style={styles.recipeNutrition}>
                    {[
                      adviceRecipe.calories != null ? `${adviceRecipe.calories} kcal` : null,
                      adviceRecipe.protein != null ? `${adviceRecipe.protein} g protein` : null,
                      adviceRecipe.fat != null ? `${adviceRecipe.fat} g fett` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                )}
                <View style={styles.recipeSteps}>
                  {adviceRecipe.steps.map((step, i) => (
                    <Text key={i} style={styles.recipeStepText}>
                      {i + 1}. {step}
                    </Text>
                  ))}
                </View>
                {recipeSaved ? (
                  <View style={styles.recipeSavedRow}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.primaryLight} />
                    <Text style={styles.recipeSavedText}>Lagret i Mine måltider</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.saveMealRow}
                    onPress={async () => {
                      await addSavedMeal({
                        name: adviceRecipe.name,
                        steps: adviceRecipe.steps,
                        calories: adviceRecipe.calories,
                        protein: adviceRecipe.protein,
                        fat: adviceRecipe.fat,
                      });
                      setRecipeSaved(true);
                    }}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="bookmark-outline" size={20} color={colors.primaryLight} />
                    <Text style={styles.saveMealRowText}>Lagre dette måltidet</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ opacity: 0.6 }} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 48 },
  section: {
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radii.lg,
    padding: spacing.md,
    fontSize: 16,
    color: colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  sendBtn: { borderRadius: radii.lg, overflow: 'hidden' },
  sendBtnDisabled: { opacity: 0.7 },
  sendBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  sendBtnText: { color: colors.white, fontWeight: '600', fontSize: 16 },
  errorText: { fontSize: 15, color: colors.expensive },
  answerBody: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  recipeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  recipeTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  recipeNutrition: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  recipeSteps: { marginBottom: spacing.md },
  recipeStepText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  recipeSavedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recipeSavedText: { fontSize: 14, color: colors.primaryLight, fontWeight: '600' },
  saveMealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  saveMealRowText: {
    flex: 1,
    fontSize: 15,
    color: colors.primaryLight,
    fontWeight: '500',
  },
});
