import React, { useState, useRef, useEffect } from 'react';
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
import { Camera, Check, RotateCcw, X } from 'lucide-react-native';
import { TrackingService } from '../../../../../../src/services/tracking.service';
import { ValidationApi } from '../../../../../../src/api/validation.api';
import { ValidationQueueRepository } from '../../../../../../src/database/validation-queue.repository';
import { BigButton } from '../../../../../../src/components/BigButton';
import { OfflineBanner } from '../../../../../../src/components/OfflineBanner';
import { AppTheme, AppRadius, AppShadow, AppSpacing } from '../../../../../../src/theme/colors';

export default function PhotoCaptureScreen() {
  const { id: missionId, stepId, qrToken } = useLocalSearchParams<{
    id: string;
    stepId: string;
    qrToken: string;
  }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();

  useEffect(() => {
    setPendingCount(ValidationQueueRepository.getPendingCount());
  }, [photoUri]);

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.permissionCard}>
          <View style={styles.permissionIcon}>
            <Camera size={32} color={AppTheme.primary} />
          </View>
          <Text style={styles.permissionTitle}>Caméra requise</Text>
          <Text style={styles.permissionSubtitle}>
            L&apos;appareil photo est nécessaire pour photographier la preuve de collecte ou de dépôt.
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
      // Capture error handling
    }
  };

  const handleValidateStep = async () => {
    if (!photoUri || !qrToken || !stepId) return;
    setIsValidating(true);

    try {
      const pos = await TrackingService.getCurrentPosition();
      const latitude = pos?.latitude ?? 0;
      const longitude = pos?.longitude ?? 0;
      const accuracy = pos?.accuracy ?? 0;
      const isMocked = pos?.isMocked ?? false;
      const recordedAt = pos?.timestamp || new Date().toISOString();
      const clientEventId = `val_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const payload = {
        clientEventId,
        qrToken,
        latitude,
        longitude,
        accuracy,
        isMocked,
        recordedAt,
      };

      const result = await ValidationApi.validateStep({
        stepId,
        payload,
        photoUri,
      });

      if (result.success) {
        router.replace({
          pathname: '/(main)/missions/[id]/steps/[stepId]/result',
          params: { id: missionId, stepId, success: 'true' },
        });
      } else if (result.queued) {
        // Enqueue offline in SQLite
        ValidationQueueRepository.enqueue({
          clientEventId,
          missionStepId: stepId,
          qrToken,
          latitude,
          longitude,
          accuracy,
          isMocked,
          recordedAt,
          photoPath: photoUri,
        });

        router.replace({
          pathname: '/(main)/missions/[id]/steps/[stepId]/result',
          params: { id: missionId, stepId, queued: 'true' },
        });
      } else {
        router.replace({
          pathname: '/(main)/missions/[id]/steps/[stepId]/result',
          params: {
            id: missionId,
            stepId,
            success: 'false',
            errorCode: result.errorCode || 'UNKNOWN',
            message: result.message || 'Validation refusée.',
          },
        });
      }
    } finally {
      setIsValidating(false);
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
            {photoUri ? <RotateCcw size={14} color="#FFFFFF" /> : <X size={16} color="#FFFFFF" />}
            <Text style={styles.actionPillText}>{photoUri ? 'Reprendre' : 'Annuler'}</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle}>{photoUri ? 'Confirmer la photo' : 'Preuve photo'}</Text>
          <View style={{ width: 80 }} />
        </View>

        {pendingCount > 0 && photoUri && <OfflineBanner pendingCount={pendingCount} />}

        <View style={styles.bottomBar}>
          {photoUri ? (
            <BigButton
              label="Valider cette étape"
              variant="success"
              isLoading={isValidating}
              icon={<Check size={20} color="#FFFFFF" />}
              onPressed={handleValidateStep}
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
                Prenez une photo claire du site ou du bac de collecte
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
    padding: AppSpacing.xxl,
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
    marginBottom: AppSpacing.xxl,
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
    paddingHorizontal: AppSpacing.xl,
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
  topTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 17,
  },
  bottomBar: {
    padding: AppSpacing.xxl,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.7)',
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
