import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/application/auth_notifier.dart';
import '../../features/auth/application/auth_state.dart';
import '../../features/auth/presentation/gps_permission_screen.dart';
import '../../features/auth/presentation/login_phone_screen.dart';
import '../../features/auth/presentation/otp_verification_screen.dart';
import '../../features/auth/presentation/profile_screen.dart';
import '../../features/auth/presentation/splash_screen.dart';
import '../../features/fuel/presentation/fuel_form_screen.dart';
import '../../features/fuel/presentation/fuel_odometer_photo_screen.dart';
import '../../features/fuel/presentation/fuel_receipt_photo_screen.dart';
import '../../features/fuel/presentation/fuel_result_screen.dart';
import '../../features/history/presentation/history_screen.dart';
import '../../features/missions/presentation/mission_detail_screen.dart';
import '../../features/missions/presentation/mission_progress_screen.dart';
import '../../features/missions/presentation/missions_list_screen.dart';
import '../../features/qr/presentation/photo_capture_screen.dart';
import '../../features/qr/presentation/qr_scan_screen.dart';
import '../../features/qr/presentation/validation_result_screen.dart';
import '../../features/sync/presentation/pending_sync_screen.dart';

/// Adapte un [Stream] en [Listenable] pour piloter `refreshListenable` de
/// GoRouter à partir des changements d'état d'authentification.
class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Stream<dynamic> stream) {
    notifyListeners();
    _subscription = stream.asBroadcastStream().listen((_) => notifyListeners());
  }

  late final StreamSubscription<dynamic> _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}

final routerProvider = Provider<GoRouter>((ref) {
  final authNotifier = ref.watch(authNotifierProvider.notifier);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: GoRouterRefreshStream(authNotifier.stream),
    redirect: (context, state) {
      final authState = ref.read(authNotifierProvider);
      final location = state.matchedLocation;
      final isAuthRoute = location == '/login' || location == '/otp';

      switch (authState.status) {
        case AuthStatus.unknown:
          return location == '/splash' ? null : '/splash';
        case AuthStatus.unauthenticated:
          return isAuthRoute ? null : '/login';
        case AuthStatus.otpRequested:
        case AuthStatus.verifyingOtp:
          return location == '/otp' ? null : '/otp';
        case AuthStatus.authenticated:
          if (location == '/splash' || isAuthRoute) return '/missions';
          return null;
      }
    },
    routes: [
      GoRoute(path: '/splash', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginPhoneScreen()),
      GoRoute(path: '/otp', builder: (_, __) => const OtpVerificationScreen()),
      GoRoute(
        path: '/gps-permission',
        builder: (_, __) => const GpsPermissionScreen(),
      ),
      GoRoute(path: '/profile', builder: (_, __) => const ProfileScreen()),
      GoRoute(path: '/sync', builder: (_, __) => const PendingSyncScreen()),
      GoRoute(path: '/history', builder: (_, __) => const HistoryScreen()),
      GoRoute(path: '/fuel', builder: (_, __) => const FuelFormScreen()),
      GoRoute(
        path: '/fuel/:vehicleId/receipt-photo',
        builder: (_, state) => FuelReceiptPhotoScreen(
          vehicleId: state.pathParameters['vehicleId']!,
        ),
      ),
      GoRoute(
        path: '/fuel/:vehicleId/odometer-photo',
        builder: (_, state) => FuelOdometerPhotoScreen(
          vehicleId: state.pathParameters['vehicleId']!,
        ),
      ),
      GoRoute(
        path: '/fuel/:vehicleId/result',
        builder: (_, state) => FuelResultScreen(
          vehicleId: state.pathParameters['vehicleId']!,
        ),
      ),
      GoRoute(
        path: '/missions',
        builder: (_, __) => const MissionsListScreen(),
      ),
      GoRoute(
        path: '/missions/:id',
        builder: (_, state) => MissionDetailScreen(
          missionId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/missions/:id/progress',
        builder: (_, state) => MissionProgressScreen(
          missionId: state.pathParameters['id']!,
        ),
      ),
      GoRoute(
        path: '/missions/:id/steps/:stepId/scan',
        builder: (_, state) => QrScanScreen(
          missionId: state.pathParameters['id']!,
          stepId: state.pathParameters['stepId']!,
        ),
      ),
      GoRoute(
        path: '/missions/:id/steps/:stepId/photo',
        builder: (_, state) => PhotoCaptureScreen(
          missionId: state.pathParameters['id']!,
          stepId: state.pathParameters['stepId']!,
        ),
      ),
      GoRoute(
        path: '/missions/:id/steps/:stepId/result',
        builder: (_, state) => ValidationResultScreen(
          missionId: state.pathParameters['id']!,
          stepId: state.pathParameters['stepId']!,
        ),
      ),
    ],
  );
});
