import { AppState, NativeEventSubscription } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { GpsQueueRepository } from '../database/gps-queue.repository';
import { ValidationQueueRepository } from '../database/validation-queue.repository';
import { FuelQueueRepository } from '../database/fuel-queue.repository';
import { TrackingApi } from '../api/tracking.api';
import { ValidationApi } from '../api/validation.api';
import { FuelApi } from '../api/fuel.api';

type SyncListener = () => void;

class SyncServiceClass {
  private isSyncing = false;
  private activeSyncPromise: Promise<void> | null = null;
  private netInfoUnsubscribe: (() => void) | null = null;
  private appStateSubscription: NativeEventSubscription | null = null;
  private intervalTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<SyncListener> = new Set();
  private isConnected = true;

  static readonly GPS_BATCH_SIZE = 100;
  static readonly VALIDATION_BATCH_SIZE = 5;
  static readonly FUEL_BATCH_SIZE = 5;
  static readonly MAX_AUTO_RETRIES = 8;
  static readonly FOREGROUND_INTERVAL_MS = 30000;

  async init(): Promise<void> {
    // Reset any stale uploading status left over from crash
    GpsQueueRepository.resetStaleUploading();
    ValidationQueueRepository.resetStaleUploading();
    FuelQueueRepository.resetStaleUploading();

    // Listen to network connectivity
    this.netInfoUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const connected = !!state.isConnected && !!state.isInternetReachable;
      const wasDisconnected = !this.isConnected;
      this.isConnected = connected;
      this.notifyListeners();

      if (connected && wasDisconnected) {
        this.syncNow(false);
      }
    });

    // Listen to app foreground events
    this.appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && this.isConnected) {
        this.syncNow(false);
      }
    });

    // Check current state
    const currentNet = await NetInfo.fetch();
    this.isConnected = !!currentNet.isConnected;

    // Periodic foreground sync
    this.intervalTimer = setInterval(() => {
      if (this.isConnected) {
        this.syncNow(false);
      }
    }, SyncServiceClass.FOREGROUND_INTERVAL_MS);

    // Initial sync
    if (this.isConnected) {
      this.syncNow(false);
    }
  }

  dispose(): void {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
    this.listeners.clear();
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // Ignore listener exceptions
      }
    });
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }

  getPendingCounts(): {
    gpsPending: number;
    gpsFailed: number;
    validationsPending: number;
    validationsFailed: number;
    fuelPending: number;
    fuelFailed: number;
    total: number;
  } {
    const gpsPending = GpsQueueRepository.getPendingCount();
    const gpsFailed = GpsQueueRepository.getFailedCount();
    const validationsPending = ValidationQueueRepository.getPendingCount();
    const validationsFailed = ValidationQueueRepository.getFailedCount();
    const fuelPending = FuelQueueRepository.getPendingCount();
    const fuelFailed = FuelQueueRepository.getFailedCount();

    return {
      gpsPending,
      gpsFailed,
      validationsPending,
      validationsFailed,
      fuelPending,
      fuelFailed,
      total: gpsPending + validationsPending + fuelPending,
    };
  }

  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  async syncNow(force = false): Promise<void> {
    if (this.activeSyncPromise) {
      return this.activeSyncPromise;
    }

    this.isSyncing = true;
    this.notifyListeners();

    this.activeSyncPromise = (async () => {
      try {
        await this.syncGpsPositions(force);
        await this.syncValidations(force);
        await this.syncFuelRecords(force);
      } finally {
        this.isSyncing = false;
        this.activeSyncPromise = null;
        this.notifyListeners();
      }
    })();

    return this.activeSyncPromise;
  }

  private async syncGpsPositions(force: boolean): Promise<void> {
    const batch = GpsQueueRepository.getNextBatch(
      SyncServiceClass.GPS_BATCH_SIZE,
      force,
      SyncServiceClass.MAX_AUTO_RETRIES
    );

    if (batch.length === 0) return;

    const ids = batch.map((p) => p.id);
    GpsQueueRepository.markUploading(ids);

    try {
      const payloads = batch.map(GpsQueueRepository.toPayload);
      const results = await TrackingApi.sendPositionsBatch(payloads);

      const byClientEventId = new Map(results.map((r) => [r.clientEventId, r]));

      for (const pos of batch) {
        const result = byClientEventId.get(pos.client_event_id);
        if (!result) {
          GpsQueueRepository.markFailed(pos.id, pos.retry_count, 'Aucune confirmation serveur reçue.');
        } else if (result.status === 'created' || result.status === 'duplicate') {
          GpsQueueRepository.markSynced([pos.id]);
        } else {
          GpsQueueRepository.markFailed(pos.id, pos.retry_count, result.reason || 'Position rejetée.');
        }
      }
    } catch (err: any) {
      for (const pos of batch) {
        GpsQueueRepository.markFailed(pos.id, pos.retry_count, err.message || 'Erreur réseau.');
      }
    }
  }

  private async syncValidations(force: boolean): Promise<void> {
    const batch = ValidationQueueRepository.getNextBatch(
      SyncServiceClass.VALIDATION_BATCH_SIZE,
      force,
      SyncServiceClass.MAX_AUTO_RETRIES
    );

    for (const val of batch) {
      ValidationQueueRepository.markUploading(val.id);

      const payload = ValidationQueueRepository.toPayload(val);
      const result = await ValidationApi.validateStep({
        stepId: val.mission_step_id,
        payload,
        photoUri: val.photo_path,
      });

      if (result.success) {
        ValidationQueueRepository.markSynced(val.id);
      } else if (result.errorCode === 'NETWORK_ERROR') {
        ValidationQueueRepository.markFailed(val.id, val.retry_count, result.message || 'Réseau indisponible.');
      } else {
        // Permanent rejection: cap retries so it doesn't loop
        ValidationQueueRepository.markFailed(
          val.id,
          SyncServiceClass.MAX_AUTO_RETRIES,
          result.rawMessage || result.message || 'Validation refusée.'
        );
      }
    }
  }

  private async syncFuelRecords(force: boolean): Promise<void> {
    const batch = FuelQueueRepository.getNextBatch(
      SyncServiceClass.FUEL_BATCH_SIZE,
      force,
      SyncServiceClass.MAX_AUTO_RETRIES
    );

    for (const fuel of batch) {
      FuelQueueRepository.markUploading(fuel.id);

      const metadata = FuelQueueRepository.toMetadata(fuel);
      const result = await FuelApi.submitFuelRecord({
        metadata,
        receiptUri: fuel.receipt_photo_path,
        odometerPhotoUri: fuel.odometer_photo_path,
      });

      if (result.success) {
        FuelQueueRepository.markSynced(fuel.id);
      } else if (result.errorCode === 'NETWORK_ERROR') {
        FuelQueueRepository.markFailed(fuel.id, fuel.retry_count, result.message || 'Réseau indisponible.');
      } else {
        // Permanent rejection
        FuelQueueRepository.markFailed(
          fuel.id,
          SyncServiceClass.MAX_AUTO_RETRIES,
          result.message || 'Déclaration refusée.'
        );
      }
    }
  }
}

export const SyncService = new SyncServiceClass();
