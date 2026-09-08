import 'dart:async';

import 'package:geolocator/geolocator.dart';

import 'gps_queue_repository.dart';

/// Suit la position GPS en continu pendant qu'une mission est active
/// (STARTED/IN_PROGRESS) et écrit chaque relevé dans la file d'attente
/// locale (jamais d'appel réseau direct depuis ce service — cf. section 13).
///
/// Intervalle adaptatif documenté ici (le cahier des charges laisse le choix
/// à l'implémentation, 5-15s) :
/// - `distanceFilter: 15` mètres : un déplacement en dessous de ce seuil (à
///   l'arrêt, ou dans un dépôt) ne déclenche aucun relevé, ce qui évite de
///   saturer la file locale de positions quasi identiques.
/// - Un minuteur de repli (`_maxSilence`, 15s) force un relevé même sans
///   déplacement suffisant, pour garder une trace régulière lors des arrêts
///   prolongés (ex. déchargement) — borne haute de la fourchette demandée.
/// - En pratique, la position naturelle du flux `Geolocator` (piloté par le
///   GPS matériel) tombe le plus souvent entre 5 et 10s en zone urbaine
///   dense, ce qui respecte la borne basse sans configuration
///   supplémentaire côté plateforme.
class LocationTrackingService {
  LocationTrackingService({required GpsQueueRepository queueRepository})
      : _queueRepository = queueRepository;

  final GpsQueueRepository _queueRepository;

  StreamSubscription<Position>? _subscription;
  Timer? _fallbackTimer;
  String? _activeVehicleId;
  String? _activeMissionId;

  static const _distanceFilterMeters = 15;
  static const _maxSilence = Duration(seconds: 15);

  bool get isTracking => _subscription != null;

  /// Démarre (ou redémarre, si le véhicule/mission a changé) le suivi.
  Future<void> start({
    required String vehicleId,
    String? missionId,
  }) async {
    if (isTracking &&
        _activeVehicleId == vehicleId &&
        _activeMissionId == missionId) {
      return;
    }
    await stop();

    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      return;
    }

    _activeVehicleId = vehicleId;
    _activeMissionId = missionId;

    final settings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: _distanceFilterMeters,
    );

    _subscription = Geolocator.getPositionStream(locationSettings: settings)
        .listen(_onPosition, onError: (_) {});

    // Filet de sécurité : si aucun événement du flux natif n'arrive dans
    // l'intervalle max (arrêt prolongé), on force un relevé explicite.
    _fallbackTimer = Timer.periodic(_maxSilence, (_) => _forceReading());
  }

  Future<void> stop() async {
    await _subscription?.cancel();
    _subscription = null;
    _fallbackTimer?.cancel();
    _fallbackTimer = null;
    _activeVehicleId = null;
    _activeMissionId = null;
  }

  Future<void> _onPosition(Position position) async {
    final vehicleId = _activeVehicleId;
    if (vehicleId == null) return;
    await _queueRepository.enqueue(
      vehicleId: vehicleId,
      missionId: _activeMissionId,
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      altitude: position.altitude,
      speed: position.speed,
      heading: position.heading,
      isMocked: position.isMocked,
      recordedAt: position.timestamp,
    );
  }

  Future<void> _forceReading() async {
    final vehicleId = _activeVehicleId;
    if (vehicleId == null) return;
    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      await _onPosition(position);
    } catch (_) {
      // Pas de position disponible (GPS momentanément indisponible) : on
      // réessaiera au prochain cycle, aucune écriture en file d'attente.
    }
  }
}
