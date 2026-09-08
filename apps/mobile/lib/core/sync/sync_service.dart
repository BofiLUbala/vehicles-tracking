import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';

import '../../features/qr/data/validation_queue_repository.dart';
import '../../features/qr/data/validation_repository.dart';
import '../../features/tracking/data/gps_queue_repository.dart';
import '../../features/tracking/data/tracking_repository.dart';
import '../database/app_database.dart';

/// Orchestre la synchronisation des files d'attente locales
/// ([PendingGpsPositions], [PendingValidations]) avec l'API, dès que le
/// réseau est disponible (section 13 du cahier des charges — l'app doit
/// fonctionner hors ligne puis rattraper son retard automatiquement).
///
/// Déclencheurs :
/// - retour de connectivité (`connectivity_plus`) ;
/// - minuteur de repli toutes les 30s tant que l'app est au premier plan
///   (couvre le cas où `connectivity_plus` signale "en ligne" alors que le
///   réseau reste en réalité inutilisable) ;
/// - bouton manuel "Synchroniser maintenant" (`force: true` — ignore le
///   backoff et le plafond d'essais automatiques, mais ne perd jamais de
///   ligne : les échecs restent en file, juste retentés plus tard).
class SyncService {
  SyncService({
    required AppDatabase database,
    required GpsQueueRepository gpsQueueRepository,
    required ValidationQueueRepository validationQueueRepository,
    required TrackingRepository trackingRepository,
    required ValidationRepository validationRepository,
    Connectivity? connectivity,
  })  : _gpsQueueRepository = gpsQueueRepository,
        _validationQueueRepository = validationQueueRepository,
        _trackingRepository = trackingRepository,
        _validationRepository = validationRepository,
        _connectivity = connectivity ?? Connectivity();

  final GpsQueueRepository _gpsQueueRepository;
  final ValidationQueueRepository _validationQueueRepository;
  final TrackingRepository _trackingRepository;
  final ValidationRepository _validationRepository;
  final Connectivity _connectivity;

  static const gpsBatchSize = 100;
  static const validationBatchSize = 5;

  /// Au-delà de ce nombre d'essais automatiques, une ligne n'est plus
  /// retentée par les déclencheurs automatiques (connectivité/minuteur) —
  /// elle reste néanmoins en file, visible sur l'écran de synchronisation,
  /// et le bouton manuel peut toujours la retenter (`force: true`).
  static const maxAutoRetries = 8;

  static const _foregroundInterval = Duration(seconds: 30);

  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  Timer? _foregroundTimer;
  bool _syncing = false;

  /// À appeler une fois au démarrage de l'app : remet en `pending` toute
  /// ligne restée `uploading` (process tué en plein envoi précédent), puis
  /// démarre l'écoute connectivité + minuteur.
  Future<void> init() async {
    await _gpsQueueRepository.resetStaleUploading();
    await _validationQueueRepository.resetStaleUploading();

    _connectivitySubscription =
        _connectivity.onConnectivityChanged.listen((results) {
      if (results.isNotEmpty && !results.contains(ConnectivityResult.none)) {
        unawaited(syncNow());
      }
    });

    _foregroundTimer = Timer.periodic(_foregroundInterval, (_) {
      unawaited(syncNow());
    });
  }

  void dispose() {
    _connectivitySubscription?.cancel();
    _foregroundTimer?.cancel();
  }

  /// Lance une passe de synchronisation (GPS puis validations). Les appels
  /// concurrents pendant qu'une passe est déjà en cours sont ignorés — le
  /// prochain déclencheur (minuteur, connectivité, bouton) en relancera une.
  Future<void> syncNow({bool force = false}) async {
    if (_syncing) return;
    _syncing = true;
    try {
      await _syncGpsPositions(force: force);
      await _syncValidations(force: force);
    } finally {
      _syncing = false;
    }
  }

  Future<void> _syncGpsPositions({required bool force}) async {
    final batch = await _gpsQueueRepository.nextBatch(
      limit: gpsBatchSize,
      force: force,
      maxAutoRetries: maxAutoRetries,
    );
    if (batch.isEmpty) return;

    await _gpsQueueRepository.markUploading(batch.map((p) => p.id).toList());

    List<BatchPositionResult>? results;
    try {
      results = await _trackingRepository.uploadPositionsBatch(batch);
    } on TrackingBatchException catch (e) {
      // Échec réseau global (pas de réponse serveur exploitable) : toutes
      // les positions du lot repartent en `failed` avec backoff — jamais
      // supprimées.
      for (final position in batch) {
        await _gpsQueueRepository.markFailed(
          id: position.id,
          previousRetryCount: position.retryCount,
          error: e.message,
        );
      }
      return;
    }

    final byClientEventId = {for (final r in results) r.clientEventId: r};
    for (final position in batch) {
      final result = byClientEventId[position.clientEventId];
      if (result == null) {
        // Le serveur n'a renvoyé aucun résultat pour cet item (réponse
        // incomplète) : on retente plus tard plutôt que de le perdre.
        await _gpsQueueRepository.markFailed(
          id: position.id,
          previousRetryCount: position.retryCount,
          error: 'Aucun résultat renvoyé par le serveur pour cet envoi.',
        );
      } else if (result.isAccepted) {
        // created ou duplicate -> synced (cf. docs/PHASE3_NOTES.md).
        await _gpsQueueRepository.markSynced([position.id]);
      } else {
        await _gpsQueueRepository.markFailed(
          id: position.id,
          previousRetryCount: position.retryCount,
          error: result.reason ?? 'Position refusée par le serveur.',
        );
      }
    }
  }

  Future<void> _syncValidations({required bool force}) async {
    final batch = await _validationQueueRepository.nextBatch(
      limit: validationBatchSize,
      force: force,
      maxAutoRetries: maxAutoRetries,
    );

    for (final validation in batch) {
      await _validationQueueRepository.markUploading(validation.id);

      final result = await _validationRepository.validateStep(
        StepValidationRequest(
          stepId: validation.missionStepId,
          qrToken: validation.qrToken,
          latitude: validation.latitude,
          longitude: validation.longitude,
          accuracy: validation.accuracy ?? 0,
          isMocked: validation.isMocked,
          recordedAt: validation.recordedAt,
          photoPath: validation.photoPath,
          // Réutilise le même clientEventId à chaque tentative : une
          // resoumission après échec réseau est reconnue comme le même
          // événement côté serveur (idempotence).
          clientEventId: validation.clientEventId,
        ),
      );

      if (result.success) {
        await _validationQueueRepository.markSynced(validation.id);
      } else if (result.errorCode == 'NETWORK_ERROR') {
        // Toujours pas de réseau exploitable : on retente plus tard.
        await _validationQueueRepository.markFailed(
          id: validation.id,
          previousRetryCount: validation.retryCount,
          error: result.rawMessage ?? 'Pas de réseau.',
        );
      } else {
        // Refus métier définitif (QR expiré, position hors zone...) — on
        // garde la ligne en `failed` (jamais supprimée silencieusement) afin
        // que le chauffeur/l'exploitant puisse voir qu'une étape n'a pas pu
        // être validée, mais on ne la retente plus automatiquement au-delà
        // du plafond puisque le refus est déjà définitif.
        await _validationQueueRepository.markFailed(
          id: validation.id,
          previousRetryCount: maxAutoRetries,
          error: result.rawMessage ?? result.errorCode ?? 'Validation refusée.',
        );
      }
    }
  }
}
