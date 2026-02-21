import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radii, gradients } from '@/utils/theme';
import { addLogEntry, type MealType } from '@/services/coachStorage';

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Frokost' },
  { value: 'lunch', label: 'Lunsj' },
  { value: 'dinner', label: 'Middag' },
  { value: 'snack', label: 'Snack' },
];

export default function CoachAddFoodScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string; calories?: string; protein?: string; fat?: string }>();
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [mealType, setMealType] = useState<MealType>('dinner');

  useEffect(() => {
    if (params.name) setName(params.name);
    if (params.calories) setCalories(params.calories);
    if (params.protein) setProtein(params.protein);
    if (params.fat) setFat(params.fat);
  }, [params.name, params.calories, params.protein, params.fat]);
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert('Mangler navn', 'Skriv inn navn på maten (f.eks. Havregryn).');
      return;
    }
    const cal = parseInt(calories, 10) || 0;
    const prot = parseInt(protein, 10) || 0;
    const fatG = parseInt(fat, 10) || 0;
    setSaving(true);
    try {
      await addLogEntry({
        name: name.trim(),
        calories: cal,
        protein: prot,
        ...(fatG > 0 && { fat: fatG }),
        mealType,
      });
      router.back();
    } catch {
      Alert.alert('Kunne ikke lagre', 'Noe gikk galt. Prøv igjen.');
    } finally {
      setSaving(false);
    }
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
            <Text style={styles.appTitle}>Legg til mat</Text>
            <Text style={styles.appSubtitle}>Fyll inn navn og næringsverdier for dagens logg</Text>
          </View>
        </View>
      </LinearGradient>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Måltid</Text>
            <View style={styles.mealTypeRow}>
              {MEAL_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.mealTypeChip, mealType === opt.value && styles.mealTypeChipActive]}
                  onPress={() => setMealType(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.mealTypeChipText, mealType === opt.value && styles.mealTypeChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Navn</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="f.eks. Havregryn"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Kalorier</Text>
            <View style={styles.fieldInputRow}>
              <TextInput
                style={styles.fieldInputNumeric}
                placeholder="350"
                placeholderTextColor={colors.textMuted}
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
              />
              <Text style={styles.fieldSuffix}>kcal</Text>
            </View>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Protein</Text>
            <View style={styles.fieldInputRow}>
              <TextInput
                style={styles.fieldInputNumeric}
                placeholder="12"
                placeholderTextColor={colors.textMuted}
                value={protein}
                onChangeText={setProtein}
                keyboardType="numeric"
              />
              <Text style={styles.fieldSuffix}>g</Text>
            </View>
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Fett</Text>
            <View style={styles.fieldInputRow}>
              <TextInput
                style={styles.fieldInputNumeric}
                placeholder="10"
                placeholderTextColor={colors.textMuted}
                value={fat}
                onChangeText={setFat}
                keyboardType="numeric"
              />
              <Text style={styles.fieldSuffix}>g</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={onSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={saving ? [colors.textMuted, colors.textMuted] : [colors.primary, colors.primaryDark]}
              style={styles.saveBtnGradient}
            >
              {saving ? (
                <Text style={styles.saveBtnText}>Lagrer…</Text>
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={22} color={colors.white} />
                  <Text style={styles.saveBtnText}>Lagre</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
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
  content: { padding: spacing.lg, paddingTop: 24, paddingBottom: 48 },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    gap: spacing.md,
  },
  mealTypeRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mealTypeChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radii.full,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  mealTypeChipActive: { backgroundColor: 'rgba(124, 58, 237, 0.35)' },
  mealTypeChipText: { fontSize: 13, color: colors.textMuted },
  mealTypeChipTextActive: { color: colors.primaryLight, fontWeight: '600' },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    minWidth: 72,
  },
  fieldInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  fieldInputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fieldInputNumeric: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: 4,
    paddingHorizontal: 0,
    minWidth: 60,
  },
  fieldSuffix: {
    fontSize: 14,
    color: colors.textMuted,
    minWidth: 40,
  },
  saveBtn: {
    borderRadius: radii.lg,
    marginTop: spacing.lg,
    overflow: 'hidden',
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});
