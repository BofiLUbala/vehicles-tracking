import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tracking_vehicles_mobile/features/qr/application/qr_flow_notifier.dart';
import 'package:tracking_vehicles_mobile/features/sync/presentation/pending_sync_screen.dart';
import 'package:tracking_vehicles_mobile/features/tracking/application/tracking_providers.dart';

/// Écran testé isolément : les providers de comptage (`StreamProvider`) sont
/// remplacés par des valeurs seedées via `overrideWith`, sans base de
/// données ni réseau réels — seul l'affichage des compteurs est vérifié
/// ici (la logique de synchronisation elle-même est couverte par
/// `test/core/sync/sync_service_test.dart`).
void main() {
  Widget buildApp({
    required int gpsPending,
    required int gpsFailed,
    required int validationsPending,
    required int validationsFailed,
  }) {
    return ProviderScope(
      overrides: [
        pendingGpsCountProvider.overrideWith((ref) => Stream.value(gpsPending)),
        gpsFailedCountProvider.overrideWith((ref) => Stream.value(gpsFailed)),
        pendingValidationsCountProvider
            .overrideWith((ref) => Stream.value(validationsPending)),
        validationsFailedCountProvider
            .overrideWith((ref) => Stream.value(validationsFailed)),
      ],
      child: const MaterialApp(home: PendingSyncScreen()),
    );
  }

  testWidgets('shows the real pending/failed counts from seeded providers',
      (tester) async {
    await tester.pumpWidget(buildApp(
      gpsPending: 12,
      gpsFailed: 2,
      validationsPending: 3,
      validationsFailed: 0,
    ));
    await tester.pump();

    expect(find.text('15 élément(s) en attente d\'envoi.'), findsOneWidget);
    expect(
      find.text('12 en attente, dont 2 en échec (retenté automatiquement)'),
      findsOneWidget,
    );
    expect(find.text('3 en attente'), findsOneWidget);
  });

  testWidgets('shows an all-synced state when every queue is empty',
      (tester) async {
    await tester.pumpWidget(buildApp(
      gpsPending: 0,
      gpsFailed: 0,
      validationsPending: 0,
      validationsFailed: 0,
    ));
    await tester.pump();

    expect(
      find.text('Toutes les données sont synchronisées.'),
      findsOneWidget,
    );
    expect(find.text('Tout est synchronisé.'), findsOneWidget);

    // The manual sync button is disabled when there's nothing to sync.
    final button = tester.widget<ElevatedButton>(find.byType(ElevatedButton));
    expect(button.onPressed, isNull);
  });
}
