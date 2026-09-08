import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_database.dart';

/// Instance unique de la base locale (Drift/SQLite), partagée par les
/// couches de suivi GPS et de synchronisation.
final appDatabaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(db.close);
  return db;
});
