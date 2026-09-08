/// Configuration globale de l'application.
///
/// L'URL de base de l'API est injectée à la compilation avec
/// `--dart-define=API_BASE_URL=https://mon-api.example.com/api/v1`.
/// En développement, elle pointe par défaut sur l'API locale.
class AppConfig {
  AppConfig._();

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:3001/api/v1',
  );

  /// Délai d'attente réseau par défaut.
  static const Duration connectTimeout = Duration(seconds: 15);
  static const Duration receiveTimeout = Duration(seconds: 30);
}
