import { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '@/utils/config';
import { colors, gradients, spacing, radii, glowShadow } from '@/utils/theme';

export default function FoodPhotoCaptureScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <LinearGradient colors={[...gradients.screenBg]} style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color={colors.textMuted} />
        <Text style={styles.message}>Vi trenger tilgang til kameraet for å ta bilde av maten</Text>
        <TouchableOpacity style={[styles.grantButton, glowShadow]} onPress={requestPermission}>
          <LinearGradient colors={[...gradients.primaryBtn]} style={styles.grantButtonGradient}>
            <Text style={styles.grantButtonText}>Gi tilgang</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  const captureAndAnalyze = async () => {
    if (uploading || !cameraRef.current) return;
    setUploading(true);
    try {
      const photo = await (cameraRef.current as any).takePictureAsync?.({ quality: 0.8 });
      if (!photo?.uri) {
        Alert.alert('Feil', 'Kunne ikke ta bilde');
        setUploading(false);
        return;
      }
      const formData = new FormData();
      formData.append('photo', {
        uri: photo.uri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);
      const res = await fetch(`${API_URL}/api/coach/analyze-food-photo`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (!res.ok) throw new Error('Analyse feilet');
      const data = await res.json();
      router.replace({
        pathname: '/result',
        params: {
          type: 'meal',
          mealDescription: data.description ?? 'Måltid',
          mealCalories: String(data.estimatedCalories ?? 0),
          mealProtein: String(data.estimatedProtein ?? 0),
          mealFat: data.estimatedFat != null ? String(data.estimatedFat) : undefined,
        },
      });
    } catch (e) {
      Alert.alert('Feil', 'Kunne ikke analysere bildet. Prøv igjen.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef}>
        <View style={styles.overlay}>
          <Text style={styles.hint}>Ta bilde av måltidet</Text>
        </View>
      </CameraView>
      <BlurView intensity={80} tint="dark" style={styles.footer}>
        <TouchableOpacity
          style={[styles.captureButton, uploading && styles.captureButtonDisabled]}
          onPress={captureAndAnalyze}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Ionicons name="camera" size={32} color={colors.white} />
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Avbryt</Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  message: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  grantButton: { borderRadius: radii.lg, overflow: 'hidden', marginTop: spacing.sm },
  grantButtonGradient: { paddingVertical: 18, paddingHorizontal: spacing.xxl, borderRadius: radii.lg },
  grantButtonText: { color: colors.white, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  hint: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  footer: { padding: spacing.lg, paddingBottom: spacing.xl, alignItems: 'center', gap: spacing.sm },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: { opacity: 0.7 },
  cancelButton: { padding: spacing.sm },
  cancelButtonText: { color: colors.primaryLight, fontSize: 16 },
});
