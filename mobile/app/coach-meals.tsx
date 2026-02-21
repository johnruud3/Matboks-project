import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii, gradients } from '@/utils/theme';
import { getSavedMeals, removeSavedMeal, type SavedMeal } from '@/services/coachStorage';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function nutritionLine(meal: SavedMeal): string {
  const parts = [
    meal.calories != null && meal.calories >= 0 ? `${meal.calories} kcal` : null,
    meal.protein != null && meal.protein >= 0 ? `${meal.protein} g protein` : null,
    meal.fat != null && meal.fat >= 0 ? `${meal.fat} g fett` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : '';
}

export default function CoachMealsScreen() {
  const router = useRouter();
  const [meals, setMeals] = useState<SavedMeal[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(() => {
    getSavedMeals().then(setMeals);
  }, []);

  useFocusEffect(load);

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const addToLog = (meal: SavedMeal) => {
    router.push({
      pathname: '/coach-add-food',
      params: {
        name: meal.name,
        ...(meal.calories != null && meal.calories >= 0 && { calories: String(meal.calories) }),
        ...(meal.protein != null && meal.protein >= 0 && { protein: String(meal.protein) }),
        ...(meal.fat != null && meal.fat >= 0 && { fat: String(meal.fat) }),
      },
    });
  };

  const deleteMeal = (meal: SavedMeal) => {
    removeSavedMeal(meal.id).then(load);
  };

  return (
    <LinearGradient colors={['#0F0A1A', '#1A1128', '#251A3A']} style={styles.container}>
      <LinearGradient colors={[...gradients.header]} style={styles.appHeader}>
        <TouchableOpacity style={styles.appBackButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.white} />
          <Text style={styles.appBackButtonText}>Tilbake</Text>
        </TouchableOpacity>
        <View style={styles.appHeaderTitleRow}>
          <View style={styles.appHeaderTitleBlock}>
            <Text style={styles.appTitle}>Mine måltider</Text>
            <Text style={styles.appSubtitle}>
              Oppskrifter du har lagret fra coach. Trykk for å se fremgangsmåte, eller legg til i dagens logg.
            </Text>
          </View>
        </View>
      </LinearGradient>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {meals.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIconWrap}>
              <Ionicons name="restaurant-outline" size={40} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyStateTitle}>Ingen lagrede måltider</Text>
            <Text style={styles.emptyStateSubtitle}>
              Spør coach f.eks. «Hvordan lager jeg havregrynsgrøt?» og lagre oppskriften når du får svaret.
            </Text>
          </View>
        ) : (
          meals.map((meal) => {
            const isExpanded = expandedId === meal.id;
            const nutrition = nutritionLine(meal);
            return (
              <View key={meal.id} style={styles.mealRow}>
                <TouchableOpacity
                  style={styles.mealRowHeader}
                  onPress={() => toggleExpand(meal.id)}
                  activeOpacity={0.6}
                >
                  <View style={styles.mealRowMain}>
                    <Text style={styles.mealName}>{meal.name}</Text>
                    {nutrition ? <Text style={styles.mealNutrition}>{nutrition}</Text> : null}
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textMuted}
                    style={{ opacity: 0.7 }}
                  />
                </TouchableOpacity>
                {isExpanded && (
                  <View style={styles.stepsBlock}>
                    <Text style={styles.stepsTitle}>Fremgangsmåte</Text>
                    {meal.steps.map((step, i) => (
                      <Text key={i} style={styles.stepText}>
                        {i + 1}. {step}
                      </Text>
                    ))}
                  </View>
                )}
                <View style={styles.mealActions}>
                  <TouchableOpacity
                    style={styles.addToLogRow}
                    onPress={() => addToLog(meal)}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="add-circle-outline" size={20} color={colors.primaryLight} />
                    <Text style={styles.addToLogRowText}>Legg til i dagens logg</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={{ opacity: 0.6 }} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteMeal(meal)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={styles.deleteBtn}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
  appHeaderTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
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
  scrollContent: { padding: spacing.lg, paddingBottom: 48 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
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
  mealRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  mealRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mealRowMain: { flex: 1 },
  mealName: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  mealNutrition: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  stepsBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  stepsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepText: { fontSize: 14, color: colors.textSecondary, lineHeight: 22, marginBottom: 4 },
  mealActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  addToLogRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addToLogRowText: {
    flex: 1,
    fontSize: 15,
    color: colors.primaryLight,
    fontWeight: '500',
  },
  deleteBtn: { padding: spacing.sm },
});
