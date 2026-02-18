import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { evaluatePrice, submitPrice } from '@/services/api';
import { saveToHistory } from '@/services/storage';
import { PriceEvaluation } from '@/types';
import { colors, gradients, spacing, radii, glowShadow } from '@/utils/theme';

interface ReceiptItem {
  name: string;
  price: number;
  quantity?: number;
}

export default function ReceiptScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);
  const router = useRouter();
  const [receiptItems, setReceiptItems] = useState<ReceiptItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <LinearGradient colors={[...gradients.screenBg]} style={styles.permissionContainer}>
        <Ionicons name="receipt-outline" size={64} color={colors.textMuted} />
        <Text style={styles.message}>
          Vi trenger tilgang til kameraet for å skanne kvitteringer
        </Text>
        <TouchableOpacity style={[styles.grantButton, glowShadow]} onPress={requestPermission}>
          <LinearGradient colors={[...gradients.primaryBtn]} style={styles.grantButtonGradient}>
            <Text style={styles.grantButtonText}>Gi tilgang</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  const handleReceiptScanned = async () => {
    if (scannedRef.current || processing) return;

    scannedRef.current = true;
    setProcessing(true);

    try {
      const API_URL = 'https://1price-project-production.up.railway.app';

      const response = await fetch(`${API_URL}/api/receipt/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          placeholder: 'receipt_scan_request',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to scan receipt');
      }

      const data = await response.json();
      const items: ReceiptItem[] = data.items || [];

      setReceiptItems(items);

      Alert.alert(
        'Kvittering skannet!',
        `Fant ${items.length} produkter på kvitteringen`,
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      Alert.alert(
        'AI-skanning feilet',
        'Kunne ikke skanne kvitteringen automatisk. Vil du legge inn produktene manuelt?',
        [
          { text: 'Avbryt', style: 'cancel' },
          {
            text: 'Manuell innføring',
            onPress: () => {
              router.push('/scanner');
            },
          },
        ]
      );
    } finally {
      setProcessing(false);
      setTimeout(() => {
        scannedRef.current = false;
      }, 2000);
    }
  };

  const handleAnalyzeAll = async () => {
    setAnalyzing(true);

    try {
      for (const item of receiptItems) {
        const evaluation = await evaluatePrice({
          barcode: '',
          price: item.price,
          currency: 'NOK',
        });

        await saveToHistory(evaluation);
      }

      Alert.alert(
        'Suksess!',
        `Analyserte og lagret ${receiptItems.length} produkter i historikken`,
        [
          { text: 'OK', onPress: () => router.push('/') },
          {
            text: 'Skann ny',
            onPress: () => {
              setReceiptItems([]);
              setAnalyzing(false);
            },
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Feil',
        'Kunne ikke analysere alle produktene. Noen er lagret.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleRemoveItem = (index: number) => {
    setReceiptItems((prev) => prev.filter((_, i) => i !== index));
  };

  const getTotalAmount = () => {
    return receiptItems.reduce(
      (total, item) => total + item.price * (item.quantity || 1),
      0
    );
  };

  // Results view
  if (receiptItems.length > 0) {
    return (
      <LinearGradient colors={[...gradients.screenBg]} style={styles.container}>
        <LinearGradient colors={[...gradients.header]} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.white} />
            <Text style={styles.backButtonText}>Tilbake</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kvitteringsresultater</Text>
        </LinearGradient>

        <ScrollView style={styles.content}>
          {/* Summary glass card */}
          <View style={[styles.glassCard, glowShadow]}>
            <Text style={styles.summaryTitle}>Kvitteringsoversikt</Text>
            <Text style={styles.summaryAmount}>{getTotalAmount().toFixed(2)} NOK</Text>
            <Text style={styles.summarySubtitle}>{receiptItems.length} produkter</Text>
          </View>

          {/* Items list */}
          <View style={styles.itemsList}>
            {receiptItems.map((item, index) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>{item.price.toFixed(2)} NOK</Text>
                  {item.quantity && item.quantity > 1 && (
                    <Text style={styles.itemQuantity}>Antall: {item.quantity}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveItem(index)}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.expensive} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Action buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.analyzeButton, glowShadow, analyzing && styles.buttonDisabled]}
              onPress={handleAnalyzeAll}
              disabled={analyzing}
            >
              <LinearGradient colors={[...gradients.primaryBtn]} style={styles.analyzeGradient}>
                <Ionicons name="analytics-outline" size={24} color={colors.white} />
                <Text style={styles.analyzeButtonText}>
                  {analyzing ? 'Analyserer...' : 'Analyser alle'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.newScanButton}
              onPress={() => setReceiptItems([])}
            >
              <Ionicons name="camera-outline" size={24} color={colors.primaryLight} />
              <Text style={styles.newScanButtonText}>Skann ny kvittering</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  // Camera view
  return (
    <View style={styles.container}>
      <LinearGradient colors={[...gradients.header]} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.white} />
          <Text style={styles.backButtonText}>Tilbake</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Skann kvittering</Text>
      </LinearGradient>

      <CameraView
        style={styles.camera}
        onBarcodeScanned={handleReceiptScanned}
        barcodeScannerSettings={{
          barcodeTypes: [],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <Ionicons name="receipt-outline" size={48} color={colors.white} />
            <Text style={styles.scanText}>Plasser kvitteringen i rammen</Text>
            <Text style={styles.scanSubtext}>Trykk for å skanne</Text>
          </View>

          {/* Capture button with glow ring */}
          <TouchableOpacity
            style={[styles.captureButton, glowShadow]}
            onPress={handleReceiptScanned}
            disabled={processing}
          >
            <View style={styles.captureInner}>
              <Ionicons name="camera" size={32} color={colors.white} />
            </View>
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.deepBg,
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
  header: {
    paddingTop: 60,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: spacing.md,
  },
  backButtonText: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scanArea: {
    width: 320,
    height: 550,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: radii.lg,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    marginTop: 80,
    gap: spacing.sm,
  },
  scanText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scanSubtext: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  captureButton: {
    marginBottom: 50,
    borderRadius: 9999,
    padding: 4,
    backgroundColor: 'rgba(124, 58, 237, 0.3)',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  captureInner: {
    backgroundColor: colors.primary,
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  glassCard: {
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.accentGlow,
    marginBottom: 4,
  },
  summarySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  itemsList: {
    marginBottom: spacing.lg,
  },
  itemCard: {
    backgroundColor: colors.glassBg,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.sm + 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.accentGlow,
  },
  itemQuantity: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  removeButton: {
    padding: spacing.sm,
  },
  actionButtons: {
    gap: spacing.sm + 4,
    marginBottom: spacing.lg,
  },
  analyzeButton: {
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  analyzeGradient: {
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
  },
  analyzeButtonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  newScanButton: {
    backgroundColor: colors.glassBg,
    padding: spacing.md,
    borderRadius: radii.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: spacing.sm,
  },
  newScanButtonText: {
    color: colors.primaryLight,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
