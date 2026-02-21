import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors, gradients, spacing, radii, glowShadow } from '@/utils/theme';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <LinearGradient colors={[...gradients.home]} style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Image
          source={require('../assets/White-matboksen-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>
          Skann strekkoder og få prisvurderinger fra AI 
        </Text>
        <Text style={styles.subtitle2}>
          Få tilbudspriser fra nærmeste butikk
        </Text>
      </View>

      <Image
        source={require('../assets/Mascot_scanning.png')}
        style={styles.logo2}
        resizeMode="contain"
      />
      <View>
        <Text style={styles.cautionText}>
          Denne versjonen er en betaversjon. Du kan oppleve feil eller ustabilitet. Ved crash eller feil: del gjerne crash-rapport og gi tilbakemelding via TestFlight.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        {/* Primary CTA - Glassmorphic with glow */}
        <TouchableOpacity
          style={[styles.primaryButton, glowShadow]}
          onPress={() => router.push('/scanner')}
          activeOpacity={0.8}
        >
          <BlurView intensity={60} tint="light" style={styles.blurWrap}>
            <View style={styles.buttonContent}>
              <Ionicons name="camera-outline" size={24} color={colors.white} />
              <Text style={styles.primaryButtonText}>Skann produkt</Text>
            </View>
          </BlurView>
        </TouchableOpacity>

        {/* Secondary buttons - Glass treatment */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/community')}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            <MaterialIcons name="groups" size={20} color={colors.white} />
            <Text style={styles.secondaryButtonText}>Fellesskapspriser</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/coach')}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="fitness-outline" size={20} color={colors.white} />
            <Text style={styles.secondaryButtonText}>AI mat coach</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/receipt-scanner')}
          activeOpacity={0.8}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="receipt-outline" size={20} color={colors.white} />
            <Text style={styles.secondaryButtonText}>Skann kvittering <Text style={styles.comingSoonLabel}>(Fungerer ikke)</Text></Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
         AI-drevet mat og prisanalyse · Produktinfo fra Open Food Facts
        </Text>
        <Text style={styles.footerTextSmall}>
          av John-Kristian G. Ruud
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
  },
  logo: {
    width: '110%',
    marginTop: '-10%',
    height: undefined,
    aspectRatio: 1.47,
    transform: [{ scale: 1.7 }],
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 1,
    marginTop: '-36%',
    lineHeight: 12,
  },
  subtitle2: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 3,
    lineHeight: 12,
  },
  logo2: {
    width: '170%',
    height: '50%',
    alignSelf: 'center',
    marginVertical: -70,
  },
  cautionText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginBottom: 24,
    lineHeight: 22,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 12,
  },
  buttonContainer: {
    gap: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: 'auto',
  },
  primaryButton: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  blurWrap: {
    padding: spacing.md,
    overflow: 'hidden',
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: colors.glassBg,
    padding: 14,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  secondaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  comingSoonLabel: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 5,
    paddingBottom: spacing.sm + 2,
    paddingTop: spacing.sm,
    transform: [{ translateY: -12 }],
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerTextSmall: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
