import 'package:dio/dio.dart';

import '../config/app_config.dart';
import '../storage/secure_storage_service.dart';
import 'auth_interceptor.dart';

/// Construit le client Dio principal de l'application, avec l'intercepteur
/// d'authentification (attache le token, gère le refresh-on-401).
///
/// [onForceLogout] est appelé quand le rafraîchissement du token échoue :
/// le fournisseur d'authentification global doit alors passer l'état à
/// "non authentifié" pour que le routeur redirige vers l'écran de connexion.
Dio buildDioClient({
  required SecureStorageService storage,
  required Future<void> Function() onForceLogout,
  String baseUrl = AppConfig.apiBaseUrl,
}) {
  final baseOptions = BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: AppConfig.connectTimeout,
    receiveTimeout: AppConfig.receiveTimeout,
    headers: {'Accept': 'application/json'},
  );

  // Client dédié au rafraîchissement de token : mêmes options de base, mais
  // sans l'AuthInterceptor pour ne jamais boucler sur lui-même.
  final refreshDio = Dio(baseOptions);

  final dio = Dio(baseOptions);
  dio.interceptors.add(
    AuthInterceptor(
      storage: storage,
      refreshDio: refreshDio,
      onForceLogout: onForceLogout,
    ),
  );

  return dio;
}
