import 'dart:convert';

import 'package:dio/dio.dart';

import '../../../core/storage/secure_storage_service.dart';
import 'models/driver.dart';

/// Résultat d'une connexion réussie : jetons + profil chauffeur.
class AuthSession {
  const AuthSession({
    required this.accessToken,
    required this.refreshToken,
    required this.driver,
  });

  final String accessToken;
  final String refreshToken;
  final Driver driver;
}

/// Erreur métier levée par le repository, avec un message déjà en français
/// prêt à être affiché.
class AuthException implements Exception {
  AuthException(this.message);
  final String message;

  @override
  String toString() => message;
}

/// Repository d'authentification : encapsule les appels réseau liés au
/// flux OTP WhatsApp (section 5 du cahier des charges) et la gestion de
/// session (stockage sécurisé des jetons).
///
/// Interface volontairement simple : un seul repository, sans abstraction
/// supplémentaire — la Phase 3 pourra y ajouter un cache local si besoin
/// (ex. profil chauffeur en cache pour le mode dégradé).
class AuthRepository {
  AuthRepository({required Dio dio, required SecureStorageService storage})
      : _dio = dio,
        _storage = storage;

  final Dio _dio;
  final SecureStorageService _storage;

  Future<void> requestOtp(String identifier) async {
    try {
      await _dio.post('/auth/otp/request', data: {
        'identifier': identifier,
        'channel': 'WHATSAPP',
      });
    } on DioException catch (e) {
      throw AuthException(_mapDioError(e));
    }
  }

  Future<void> resendOtp(String identifier) async {
    try {
      await _dio.post('/auth/otp/resend', data: {
        'identifier': identifier,
        'channel': 'WHATSAPP',
      });
    } on DioException catch (e) {
      throw AuthException(_mapDioError(e));
    }
  }

  Future<AuthSession> verifyOtp({
    required String identifier,
    required String code,
    required String deviceId,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/auth/otp/verify',
        data: {
          'identifier': identifier,
          'code': code,
          'deviceId': deviceId,
        },
      );
      final data = response.data!;
      final accessToken = data['accessToken'] as String;
      final refreshToken = data['refreshToken'] as String;
      final driver = Driver.fromJson(
        (data['driver'] as Map).cast<String, dynamic>(),
      );

      await _storage.saveTokens(
        accessToken: accessToken,
        refreshToken: refreshToken,
      );
      await _storage.saveDriverProfileJson(jsonEncode(driver.toJson()));

      return AuthSession(
        accessToken: accessToken,
        refreshToken: refreshToken,
        driver: driver,
      );
    } on DioException catch (e) {
      throw AuthException(_mapDioError(e));
    }
  }

  Future<Driver> fetchProfile() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/auth/profile',
      );
      final driver = Driver.fromJson(response.data!);
      await _storage.saveDriverProfileJson(jsonEncode(driver.toJson()));
      return driver;
    } on DioException catch (e) {
      throw AuthException(_mapDioError(e));
    }
  }

  /// Renvoie le profil chauffeur mis en cache localement (utilisé au
  /// démarrage, avant confirmation réseau).
  Future<Driver?> readCachedProfile() async {
    final json = await _storage.readDriverProfileJson();
    if (json == null) return null;
    try {
      return Driver.fromJson(
        (jsonDecode(json) as Map).cast<String, dynamic>(),
      );
    } catch (_) {
      return null;
    }
  }

  Future<bool> hasStoredSession() async {
    final token = await _storage.readAccessToken();
    return token != null && token.isNotEmpty;
  }

  Future<void> logout() async {
    final refreshToken = await _storage.readRefreshToken();
    try {
      if (refreshToken != null) {
        await _dio.post('/auth/logout', data: {'refreshToken': refreshToken});
      }
    } on DioException {
      // On déconnecte localement même si l'appel réseau échoue.
    } finally {
      await _storage.clearSession();
    }
  }

  String _mapDioError(DioException e) {
    final statusCode = e.response?.statusCode;
    final data = e.response?.data;
    if (data is Map && data['message'] != null) {
      final message = data['message'];
      if (message is String) return message;
      if (message is List && message.isNotEmpty) return message.first.toString();
    }
    if (statusCode == 400) return "Numéro ou code invalide.";
    if (statusCode == 401) return "Code incorrect ou expiré.";
    if (statusCode == 404) return "Ce numéro n'est pas reconnu.";
    if (statusCode == 429) {
      return "Trop de tentatives. Merci de patienter avant de réessayer.";
    }
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.connectionError) {
      return "Connexion impossible. Vérifiez votre connexion Internet.";
    }
    return "Une erreur est survenue. Merci de réessayer.";
  }
}
