import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ArrowLeft, ArrowRight, Camera, X } from 'lucide-react-native';
import { BigButton } from '../../../../src/components/BigButton';
import { AppRadius, AppShadow, AppTheme } from '../../../../src/theme/colors';

export default function FuelReceiptPhotoScreen() {
  const params = useLocalSearchParams<{
    vehicleId: string;
    liters: string;
    totalCost: string;
    odometer: string;
    fuelType: string;
    stationName?: string;
  }>();

  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.permissionCard}>
          <View style={styles.permissionIcon}>
            <Camera size={24} color={AppTheme.primary} />
          </View>
          <Text style={styles.permissionTitle}>Caméra requise</Text>
          <Text style={styles.permissionSubtitle}>
            L&apos;appareil photo est nécessaire pour photographier le reçu de la station-service.
          </Text>
          <BigButton label="Autoriser" onPressed={requestPermission} />
        </View>
      </SafeAreaView>
    );
  }

  const handleTakePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
      }
    } catch {
      // Capture error
    }
  };

  const handleNext = () => {
    if (!photoUri) return;
    router.push({
      pathname: '/(main)/fuel/[vehicleId]/odometer-photo',
      params: {
        ...params,
        vehicleId: params.vehicleId,
        receiptPhotoUri: photoUri,
      },
    });
  };

  return (
    <View style={styles.container}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} />
      ) : (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
      )}

      <SafeAreaView style={styles.overlay}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => (photoUri ? setPhotoUri(null) : router.back())}
            style={styles.actionPill}
          >
            {photoUri ? (
              <ArrowLeft size={15} color="#FFFFFF" />
            ) : (
              <X size={15} color="#FFFFFF" />
            )}
            <Text style={styles.actionPillText}>{photoUri ? 'Reprendre' : 'Annuler'}</Text>
          </TouchableOpacity>
          <View style={styles.stepPill}>
            <Camera size={13} color="#FFFFFF" />
            <Text style={styles.topTitle}>1/2 Photo du Reçu</Text>
          </View>
          <View style={styles.topSpacer} />
        </View>

        <View style={styles.bottomBar}>
          {photoUri ? (
            <BigButton
              label="Continuer vers le compteur"
              icon={<ArrowRight size={20} color="#FFFFFF" />}
              onPressed={handleNext}
              style={styles.continueBtn}
            />
          ) : (
            <View style={styles.captureContainer}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleTakePicture}
                style={styles.captureBtn}
              >
                <View style={styles.captureInner} />
              </TouchableOpacity>
              <Text style={styles.captureHint}>
                Photographiez le ticket de caisse ou reçu de la station
              </Text>
            </View>
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
    padding: 24,
  },
  permissionCard: {
    backgroundColor: AppTheme.card,
    borderRadius: AppRadius.xl,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppTheme.border,
    ...AppShadow.card,
  },
  permissionIcon: {
    width: 48,
    height: 48,
    borderRadius: AppRadius.md,
    backgroundColor: AppTheme.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: AppTheme.text,
    marginBottom: 8,
  },
  permissionSubtitle: {
    fontSize: 14,
    color: AppTheme.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: AppRadius.pill,
  },
  actionPillText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 6,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: AppRadius.pill,
  },
  topTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    marginLeft: 6,
  },
  topSpacer: {
    width: 84,
  },
  bottomBar: {
    padding: 24,
    paddingBottom: 32,
  },
  captureContainer: {
    alignItems: 'center',
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
  },
  captureHint: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  continueBtn: {
    backgroundColor: AppTheme.primary,
  },
});