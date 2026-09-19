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
import { ArrowLeft, Camera, Send } from 'lucide-react-native';
import { TrackingService } from '../../../../src/services/tracking.service';
import { FuelApi } from '../../../../src/api/fuel.api';
import { FuelQueueRepository } from '../../../../src/database/fuel-queue.repository';
import { FuelType } from '../../../../src/types/fuel.types';
import { useSync } from '../../../../src/context/SyncContext';
import { BigButton } from '../../../../src/components/BigButton';
import { OfflineBanner } from '../../../../src/components/OfflineBanner';
import { AppRadius, AppShadow, AppTheme } from '../../../../src/theme/colors';

export default function FuelOdometerPhotoScreen() {
  const params = useLocalSearchParams<{
    vehicleId: string;
    liters: string;
    totalCost: string;
    odometer: string;
    fuelType: string;
    stationName?: string;
    receiptPhotoUri: string;
  }>();

  const { isConnected, counts } = useSync();
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
            L&apos;appareil photo est nécessaire pour photographier le compteur kilométrique du camion.
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

  const handleSubmit = async () => {
    if (!photoUri || !params.receiptPhotoUri) return;
    setIsSubmitting(true);

    try {
      const pos = await TrackingService.getCurrentPosition();
      const latitude = pos?.latitude ?? 0;
      const longitude = pos?.longitude ?? 0;
      const recordedAt = pos?.timestamp || new Date().toISOString();
      const clientEventId = `fuel_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const metadata = {
        clientEventId,
        vehicleId: params.vehicleId,
        liters: Number(params.liters),
        totalCost: Number(params.totalCost),
        odometer: Number(params.odometer),
        fuelType: params.fuelType as FuelType,
        stationName: params.stationName || undefined,
        latitude,
        longitude,
      };

      const result = await FuelApi.submitFuelRecord({
        metadata,
        receiptUri: params.receiptPhotoUri,
        odometerPhotoUri: photoUri,
      });

      if (result.success) {
        router.replace({
          pathname: '/(main)/fuel/[vehicleId]/result',
          params: {
            vehicleId: params.vehicleId,
            success: 'true',
            anomaliesCount: result.anomalies?.length ? String(result.anomalies.length) : '0',
          },
        });
      } else if (result.queued) {
        // Enqueue offline in SQLite
        FuelQueueRepository.enqueue({
          clientEventId,
          vehicleId: params.vehicleId,
          liters: Number(params.liters),
          totalCost: Number(params.totalCost),
          odometer: Number(params.odometer),
          fuelType: params.fuelType as FuelType,
          stationName: params.stationName,
          latitude,
          longitude,
          recordedAt,
          receiptPhotoPath: params.receiptPhotoUri,
          odometerPhotoPath: photoUri,
        });

        router.replace({
          pathname: '/(main)/fuel/[vehicleId]/result',
          params: {
            vehicleId: params.vehicleId,
            queued: 'true',
          },
        });
      } else {
        router.replace({
          pathname: '/(main)/fuel/[vehicleId]/result',
          params: {
            vehicleId: params.vehicleId,
            success: 'false',
            errorCode: result.errorCode,
            message: result.message,
          },
        });
      }
    } finally {
      setIsSubmitting(false);
    }
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
            <ArrowLeft size={15} color="#FFFFFF" />
            <Text style={styles.actionPillText}>{photoUri ? 'Reprendre' : 'Reçu'}</Text>
          </TouchableOpacity>
          <View style={styles.stepPill}>
            <Camera size={13} color="#FFFFFF" />
            <Text style={styles.topTitle}>2/2 Photo du Compteur</Text>
          </View>
          <View style={styles.topSpacer} />
        </View>

        {!isConnected && <OfflineBanner pendingCount={counts.fuelPending} />}

        <View style={styles.bottomBar}>
          {photoUri ? (
            <BigButton
              label="Envoyer la déclaration"
              variant="success"
              icon={<Send size={20} color="#FFFFFF" />}
              isLoading={isSubmitting}
              onPressed={handleSubmit}
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
                Cadrez clairement le tableau de bord avec le kilométrage odométrique visible
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
});