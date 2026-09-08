import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router/app_router.dart';
import 'core/sync/sync_providers.dart';
import 'core/theme/app_theme.dart';

void main() {
  runApp(const ProviderScope(child: TrackingVehiclesApp()));
}

class TrackingVehiclesApp extends ConsumerStatefulWidget {
  const TrackingVehiclesApp({super.key});

  @override
  ConsumerState<TrackingVehiclesApp> createState() =>
      _TrackingVehiclesAppState();
}

class _TrackingVehiclesAppState extends ConsumerState<TrackingVehiclesApp> {
  @override
  void initState() {
    super.initState();
    // Remet en `pending` les lignes restées `uploading` (process tué en
    // plein envoi) et démarre l'écoute connectivité + minuteur de repli —
    // une seule fois pour toute la durée de vie de l'app.
    Future.microtask(() => ref.read(syncServiceProvider).init());
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Suivi des véhicules — Chauffeur',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      routerConfig: router,
      locale: const Locale('fr', 'FR'),
      supportedLocales: const [Locale('fr', 'FR')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    );
  }
}
