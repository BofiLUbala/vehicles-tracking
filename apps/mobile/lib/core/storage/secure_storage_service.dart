import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Fine enveloppe autour de [FlutterSecureStorage] pour centraliser les clés
/// utilisées par l'application (tokens JWT, identifiant d'appareil, etc.).
///
/// Regrouper l'accès ici permet, en Phase 3, de brancher un cache local
/// (Drift/SQLite) sans changer les appelants.
class SecureStorageService {
  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(encryptedSharedPreferences: true),
            );

  final FlutterSecureStorage _storage;

  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';
  static const _deviceIdKey = 'device_id';
  static const _driverProfileKey = 'driver_profile_json';

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      _storage.write(key: _accessTokenKey, value: accessToken),
      _storage.write(key: _refreshTokenKey, value: refreshToken),
    ]);
  }

  Future<String?> readAccessToken() => _storage.read(key: _accessTokenKey);

  Future<String?> readRefreshToken() => _storage.read(key: _refreshTokenKey);

  Future<void> saveDeviceId(String deviceId) =>
      _storage.write(key: _deviceIdKey, value: deviceId);

  Future<String?> readDeviceId() => _storage.read(key: _deviceIdKey);

  Future<void> saveDriverProfileJson(String json) =>
      _storage.write(key: _driverProfileKey, value: json);

  Future<String?> readDriverProfileJson() =>
      _storage.read(key: _driverProfileKey);

  /// Supprime les jetons et le profil (déconnexion), conserve l'identifiant
  /// d'appareil qui reste stable entre deux sessions.
  Future<void> clearSession() async {
    await Future.wait([
      _storage.delete(key: _accessTokenKey),
      _storage.delete(key: _refreshTokenKey),
      _storage.delete(key: _driverProfileKey),
    ]);
  }
}
