import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/providers/core_providers.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../data/auth_repository.dart';
import 'auth_state.dart';

const _resendCooldownSeconds = 60;

/// Notifier central du flux d'authentification chauffeur (section 5 du
/// cahier des charges) : connexion par téléphone → OTP WhatsApp → session.
class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier({
    required AuthRepository repository,
    required SecureStorageService storage,
  })  : _repository = repository,
        _storage = storage,
        super(const AuthState()) {
    _init();
  }

  final AuthRepository _repository;
  final SecureStorageService _storage;
  Timer? _cooldownTimer;

  Future<void> _init() async {
    final hasSession = await _repository.hasStoredSession();
    if (!hasSession) {
      state = state.copyWith(status: AuthStatus.unauthenticated);
      return;
    }

    // Optimistic : on affiche le profil en cache pendant la confirmation
    // réseau, pour un démarrage perçu comme instantané.
    final cached = await _repository.readCachedProfile();
    if (cached != null) {
      state = state.copyWith(
        status: AuthStatus.authenticated,
        driver: cached,
      );
    }

    try {
      final driver = await _repository.fetchProfile();
      state = state.copyWith(status: AuthStatus.authenticated, driver: driver);
    } on AuthException {
      if (cached == null) {
        state = state.copyWith(status: AuthStatus.unauthenticated);
      }
      // Si un profil en cache existe déjà, on reste authentifié
      // optimistiquement (l'intercepteur gèrera un éventuel 401).
    }
  }

  Future<String> _deviceId() async {
    var id = await _storage.readDeviceId();
    if (id == null) {
      id = const Uuid().v4();
      await _storage.saveDeviceId(id);
    }
    return id;
  }

  Future<bool> requestOtp(String phoneE164) async {
    state = state.copyWith(
      isSubmitting: true,
      clearError: true,
      identifier: phoneE164,
    );
    try {
      await _repository.requestOtp(phoneE164);
      state = state.copyWith(
        status: AuthStatus.otpRequested,
        isSubmitting: false,
        otpRequestedAt: DateTime.now(),
      );
      _startCooldown();
      return true;
    } on AuthException catch (e) {
      state = state.copyWith(isSubmitting: false, errorMessage: e.message);
      return false;
    }
  }

  Future<bool> resendOtp() async {
    final identifier = state.identifier;
    if (identifier == null || state.resendCooldownSeconds > 0) return false;
    try {
      await _repository.resendOtp(identifier);
      state = state.copyWith(
        clearError: true,
        otpRequestedAt: DateTime.now(),
      );
      _startCooldown();
      return true;
    } on AuthException catch (e) {
      state = state.copyWith(errorMessage: e.message);
      return false;
    }
  }

  void _startCooldown() {
    _cooldownTimer?.cancel();
    state = state.copyWith(resendCooldownSeconds: _resendCooldownSeconds);
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      final remaining = state.resendCooldownSeconds - 1;
      if (remaining <= 0) {
        timer.cancel();
        state = state.copyWith(resendCooldownSeconds: 0);
      } else {
        state = state.copyWith(resendCooldownSeconds: remaining);
      }
    });
  }

  Future<bool> verifyOtp(String code) async {
    final identifier = state.identifier;
    if (identifier == null) {
      state = state.copyWith(errorMessage: 'Veuillez ressaisir votre numéro.');
      return false;
    }
    state = state.copyWith(
      status: AuthStatus.verifyingOtp,
      isSubmitting: true,
      clearError: true,
    );
    try {
      final deviceId = await _deviceId();
      final session = await _repository.verifyOtp(
        identifier: identifier,
        code: code,
        deviceId: deviceId,
      );
      _cooldownTimer?.cancel();
      state = state.copyWith(
        status: AuthStatus.authenticated,
        driver: session.driver,
        isSubmitting: false,
      );
      return true;
    } on AuthException catch (e) {
      state = state.copyWith(
        status: AuthStatus.otpRequested,
        isSubmitting: false,
        errorMessage: e.message,
      );
      return false;
    }
  }

  /// Retour à l'écran de saisie du numéro (ex. "modifier le numéro").
  void resetToPhoneEntry() {
    _cooldownTimer?.cancel();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  Future<void> logout() async {
    _cooldownTimer?.cancel();
    await _repository.logout();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  /// Appelé par l'intercepteur Dio quand le refresh token est invalide.
  Future<void> forceLogout() async {
    _cooldownTimer?.cancel();
    await _storage.clearSession();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }

  @override
  void dispose() {
    _cooldownTimer?.cancel();
    super.dispose();
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    dio: ref.watch(dioProvider),
    storage: ref.watch(secureStorageProvider),
  );
});

final authNotifierProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final notifier = AuthNotifier(
    repository: ref.watch(authRepositoryProvider),
    storage: ref.watch(secureStorageProvider),
  );
  // Enregistre le callback de force-logout utilisé par l'intercepteur Dio.
  ref.read(forceLogoutCallbackProvider.notifier).state = notifier.forceLogout;
  return notifier;
});
