import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

part 'app_database.g.dart';

/// Statuts possibles d'une ligne en attente de synchronisation (positions
/// GPS ou validations d'étape). Stockés en texte en base (voir
/// [SyncStatusConverter]) pour rester lisibles en debug SQLite.
enum SyncStatus { pending, uploading, synced, failed, conflict }

class SyncStatusConverter extends TypeConverter<SyncStatus, String> {
  const SyncStatusConverter();

  @override
  SyncStatus fromSql(String fromDb) {
    return SyncStatus.values.firstWhere(
      (s) => s.name == fromDb,
      orElse: () => SyncStatus.pending,
    );
  }

  @override
  String toSql(SyncStatus value) => value.name;
}

/// File d'attente locale des positions GPS relevées pendant une mission
/// active, en attente d'envoi vers `POST /tracking/positions/batch`
/// (cf. docs/PHASE3_NOTES.md).
class PendingGpsPositions extends Table {
  IntColumn get id => integer().autoIncrement()();

  /// Identifiant unique généré côté client (UUID) — sert de clé
  /// d'idempotence côté serveur, comme pour les validations d'étape.
  TextColumn get clientEventId => text().unique()();

  TextColumn get vehicleId => text()();
  TextColumn get missionId => text().nullable()();

  RealColumn get latitude => real()();
  RealColumn get longitude => real()();
  RealColumn get accuracy => real().nullable()();
  RealColumn get altitude => real().nullable()();
  RealColumn get speed => real().nullable()();
  RealColumn get heading => real().nullable()();
  BoolColumn get isMocked => boolean().withDefault(const Constant(false))();

  /// Horodatage de la position elle-même (fourni par le GPS).
  DateTimeColumn get recordedAt => dateTime()();

  /// Horodatage d'écriture en base locale (peut différer de [recordedAt]
  /// en cas de traitement différé).
  DateTimeColumn get createdAtDevice =>
      dateTime().withDefault(currentDateAndTime)();

  TextColumn get syncStatus => text()
      .map(const SyncStatusConverter())
      .withDefault(const Constant('pending'))();

  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  TextColumn get lastError => text().nullable()();

  /// Prochain instant où un essai automatique (déclenché par la
  /// reconnexion ou le minuteur périodique) est autorisé — calculé avec un
  /// backoff exponentiel après chaque échec. `null` = aucune attente.
  /// Le bouton manuel "Synchroniser maintenant" ignore ce délai.
  DateTimeColumn get nextRetryAt => dateTime().nullable()();
}

/// File d'attente locale des validations d'étape (QR + GPS + photo) en
/// attente d'envoi vers `POST /mission-steps/:id/validate` — alimentée
/// quand la validation est tentée hors ligne (Phase 2 appelait l'API
/// directement en supposant une connexion active).
class PendingValidations extends Table {
  IntColumn get id => integer().autoIncrement()();

  TextColumn get clientEventId => text().unique()();
  TextColumn get missionStepId => text()();
  TextColumn get qrToken => text()();

  RealColumn get latitude => real()();
  RealColumn get longitude => real()();
  RealColumn get accuracy => real().nullable()();
  BoolColumn get isMocked => boolean().withDefault(const Constant(false))();

  DateTimeColumn get recordedAt => dateTime()();

  /// Chemin local (fichier) de la photo prise — le fichier reste sur le
  /// disque de l'appareil jusqu'à l'envoi multipart réussi.
  TextColumn get photoPath => text()();

  DateTimeColumn get createdAtDevice =>
      dateTime().withDefault(currentDateAndTime)();

  TextColumn get syncStatus => text()
      .map(const SyncStatusConverter())
      .withDefault(const Constant('pending'))();

  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  TextColumn get lastError => text().nullable()();
  DateTimeColumn get nextRetryAt => dateTime().nullable()();
}

/// Cache brut (un seul blob JSON) de la dernière réponse réussie de
/// `GET /mobile/missions/today`, pour repli hors-ligne à l'ouverture de
/// l'app. Volontairement non normalisé en tables Drift : le seul besoin
/// est "revoir la dernière liste connue", pas une source de vérité locale.
class TodayMissionsCache extends Table {
  /// Toujours 0 — une seule ligne, remplacée à chaque fetch réussi.
  IntColumn get id => integer().withDefault(const Constant(0))();
  TextColumn get responseJson => text()();
  DateTimeColumn get fetchedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

@DriftDatabase(
  tables: [PendingGpsPositions, PendingValidations, TodayMissionsCache],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  /// Constructeur pour les tests : base en mémoire (`NativeDatabase.memory`).
  AppDatabase.forTesting(super.executor);

  @override
  int get schemaVersion => 1;
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'tracking_vehicles.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}
