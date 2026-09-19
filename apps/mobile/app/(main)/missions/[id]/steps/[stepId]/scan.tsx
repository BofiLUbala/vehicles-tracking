import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Camera, ScanLine, X } from 'lucide-react-native';
import { BigButton } from '../../../../../../src/components/BigButton';
import { AppTheme, AppRadius, AppShadow, AppSpacing } from '../../../../../../src/theme/colors';

export default function QrScanScreen() {
  const { id: missionId, stepId } = useLocalSearchParams<{ id: string; stepId: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  if (!permission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ScanLine size={36} color={AppTheme.textMuted} />
          <Text style={styles.loadingText}>Initialisation de la caméra…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.permissionCard}>
          <View style={styles.permissionIcon}>
            <Camera size={32} color={AppTheme.primary} />
          </View>
          <Text style={styles.permissionTitle}>Caméra requise</Text>
          <Text style={styles.permissionSubtitle}>
            L&apos;application a besoin d&apos;accéder à votre appareil photo pour scanner le QR code physique du site.
          </Text>
          <BigButton
            label="Autoriser la caméra"
            onPressed={requestPermission}
            style={styles.permissionBtn}
          />
        </View>
      </SafeAreaView>
    );
  }

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned || !data) return;
    setScanned(true);

    // Navigate to photo step with captured QR token
    router.push({
      pathname: '/(main)/missions/[id]/steps/[stepId]/photo',
      params: { id: missionId, stepId, qrToken: data },
    });
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      <SafeAreaView style={styles.overlay}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={16} color="#FFFFFF" />
            <Text style={styles.closeText}>Annuler</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>Scan QR Code</Text>
          <View style={{ width: 70 }} />
        </View>

        <View style={styles.scannerTargetWrapper}>
          <View style={styles.targetFrame}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
          <Text style={styles.instructions}>
            Cadrez le QR code affiché sur le panneau du site de collecte ou de dépôt.
          </Text>
        </View>

        <View style={styles.bottomBar}>
          {scanned && (
            <BigButton
              label="Scanner à nouveau"
              variant="outline"
              onPressed={() => setScanned(false)}
            />
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
    backgroundColor: AppTheme.background,
    justifyContent: 'center',
    padding: AppSpacing.xxl,
  },
  centerContainer: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: AppTheme.textSecondary,
    fontWeight: '600',
    marginTop: AppSpacing.lg,
  },
  permissionCard: {
    backgroundColor: AppTheme.card,
    borderRadius: AppRadius.xl,
    padding: AppSpacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppTheme.border,
    ...AppShadow.card,
  },
  permissionIcon: {
    width: 64,
    height: 64,
    borderRadius: AppRadius.pill,
    backgroundColor: AppTheme.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: AppSpacing.lg,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: AppTheme.text,
    marginBottom: AppSpacing.sm,
  },
  permissionSubtitle: {
    fontSize: 14,
    color: AppTheme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: AppSpacing.xxl,
  },
  permissionBtn: {
    width: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: AppSpacing.xl,
    paddingTop: 10,
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: AppRadius.pill,
  },
  closeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
  topTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 17,
  },
  scannerTargetWrapper: {
    alignItems: 'center',
  },
  targetFrame: {
    width: 250,
    height: 250,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: AppRadius.xl,
    position: 'relative',
    marginBottom: AppSpacing.xl,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: AppTheme.tracking,
  },
  tl: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: AppRadius.md,
  },
  tr: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: AppRadius.md,
  },
  bl: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: AppRadius.md,
  },
  br: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: AppRadius.md,
  },
  instructions: {
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 40,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomBar: {
    padding: AppSpacing.xxl,
  },
});
