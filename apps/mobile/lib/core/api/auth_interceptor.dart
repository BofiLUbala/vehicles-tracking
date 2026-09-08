import 'package:dio/dio.dart';

import '../storage/secure_storage_service.dart';

/// Intercepteur Dio qui :
/// 1. ajoute `Authorization: Bearer <token>` sur chaque requête sortante ;
/// 2. sur une réponse 401, tente **une seule fois** un rafraîchissement du
///    jeton via `POST /auth/refresh`, puis rejoue la requête d'origine ;
/// 3. si le rafraîchissement échoue également, force la déconnexion
///    (purge du stockage sécurisé + callback [onForceLogout], typiquement
///    utilisé pour rediriger vers l'écran de connexion).
///
/// Un [QueuedInterceptor] est utilisé pour que les requêtes concurrentes
/// déclenchées pendant un rafraîchissement en cours attendent le même
/// résultat au lieu de déclencher chacune leur propre appel `/auth/refresh`.
class AuthInterceptor extends QueuedInterceptor {
  AuthInterceptor({
    required this.storage,
    required this.refreshDio,
    required this.onForceLogout,
  });

  final SecureStorageService storage;

  /// Client Dio dédié à l'appel de rafraîchissement : il ne doit PAS porter
  /// cet intercepteur (pour éviter toute boucle) et pointe vers la même
  /// `baseUrl` que le client principal.
  final Dio refreshDio;

  /// Appelé quand le rafraîchissement échoue : l'appelant doit purger la
  /// session et rediriger l'utilisateur vers l'écran de connexion.
  final Future<void> Function() onForceLogout;

  static const _retriedFlag = 'auth_interceptor_retried';

  bool _refreshing = false;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Les appels d'authentification eux-mêmes ne portent pas de jeton.
    if (!_isAuthEndpoint(options.path)) {
      final token = await storage.readAccessToken();
      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final response = err.response;
    final requestOptions = err.requestOptions;

    final isUnauthorized = response?.statusCode == 401;
    final alreadyRetried = requestOptions.extra[_retriedFlag] == true;
    final isAuthEndpoint = _isAuthEndpoint(requestOptions.path);

    if (!isUnauthorized || alreadyRetried || isAuthEndpoint) {
      handler.next(err);
      return;
    }

    try {
      final refreshed = await _refreshTokens();
      if (!refreshed) {
        await _forceLogout();
        handler.next(err);
        return;
      }

      final newToken = await storage.readAccessToken();
      requestOptions.extra[_retriedFlag] = true;
      requestOptions.headers['Authorization'] = 'Bearer $newToken';

      // Rejoue la requête via `refreshDio` (mêmes options de base, pas
      // d'AuthInterceptor dessus) pour éviter toute boucle.
      final retryResponse = await refreshDio.fetch(requestOptions);
      handler.resolve(retryResponse);
    } catch (_) {
      await _forceLogout();
      handler.next(err);
    }
  }

  Future<bool> _refreshTokens() async {
    if (_refreshing) {
      // Un autre appel est déjà en train de rafraîchir : QueuedInterceptor
      // garantit que ce code n'est en réalité exécuté qu'une requête à la
      // fois, mais on protège quand même contre la ré-entrance.
      return storage.readAccessToken().then((t) => t != null);
    }
    _refreshing = true;
    try {
      final refreshToken = await storage.readRefreshToken();
      if (refreshToken == null || refreshToken.isEmpty) {
        return false;
      }

      final response = await refreshDio.post<Map<String, dynamic>>(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
      );

      final data = response.data;
      final accessToken = data?['accessToken'] as String?;
      final newRefreshToken = data?['refreshToken'] as String?;
      if (accessToken == null || newRefreshToken == null) {
        return false;
      }

      await storage.saveTokens(
        accessToken: accessToken,
        refreshToken: newRefreshToken,
      );
      return true;
    } catch (_) {
      return false;
    } finally {
      _refreshing = false;
    }
  }

  Future<void> _forceLogout() async {
    await storage.clearSession();
    await onForceLogout();
  }

  bool _isAuthEndpoint(String path) {
    return path.contains('/auth/otp/') ||
        path.contains('/auth/refresh') ||
        path.contains('/auth/logout');
  }
}
