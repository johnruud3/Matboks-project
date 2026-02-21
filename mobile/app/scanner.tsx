import { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients, radii, spacing, glowShadow } from '@/utils/theme';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);
  const router = useRouter();

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <LinearGradient colors={[...gradients.screenBg]} style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color={colors.textMuted} />
        <Text style={styles.message}>
          Vi trenger tilgang til kameraet for å skanne strekkoder
        </Text>
        <TouchableOpacity style={[styles.grantButton, glowShadow]} onPress={requestPermission}>
          <LinearGradient colors={[...gradients.primaryBtn]} style={styles.grantButtonGradient}>
            <Text style={styles.grantButtonText}>Gi tilgang</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scannedRef.current) return;

    scannedRef.current = true;

    router.push({
      pathname: '/result',
      params: { barcode: data },
    });

    setTimeout(() => {
      scannedRef.current = false;
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
        }}
      >
        <View style={styles.overlay}>
          {/* Scan area with glowing corners */}
          <View style={styles.scanArea}>
            {/* Top-left corner */}
            <View style={[styles.corner, styles.cornerTL]} />
            {/* Top-right corner */}
            <View style={[styles.corner, styles.cornerTR]} />
            {/* Bottom-left corner */}
            <View style={[styles.corner, styles.cornerBL]} />
            {/* Bottom-right corner */}
            <View style={[styles.corner, styles.cornerBR]} />

            <Text style={styles.scanText}>
              Plasser strekkoden i rammen
            </Text>
          </View>
        </View>
      </CameraView>

      {/* Frosted glass footer */}
      <BlurView intensity={80} tint="dark" style={styles.footer}>
        <TouchableOpacity
          style={styles.foodPhotoButton}
          onPress={() => router.push('/food-photo-capture')}
        >
          <Ionicons name="restaurant-outline" size={20} color={colors.white} />
          <Text style={styles.foodPhotoButtonText}>Bilde av mat</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={20} color={colors.white} />
          <Text style={styles.cancelButtonText}>Avbryt</Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const CORNER_SIZE = 32;
const CORNER_BORDER = 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
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
  grantButton: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    marginTop: spacing.sm,
  },
  grantButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.lg,
  },
  grantButtonText: {
    color: colors.white,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 300,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_BORDER,
    borderLeftWidth: CORNER_BORDER,
    borderColor: colors.primary,
    borderTopLeftRadius: radii.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_BORDER,
    borderRightWidth: CORNER_BORDER,
    borderColor: colors.primary,
    borderTopRightRadius: radii.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_BORDER,
    borderLeftWidth: CORNER_BORDER,
    borderColor: colors.primary,
    borderBottomLeftRadius: radii.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_BORDER,
    borderRightWidth: CORNER_BORDER,
    borderColor: colors.primary,
    borderBottomRightRadius: radii.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  scanText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  footer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  foodPhotoButton: {
    backgroundColor: 'rgba(124, 58, 237, 0.6)',
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  foodPhotoButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  cancelButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
