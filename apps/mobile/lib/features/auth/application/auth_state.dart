import '../data/models/driver.dart';

enum AuthStatus {
  /// État initial, avant vérification du token stocké.
  unknown,
  unauthenticated,
  otpRequested,
  verifyingOtp,
  authenticated,
}

/// État global d'authentification, consommé par le routeur pour décider
/// de l'écran à afficher (splash → login → OTP → missions).
class AuthState {
  const AuthState({
    this.status = AuthStatus.unknown,
    this.identifier,
    this.driver,
    this.errorMessage,
    this.isSubmitting = false,
    this.otpRequestedAt,
    this.resendCooldownSeconds = 0,
  });

  final AuthStatus status;
  final String? identifier;
  final Driver? driver;
  final String? errorMessage;
  final bool isSubmitting;
  final DateTime? otpRequestedAt;
  final int resendCooldownSeconds;

  bool get isAuthenticated =>
      status == AuthStatus.authenticated && driver != null;

  AuthState copyWith({
    AuthStatus? status,
    String? identifier,
    Driver? driver,
    String? errorMessage,
    bool clearError = false,
    bool? isSubmitting,
    DateTime? otpRequestedAt,
    int? resendCooldownSeconds,
  }) {
    return AuthState(
      status: status ?? this.status,
      identifier: identifier ?? this.identifier,
      driver: driver ?? this.driver,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      isSubmitting: isSubmitting ?? this.isSubmitting,
      otpRequestedAt: otpRequestedAt ?? this.otpRequestedAt,
      resendCooldownSeconds:
          resendCooldownSeconds ?? this.resendCooldownSeconds,
    );
  }
}
