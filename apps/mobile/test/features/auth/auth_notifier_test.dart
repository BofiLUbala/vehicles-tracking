import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:tracking_vehicles_mobile/features/auth/application/auth_notifier.dart';
import 'package:tracking_vehicles_mobile/features/auth/application/auth_state.dart';
import 'package:tracking_vehicles_mobile/features/auth/data/auth_repository.dart';
import 'package:tracking_vehicles_mobile/features/auth/data/models/driver.dart';
import 'package:tracking_vehicles_mobile/core/storage/secure_storage_service.dart';

class MockAuthRepository extends Mock implements AuthRepository {}

class MockSecureStorageService extends Mock implements SecureStorageService {}

void main() {
  late MockAuthRepository repository;
  late MockSecureStorageService storage;

  const phone = '+243999000000';
  const driver = Driver(id: 'd1', fullName: 'Jean Kabila', phone: phone);

  setUp(() {
    repository = MockAuthRepository();
    storage = MockSecureStorageService();

    when(() => repository.hasStoredSession()).thenAnswer((_) async => false);
    when(() => storage.readDeviceId()).thenAnswer((_) async => 'device-123');
  });

  Future<AuthNotifier> buildNotifier() async {
    final notifier = AuthNotifier(repository: repository, storage: storage);
    // Laisse l'initialisation asynchrone (_init) se terminer.
    await Future<void>.delayed(Duration.zero);
    addTearDown(notifier.dispose);
    return notifier;
  }

  test('starts unauthenticated when no session is stored', () async {
    final notifier = await buildNotifier();
    expect(notifier.state.status, AuthStatus.unauthenticated);
  });

  test(
      'happy path: requestOtp -> verifyOtp -> tokens stored -> authenticated',
      () async {
    when(() => repository.requestOtp(phone)).thenAnswer((_) async {});
    when(() => repository.verifyOtp(
          identifier: phone,
          code: '123456',
          deviceId: 'device-123',
        )).thenAnswer((_) async => const AuthSession(
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          driver: driver,
        ));

    final notifier = await buildNotifier();

    final requested = await notifier.requestOtp(phone);
    expect(requested, isTrue);
    expect(notifier.state.status, AuthStatus.otpRequested);
    expect(notifier.state.identifier, phone);

    final verified = await notifier.verifyOtp('123456');
    expect(verified, isTrue);
    expect(notifier.state.status, AuthStatus.authenticated);
    expect(notifier.state.driver, driver);
    expect(notifier.state.isAuthenticated, isTrue);

    verify(() => repository.verifyOtp(
          identifier: phone,
          code: '123456',
          deviceId: 'device-123',
        )).called(1);
  });

  test('wrong OTP surfaces an error and stays on the OTP screen', () async {
    when(() => repository.requestOtp(phone)).thenAnswer((_) async {});
    when(() => repository.verifyOtp(
          identifier: phone,
          code: any(named: 'code'),
          deviceId: any(named: 'deviceId'),
        )).thenThrow(AuthException('Code incorrect ou expiré.'));

    final notifier = await buildNotifier();
    await notifier.requestOtp(phone);

    final verified = await notifier.verifyOtp('000000');

    expect(verified, isFalse);
    expect(notifier.state.status, AuthStatus.otpRequested);
    expect(notifier.state.errorMessage, 'Code incorrect ou expiré.');
    expect(notifier.state.isAuthenticated, isFalse);
  });

  test('requestOtp failure surfaces an error without changing status',
      () async {
    when(() => repository.requestOtp(phone))
        .thenThrow(AuthException("Ce numéro n'est pas reconnu."));

    final notifier = await buildNotifier();
    final ok = await notifier.requestOtp(phone);

    expect(ok, isFalse);
    expect(notifier.state.status, AuthStatus.unauthenticated);
    expect(notifier.state.errorMessage, "Ce numéro n'est pas reconnu.");
  });
}
