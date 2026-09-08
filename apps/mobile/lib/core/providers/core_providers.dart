import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/dio_client.dart';
import '../storage/secure_storage_service.dart';

final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

/// Callback invoqué par l'intercepteur d'authentification quand le
/// rafraîchissement du token échoue. Le provider d'authentification
/// s'enregistre lui-même via [forceLogoutCallbackProvider] pour éviter une
/// dépendance circulaire directe entre `dioProvider` et `authNotifierProvider`.
final forceLogoutCallbackProvider =
    StateProvider<Future<void> Function()>((ref) async {});

final dioProvider = Provider<Dio>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return buildDioClient(
    storage: storage,
    onForceLogout: () => ref.read(forceLogoutCallbackProvider)(),
  );
});
