import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, glowShadow, gradients } from '@/utils/theme';
import {
  getCoachGoals,
  setCoachGoals,
  type CoachGoals,
  type CoachGoalType,
  type CoachGender,
} from '@/services/coachStorage';

const GOAL_OPTIONS: { value: CoachGoalType; label: string }[] = [
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

export default function CoachSettingsScreen() {
  const router = useRouter();
  const [goalType, setGoalType] = useState<CoachGoalType>('maintain');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [targetWeightKg, setTargetWeightKg] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<CoachGender | undefined>(undefined);

  useEffect(() => {
    getCoachGoals().then((g) => {
      if (!g) return;
      setGoalType(g.goalType);
      if (g.heightCm != null) setHeightCm(String(g.heightCm));
      if (g.weightKg != null) setWeightKg(String(g.weightKg));
      if (g.targetWeightKg != null) setTargetWeightKg(String(g.targetWeightKg));
      if (g.age != null) setAge(String(g.age));
      if (g.gender) setGender(g.gender);
    });
  }, []);

  const onSave = async () => {
    const goals: CoachGoals = {
      goalType,
      heightCm: heightCm ? parseInt(heightCm, 10) || undefined : undefined,
      weightKg: weightKg ? parseFloat(weightKg) || undefined : undefined,
      targetWeightKg: targetWeightKg ? parseFloat(targetWeightKg) || undefined : undefined,
      age: age ? parseInt(age, 10) || undefined : undefined,
      gender,
    };
    await setCoachGoals(goals);
    router.back();
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
            <Text style={styles.appTitle}>Mål og profil</Text>
            <Text style={styles.appSubtitle}>
              Jo mer du fyller inn, jo mer personlige råd får du fra coach. Alt er valgfritt.
            </Text>
          </View>
        </View>
      </LinearGradient>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Mål</Text>
            {GOAL_OPTIONS.map((opt) => (
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
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Om deg</Text>
            <View style={styles.glassCard}>
              <Text style={styles.inputLabel}>Høyde (cm)</Text>
              <TextInput
                style={styles.input}
                placeholder="f.eks. 175"
                placeholderTextColor={colors.textMuted}
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="numeric"
              />
              <Text style={styles.inputLabel}>Vekt (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="f.eks. 72"
                placeholderTextColor={colors.textMuted}
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="decimal-pad"
              />
              <Text style={styles.inputLabel}>Målvekt (kg) – valgfritt</Text>
              <TextInput
                style={styles.input}
                placeholder="f.eks. 68"
                placeholderTextColor={colors.textMuted}
                value={targetWeightKg}
                onChangeText={setTargetWeightKg}
                keyboardType="decimal-pad"
              />
              <Text style={styles.inputLabel}>Alder – valgfritt</Text>
              <TextInput
                style={styles.input}
                placeholder="f.eks. 30"
                placeholderTextColor={colors.textMuted}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
              />
              <Text style={styles.inputLabel}>Kjønn – valgfritt</Text>
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
          </View>

          <TouchableOpacity style={[styles.saveBtn, glowShadow]} onPress={onSave} activeOpacity={0.85}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.saveBtnGradient}>
              <Ionicons name="checkmark-circle" size={22} color={colors.white} />
              <Text style={styles.saveBtnText}>Lagre</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.backBtnText}>Tilbake</Text>
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
  content: { padding: spacing.lg, paddingTop: 20, paddingBottom: 40 },
  section: { marginBottom: spacing.xl },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryLight,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
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
  glassCard: {
    backgroundColor: colors.glassBg,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  inputLabel: { fontSize: 13, color: colors.textMuted, marginBottom: 6, marginTop: spacing.sm },
  input: {
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
  saveBtn: { borderRadius: radii.lg, overflow: 'hidden', marginTop: spacing.md },
  saveBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  backBtn: { marginTop: spacing.md, alignItems: 'center' },
  backBtnText: { color: colors.primaryLight, fontSize: 16 },
});
