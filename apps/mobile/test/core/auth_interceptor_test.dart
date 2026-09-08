import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:tracking_vehicles_mobile/core/api/auth_interceptor.dart';
import 'package:tracking_vehicles_mobile/core/storage/secure_storage_service.dart';

import '../helpers/fake_http_adapter.dart';

class MockSecureStorageService extends Mock implements SecureStorageService {}

void main() {
  late MockSecureStorageService storage;
  late Dio mainDio;
  late Dio refreshDio;
  late bool forcedLogout;

  setUp(() {
    storage = MockSecureStorageService();
    forcedLogout = false;

    when(() => storage.readAccessToken()).thenAnswer((_) async => 'old-access');
    when(() => storage.readRefreshToken())
        .thenAnswer((_) async => 'valid-refresh');
    when(() => storage.saveTokens(
          accessToken: any(named: 'accessToken'),
          refreshToken: any(named: 'refreshToken'),
        )).thenAnswer((_) async {});
    when(() => storage.clearSession()).thenAnswer((_) async {});

    final baseOptions = BaseOptions(baseUrl: 'https://api.test');
    refreshDio = Dio(baseOptions);
    mainDio = Dio(baseOptions);
  });

  test('401 triggers one refresh and retries the original request', () async {
    var protectedCallCount = 0;

    // Le retry après refresh passe par `refreshDio.fetch`, donc les deux
    // clients doivent partager le même faux adaptateur dans ce test.
    final sharedAdapter = FakeHttpClientAdapter((options) {
      if (options.path == '/auth/refresh') {
        return const FakeResponse(
          statusCode: 200,
          data: {'accessToken': 'new-access', 'refreshToken': 'new-refresh'},
        );
      }
      if (options.path == '/protected') {
        protectedCallCount++;
        final authHeader = options.headers['Authorization'] as String?;
        if (authHeader == 'Bearer new-access') {
          return const FakeResponse(statusCode: 200, data: {'ok': true});
        }
        return const FakeResponse(
          statusCode: 401,
          data: {'message': 'Unauthorized'},
        );
      }
      throw StateError('Unexpected path ${options.path}');
    });
    mainDio.httpClientAdapter = sharedAdapter;
    refreshDio.httpClientAdapter = sharedAdapter;

    // After refresh succeeds, subsequent reads should return the new token.
    when(() => storage.readAccessToken()).thenAnswer((invocation) async {
      return protectedCallCount == 0 ? 'old-access' : 'new-access';
    });

    mainDio.interceptors.add(AuthInterceptor(
      storage: storage,
      refreshDio: refreshDio,
      onForceLogout: () async {
        forcedLogout = true;
      },
    ));

    final response = await mainDio.get('/protected');

    expect(response.statusCode, 200);
    expect(response.data['ok'], true);
    expect(protectedCallCount, 2, reason: 'original call + retry after refresh');
    verify(() => storage.saveTokens(
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
        )).called(1);
    expect(forcedLogout, isFalse);
  });

  test('forces logout when refresh also fails', () async {
    mainDio.httpClientAdapter = FakeHttpClientAdapter((options) {
      return const FakeResponse(
        statusCode: 401,
        data: {'message': 'Unauthorized'},
      );
    });

    refreshDio.httpClientAdapter = FakeHttpClientAdapter((options) {
      return const FakeResponse(
        statusCode: 401,
        data: {'message': 'Invalid refresh token'},
      );
    });

    mainDio.interceptors.add(AuthInterceptor(
      storage: storage,
      refreshDio: refreshDio,
      onForceLogout: () async {
        forcedLogout = true;
      },
    ));

    await expectLater(
      mainDio.get('/protected'),
      throwsA(isA<DioException>()),
    );

    expect(forcedLogout, isTrue);
    verify(() => storage.clearSession()).called(1);
  });
}
