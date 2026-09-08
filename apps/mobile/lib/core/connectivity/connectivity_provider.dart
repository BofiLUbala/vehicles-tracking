import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Expose l'état de connectivité réseau (Wi-Fi / données mobiles / hors
/// ligne) pour piloter l'indicateur "En ligne" de l'interface.
///
/// En Phase 2, l'application suppose être en ligne pour appeler l'API
/// directement (pas de file d'attente hors-ligne — cf. Phase 3). Cet
/// indicateur reste néanmoins utile pour informer le chauffeur.
final connectivityStreamProvider = StreamProvider<List<ConnectivityResult>>((
  ref,
) {
  return Connectivity().onConnectivityChanged;
});

final isOnlineProvider = Provider<bool>((ref) {
  final connectivity = ref.watch(connectivityStreamProvider);
  return connectivity.maybeWhen(
    data: (results) =>
        results.isNotEmpty && !results.contains(ConnectivityResult.none),
    orElse: () => true,
  );
});
