// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $PendingGpsPositionsTable extends PendingGpsPositions
    with TableInfo<$PendingGpsPositionsTable, PendingGpsPosition> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $PendingGpsPositionsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _clientEventIdMeta =
      const VerificationMeta('clientEventId');
  @override
  late final GeneratedColumn<String> clientEventId = GeneratedColumn<String>(
      'client_event_id', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: true,
      defaultConstraints: GeneratedColumn.constraintIsAlways('UNIQUE'));
  static const VerificationMeta _vehicleIdMeta =
      const VerificationMeta('vehicleId');
  @override
  late final GeneratedColumn<String> vehicleId = GeneratedColumn<String>(
      'vehicle_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _missionIdMeta =
      const VerificationMeta('missionId');
  @override
  late final GeneratedColumn<String> missionId = GeneratedColumn<String>(
      'mission_id', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _latitudeMeta =
      const VerificationMeta('latitude');
  @override
  late final GeneratedColumn<double> latitude = GeneratedColumn<double>(
      'latitude', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _longitudeMeta =
      const VerificationMeta('longitude');
  @override
  late final GeneratedColumn<double> longitude = GeneratedColumn<double>(
      'longitude', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _accuracyMeta =
      const VerificationMeta('accuracy');
  @override
  late final GeneratedColumn<double> accuracy = GeneratedColumn<double>(
      'accuracy', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _altitudeMeta =
      const VerificationMeta('altitude');
  @override
  late final GeneratedColumn<double> altitude = GeneratedColumn<double>(
      'altitude', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _speedMeta = const VerificationMeta('speed');
  @override
  late final GeneratedColumn<double> speed = GeneratedColumn<double>(
      'speed', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _headingMeta =
      const VerificationMeta('heading');
  @override
  late final GeneratedColumn<double> heading = GeneratedColumn<double>(
      'heading', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _isMockedMeta =
      const VerificationMeta('isMocked');
  @override
  late final GeneratedColumn<bool> isMocked = GeneratedColumn<bool>(
      'is_mocked', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_mocked" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _recordedAtMeta =
      const VerificationMeta('recordedAt');
  @override
  late final GeneratedColumn<DateTime> recordedAt = GeneratedColumn<DateTime>(
      'recorded_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _createdAtDeviceMeta =
      const VerificationMeta('createdAtDevice');
  @override
  late final GeneratedColumn<DateTime> createdAtDevice =
      GeneratedColumn<DateTime>('created_at_device', aliasedName, false,
          type: DriftSqlType.dateTime,
          requiredDuringInsert: false,
          defaultValue: currentDateAndTime);
  @override
  late final GeneratedColumnWithTypeConverter<SyncStatus, String> syncStatus =
      GeneratedColumn<String>('sync_status', aliasedName, false,
              type: DriftSqlType.string,
              requiredDuringInsert: false,
              defaultValue: const Constant('pending'))
          .withConverter<SyncStatus>(
              $PendingGpsPositionsTable.$convertersyncStatus);
  static const VerificationMeta _retryCountMeta =
      const VerificationMeta('retryCount');
  @override
  late final GeneratedColumn<int> retryCount = GeneratedColumn<int>(
      'retry_count', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _lastErrorMeta =
      const VerificationMeta('lastError');
  @override
  late final GeneratedColumn<String> lastError = GeneratedColumn<String>(
      'last_error', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _nextRetryAtMeta =
      const VerificationMeta('nextRetryAt');
  @override
  late final GeneratedColumn<DateTime> nextRetryAt = GeneratedColumn<DateTime>(
      'next_retry_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        clientEventId,
        vehicleId,
        missionId,
        latitude,
        longitude,
        accuracy,
        altitude,
        speed,
        heading,
        isMocked,
        recordedAt,
        createdAtDevice,
        syncStatus,
        retryCount,
        lastError,
        nextRetryAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'pending_gps_positions';
  @override
  VerificationContext validateIntegrity(Insertable<PendingGpsPosition> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('client_event_id')) {
      context.handle(
          _clientEventIdMeta,
          clientEventId.isAcceptableOrUnknown(
              data['client_event_id']!, _clientEventIdMeta));
    } else if (isInserting) {
      context.missing(_clientEventIdMeta);
    }
    if (data.containsKey('vehicle_id')) {
      context.handle(_vehicleIdMeta,
          vehicleId.isAcceptableOrUnknown(data['vehicle_id']!, _vehicleIdMeta));
    } else if (isInserting) {
      context.missing(_vehicleIdMeta);
    }
    if (data.containsKey('mission_id')) {
      context.handle(_missionIdMeta,
          missionId.isAcceptableOrUnknown(data['mission_id']!, _missionIdMeta));
    }
    if (data.containsKey('latitude')) {
      context.handle(_latitudeMeta,
          latitude.isAcceptableOrUnknown(data['latitude']!, _latitudeMeta));
    } else if (isInserting) {
      context.missing(_latitudeMeta);
    }
    if (data.containsKey('longitude')) {
      context.handle(_longitudeMeta,
          longitude.isAcceptableOrUnknown(data['longitude']!, _longitudeMeta));
    } else if (isInserting) {
      context.missing(_longitudeMeta);
    }
    if (data.containsKey('accuracy')) {
      context.handle(_accuracyMeta,
          accuracy.isAcceptableOrUnknown(data['accuracy']!, _accuracyMeta));
    }
    if (data.containsKey('altitude')) {
      context.handle(_altitudeMeta,
          altitude.isAcceptableOrUnknown(data['altitude']!, _altitudeMeta));
    }
    if (data.containsKey('speed')) {
      context.handle(
          _speedMeta, speed.isAcceptableOrUnknown(data['speed']!, _speedMeta));
    }
    if (data.containsKey('heading')) {
      context.handle(_headingMeta,
          heading.isAcceptableOrUnknown(data['heading']!, _headingMeta));
    }
    if (data.containsKey('is_mocked')) {
      context.handle(_isMockedMeta,
          isMocked.isAcceptableOrUnknown(data['is_mocked']!, _isMockedMeta));
    }
    if (data.containsKey('recorded_at')) {
      context.handle(
          _recordedAtMeta,
          recordedAt.isAcceptableOrUnknown(
              data['recorded_at']!, _recordedAtMeta));
    } else if (isInserting) {
      context.missing(_recordedAtMeta);
    }
    if (data.containsKey('created_at_device')) {
      context.handle(
          _createdAtDeviceMeta,
          createdAtDevice.isAcceptableOrUnknown(
              data['created_at_device']!, _createdAtDeviceMeta));
    }
    if (data.containsKey('retry_count')) {
      context.handle(
          _retryCountMeta,
          retryCount.isAcceptableOrUnknown(
              data['retry_count']!, _retryCountMeta));
    }
    if (data.containsKey('last_error')) {
      context.handle(_lastErrorMeta,
          lastError.isAcceptableOrUnknown(data['last_error']!, _lastErrorMeta));
    }
    if (data.containsKey('next_retry_at')) {
      context.handle(
          _nextRetryAtMeta,
          nextRetryAt.isAcceptableOrUnknown(
              data['next_retry_at']!, _nextRetryAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  PendingGpsPosition map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return PendingGpsPosition(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      clientEventId: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}client_event_id'])!,
      vehicleId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}vehicle_id'])!,
      missionId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}mission_id']),
      latitude: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}latitude'])!,
      longitude: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}longitude'])!,
      accuracy: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}accuracy']),
      altitude: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}altitude']),
      speed: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}speed']),
      heading: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}heading']),
      isMocked: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_mocked'])!,
      recordedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}recorded_at'])!,
      createdAtDevice: attachedDatabase.typeMapping.read(
          DriftSqlType.dateTime, data['${effectivePrefix}created_at_device'])!,
      syncStatus: $PendingGpsPositionsTable.$convertersyncStatus.fromSql(
          attachedDatabase.typeMapping.read(
              DriftSqlType.string, data['${effectivePrefix}sync_status'])!),
      retryCount: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}retry_count'])!,
      lastError: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}last_error']),
      nextRetryAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}next_retry_at']),
    );
  }

  @override
  $PendingGpsPositionsTable createAlias(String alias) {
    return $PendingGpsPositionsTable(attachedDatabase, alias);
  }

  static TypeConverter<SyncStatus, String> $convertersyncStatus =
      const SyncStatusConverter();
}

class PendingGpsPosition extends DataClass
    implements Insertable<PendingGpsPosition> {
  final int id;

  /// Identifiant unique généré côté client (UUID) — sert de clé
  /// d'idempotence côté serveur, comme pour les validations d'étape.
  final String clientEventId;
  final String vehicleId;
  final String? missionId;
  final double latitude;
  final double longitude;
  final double? accuracy;
  final double? altitude;
  final double? speed;
  final double? heading;
  final bool isMocked;

  /// Horodatage de la position elle-même (fourni par le GPS).
  final DateTime recordedAt;

  /// Horodatage d'écriture en base locale (peut différer de [recordedAt]
  /// en cas de traitement différé).
  final DateTime createdAtDevice;
  final SyncStatus syncStatus;
  final int retryCount;
  final String? lastError;

  /// Prochain instant où un essai automatique (déclenché par la
  /// reconnexion ou le minuteur périodique) est autorisé — calculé avec un
  /// backoff exponentiel après chaque échec. `null` = aucune attente.
  /// Le bouton manuel "Synchroniser maintenant" ignore ce délai.
  final DateTime? nextRetryAt;
  const PendingGpsPosition(
      {required this.id,
      required this.clientEventId,
      required this.vehicleId,
      this.missionId,
      required this.latitude,
      required this.longitude,
      this.accuracy,
      this.altitude,
      this.speed,
      this.heading,
      required this.isMocked,
      required this.recordedAt,
      required this.createdAtDevice,
      required this.syncStatus,
      required this.retryCount,
      this.lastError,
      this.nextRetryAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['client_event_id'] = Variable<String>(clientEventId);
    map['vehicle_id'] = Variable<String>(vehicleId);
    if (!nullToAbsent || missionId != null) {
      map['mission_id'] = Variable<String>(missionId);
    }
    map['latitude'] = Variable<double>(latitude);
    map['longitude'] = Variable<double>(longitude);
    if (!nullToAbsent || accuracy != null) {
      map['accuracy'] = Variable<double>(accuracy);
    }
    if (!nullToAbsent || altitude != null) {
      map['altitude'] = Variable<double>(altitude);
    }
    if (!nullToAbsent || speed != null) {
      map['speed'] = Variable<double>(speed);
    }
    if (!nullToAbsent || heading != null) {
      map['heading'] = Variable<double>(heading);
    }
    map['is_mocked'] = Variable<bool>(isMocked);
    map['recorded_at'] = Variable<DateTime>(recordedAt);
    map['created_at_device'] = Variable<DateTime>(createdAtDevice);
    {
      map['sync_status'] = Variable<String>(
          $PendingGpsPositionsTable.$convertersyncStatus.toSql(syncStatus));
    }
    map['retry_count'] = Variable<int>(retryCount);
    if (!nullToAbsent || lastError != null) {
      map['last_error'] = Variable<String>(lastError);
    }
    if (!nullToAbsent || nextRetryAt != null) {
      map['next_retry_at'] = Variable<DateTime>(nextRetryAt);
    }
    return map;
  }

  PendingGpsPositionsCompanion toCompanion(bool nullToAbsent) {
    return PendingGpsPositionsCompanion(
      id: Value(id),
      clientEventId: Value(clientEventId),
      vehicleId: Value(vehicleId),
      missionId: missionId == null && nullToAbsent
          ? const Value.absent()
          : Value(missionId),
      latitude: Value(latitude),
      longitude: Value(longitude),
      accuracy: accuracy == null && nullToAbsent
          ? const Value.absent()
          : Value(accuracy),
      altitude: altitude == null && nullToAbsent
          ? const Value.absent()
          : Value(altitude),
      speed:
          speed == null && nullToAbsent ? const Value.absent() : Value(speed),
      heading: heading == null && nullToAbsent
          ? const Value.absent()
          : Value(heading),
      isMocked: Value(isMocked),
      recordedAt: Value(recordedAt),
      createdAtDevice: Value(createdAtDevice),
      syncStatus: Value(syncStatus),
      retryCount: Value(retryCount),
      lastError: lastError == null && nullToAbsent
          ? const Value.absent()
          : Value(lastError),
      nextRetryAt: nextRetryAt == null && nullToAbsent
          ? const Value.absent()
          : Value(nextRetryAt),
    );
  }

  factory PendingGpsPosition.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return PendingGpsPosition(
      id: serializer.fromJson<int>(json['id']),
      clientEventId: serializer.fromJson<String>(json['clientEventId']),
      vehicleId: serializer.fromJson<String>(json['vehicleId']),
      missionId: serializer.fromJson<String?>(json['missionId']),
      latitude: serializer.fromJson<double>(json['latitude']),
      longitude: serializer.fromJson<double>(json['longitude']),
      accuracy: serializer.fromJson<double?>(json['accuracy']),
      altitude: serializer.fromJson<double?>(json['altitude']),
      speed: serializer.fromJson<double?>(json['speed']),
      heading: serializer.fromJson<double?>(json['heading']),
      isMocked: serializer.fromJson<bool>(json['isMocked']),
      recordedAt: serializer.fromJson<DateTime>(json['recordedAt']),
      createdAtDevice: serializer.fromJson<DateTime>(json['createdAtDevice']),
      syncStatus: serializer.fromJson<SyncStatus>(json['syncStatus']),
      retryCount: serializer.fromJson<int>(json['retryCount']),
      lastError: serializer.fromJson<String?>(json['lastError']),
      nextRetryAt: serializer.fromJson<DateTime?>(json['nextRetryAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'clientEventId': serializer.toJson<String>(clientEventId),
      'vehicleId': serializer.toJson<String>(vehicleId),
      'missionId': serializer.toJson<String?>(missionId),
      'latitude': serializer.toJson<double>(latitude),
      'longitude': serializer.toJson<double>(longitude),
      'accuracy': serializer.toJson<double?>(accuracy),
      'altitude': serializer.toJson<double?>(altitude),
      'speed': serializer.toJson<double?>(speed),
      'heading': serializer.toJson<double?>(heading),
      'isMocked': serializer.toJson<bool>(isMocked),
      'recordedAt': serializer.toJson<DateTime>(recordedAt),
      'createdAtDevice': serializer.toJson<DateTime>(createdAtDevice),
      'syncStatus': serializer.toJson<SyncStatus>(syncStatus),
      'retryCount': serializer.toJson<int>(retryCount),
      'lastError': serializer.toJson<String?>(lastError),
      'nextRetryAt': serializer.toJson<DateTime?>(nextRetryAt),
    };
  }

  PendingGpsPosition copyWith(
          {int? id,
          String? clientEventId,
          String? vehicleId,
          Value<String?> missionId = const Value.absent(),
          double? latitude,
          double? longitude,
          Value<double?> accuracy = const Value.absent(),
          Value<double?> altitude = const Value.absent(),
          Value<double?> speed = const Value.absent(),
          Value<double?> heading = const Value.absent(),
          bool? isMocked,
          DateTime? recordedAt,
          DateTime? createdAtDevice,
          SyncStatus? syncStatus,
          int? retryCount,
          Value<String?> lastError = const Value.absent(),
          Value<DateTime?> nextRetryAt = const Value.absent()}) =>
      PendingGpsPosition(
        id: id ?? this.id,
        clientEventId: clientEventId ?? this.clientEventId,
        vehicleId: vehicleId ?? this.vehicleId,
        missionId: missionId.present ? missionId.value : this.missionId,
        latitude: latitude ?? this.latitude,
        longitude: longitude ?? this.longitude,
        accuracy: accuracy.present ? accuracy.value : this.accuracy,
        altitude: altitude.present ? altitude.value : this.altitude,
        speed: speed.present ? speed.value : this.speed,
        heading: heading.present ? heading.value : this.heading,
        isMocked: isMocked ?? this.isMocked,
        recordedAt: recordedAt ?? this.recordedAt,
        createdAtDevice: createdAtDevice ?? this.createdAtDevice,
        syncStatus: syncStatus ?? this.syncStatus,
        retryCount: retryCount ?? this.retryCount,
        lastError: lastError.present ? lastError.value : this.lastError,
        nextRetryAt: nextRetryAt.present ? nextRetryAt.value : this.nextRetryAt,
      );
  PendingGpsPosition copyWithCompanion(PendingGpsPositionsCompanion data) {
    return PendingGpsPosition(
      id: data.id.present ? data.id.value : this.id,
      clientEventId: data.clientEventId.present
          ? data.clientEventId.value
          : this.clientEventId,
      vehicleId: data.vehicleId.present ? data.vehicleId.value : this.vehicleId,
      missionId: data.missionId.present ? data.missionId.value : this.missionId,
      latitude: data.latitude.present ? data.latitude.value : this.latitude,
      longitude: data.longitude.present ? data.longitude.value : this.longitude,
      accuracy: data.accuracy.present ? data.accuracy.value : this.accuracy,
      altitude: data.altitude.present ? data.altitude.value : this.altitude,
      speed: data.speed.present ? data.speed.value : this.speed,
      heading: data.heading.present ? data.heading.value : this.heading,
      isMocked: data.isMocked.present ? data.isMocked.value : this.isMocked,
      recordedAt:
          data.recordedAt.present ? data.recordedAt.value : this.recordedAt,
      createdAtDevice: data.createdAtDevice.present
          ? data.createdAtDevice.value
          : this.createdAtDevice,
      syncStatus:
          data.syncStatus.present ? data.syncStatus.value : this.syncStatus,
      retryCount:
          data.retryCount.present ? data.retryCount.value : this.retryCount,
      lastError: data.lastError.present ? data.lastError.value : this.lastError,
      nextRetryAt:
          data.nextRetryAt.present ? data.nextRetryAt.value : this.nextRetryAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('PendingGpsPosition(')
          ..write('id: $id, ')
          ..write('clientEventId: $clientEventId, ')
          ..write('vehicleId: $vehicleId, ')
          ..write('missionId: $missionId, ')
          ..write('latitude: $latitude, ')
          ..write('longitude: $longitude, ')
          ..write('accuracy: $accuracy, ')
          ..write('altitude: $altitude, ')
          ..write('speed: $speed, ')
          ..write('heading: $heading, ')
          ..write('isMocked: $isMocked, ')
          ..write('recordedAt: $recordedAt, ')
          ..write('createdAtDevice: $createdAtDevice, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('retryCount: $retryCount, ')
          ..write('lastError: $lastError, ')
          ..write('nextRetryAt: $nextRetryAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      clientEventId,
      vehicleId,
      missionId,
      latitude,
      longitude,
      accuracy,
      altitude,
      speed,
      heading,
      isMocked,
      recordedAt,
      createdAtDevice,
      syncStatus,
      retryCount,
      lastError,
      nextRetryAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PendingGpsPosition &&
          other.id == this.id &&
          other.clientEventId == this.clientEventId &&
          other.vehicleId == this.vehicleId &&
          other.missionId == this.missionId &&
          other.latitude == this.latitude &&
          other.longitude == this.longitude &&
          other.accuracy == this.accuracy &&
          other.altitude == this.altitude &&
          other.speed == this.speed &&
          other.heading == this.heading &&
          other.isMocked == this.isMocked &&
          other.recordedAt == this.recordedAt &&
          other.createdAtDevice == this.createdAtDevice &&
          other.syncStatus == this.syncStatus &&
          other.retryCount == this.retryCount &&
          other.lastError == this.lastError &&
          other.nextRetryAt == this.nextRetryAt);
}

class PendingGpsPositionsCompanion extends UpdateCompanion<PendingGpsPosition> {
  final Value<int> id;
  final Value<String> clientEventId;
  final Value<String> vehicleId;
  final Value<String?> missionId;
  final Value<double> latitude;
  final Value<double> longitude;
  final Value<double?> accuracy;
  final Value<double?> altitude;
  final Value<double?> speed;
  final Value<double?> heading;
  final Value<bool> isMocked;
  final Value<DateTime> recordedAt;
  final Value<DateTime> createdAtDevice;
  final Value<SyncStatus> syncStatus;
  final Value<int> retryCount;
  final Value<String?> lastError;
  final Value<DateTime?> nextRetryAt;
  const PendingGpsPositionsCompanion({
    this.id = const Value.absent(),
    this.clientEventId = const Value.absent(),
    this.vehicleId = const Value.absent(),
    this.missionId = const Value.absent(),
    this.latitude = const Value.absent(),
    this.longitude = const Value.absent(),
    this.accuracy = const Value.absent(),
    this.altitude = const Value.absent(),
    this.speed = const Value.absent(),
    this.heading = const Value.absent(),
    this.isMocked = const Value.absent(),
    this.recordedAt = const Value.absent(),
    this.createdAtDevice = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.retryCount = const Value.absent(),
    this.lastError = const Value.absent(),
    this.nextRetryAt = const Value.absent(),
  });
  PendingGpsPositionsCompanion.insert({
    this.id = const Value.absent(),
    required String clientEventId,
    required String vehicleId,
    this.missionId = const Value.absent(),
    required double latitude,
    required double longitude,
    this.accuracy = const Value.absent(),
    this.altitude = const Value.absent(),
    this.speed = const Value.absent(),
    this.heading = const Value.absent(),
    this.isMocked = const Value.absent(),
    required DateTime recordedAt,
    this.createdAtDevice = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.retryCount = const Value.absent(),
    this.lastError = const Value.absent(),
    this.nextRetryAt = const Value.absent(),
  })  : clientEventId = Value(clientEventId),
        vehicleId = Value(vehicleId),
        latitude = Value(latitude),
        longitude = Value(longitude),
        recordedAt = Value(recordedAt);
  static Insertable<PendingGpsPosition> custom({
    Expression<int>? id,
    Expression<String>? clientEventId,
    Expression<String>? vehicleId,
    Expression<String>? missionId,
    Expression<double>? latitude,
    Expression<double>? longitude,
    Expression<double>? accuracy,
    Expression<double>? altitude,
    Expression<double>? speed,
    Expression<double>? heading,
    Expression<bool>? isMocked,
    Expression<DateTime>? recordedAt,
    Expression<DateTime>? createdAtDevice,
    Expression<String>? syncStatus,
    Expression<int>? retryCount,
    Expression<String>? lastError,
    Expression<DateTime>? nextRetryAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (clientEventId != null) 'client_event_id': clientEventId,
      if (vehicleId != null) 'vehicle_id': vehicleId,
      if (missionId != null) 'mission_id': missionId,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      if (accuracy != null) 'accuracy': accuracy,
      if (altitude != null) 'altitude': altitude,
      if (speed != null) 'speed': speed,
      if (heading != null) 'heading': heading,
      if (isMocked != null) 'is_mocked': isMocked,
      if (recordedAt != null) 'recorded_at': recordedAt,
      if (createdAtDevice != null) 'created_at_device': createdAtDevice,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (retryCount != null) 'retry_count': retryCount,
      if (lastError != null) 'last_error': lastError,
      if (nextRetryAt != null) 'next_retry_at': nextRetryAt,
    });
  }

  PendingGpsPositionsCompanion copyWith(
      {Value<int>? id,
      Value<String>? clientEventId,
      Value<String>? vehicleId,
      Value<String?>? missionId,
      Value<double>? latitude,
      Value<double>? longitude,
      Value<double?>? accuracy,
      Value<double?>? altitude,
      Value<double?>? speed,
      Value<double?>? heading,
      Value<bool>? isMocked,
      Value<DateTime>? recordedAt,
      Value<DateTime>? createdAtDevice,
      Value<SyncStatus>? syncStatus,
      Value<int>? retryCount,
      Value<String?>? lastError,
      Value<DateTime?>? nextRetryAt}) {
    return PendingGpsPositionsCompanion(
      id: id ?? this.id,
      clientEventId: clientEventId ?? this.clientEventId,
      vehicleId: vehicleId ?? this.vehicleId,
      missionId: missionId ?? this.missionId,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      accuracy: accuracy ?? this.accuracy,
      altitude: altitude ?? this.altitude,
      speed: speed ?? this.speed,
      heading: heading ?? this.heading,
      isMocked: isMocked ?? this.isMocked,
      recordedAt: recordedAt ?? this.recordedAt,
      createdAtDevice: createdAtDevice ?? this.createdAtDevice,
      syncStatus: syncStatus ?? this.syncStatus,
      retryCount: retryCount ?? this.retryCount,
      lastError: lastError ?? this.lastError,
      nextRetryAt: nextRetryAt ?? this.nextRetryAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (clientEventId.present) {
      map['client_event_id'] = Variable<String>(clientEventId.value);
    }
    if (vehicleId.present) {
      map['vehicle_id'] = Variable<String>(vehicleId.value);
    }
    if (missionId.present) {
      map['mission_id'] = Variable<String>(missionId.value);
    }
    if (latitude.present) {
      map['latitude'] = Variable<double>(latitude.value);
    }
    if (longitude.present) {
      map['longitude'] = Variable<double>(longitude.value);
    }
    if (accuracy.present) {
      map['accuracy'] = Variable<double>(accuracy.value);
    }
    if (altitude.present) {
      map['altitude'] = Variable<double>(altitude.value);
    }
    if (speed.present) {
      map['speed'] = Variable<double>(speed.value);
    }
    if (heading.present) {
      map['heading'] = Variable<double>(heading.value);
    }
    if (isMocked.present) {
      map['is_mocked'] = Variable<bool>(isMocked.value);
    }
    if (recordedAt.present) {
      map['recorded_at'] = Variable<DateTime>(recordedAt.value);
    }
    if (createdAtDevice.present) {
      map['created_at_device'] = Variable<DateTime>(createdAtDevice.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<String>($PendingGpsPositionsTable
          .$convertersyncStatus
          .toSql(syncStatus.value));
    }
    if (retryCount.present) {
      map['retry_count'] = Variable<int>(retryCount.value);
    }
    if (lastError.present) {
      map['last_error'] = Variable<String>(lastError.value);
    }
    if (nextRetryAt.present) {
      map['next_retry_at'] = Variable<DateTime>(nextRetryAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('PendingGpsPositionsCompanion(')
          ..write('id: $id, ')
          ..write('clientEventId: $clientEventId, ')
          ..write('vehicleId: $vehicleId, ')
          ..write('missionId: $missionId, ')
          ..write('latitude: $latitude, ')
          ..write('longitude: $longitude, ')
          ..write('accuracy: $accuracy, ')
          ..write('altitude: $altitude, ')
          ..write('speed: $speed, ')
          ..write('heading: $heading, ')
          ..write('isMocked: $isMocked, ')
          ..write('recordedAt: $recordedAt, ')
          ..write('createdAtDevice: $createdAtDevice, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('retryCount: $retryCount, ')
          ..write('lastError: $lastError, ')
          ..write('nextRetryAt: $nextRetryAt')
          ..write(')'))
        .toString();
  }
}

class $PendingValidationsTable extends PendingValidations
    with TableInfo<$PendingValidationsTable, PendingValidation> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $PendingValidationsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _clientEventIdMeta =
      const VerificationMeta('clientEventId');
  @override
  late final GeneratedColumn<String> clientEventId = GeneratedColumn<String>(
      'client_event_id', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: true,
      defaultConstraints: GeneratedColumn.constraintIsAlways('UNIQUE'));
  static const VerificationMeta _missionStepIdMeta =
      const VerificationMeta('missionStepId');
  @override
  late final GeneratedColumn<String> missionStepId = GeneratedColumn<String>(
      'mission_step_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _qrTokenMeta =
      const VerificationMeta('qrToken');
  @override
  late final GeneratedColumn<String> qrToken = GeneratedColumn<String>(
      'qr_token', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _latitudeMeta =
      const VerificationMeta('latitude');
  @override
  late final GeneratedColumn<double> latitude = GeneratedColumn<double>(
      'latitude', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _longitudeMeta =
      const VerificationMeta('longitude');
  @override
  late final GeneratedColumn<double> longitude = GeneratedColumn<double>(
      'longitude', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _accuracyMeta =
      const VerificationMeta('accuracy');
  @override
  late final GeneratedColumn<double> accuracy = GeneratedColumn<double>(
      'accuracy', aliasedName, true,
      type: DriftSqlType.double, requiredDuringInsert: false);
  static const VerificationMeta _isMockedMeta =
      const VerificationMeta('isMocked');
  @override
  late final GeneratedColumn<bool> isMocked = GeneratedColumn<bool>(
      'is_mocked', aliasedName, false,
      type: DriftSqlType.bool,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('CHECK ("is_mocked" IN (0, 1))'),
      defaultValue: const Constant(false));
  static const VerificationMeta _recordedAtMeta =
      const VerificationMeta('recordedAt');
  @override
  late final GeneratedColumn<DateTime> recordedAt = GeneratedColumn<DateTime>(
      'recorded_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _photoPathMeta =
      const VerificationMeta('photoPath');
  @override
  late final GeneratedColumn<String> photoPath = GeneratedColumn<String>(
      'photo_path', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _createdAtDeviceMeta =
      const VerificationMeta('createdAtDevice');
  @override
  late final GeneratedColumn<DateTime> createdAtDevice =
      GeneratedColumn<DateTime>('created_at_device', aliasedName, false,
          type: DriftSqlType.dateTime,
          requiredDuringInsert: false,
          defaultValue: currentDateAndTime);
  @override
  late final GeneratedColumnWithTypeConverter<SyncStatus, String> syncStatus =
      GeneratedColumn<String>('sync_status', aliasedName, false,
              type: DriftSqlType.string,
              requiredDuringInsert: false,
              defaultValue: const Constant('pending'))
          .withConverter<SyncStatus>(
              $PendingValidationsTable.$convertersyncStatus);
  static const VerificationMeta _retryCountMeta =
      const VerificationMeta('retryCount');
  @override
  late final GeneratedColumn<int> retryCount = GeneratedColumn<int>(
      'retry_count', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _lastErrorMeta =
      const VerificationMeta('lastError');
  @override
  late final GeneratedColumn<String> lastError = GeneratedColumn<String>(
      'last_error', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _nextRetryAtMeta =
      const VerificationMeta('nextRetryAt');
  @override
  late final GeneratedColumn<DateTime> nextRetryAt = GeneratedColumn<DateTime>(
      'next_retry_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        clientEventId,
        missionStepId,
        qrToken,
        latitude,
        longitude,
        accuracy,
        isMocked,
        recordedAt,
        photoPath,
        createdAtDevice,
        syncStatus,
        retryCount,
        lastError,
        nextRetryAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'pending_validations';
  @override
  VerificationContext validateIntegrity(Insertable<PendingValidation> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('client_event_id')) {
      context.handle(
          _clientEventIdMeta,
          clientEventId.isAcceptableOrUnknown(
              data['client_event_id']!, _clientEventIdMeta));
    } else if (isInserting) {
      context.missing(_clientEventIdMeta);
    }
    if (data.containsKey('mission_step_id')) {
      context.handle(
          _missionStepIdMeta,
          missionStepId.isAcceptableOrUnknown(
              data['mission_step_id']!, _missionStepIdMeta));
    } else if (isInserting) {
      context.missing(_missionStepIdMeta);
    }
    if (data.containsKey('qr_token')) {
      context.handle(_qrTokenMeta,
          qrToken.isAcceptableOrUnknown(data['qr_token']!, _qrTokenMeta));
    } else if (isInserting) {
      context.missing(_qrTokenMeta);
    }
    if (data.containsKey('latitude')) {
      context.handle(_latitudeMeta,
          latitude.isAcceptableOrUnknown(data['latitude']!, _latitudeMeta));
    } else if (isInserting) {
      context.missing(_latitudeMeta);
    }
    if (data.containsKey('longitude')) {
      context.handle(_longitudeMeta,
          longitude.isAcceptableOrUnknown(data['longitude']!, _longitudeMeta));
    } else if (isInserting) {
      context.missing(_longitudeMeta);
    }
    if (data.containsKey('accuracy')) {
      context.handle(_accuracyMeta,
          accuracy.isAcceptableOrUnknown(data['accuracy']!, _accuracyMeta));
    }
    if (data.containsKey('is_mocked')) {
      context.handle(_isMockedMeta,
          isMocked.isAcceptableOrUnknown(data['is_mocked']!, _isMockedMeta));
    }
    if (data.containsKey('recorded_at')) {
      context.handle(
          _recordedAtMeta,
          recordedAt.isAcceptableOrUnknown(
              data['recorded_at']!, _recordedAtMeta));
    } else if (isInserting) {
      context.missing(_recordedAtMeta);
    }
    if (data.containsKey('photo_path')) {
      context.handle(_photoPathMeta,
          photoPath.isAcceptableOrUnknown(data['photo_path']!, _photoPathMeta));
    } else if (isInserting) {
      context.missing(_photoPathMeta);
    }
    if (data.containsKey('created_at_device')) {
      context.handle(
          _createdAtDeviceMeta,
          createdAtDevice.isAcceptableOrUnknown(
              data['created_at_device']!, _createdAtDeviceMeta));
    }
    if (data.containsKey('retry_count')) {
      context.handle(
          _retryCountMeta,
          retryCount.isAcceptableOrUnknown(
              data['retry_count']!, _retryCountMeta));
    }
    if (data.containsKey('last_error')) {
      context.handle(_lastErrorMeta,
          lastError.isAcceptableOrUnknown(data['last_error']!, _lastErrorMeta));
    }
    if (data.containsKey('next_retry_at')) {
      context.handle(
          _nextRetryAtMeta,
          nextRetryAt.isAcceptableOrUnknown(
              data['next_retry_at']!, _nextRetryAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  PendingValidation map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return PendingValidation(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      clientEventId: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}client_event_id'])!,
      missionStepId: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}mission_step_id'])!,
      qrToken: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}qr_token'])!,
      latitude: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}latitude'])!,
      longitude: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}longitude'])!,
      accuracy: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}accuracy']),
      isMocked: attachedDatabase.typeMapping
          .read(DriftSqlType.bool, data['${effectivePrefix}is_mocked'])!,
      recordedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}recorded_at'])!,
      photoPath: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}photo_path'])!,
      createdAtDevice: attachedDatabase.typeMapping.read(
          DriftSqlType.dateTime, data['${effectivePrefix}created_at_device'])!,
      syncStatus: $PendingValidationsTable.$convertersyncStatus.fromSql(
          attachedDatabase.typeMapping.read(
              DriftSqlType.string, data['${effectivePrefix}sync_status'])!),
      retryCount: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}retry_count'])!,
      lastError: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}last_error']),
      nextRetryAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}next_retry_at']),
    );
  }

  @override
  $PendingValidationsTable createAlias(String alias) {
    return $PendingValidationsTable(attachedDatabase, alias);
  }

  static TypeConverter<SyncStatus, String> $convertersyncStatus =
      const SyncStatusConverter();
}

class PendingValidation extends DataClass
    implements Insertable<PendingValidation> {
  final int id;
  final String clientEventId;
  final String missionStepId;
  final String qrToken;
  final double latitude;
  final double longitude;
  final double? accuracy;
  final bool isMocked;
  final DateTime recordedAt;

  /// Chemin local (fichier) de la photo prise — le fichier reste sur le
  /// disque de l'appareil jusqu'à l'envoi multipart réussi.
  final String photoPath;
  final DateTime createdAtDevice;
  final SyncStatus syncStatus;
  final int retryCount;
  final String? lastError;
  final DateTime? nextRetryAt;
  const PendingValidation(
      {required this.id,
      required this.clientEventId,
      required this.missionStepId,
      required this.qrToken,
      required this.latitude,
      required this.longitude,
      this.accuracy,
      required this.isMocked,
      required this.recordedAt,
      required this.photoPath,
      required this.createdAtDevice,
      required this.syncStatus,
      required this.retryCount,
      this.lastError,
      this.nextRetryAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['client_event_id'] = Variable<String>(clientEventId);
    map['mission_step_id'] = Variable<String>(missionStepId);
    map['qr_token'] = Variable<String>(qrToken);
    map['latitude'] = Variable<double>(latitude);
    map['longitude'] = Variable<double>(longitude);
    if (!nullToAbsent || accuracy != null) {
      map['accuracy'] = Variable<double>(accuracy);
    }
    map['is_mocked'] = Variable<bool>(isMocked);
    map['recorded_at'] = Variable<DateTime>(recordedAt);
    map['photo_path'] = Variable<String>(photoPath);
    map['created_at_device'] = Variable<DateTime>(createdAtDevice);
    {
      map['sync_status'] = Variable<String>(
          $PendingValidationsTable.$convertersyncStatus.toSql(syncStatus));
    }
    map['retry_count'] = Variable<int>(retryCount);
    if (!nullToAbsent || lastError != null) {
      map['last_error'] = Variable<String>(lastError);
    }
    if (!nullToAbsent || nextRetryAt != null) {
      map['next_retry_at'] = Variable<DateTime>(nextRetryAt);
    }
    return map;
  }

  PendingValidationsCompanion toCompanion(bool nullToAbsent) {
    return PendingValidationsCompanion(
      id: Value(id),
      clientEventId: Value(clientEventId),
      missionStepId: Value(missionStepId),
      qrToken: Value(qrToken),
      latitude: Value(latitude),
      longitude: Value(longitude),
      accuracy: accuracy == null && nullToAbsent
          ? const Value.absent()
          : Value(accuracy),
      isMocked: Value(isMocked),
      recordedAt: Value(recordedAt),
      photoPath: Value(photoPath),
      createdAtDevice: Value(createdAtDevice),
      syncStatus: Value(syncStatus),
      retryCount: Value(retryCount),
      lastError: lastError == null && nullToAbsent
          ? const Value.absent()
          : Value(lastError),
      nextRetryAt: nextRetryAt == null && nullToAbsent
          ? const Value.absent()
          : Value(nextRetryAt),
    );
  }

  factory PendingValidation.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return PendingValidation(
      id: serializer.fromJson<int>(json['id']),
      clientEventId: serializer.fromJson<String>(json['clientEventId']),
      missionStepId: serializer.fromJson<String>(json['missionStepId']),
      qrToken: serializer.fromJson<String>(json['qrToken']),
      latitude: serializer.fromJson<double>(json['latitude']),
      longitude: serializer.fromJson<double>(json['longitude']),
      accuracy: serializer.fromJson<double?>(json['accuracy']),
      isMocked: serializer.fromJson<bool>(json['isMocked']),
      recordedAt: serializer.fromJson<DateTime>(json['recordedAt']),
      photoPath: serializer.fromJson<String>(json['photoPath']),
      createdAtDevice: serializer.fromJson<DateTime>(json['createdAtDevice']),
      syncStatus: serializer.fromJson<SyncStatus>(json['syncStatus']),
      retryCount: serializer.fromJson<int>(json['retryCount']),
      lastError: serializer.fromJson<String?>(json['lastError']),
      nextRetryAt: serializer.fromJson<DateTime?>(json['nextRetryAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'clientEventId': serializer.toJson<String>(clientEventId),
      'missionStepId': serializer.toJson<String>(missionStepId),
      'qrToken': serializer.toJson<String>(qrToken),
      'latitude': serializer.toJson<double>(latitude),
      'longitude': serializer.toJson<double>(longitude),
      'accuracy': serializer.toJson<double?>(accuracy),
      'isMocked': serializer.toJson<bool>(isMocked),
      'recordedAt': serializer.toJson<DateTime>(recordedAt),
      'photoPath': serializer.toJson<String>(photoPath),
      'createdAtDevice': serializer.toJson<DateTime>(createdAtDevice),
      'syncStatus': serializer.toJson<SyncStatus>(syncStatus),
      'retryCount': serializer.toJson<int>(retryCount),
      'lastError': serializer.toJson<String?>(lastError),
      'nextRetryAt': serializer.toJson<DateTime?>(nextRetryAt),
    };
  }

  PendingValidation copyWith(
          {int? id,
          String? clientEventId,
          String? missionStepId,
          String? qrToken,
          double? latitude,
          double? longitude,
          Value<double?> accuracy = const Value.absent(),
          bool? isMocked,
          DateTime? recordedAt,
          String? photoPath,
          DateTime? createdAtDevice,
          SyncStatus? syncStatus,
          int? retryCount,
          Value<String?> lastError = const Value.absent(),
          Value<DateTime?> nextRetryAt = const Value.absent()}) =>
      PendingValidation(
        id: id ?? this.id,
        clientEventId: clientEventId ?? this.clientEventId,
        missionStepId: missionStepId ?? this.missionStepId,
        qrToken: qrToken ?? this.qrToken,
        latitude: latitude ?? this.latitude,
        longitude: longitude ?? this.longitude,
        accuracy: accuracy.present ? accuracy.value : this.accuracy,
        isMocked: isMocked ?? this.isMocked,
        recordedAt: recordedAt ?? this.recordedAt,
        photoPath: photoPath ?? this.photoPath,
        createdAtDevice: createdAtDevice ?? this.createdAtDevice,
        syncStatus: syncStatus ?? this.syncStatus,
        retryCount: retryCount ?? this.retryCount,
        lastError: lastError.present ? lastError.value : this.lastError,
        nextRetryAt: nextRetryAt.present ? nextRetryAt.value : this.nextRetryAt,
      );
  PendingValidation copyWithCompanion(PendingValidationsCompanion data) {
    return PendingValidation(
      id: data.id.present ? data.id.value : this.id,
      clientEventId: data.clientEventId.present
          ? data.clientEventId.value
          : this.clientEventId,
      missionStepId: data.missionStepId.present
          ? data.missionStepId.value
          : this.missionStepId,
      qrToken: data.qrToken.present ? data.qrToken.value : this.qrToken,
      latitude: data.latitude.present ? data.latitude.value : this.latitude,
      longitude: data.longitude.present ? data.longitude.value : this.longitude,
      accuracy: data.accuracy.present ? data.accuracy.value : this.accuracy,
      isMocked: data.isMocked.present ? data.isMocked.value : this.isMocked,
      recordedAt:
          data.recordedAt.present ? data.recordedAt.value : this.recordedAt,
      photoPath: data.photoPath.present ? data.photoPath.value : this.photoPath,
      createdAtDevice: data.createdAtDevice.present
          ? data.createdAtDevice.value
          : this.createdAtDevice,
      syncStatus:
          data.syncStatus.present ? data.syncStatus.value : this.syncStatus,
      retryCount:
          data.retryCount.present ? data.retryCount.value : this.retryCount,
      lastError: data.lastError.present ? data.lastError.value : this.lastError,
      nextRetryAt:
          data.nextRetryAt.present ? data.nextRetryAt.value : this.nextRetryAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('PendingValidation(')
          ..write('id: $id, ')
          ..write('clientEventId: $clientEventId, ')
          ..write('missionStepId: $missionStepId, ')
          ..write('qrToken: $qrToken, ')
          ..write('latitude: $latitude, ')
          ..write('longitude: $longitude, ')
          ..write('accuracy: $accuracy, ')
          ..write('isMocked: $isMocked, ')
          ..write('recordedAt: $recordedAt, ')
          ..write('photoPath: $photoPath, ')
          ..write('createdAtDevice: $createdAtDevice, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('retryCount: $retryCount, ')
          ..write('lastError: $lastError, ')
          ..write('nextRetryAt: $nextRetryAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      clientEventId,
      missionStepId,
      qrToken,
      latitude,
      longitude,
      accuracy,
      isMocked,
      recordedAt,
      photoPath,
      createdAtDevice,
      syncStatus,
      retryCount,
      lastError,
      nextRetryAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PendingValidation &&
          other.id == this.id &&
          other.clientEventId == this.clientEventId &&
          other.missionStepId == this.missionStepId &&
          other.qrToken == this.qrToken &&
          other.latitude == this.latitude &&
          other.longitude == this.longitude &&
          other.accuracy == this.accuracy &&
          other.isMocked == this.isMocked &&
          other.recordedAt == this.recordedAt &&
          other.photoPath == this.photoPath &&
          other.createdAtDevice == this.createdAtDevice &&
          other.syncStatus == this.syncStatus &&
          other.retryCount == this.retryCount &&
          other.lastError == this.lastError &&
          other.nextRetryAt == this.nextRetryAt);
}

class PendingValidationsCompanion extends UpdateCompanion<PendingValidation> {
  final Value<int> id;
  final Value<String> clientEventId;
  final Value<String> missionStepId;
  final Value<String> qrToken;
  final Value<double> latitude;
  final Value<double> longitude;
  final Value<double?> accuracy;
  final Value<bool> isMocked;
  final Value<DateTime> recordedAt;
  final Value<String> photoPath;
  final Value<DateTime> createdAtDevice;
  final Value<SyncStatus> syncStatus;
  final Value<int> retryCount;
  final Value<String?> lastError;
  final Value<DateTime?> nextRetryAt;
  const PendingValidationsCompanion({
    this.id = const Value.absent(),
    this.clientEventId = const Value.absent(),
    this.missionStepId = const Value.absent(),
    this.qrToken = const Value.absent(),
    this.latitude = const Value.absent(),
    this.longitude = const Value.absent(),
    this.accuracy = const Value.absent(),
    this.isMocked = const Value.absent(),
    this.recordedAt = const Value.absent(),
    this.photoPath = const Value.absent(),
    this.createdAtDevice = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.retryCount = const Value.absent(),
    this.lastError = const Value.absent(),
    this.nextRetryAt = const Value.absent(),
  });
  PendingValidationsCompanion.insert({
    this.id = const Value.absent(),
    required String clientEventId,
    required String missionStepId,
    required String qrToken,
    required double latitude,
    required double longitude,
    this.accuracy = const Value.absent(),
    this.isMocked = const Value.absent(),
    required DateTime recordedAt,
    required String photoPath,
    this.createdAtDevice = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.retryCount = const Value.absent(),
    this.lastError = const Value.absent(),
    this.nextRetryAt = const Value.absent(),
  })  : clientEventId = Value(clientEventId),
        missionStepId = Value(missionStepId),
        qrToken = Value(qrToken),
        latitude = Value(latitude),
        longitude = Value(longitude),
        recordedAt = Value(recordedAt),
        photoPath = Value(photoPath);
  static Insertable<PendingValidation> custom({
    Expression<int>? id,
    Expression<String>? clientEventId,
    Expression<String>? missionStepId,
    Expression<String>? qrToken,
    Expression<double>? latitude,
    Expression<double>? longitude,
    Expression<double>? accuracy,
    Expression<bool>? isMocked,
    Expression<DateTime>? recordedAt,
    Expression<String>? photoPath,
    Expression<DateTime>? createdAtDevice,
    Expression<String>? syncStatus,
    Expression<int>? retryCount,
    Expression<String>? lastError,
    Expression<DateTime>? nextRetryAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (clientEventId != null) 'client_event_id': clientEventId,
      if (missionStepId != null) 'mission_step_id': missionStepId,
      if (qrToken != null) 'qr_token': qrToken,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      if (accuracy != null) 'accuracy': accuracy,
      if (isMocked != null) 'is_mocked': isMocked,
      if (recordedAt != null) 'recorded_at': recordedAt,
      if (photoPath != null) 'photo_path': photoPath,
      if (createdAtDevice != null) 'created_at_device': createdAtDevice,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (retryCount != null) 'retry_count': retryCount,
      if (lastError != null) 'last_error': lastError,
      if (nextRetryAt != null) 'next_retry_at': nextRetryAt,
    });
  }

  PendingValidationsCompanion copyWith(
      {Value<int>? id,
      Value<String>? clientEventId,
      Value<String>? missionStepId,
      Value<String>? qrToken,
      Value<double>? latitude,
      Value<double>? longitude,
      Value<double?>? accuracy,
      Value<bool>? isMocked,
      Value<DateTime>? recordedAt,
      Value<String>? photoPath,
      Value<DateTime>? createdAtDevice,
      Value<SyncStatus>? syncStatus,
      Value<int>? retryCount,
      Value<String?>? lastError,
      Value<DateTime?>? nextRetryAt}) {
    return PendingValidationsCompanion(
      id: id ?? this.id,
      clientEventId: clientEventId ?? this.clientEventId,
      missionStepId: missionStepId ?? this.missionStepId,
      qrToken: qrToken ?? this.qrToken,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      accuracy: accuracy ?? this.accuracy,
      isMocked: isMocked ?? this.isMocked,
      recordedAt: recordedAt ?? this.recordedAt,
      photoPath: photoPath ?? this.photoPath,
      createdAtDevice: createdAtDevice ?? this.createdAtDevice,
      syncStatus: syncStatus ?? this.syncStatus,
      retryCount: retryCount ?? this.retryCount,
      lastError: lastError ?? this.lastError,
      nextRetryAt: nextRetryAt ?? this.nextRetryAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (clientEventId.present) {
      map['client_event_id'] = Variable<String>(clientEventId.value);
    }
    if (missionStepId.present) {
      map['mission_step_id'] = Variable<String>(missionStepId.value);
    }
    if (qrToken.present) {
      map['qr_token'] = Variable<String>(qrToken.value);
    }
    if (latitude.present) {
      map['latitude'] = Variable<double>(latitude.value);
    }
    if (longitude.present) {
      map['longitude'] = Variable<double>(longitude.value);
    }
    if (accuracy.present) {
      map['accuracy'] = Variable<double>(accuracy.value);
    }
    if (isMocked.present) {
      map['is_mocked'] = Variable<bool>(isMocked.value);
    }
    if (recordedAt.present) {
      map['recorded_at'] = Variable<DateTime>(recordedAt.value);
    }
    if (photoPath.present) {
      map['photo_path'] = Variable<String>(photoPath.value);
    }
    if (createdAtDevice.present) {
      map['created_at_device'] = Variable<DateTime>(createdAtDevice.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<String>($PendingValidationsTable
          .$convertersyncStatus
          .toSql(syncStatus.value));
    }
    if (retryCount.present) {
      map['retry_count'] = Variable<int>(retryCount.value);
    }
    if (lastError.present) {
      map['last_error'] = Variable<String>(lastError.value);
    }
    if (nextRetryAt.present) {
      map['next_retry_at'] = Variable<DateTime>(nextRetryAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('PendingValidationsCompanion(')
          ..write('id: $id, ')
          ..write('clientEventId: $clientEventId, ')
          ..write('missionStepId: $missionStepId, ')
          ..write('qrToken: $qrToken, ')
          ..write('latitude: $latitude, ')
          ..write('longitude: $longitude, ')
          ..write('accuracy: $accuracy, ')
          ..write('isMocked: $isMocked, ')
          ..write('recordedAt: $recordedAt, ')
          ..write('photoPath: $photoPath, ')
          ..write('createdAtDevice: $createdAtDevice, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('retryCount: $retryCount, ')
          ..write('lastError: $lastError, ')
          ..write('nextRetryAt: $nextRetryAt')
          ..write(')'))
        .toString();
  }
}

class $PendingFuelRecordsTable extends PendingFuelRecords
    with TableInfo<$PendingFuelRecordsTable, PendingFuelRecord> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $PendingFuelRecordsTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      hasAutoIncrement: true,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultConstraints:
          GeneratedColumn.constraintIsAlways('PRIMARY KEY AUTOINCREMENT'));
  static const VerificationMeta _clientEventIdMeta =
      const VerificationMeta('clientEventId');
  @override
  late final GeneratedColumn<String> clientEventId = GeneratedColumn<String>(
      'client_event_id', aliasedName, false,
      type: DriftSqlType.string,
      requiredDuringInsert: true,
      defaultConstraints: GeneratedColumn.constraintIsAlways('UNIQUE'));
  static const VerificationMeta _vehicleIdMeta =
      const VerificationMeta('vehicleId');
  @override
  late final GeneratedColumn<String> vehicleId = GeneratedColumn<String>(
      'vehicle_id', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _litersMeta = const VerificationMeta('liters');
  @override
  late final GeneratedColumn<double> liters = GeneratedColumn<double>(
      'liters', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _totalCostMeta =
      const VerificationMeta('totalCost');
  @override
  late final GeneratedColumn<double> totalCost = GeneratedColumn<double>(
      'total_cost', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _odometerMeta =
      const VerificationMeta('odometer');
  @override
  late final GeneratedColumn<double> odometer = GeneratedColumn<double>(
      'odometer', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _fuelTypeMeta =
      const VerificationMeta('fuelType');
  @override
  late final GeneratedColumn<String> fuelType = GeneratedColumn<String>(
      'fuel_type', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _stationNameMeta =
      const VerificationMeta('stationName');
  @override
  late final GeneratedColumn<String> stationName = GeneratedColumn<String>(
      'station_name', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _latitudeMeta =
      const VerificationMeta('latitude');
  @override
  late final GeneratedColumn<double> latitude = GeneratedColumn<double>(
      'latitude', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _longitudeMeta =
      const VerificationMeta('longitude');
  @override
  late final GeneratedColumn<double> longitude = GeneratedColumn<double>(
      'longitude', aliasedName, false,
      type: DriftSqlType.double, requiredDuringInsert: true);
  static const VerificationMeta _recordedAtMeta =
      const VerificationMeta('recordedAt');
  @override
  late final GeneratedColumn<DateTime> recordedAt = GeneratedColumn<DateTime>(
      'recorded_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  static const VerificationMeta _receiptPhotoPathMeta =
      const VerificationMeta('receiptPhotoPath');
  @override
  late final GeneratedColumn<String> receiptPhotoPath = GeneratedColumn<String>(
      'receipt_photo_path', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _odometerPhotoPathMeta =
      const VerificationMeta('odometerPhotoPath');
  @override
  late final GeneratedColumn<String> odometerPhotoPath =
      GeneratedColumn<String>('odometer_photo_path', aliasedName, false,
          type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _createdAtDeviceMeta =
      const VerificationMeta('createdAtDevice');
  @override
  late final GeneratedColumn<DateTime> createdAtDevice =
      GeneratedColumn<DateTime>('created_at_device', aliasedName, false,
          type: DriftSqlType.dateTime,
          requiredDuringInsert: false,
          defaultValue: currentDateAndTime);
  @override
  late final GeneratedColumnWithTypeConverter<SyncStatus, String> syncStatus =
      GeneratedColumn<String>('sync_status', aliasedName, false,
              type: DriftSqlType.string,
              requiredDuringInsert: false,
              defaultValue: const Constant('pending'))
          .withConverter<SyncStatus>(
              $PendingFuelRecordsTable.$convertersyncStatus);
  static const VerificationMeta _retryCountMeta =
      const VerificationMeta('retryCount');
  @override
  late final GeneratedColumn<int> retryCount = GeneratedColumn<int>(
      'retry_count', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _lastErrorMeta =
      const VerificationMeta('lastError');
  @override
  late final GeneratedColumn<String> lastError = GeneratedColumn<String>(
      'last_error', aliasedName, true,
      type: DriftSqlType.string, requiredDuringInsert: false);
  static const VerificationMeta _nextRetryAtMeta =
      const VerificationMeta('nextRetryAt');
  @override
  late final GeneratedColumn<DateTime> nextRetryAt = GeneratedColumn<DateTime>(
      'next_retry_at', aliasedName, true,
      type: DriftSqlType.dateTime, requiredDuringInsert: false);
  @override
  List<GeneratedColumn> get $columns => [
        id,
        clientEventId,
        vehicleId,
        liters,
        totalCost,
        odometer,
        fuelType,
        stationName,
        latitude,
        longitude,
        recordedAt,
        receiptPhotoPath,
        odometerPhotoPath,
        createdAtDevice,
        syncStatus,
        retryCount,
        lastError,
        nextRetryAt
      ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'pending_fuel_records';
  @override
  VerificationContext validateIntegrity(Insertable<PendingFuelRecord> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('client_event_id')) {
      context.handle(
          _clientEventIdMeta,
          clientEventId.isAcceptableOrUnknown(
              data['client_event_id']!, _clientEventIdMeta));
    } else if (isInserting) {
      context.missing(_clientEventIdMeta);
    }
    if (data.containsKey('vehicle_id')) {
      context.handle(_vehicleIdMeta,
          vehicleId.isAcceptableOrUnknown(data['vehicle_id']!, _vehicleIdMeta));
    } else if (isInserting) {
      context.missing(_vehicleIdMeta);
    }
    if (data.containsKey('liters')) {
      context.handle(_litersMeta,
          liters.isAcceptableOrUnknown(data['liters']!, _litersMeta));
    } else if (isInserting) {
      context.missing(_litersMeta);
    }
    if (data.containsKey('total_cost')) {
      context.handle(_totalCostMeta,
          totalCost.isAcceptableOrUnknown(data['total_cost']!, _totalCostMeta));
    } else if (isInserting) {
      context.missing(_totalCostMeta);
    }
    if (data.containsKey('odometer')) {
      context.handle(_odometerMeta,
          odometer.isAcceptableOrUnknown(data['odometer']!, _odometerMeta));
    } else if (isInserting) {
      context.missing(_odometerMeta);
    }
    if (data.containsKey('fuel_type')) {
      context.handle(_fuelTypeMeta,
          fuelType.isAcceptableOrUnknown(data['fuel_type']!, _fuelTypeMeta));
    } else if (isInserting) {
      context.missing(_fuelTypeMeta);
    }
    if (data.containsKey('station_name')) {
      context.handle(
          _stationNameMeta,
          stationName.isAcceptableOrUnknown(
              data['station_name']!, _stationNameMeta));
    }
    if (data.containsKey('latitude')) {
      context.handle(_latitudeMeta,
          latitude.isAcceptableOrUnknown(data['latitude']!, _latitudeMeta));
    } else if (isInserting) {
      context.missing(_latitudeMeta);
    }
    if (data.containsKey('longitude')) {
      context.handle(_longitudeMeta,
          longitude.isAcceptableOrUnknown(data['longitude']!, _longitudeMeta));
    } else if (isInserting) {
      context.missing(_longitudeMeta);
    }
    if (data.containsKey('recorded_at')) {
      context.handle(
          _recordedAtMeta,
          recordedAt.isAcceptableOrUnknown(
              data['recorded_at']!, _recordedAtMeta));
    } else if (isInserting) {
      context.missing(_recordedAtMeta);
    }
    if (data.containsKey('receipt_photo_path')) {
      context.handle(
          _receiptPhotoPathMeta,
          receiptPhotoPath.isAcceptableOrUnknown(
              data['receipt_photo_path']!, _receiptPhotoPathMeta));
    } else if (isInserting) {
      context.missing(_receiptPhotoPathMeta);
    }
    if (data.containsKey('odometer_photo_path')) {
      context.handle(
          _odometerPhotoPathMeta,
          odometerPhotoPath.isAcceptableOrUnknown(
              data['odometer_photo_path']!, _odometerPhotoPathMeta));
    } else if (isInserting) {
      context.missing(_odometerPhotoPathMeta);
    }
    if (data.containsKey('created_at_device')) {
      context.handle(
          _createdAtDeviceMeta,
          createdAtDevice.isAcceptableOrUnknown(
              data['created_at_device']!, _createdAtDeviceMeta));
    }
    if (data.containsKey('retry_count')) {
      context.handle(
          _retryCountMeta,
          retryCount.isAcceptableOrUnknown(
              data['retry_count']!, _retryCountMeta));
    }
    if (data.containsKey('last_error')) {
      context.handle(_lastErrorMeta,
          lastError.isAcceptableOrUnknown(data['last_error']!, _lastErrorMeta));
    }
    if (data.containsKey('next_retry_at')) {
      context.handle(
          _nextRetryAtMeta,
          nextRetryAt.isAcceptableOrUnknown(
              data['next_retry_at']!, _nextRetryAtMeta));
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  PendingFuelRecord map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return PendingFuelRecord(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      clientEventId: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}client_event_id'])!,
      vehicleId: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}vehicle_id'])!,
      liters: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}liters'])!,
      totalCost: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}total_cost'])!,
      odometer: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}odometer'])!,
      fuelType: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}fuel_type'])!,
      stationName: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}station_name']),
      latitude: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}latitude'])!,
      longitude: attachedDatabase.typeMapping
          .read(DriftSqlType.double, data['${effectivePrefix}longitude'])!,
      recordedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}recorded_at'])!,
      receiptPhotoPath: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}receipt_photo_path'])!,
      odometerPhotoPath: attachedDatabase.typeMapping.read(
          DriftSqlType.string, data['${effectivePrefix}odometer_photo_path'])!,
      createdAtDevice: attachedDatabase.typeMapping.read(
          DriftSqlType.dateTime, data['${effectivePrefix}created_at_device'])!,
      syncStatus: $PendingFuelRecordsTable.$convertersyncStatus.fromSql(
          attachedDatabase.typeMapping.read(
              DriftSqlType.string, data['${effectivePrefix}sync_status'])!),
      retryCount: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}retry_count'])!,
      lastError: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}last_error']),
      nextRetryAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}next_retry_at']),
    );
  }

  @override
  $PendingFuelRecordsTable createAlias(String alias) {
    return $PendingFuelRecordsTable(attachedDatabase, alias);
  }

  static TypeConverter<SyncStatus, String> $convertersyncStatus =
      const SyncStatusConverter();
}

class PendingFuelRecord extends DataClass
    implements Insertable<PendingFuelRecord> {
  final int id;
  final String clientEventId;
  final String vehicleId;
  final double liters;
  final double totalCost;
  final double odometer;

  /// Valeur brute de l'enum `FuelType` côté API (DIESEL/PETROL/ELECTRIC/
  /// OTHER — `apps/api/prisma/schema.prisma`).
  final String fuelType;
  final String? stationName;
  final double latitude;
  final double longitude;
  final DateTime recordedAt;

  /// Chemins locaux des deux photos (reçu, compteur) — les fichiers restent
  /// sur le disque de l'appareil jusqu'à l'envoi multipart réussi.
  final String receiptPhotoPath;
  final String odometerPhotoPath;
  final DateTime createdAtDevice;
  final SyncStatus syncStatus;
  final int retryCount;
  final String? lastError;
  final DateTime? nextRetryAt;
  const PendingFuelRecord(
      {required this.id,
      required this.clientEventId,
      required this.vehicleId,
      required this.liters,
      required this.totalCost,
      required this.odometer,
      required this.fuelType,
      this.stationName,
      required this.latitude,
      required this.longitude,
      required this.recordedAt,
      required this.receiptPhotoPath,
      required this.odometerPhotoPath,
      required this.createdAtDevice,
      required this.syncStatus,
      required this.retryCount,
      this.lastError,
      this.nextRetryAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['client_event_id'] = Variable<String>(clientEventId);
    map['vehicle_id'] = Variable<String>(vehicleId);
    map['liters'] = Variable<double>(liters);
    map['total_cost'] = Variable<double>(totalCost);
    map['odometer'] = Variable<double>(odometer);
    map['fuel_type'] = Variable<String>(fuelType);
    if (!nullToAbsent || stationName != null) {
      map['station_name'] = Variable<String>(stationName);
    }
    map['latitude'] = Variable<double>(latitude);
    map['longitude'] = Variable<double>(longitude);
    map['recorded_at'] = Variable<DateTime>(recordedAt);
    map['receipt_photo_path'] = Variable<String>(receiptPhotoPath);
    map['odometer_photo_path'] = Variable<String>(odometerPhotoPath);
    map['created_at_device'] = Variable<DateTime>(createdAtDevice);
    {
      map['sync_status'] = Variable<String>(
          $PendingFuelRecordsTable.$convertersyncStatus.toSql(syncStatus));
    }
    map['retry_count'] = Variable<int>(retryCount);
    if (!nullToAbsent || lastError != null) {
      map['last_error'] = Variable<String>(lastError);
    }
    if (!nullToAbsent || nextRetryAt != null) {
      map['next_retry_at'] = Variable<DateTime>(nextRetryAt);
    }
    return map;
  }

  PendingFuelRecordsCompanion toCompanion(bool nullToAbsent) {
    return PendingFuelRecordsCompanion(
      id: Value(id),
      clientEventId: Value(clientEventId),
      vehicleId: Value(vehicleId),
      liters: Value(liters),
      totalCost: Value(totalCost),
      odometer: Value(odometer),
      fuelType: Value(fuelType),
      stationName: stationName == null && nullToAbsent
          ? const Value.absent()
          : Value(stationName),
      latitude: Value(latitude),
      longitude: Value(longitude),
      recordedAt: Value(recordedAt),
      receiptPhotoPath: Value(receiptPhotoPath),
      odometerPhotoPath: Value(odometerPhotoPath),
      createdAtDevice: Value(createdAtDevice),
      syncStatus: Value(syncStatus),
      retryCount: Value(retryCount),
      lastError: lastError == null && nullToAbsent
          ? const Value.absent()
          : Value(lastError),
      nextRetryAt: nextRetryAt == null && nullToAbsent
          ? const Value.absent()
          : Value(nextRetryAt),
    );
  }

  factory PendingFuelRecord.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return PendingFuelRecord(
      id: serializer.fromJson<int>(json['id']),
      clientEventId: serializer.fromJson<String>(json['clientEventId']),
      vehicleId: serializer.fromJson<String>(json['vehicleId']),
      liters: serializer.fromJson<double>(json['liters']),
      totalCost: serializer.fromJson<double>(json['totalCost']),
      odometer: serializer.fromJson<double>(json['odometer']),
      fuelType: serializer.fromJson<String>(json['fuelType']),
      stationName: serializer.fromJson<String?>(json['stationName']),
      latitude: serializer.fromJson<double>(json['latitude']),
      longitude: serializer.fromJson<double>(json['longitude']),
      recordedAt: serializer.fromJson<DateTime>(json['recordedAt']),
      receiptPhotoPath: serializer.fromJson<String>(json['receiptPhotoPath']),
      odometerPhotoPath: serializer.fromJson<String>(json['odometerPhotoPath']),
      createdAtDevice: serializer.fromJson<DateTime>(json['createdAtDevice']),
      syncStatus: serializer.fromJson<SyncStatus>(json['syncStatus']),
      retryCount: serializer.fromJson<int>(json['retryCount']),
      lastError: serializer.fromJson<String?>(json['lastError']),
      nextRetryAt: serializer.fromJson<DateTime?>(json['nextRetryAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'clientEventId': serializer.toJson<String>(clientEventId),
      'vehicleId': serializer.toJson<String>(vehicleId),
      'liters': serializer.toJson<double>(liters),
      'totalCost': serializer.toJson<double>(totalCost),
      'odometer': serializer.toJson<double>(odometer),
      'fuelType': serializer.toJson<String>(fuelType),
      'stationName': serializer.toJson<String?>(stationName),
      'latitude': serializer.toJson<double>(latitude),
      'longitude': serializer.toJson<double>(longitude),
      'recordedAt': serializer.toJson<DateTime>(recordedAt),
      'receiptPhotoPath': serializer.toJson<String>(receiptPhotoPath),
      'odometerPhotoPath': serializer.toJson<String>(odometerPhotoPath),
      'createdAtDevice': serializer.toJson<DateTime>(createdAtDevice),
      'syncStatus': serializer.toJson<SyncStatus>(syncStatus),
      'retryCount': serializer.toJson<int>(retryCount),
      'lastError': serializer.toJson<String?>(lastError),
      'nextRetryAt': serializer.toJson<DateTime?>(nextRetryAt),
    };
  }

  PendingFuelRecord copyWith(
          {int? id,
          String? clientEventId,
          String? vehicleId,
          double? liters,
          double? totalCost,
          double? odometer,
          String? fuelType,
          Value<String?> stationName = const Value.absent(),
          double? latitude,
          double? longitude,
          DateTime? recordedAt,
          String? receiptPhotoPath,
          String? odometerPhotoPath,
          DateTime? createdAtDevice,
          SyncStatus? syncStatus,
          int? retryCount,
          Value<String?> lastError = const Value.absent(),
          Value<DateTime?> nextRetryAt = const Value.absent()}) =>
      PendingFuelRecord(
        id: id ?? this.id,
        clientEventId: clientEventId ?? this.clientEventId,
        vehicleId: vehicleId ?? this.vehicleId,
        liters: liters ?? this.liters,
        totalCost: totalCost ?? this.totalCost,
        odometer: odometer ?? this.odometer,
        fuelType: fuelType ?? this.fuelType,
        stationName: stationName.present ? stationName.value : this.stationName,
        latitude: latitude ?? this.latitude,
        longitude: longitude ?? this.longitude,
        recordedAt: recordedAt ?? this.recordedAt,
        receiptPhotoPath: receiptPhotoPath ?? this.receiptPhotoPath,
        odometerPhotoPath: odometerPhotoPath ?? this.odometerPhotoPath,
        createdAtDevice: createdAtDevice ?? this.createdAtDevice,
        syncStatus: syncStatus ?? this.syncStatus,
        retryCount: retryCount ?? this.retryCount,
        lastError: lastError.present ? lastError.value : this.lastError,
        nextRetryAt: nextRetryAt.present ? nextRetryAt.value : this.nextRetryAt,
      );
  PendingFuelRecord copyWithCompanion(PendingFuelRecordsCompanion data) {
    return PendingFuelRecord(
      id: data.id.present ? data.id.value : this.id,
      clientEventId: data.clientEventId.present
          ? data.clientEventId.value
          : this.clientEventId,
      vehicleId: data.vehicleId.present ? data.vehicleId.value : this.vehicleId,
      liters: data.liters.present ? data.liters.value : this.liters,
      totalCost: data.totalCost.present ? data.totalCost.value : this.totalCost,
      odometer: data.odometer.present ? data.odometer.value : this.odometer,
      fuelType: data.fuelType.present ? data.fuelType.value : this.fuelType,
      stationName:
          data.stationName.present ? data.stationName.value : this.stationName,
      latitude: data.latitude.present ? data.latitude.value : this.latitude,
      longitude: data.longitude.present ? data.longitude.value : this.longitude,
      recordedAt:
          data.recordedAt.present ? data.recordedAt.value : this.recordedAt,
      receiptPhotoPath: data.receiptPhotoPath.present
          ? data.receiptPhotoPath.value
          : this.receiptPhotoPath,
      odometerPhotoPath: data.odometerPhotoPath.present
          ? data.odometerPhotoPath.value
          : this.odometerPhotoPath,
      createdAtDevice: data.createdAtDevice.present
          ? data.createdAtDevice.value
          : this.createdAtDevice,
      syncStatus:
          data.syncStatus.present ? data.syncStatus.value : this.syncStatus,
      retryCount:
          data.retryCount.present ? data.retryCount.value : this.retryCount,
      lastError: data.lastError.present ? data.lastError.value : this.lastError,
      nextRetryAt:
          data.nextRetryAt.present ? data.nextRetryAt.value : this.nextRetryAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('PendingFuelRecord(')
          ..write('id: $id, ')
          ..write('clientEventId: $clientEventId, ')
          ..write('vehicleId: $vehicleId, ')
          ..write('liters: $liters, ')
          ..write('totalCost: $totalCost, ')
          ..write('odometer: $odometer, ')
          ..write('fuelType: $fuelType, ')
          ..write('stationName: $stationName, ')
          ..write('latitude: $latitude, ')
          ..write('longitude: $longitude, ')
          ..write('recordedAt: $recordedAt, ')
          ..write('receiptPhotoPath: $receiptPhotoPath, ')
          ..write('odometerPhotoPath: $odometerPhotoPath, ')
          ..write('createdAtDevice: $createdAtDevice, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('retryCount: $retryCount, ')
          ..write('lastError: $lastError, ')
          ..write('nextRetryAt: $nextRetryAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
      id,
      clientEventId,
      vehicleId,
      liters,
      totalCost,
      odometer,
      fuelType,
      stationName,
      latitude,
      longitude,
      recordedAt,
      receiptPhotoPath,
      odometerPhotoPath,
      createdAtDevice,
      syncStatus,
      retryCount,
      lastError,
      nextRetryAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is PendingFuelRecord &&
          other.id == this.id &&
          other.clientEventId == this.clientEventId &&
          other.vehicleId == this.vehicleId &&
          other.liters == this.liters &&
          other.totalCost == this.totalCost &&
          other.odometer == this.odometer &&
          other.fuelType == this.fuelType &&
          other.stationName == this.stationName &&
          other.latitude == this.latitude &&
          other.longitude == this.longitude &&
          other.recordedAt == this.recordedAt &&
          other.receiptPhotoPath == this.receiptPhotoPath &&
          other.odometerPhotoPath == this.odometerPhotoPath &&
          other.createdAtDevice == this.createdAtDevice &&
          other.syncStatus == this.syncStatus &&
          other.retryCount == this.retryCount &&
          other.lastError == this.lastError &&
          other.nextRetryAt == this.nextRetryAt);
}

class PendingFuelRecordsCompanion extends UpdateCompanion<PendingFuelRecord> {
  final Value<int> id;
  final Value<String> clientEventId;
  final Value<String> vehicleId;
  final Value<double> liters;
  final Value<double> totalCost;
  final Value<double> odometer;
  final Value<String> fuelType;
  final Value<String?> stationName;
  final Value<double> latitude;
  final Value<double> longitude;
  final Value<DateTime> recordedAt;
  final Value<String> receiptPhotoPath;
  final Value<String> odometerPhotoPath;
  final Value<DateTime> createdAtDevice;
  final Value<SyncStatus> syncStatus;
  final Value<int> retryCount;
  final Value<String?> lastError;
  final Value<DateTime?> nextRetryAt;
  const PendingFuelRecordsCompanion({
    this.id = const Value.absent(),
    this.clientEventId = const Value.absent(),
    this.vehicleId = const Value.absent(),
    this.liters = const Value.absent(),
    this.totalCost = const Value.absent(),
    this.odometer = const Value.absent(),
    this.fuelType = const Value.absent(),
    this.stationName = const Value.absent(),
    this.latitude = const Value.absent(),
    this.longitude = const Value.absent(),
    this.recordedAt = const Value.absent(),
    this.receiptPhotoPath = const Value.absent(),
    this.odometerPhotoPath = const Value.absent(),
    this.createdAtDevice = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.retryCount = const Value.absent(),
    this.lastError = const Value.absent(),
    this.nextRetryAt = const Value.absent(),
  });
  PendingFuelRecordsCompanion.insert({
    this.id = const Value.absent(),
    required String clientEventId,
    required String vehicleId,
    required double liters,
    required double totalCost,
    required double odometer,
    required String fuelType,
    this.stationName = const Value.absent(),
    required double latitude,
    required double longitude,
    required DateTime recordedAt,
    required String receiptPhotoPath,
    required String odometerPhotoPath,
    this.createdAtDevice = const Value.absent(),
    this.syncStatus = const Value.absent(),
    this.retryCount = const Value.absent(),
    this.lastError = const Value.absent(),
    this.nextRetryAt = const Value.absent(),
  })  : clientEventId = Value(clientEventId),
        vehicleId = Value(vehicleId),
        liters = Value(liters),
        totalCost = Value(totalCost),
        odometer = Value(odometer),
        fuelType = Value(fuelType),
        latitude = Value(latitude),
        longitude = Value(longitude),
        recordedAt = Value(recordedAt),
        receiptPhotoPath = Value(receiptPhotoPath),
        odometerPhotoPath = Value(odometerPhotoPath);
  static Insertable<PendingFuelRecord> custom({
    Expression<int>? id,
    Expression<String>? clientEventId,
    Expression<String>? vehicleId,
    Expression<double>? liters,
    Expression<double>? totalCost,
    Expression<double>? odometer,
    Expression<String>? fuelType,
    Expression<String>? stationName,
    Expression<double>? latitude,
    Expression<double>? longitude,
    Expression<DateTime>? recordedAt,
    Expression<String>? receiptPhotoPath,
    Expression<String>? odometerPhotoPath,
    Expression<DateTime>? createdAtDevice,
    Expression<String>? syncStatus,
    Expression<int>? retryCount,
    Expression<String>? lastError,
    Expression<DateTime>? nextRetryAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (clientEventId != null) 'client_event_id': clientEventId,
      if (vehicleId != null) 'vehicle_id': vehicleId,
      if (liters != null) 'liters': liters,
      if (totalCost != null) 'total_cost': totalCost,
      if (odometer != null) 'odometer': odometer,
      if (fuelType != null) 'fuel_type': fuelType,
      if (stationName != null) 'station_name': stationName,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      if (recordedAt != null) 'recorded_at': recordedAt,
      if (receiptPhotoPath != null) 'receipt_photo_path': receiptPhotoPath,
      if (odometerPhotoPath != null) 'odometer_photo_path': odometerPhotoPath,
      if (createdAtDevice != null) 'created_at_device': createdAtDevice,
      if (syncStatus != null) 'sync_status': syncStatus,
      if (retryCount != null) 'retry_count': retryCount,
      if (lastError != null) 'last_error': lastError,
      if (nextRetryAt != null) 'next_retry_at': nextRetryAt,
    });
  }

  PendingFuelRecordsCompanion copyWith(
      {Value<int>? id,
      Value<String>? clientEventId,
      Value<String>? vehicleId,
      Value<double>? liters,
      Value<double>? totalCost,
      Value<double>? odometer,
      Value<String>? fuelType,
      Value<String?>? stationName,
      Value<double>? latitude,
      Value<double>? longitude,
      Value<DateTime>? recordedAt,
      Value<String>? receiptPhotoPath,
      Value<String>? odometerPhotoPath,
      Value<DateTime>? createdAtDevice,
      Value<SyncStatus>? syncStatus,
      Value<int>? retryCount,
      Value<String?>? lastError,
      Value<DateTime?>? nextRetryAt}) {
    return PendingFuelRecordsCompanion(
      id: id ?? this.id,
      clientEventId: clientEventId ?? this.clientEventId,
      vehicleId: vehicleId ?? this.vehicleId,
      liters: liters ?? this.liters,
      totalCost: totalCost ?? this.totalCost,
      odometer: odometer ?? this.odometer,
      fuelType: fuelType ?? this.fuelType,
      stationName: stationName ?? this.stationName,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      recordedAt: recordedAt ?? this.recordedAt,
      receiptPhotoPath: receiptPhotoPath ?? this.receiptPhotoPath,
      odometerPhotoPath: odometerPhotoPath ?? this.odometerPhotoPath,
      createdAtDevice: createdAtDevice ?? this.createdAtDevice,
      syncStatus: syncStatus ?? this.syncStatus,
      retryCount: retryCount ?? this.retryCount,
      lastError: lastError ?? this.lastError,
      nextRetryAt: nextRetryAt ?? this.nextRetryAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (clientEventId.present) {
      map['client_event_id'] = Variable<String>(clientEventId.value);
    }
    if (vehicleId.present) {
      map['vehicle_id'] = Variable<String>(vehicleId.value);
    }
    if (liters.present) {
      map['liters'] = Variable<double>(liters.value);
    }
    if (totalCost.present) {
      map['total_cost'] = Variable<double>(totalCost.value);
    }
    if (odometer.present) {
      map['odometer'] = Variable<double>(odometer.value);
    }
    if (fuelType.present) {
      map['fuel_type'] = Variable<String>(fuelType.value);
    }
    if (stationName.present) {
      map['station_name'] = Variable<String>(stationName.value);
    }
    if (latitude.present) {
      map['latitude'] = Variable<double>(latitude.value);
    }
    if (longitude.present) {
      map['longitude'] = Variable<double>(longitude.value);
    }
    if (recordedAt.present) {
      map['recorded_at'] = Variable<DateTime>(recordedAt.value);
    }
    if (receiptPhotoPath.present) {
      map['receipt_photo_path'] = Variable<String>(receiptPhotoPath.value);
    }
    if (odometerPhotoPath.present) {
      map['odometer_photo_path'] = Variable<String>(odometerPhotoPath.value);
    }
    if (createdAtDevice.present) {
      map['created_at_device'] = Variable<DateTime>(createdAtDevice.value);
    }
    if (syncStatus.present) {
      map['sync_status'] = Variable<String>($PendingFuelRecordsTable
          .$convertersyncStatus
          .toSql(syncStatus.value));
    }
    if (retryCount.present) {
      map['retry_count'] = Variable<int>(retryCount.value);
    }
    if (lastError.present) {
      map['last_error'] = Variable<String>(lastError.value);
    }
    if (nextRetryAt.present) {
      map['next_retry_at'] = Variable<DateTime>(nextRetryAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('PendingFuelRecordsCompanion(')
          ..write('id: $id, ')
          ..write('clientEventId: $clientEventId, ')
          ..write('vehicleId: $vehicleId, ')
          ..write('liters: $liters, ')
          ..write('totalCost: $totalCost, ')
          ..write('odometer: $odometer, ')
          ..write('fuelType: $fuelType, ')
          ..write('stationName: $stationName, ')
          ..write('latitude: $latitude, ')
          ..write('longitude: $longitude, ')
          ..write('recordedAt: $recordedAt, ')
          ..write('receiptPhotoPath: $receiptPhotoPath, ')
          ..write('odometerPhotoPath: $odometerPhotoPath, ')
          ..write('createdAtDevice: $createdAtDevice, ')
          ..write('syncStatus: $syncStatus, ')
          ..write('retryCount: $retryCount, ')
          ..write('lastError: $lastError, ')
          ..write('nextRetryAt: $nextRetryAt')
          ..write(')'))
        .toString();
  }
}

class $TodayMissionsCacheTable extends TodayMissionsCache
    with TableInfo<$TodayMissionsCacheTable, TodayMissionsCacheData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $TodayMissionsCacheTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
      'id', aliasedName, false,
      type: DriftSqlType.int,
      requiredDuringInsert: false,
      defaultValue: const Constant(0));
  static const VerificationMeta _responseJsonMeta =
      const VerificationMeta('responseJson');
  @override
  late final GeneratedColumn<String> responseJson = GeneratedColumn<String>(
      'response_json', aliasedName, false,
      type: DriftSqlType.string, requiredDuringInsert: true);
  static const VerificationMeta _fetchedAtMeta =
      const VerificationMeta('fetchedAt');
  @override
  late final GeneratedColumn<DateTime> fetchedAt = GeneratedColumn<DateTime>(
      'fetched_at', aliasedName, false,
      type: DriftSqlType.dateTime, requiredDuringInsert: true);
  @override
  List<GeneratedColumn> get $columns => [id, responseJson, fetchedAt];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'today_missions_cache';
  @override
  VerificationContext validateIntegrity(
      Insertable<TodayMissionsCacheData> instance,
      {bool isInserting = false}) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('response_json')) {
      context.handle(
          _responseJsonMeta,
          responseJson.isAcceptableOrUnknown(
              data['response_json']!, _responseJsonMeta));
    } else if (isInserting) {
      context.missing(_responseJsonMeta);
    }
    if (data.containsKey('fetched_at')) {
      context.handle(_fetchedAtMeta,
          fetchedAt.isAcceptableOrUnknown(data['fetched_at']!, _fetchedAtMeta));
    } else if (isInserting) {
      context.missing(_fetchedAtMeta);
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  TodayMissionsCacheData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return TodayMissionsCacheData(
      id: attachedDatabase.typeMapping
          .read(DriftSqlType.int, data['${effectivePrefix}id'])!,
      responseJson: attachedDatabase.typeMapping
          .read(DriftSqlType.string, data['${effectivePrefix}response_json'])!,
      fetchedAt: attachedDatabase.typeMapping
          .read(DriftSqlType.dateTime, data['${effectivePrefix}fetched_at'])!,
    );
  }

  @override
  $TodayMissionsCacheTable createAlias(String alias) {
    return $TodayMissionsCacheTable(attachedDatabase, alias);
  }
}

class TodayMissionsCacheData extends DataClass
    implements Insertable<TodayMissionsCacheData> {
  /// Toujours 0 — une seule ligne, remplacée à chaque fetch réussi.
  final int id;
  final String responseJson;
  final DateTime fetchedAt;
  const TodayMissionsCacheData(
      {required this.id, required this.responseJson, required this.fetchedAt});
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['response_json'] = Variable<String>(responseJson);
    map['fetched_at'] = Variable<DateTime>(fetchedAt);
    return map;
  }

  TodayMissionsCacheCompanion toCompanion(bool nullToAbsent) {
    return TodayMissionsCacheCompanion(
      id: Value(id),
      responseJson: Value(responseJson),
      fetchedAt: Value(fetchedAt),
    );
  }

  factory TodayMissionsCacheData.fromJson(Map<String, dynamic> json,
      {ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return TodayMissionsCacheData(
      id: serializer.fromJson<int>(json['id']),
      responseJson: serializer.fromJson<String>(json['responseJson']),
      fetchedAt: serializer.fromJson<DateTime>(json['fetchedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'responseJson': serializer.toJson<String>(responseJson),
      'fetchedAt': serializer.toJson<DateTime>(fetchedAt),
    };
  }

  TodayMissionsCacheData copyWith(
          {int? id, String? responseJson, DateTime? fetchedAt}) =>
      TodayMissionsCacheData(
        id: id ?? this.id,
        responseJson: responseJson ?? this.responseJson,
        fetchedAt: fetchedAt ?? this.fetchedAt,
      );
  TodayMissionsCacheData copyWithCompanion(TodayMissionsCacheCompanion data) {
    return TodayMissionsCacheData(
      id: data.id.present ? data.id.value : this.id,
      responseJson: data.responseJson.present
          ? data.responseJson.value
          : this.responseJson,
      fetchedAt: data.fetchedAt.present ? data.fetchedAt.value : this.fetchedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('TodayMissionsCacheData(')
          ..write('id: $id, ')
          ..write('responseJson: $responseJson, ')
          ..write('fetchedAt: $fetchedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(id, responseJson, fetchedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is TodayMissionsCacheData &&
          other.id == this.id &&
          other.responseJson == this.responseJson &&
          other.fetchedAt == this.fetchedAt);
}

class TodayMissionsCacheCompanion
    extends UpdateCompanion<TodayMissionsCacheData> {
  final Value<int> id;
  final Value<String> responseJson;
  final Value<DateTime> fetchedAt;
  const TodayMissionsCacheCompanion({
    this.id = const Value.absent(),
    this.responseJson = const Value.absent(),
    this.fetchedAt = const Value.absent(),
  });
  TodayMissionsCacheCompanion.insert({
    this.id = const Value.absent(),
    required String responseJson,
    required DateTime fetchedAt,
  })  : responseJson = Value(responseJson),
        fetchedAt = Value(fetchedAt);
  static Insertable<TodayMissionsCacheData> custom({
    Expression<int>? id,
    Expression<String>? responseJson,
    Expression<DateTime>? fetchedAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (responseJson != null) 'response_json': responseJson,
      if (fetchedAt != null) 'fetched_at': fetchedAt,
    });
  }

  TodayMissionsCacheCompanion copyWith(
      {Value<int>? id,
      Value<String>? responseJson,
      Value<DateTime>? fetchedAt}) {
    return TodayMissionsCacheCompanion(
      id: id ?? this.id,
      responseJson: responseJson ?? this.responseJson,
      fetchedAt: fetchedAt ?? this.fetchedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (responseJson.present) {
      map['response_json'] = Variable<String>(responseJson.value);
    }
    if (fetchedAt.present) {
      map['fetched_at'] = Variable<DateTime>(fetchedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('TodayMissionsCacheCompanion(')
          ..write('id: $id, ')
          ..write('responseJson: $responseJson, ')
          ..write('fetchedAt: $fetchedAt')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $PendingGpsPositionsTable pendingGpsPositions =
      $PendingGpsPositionsTable(this);
  late final $PendingValidationsTable pendingValidations =
      $PendingValidationsTable(this);
  late final $PendingFuelRecordsTable pendingFuelRecords =
      $PendingFuelRecordsTable(this);
  late final $TodayMissionsCacheTable todayMissionsCache =
      $TodayMissionsCacheTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
        pendingGpsPositions,
        pendingValidations,
        pendingFuelRecords,
        todayMissionsCache
      ];
}

typedef $$PendingGpsPositionsTableCreateCompanionBuilder
    = PendingGpsPositionsCompanion Function({
  Value<int> id,
  required String clientEventId,
  required String vehicleId,
  Value<String?> missionId,
  required double latitude,
  required double longitude,
  Value<double?> accuracy,
  Value<double?> altitude,
  Value<double?> speed,
  Value<double?> heading,
  Value<bool> isMocked,
  required DateTime recordedAt,
  Value<DateTime> createdAtDevice,
  Value<SyncStatus> syncStatus,
  Value<int> retryCount,
  Value<String?> lastError,
  Value<DateTime?> nextRetryAt,
});
typedef $$PendingGpsPositionsTableUpdateCompanionBuilder
    = PendingGpsPositionsCompanion Function({
  Value<int> id,
  Value<String> clientEventId,
  Value<String> vehicleId,
  Value<String?> missionId,
  Value<double> latitude,
  Value<double> longitude,
  Value<double?> accuracy,
  Value<double?> altitude,
  Value<double?> speed,
  Value<double?> heading,
  Value<bool> isMocked,
  Value<DateTime> recordedAt,
  Value<DateTime> createdAtDevice,
  Value<SyncStatus> syncStatus,
  Value<int> retryCount,
  Value<String?> lastError,
  Value<DateTime?> nextRetryAt,
});

class $$PendingGpsPositionsTableFilterComposer
    extends Composer<_$AppDatabase, $PendingGpsPositionsTable> {
  $$PendingGpsPositionsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get clientEventId => $composableBuilder(
      column: $table.clientEventId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get vehicleId => $composableBuilder(
      column: $table.vehicleId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get missionId => $composableBuilder(
      column: $table.missionId, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get latitude => $composableBuilder(
      column: $table.latitude, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get longitude => $composableBuilder(
      column: $table.longitude, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get accuracy => $composableBuilder(
      column: $table.accuracy, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get altitude => $composableBuilder(
      column: $table.altitude, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get speed => $composableBuilder(
      column: $table.speed, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get heading => $composableBuilder(
      column: $table.heading, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isMocked => $composableBuilder(
      column: $table.isMocked, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get recordedAt => $composableBuilder(
      column: $table.recordedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAtDevice => $composableBuilder(
      column: $table.createdAtDevice,
      builder: (column) => ColumnFilters(column));

  ColumnWithTypeConverterFilters<SyncStatus, SyncStatus, String>
      get syncStatus => $composableBuilder(
          column: $table.syncStatus,
          builder: (column) => ColumnWithTypeConverterFilters(column));

  ColumnFilters<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lastError => $composableBuilder(
      column: $table.lastError, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get nextRetryAt => $composableBuilder(
      column: $table.nextRetryAt, builder: (column) => ColumnFilters(column));
}

class $$PendingGpsPositionsTableOrderingComposer
    extends Composer<_$AppDatabase, $PendingGpsPositionsTable> {
  $$PendingGpsPositionsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get clientEventId => $composableBuilder(
      column: $table.clientEventId,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get vehicleId => $composableBuilder(
      column: $table.vehicleId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get missionId => $composableBuilder(
      column: $table.missionId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get latitude => $composableBuilder(
      column: $table.latitude, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get longitude => $composableBuilder(
      column: $table.longitude, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get accuracy => $composableBuilder(
      column: $table.accuracy, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get altitude => $composableBuilder(
      column: $table.altitude, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get speed => $composableBuilder(
      column: $table.speed, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get heading => $composableBuilder(
      column: $table.heading, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isMocked => $composableBuilder(
      column: $table.isMocked, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get recordedAt => $composableBuilder(
      column: $table.recordedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAtDevice => $composableBuilder(
      column: $table.createdAtDevice,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lastError => $composableBuilder(
      column: $table.lastError, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get nextRetryAt => $composableBuilder(
      column: $table.nextRetryAt, builder: (column) => ColumnOrderings(column));
}

class $$PendingGpsPositionsTableAnnotationComposer
    extends Composer<_$AppDatabase, $PendingGpsPositionsTable> {
  $$PendingGpsPositionsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get clientEventId => $composableBuilder(
      column: $table.clientEventId, builder: (column) => column);

  GeneratedColumn<String> get vehicleId =>
      $composableBuilder(column: $table.vehicleId, builder: (column) => column);

  GeneratedColumn<String> get missionId =>
      $composableBuilder(column: $table.missionId, builder: (column) => column);

  GeneratedColumn<double> get latitude =>
      $composableBuilder(column: $table.latitude, builder: (column) => column);

  GeneratedColumn<double> get longitude =>
      $composableBuilder(column: $table.longitude, builder: (column) => column);

  GeneratedColumn<double> get accuracy =>
      $composableBuilder(column: $table.accuracy, builder: (column) => column);

  GeneratedColumn<double> get altitude =>
      $composableBuilder(column: $table.altitude, builder: (column) => column);

  GeneratedColumn<double> get speed =>
      $composableBuilder(column: $table.speed, builder: (column) => column);

  GeneratedColumn<double> get heading =>
      $composableBuilder(column: $table.heading, builder: (column) => column);

  GeneratedColumn<bool> get isMocked =>
      $composableBuilder(column: $table.isMocked, builder: (column) => column);

  GeneratedColumn<DateTime> get recordedAt => $composableBuilder(
      column: $table.recordedAt, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAtDevice => $composableBuilder(
      column: $table.createdAtDevice, builder: (column) => column);

  GeneratedColumnWithTypeConverter<SyncStatus, String> get syncStatus =>
      $composableBuilder(
          column: $table.syncStatus, builder: (column) => column);

  GeneratedColumn<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => column);

  GeneratedColumn<String> get lastError =>
      $composableBuilder(column: $table.lastError, builder: (column) => column);

  GeneratedColumn<DateTime> get nextRetryAt => $composableBuilder(
      column: $table.nextRetryAt, builder: (column) => column);
}

class $$PendingGpsPositionsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $PendingGpsPositionsTable,
    PendingGpsPosition,
    $$PendingGpsPositionsTableFilterComposer,
    $$PendingGpsPositionsTableOrderingComposer,
    $$PendingGpsPositionsTableAnnotationComposer,
    $$PendingGpsPositionsTableCreateCompanionBuilder,
    $$PendingGpsPositionsTableUpdateCompanionBuilder,
    (
      PendingGpsPosition,
      BaseReferences<_$AppDatabase, $PendingGpsPositionsTable,
          PendingGpsPosition>
    ),
    PendingGpsPosition,
    PrefetchHooks Function()> {
  $$PendingGpsPositionsTableTableManager(
      _$AppDatabase db, $PendingGpsPositionsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$PendingGpsPositionsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$PendingGpsPositionsTableOrderingComposer(
                  $db: db, $table: table),
          createComputedFieldComposer: () =>
              $$PendingGpsPositionsTableAnnotationComposer(
                  $db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> clientEventId = const Value.absent(),
            Value<String> vehicleId = const Value.absent(),
            Value<String?> missionId = const Value.absent(),
            Value<double> latitude = const Value.absent(),
            Value<double> longitude = const Value.absent(),
            Value<double?> accuracy = const Value.absent(),
            Value<double?> altitude = const Value.absent(),
            Value<double?> speed = const Value.absent(),
            Value<double?> heading = const Value.absent(),
            Value<bool> isMocked = const Value.absent(),
            Value<DateTime> recordedAt = const Value.absent(),
            Value<DateTime> createdAtDevice = const Value.absent(),
            Value<SyncStatus> syncStatus = const Value.absent(),
            Value<int> retryCount = const Value.absent(),
            Value<String?> lastError = const Value.absent(),
            Value<DateTime?> nextRetryAt = const Value.absent(),
          }) =>
              PendingGpsPositionsCompanion(
            id: id,
            clientEventId: clientEventId,
            vehicleId: vehicleId,
            missionId: missionId,
            latitude: latitude,
            longitude: longitude,
            accuracy: accuracy,
            altitude: altitude,
            speed: speed,
            heading: heading,
            isMocked: isMocked,
            recordedAt: recordedAt,
            createdAtDevice: createdAtDevice,
            syncStatus: syncStatus,
            retryCount: retryCount,
            lastError: lastError,
            nextRetryAt: nextRetryAt,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String clientEventId,
            required String vehicleId,
            Value<String?> missionId = const Value.absent(),
            required double latitude,
            required double longitude,
            Value<double?> accuracy = const Value.absent(),
            Value<double?> altitude = const Value.absent(),
            Value<double?> speed = const Value.absent(),
            Value<double?> heading = const Value.absent(),
            Value<bool> isMocked = const Value.absent(),
            required DateTime recordedAt,
            Value<DateTime> createdAtDevice = const Value.absent(),
            Value<SyncStatus> syncStatus = const Value.absent(),
            Value<int> retryCount = const Value.absent(),
            Value<String?> lastError = const Value.absent(),
            Value<DateTime?> nextRetryAt = const Value.absent(),
          }) =>
              PendingGpsPositionsCompanion.insert(
            id: id,
            clientEventId: clientEventId,
            vehicleId: vehicleId,
            missionId: missionId,
            latitude: latitude,
            longitude: longitude,
            accuracy: accuracy,
            altitude: altitude,
            speed: speed,
            heading: heading,
            isMocked: isMocked,
            recordedAt: recordedAt,
            createdAtDevice: createdAtDevice,
            syncStatus: syncStatus,
            retryCount: retryCount,
            lastError: lastError,
            nextRetryAt: nextRetryAt,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable<$PendingGpsPositionsTable, PendingGpsPosition>(
                        table),
                    BaseReferences<_$AppDatabase, $PendingGpsPositionsTable,
                        PendingGpsPosition>(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$PendingGpsPositionsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $PendingGpsPositionsTable,
    PendingGpsPosition,
    $$PendingGpsPositionsTableFilterComposer,
    $$PendingGpsPositionsTableOrderingComposer,
    $$PendingGpsPositionsTableAnnotationComposer,
    $$PendingGpsPositionsTableCreateCompanionBuilder,
    $$PendingGpsPositionsTableUpdateCompanionBuilder,
    (
      PendingGpsPosition,
      BaseReferences<_$AppDatabase, $PendingGpsPositionsTable,
          PendingGpsPosition>
    ),
    PendingGpsPosition,
    PrefetchHooks Function()>;
typedef $$PendingValidationsTableCreateCompanionBuilder
    = PendingValidationsCompanion Function({
  Value<int> id,
  required String clientEventId,
  required String missionStepId,
  required String qrToken,
  required double latitude,
  required double longitude,
  Value<double?> accuracy,
  Value<bool> isMocked,
  required DateTime recordedAt,
  required String photoPath,
  Value<DateTime> createdAtDevice,
  Value<SyncStatus> syncStatus,
  Value<int> retryCount,
  Value<String?> lastError,
  Value<DateTime?> nextRetryAt,
});
typedef $$PendingValidationsTableUpdateCompanionBuilder
    = PendingValidationsCompanion Function({
  Value<int> id,
  Value<String> clientEventId,
  Value<String> missionStepId,
  Value<String> qrToken,
  Value<double> latitude,
  Value<double> longitude,
  Value<double?> accuracy,
  Value<bool> isMocked,
  Value<DateTime> recordedAt,
  Value<String> photoPath,
  Value<DateTime> createdAtDevice,
  Value<SyncStatus> syncStatus,
  Value<int> retryCount,
  Value<String?> lastError,
  Value<DateTime?> nextRetryAt,
});

class $$PendingValidationsTableFilterComposer
    extends Composer<_$AppDatabase, $PendingValidationsTable> {
  $$PendingValidationsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get clientEventId => $composableBuilder(
      column: $table.clientEventId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get missionStepId => $composableBuilder(
      column: $table.missionStepId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get qrToken => $composableBuilder(
      column: $table.qrToken, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get latitude => $composableBuilder(
      column: $table.latitude, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get longitude => $composableBuilder(
      column: $table.longitude, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get accuracy => $composableBuilder(
      column: $table.accuracy, builder: (column) => ColumnFilters(column));

  ColumnFilters<bool> get isMocked => $composableBuilder(
      column: $table.isMocked, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get recordedAt => $composableBuilder(
      column: $table.recordedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get photoPath => $composableBuilder(
      column: $table.photoPath, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAtDevice => $composableBuilder(
      column: $table.createdAtDevice,
      builder: (column) => ColumnFilters(column));

  ColumnWithTypeConverterFilters<SyncStatus, SyncStatus, String>
      get syncStatus => $composableBuilder(
          column: $table.syncStatus,
          builder: (column) => ColumnWithTypeConverterFilters(column));

  ColumnFilters<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lastError => $composableBuilder(
      column: $table.lastError, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get nextRetryAt => $composableBuilder(
      column: $table.nextRetryAt, builder: (column) => ColumnFilters(column));
}

class $$PendingValidationsTableOrderingComposer
    extends Composer<_$AppDatabase, $PendingValidationsTable> {
  $$PendingValidationsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get clientEventId => $composableBuilder(
      column: $table.clientEventId,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get missionStepId => $composableBuilder(
      column: $table.missionStepId,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get qrToken => $composableBuilder(
      column: $table.qrToken, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get latitude => $composableBuilder(
      column: $table.latitude, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get longitude => $composableBuilder(
      column: $table.longitude, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get accuracy => $composableBuilder(
      column: $table.accuracy, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<bool> get isMocked => $composableBuilder(
      column: $table.isMocked, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get recordedAt => $composableBuilder(
      column: $table.recordedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get photoPath => $composableBuilder(
      column: $table.photoPath, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAtDevice => $composableBuilder(
      column: $table.createdAtDevice,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lastError => $composableBuilder(
      column: $table.lastError, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get nextRetryAt => $composableBuilder(
      column: $table.nextRetryAt, builder: (column) => ColumnOrderings(column));
}

class $$PendingValidationsTableAnnotationComposer
    extends Composer<_$AppDatabase, $PendingValidationsTable> {
  $$PendingValidationsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get clientEventId => $composableBuilder(
      column: $table.clientEventId, builder: (column) => column);

  GeneratedColumn<String> get missionStepId => $composableBuilder(
      column: $table.missionStepId, builder: (column) => column);

  GeneratedColumn<String> get qrToken =>
      $composableBuilder(column: $table.qrToken, builder: (column) => column);

  GeneratedColumn<double> get latitude =>
      $composableBuilder(column: $table.latitude, builder: (column) => column);

  GeneratedColumn<double> get longitude =>
      $composableBuilder(column: $table.longitude, builder: (column) => column);

  GeneratedColumn<double> get accuracy =>
      $composableBuilder(column: $table.accuracy, builder: (column) => column);

  GeneratedColumn<bool> get isMocked =>
      $composableBuilder(column: $table.isMocked, builder: (column) => column);

  GeneratedColumn<DateTime> get recordedAt => $composableBuilder(
      column: $table.recordedAt, builder: (column) => column);

  GeneratedColumn<String> get photoPath =>
      $composableBuilder(column: $table.photoPath, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAtDevice => $composableBuilder(
      column: $table.createdAtDevice, builder: (column) => column);

  GeneratedColumnWithTypeConverter<SyncStatus, String> get syncStatus =>
      $composableBuilder(
          column: $table.syncStatus, builder: (column) => column);

  GeneratedColumn<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => column);

  GeneratedColumn<String> get lastError =>
      $composableBuilder(column: $table.lastError, builder: (column) => column);

  GeneratedColumn<DateTime> get nextRetryAt => $composableBuilder(
      column: $table.nextRetryAt, builder: (column) => column);
}

class $$PendingValidationsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $PendingValidationsTable,
    PendingValidation,
    $$PendingValidationsTableFilterComposer,
    $$PendingValidationsTableOrderingComposer,
    $$PendingValidationsTableAnnotationComposer,
    $$PendingValidationsTableCreateCompanionBuilder,
    $$PendingValidationsTableUpdateCompanionBuilder,
    (
      PendingValidation,
      BaseReferences<_$AppDatabase, $PendingValidationsTable, PendingValidation>
    ),
    PendingValidation,
    PrefetchHooks Function()> {
  $$PendingValidationsTableTableManager(
      _$AppDatabase db, $PendingValidationsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$PendingValidationsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$PendingValidationsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$PendingValidationsTableAnnotationComposer(
                  $db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> clientEventId = const Value.absent(),
            Value<String> missionStepId = const Value.absent(),
            Value<String> qrToken = const Value.absent(),
            Value<double> latitude = const Value.absent(),
            Value<double> longitude = const Value.absent(),
            Value<double?> accuracy = const Value.absent(),
            Value<bool> isMocked = const Value.absent(),
            Value<DateTime> recordedAt = const Value.absent(),
            Value<String> photoPath = const Value.absent(),
            Value<DateTime> createdAtDevice = const Value.absent(),
            Value<SyncStatus> syncStatus = const Value.absent(),
            Value<int> retryCount = const Value.absent(),
            Value<String?> lastError = const Value.absent(),
            Value<DateTime?> nextRetryAt = const Value.absent(),
          }) =>
              PendingValidationsCompanion(
            id: id,
            clientEventId: clientEventId,
            missionStepId: missionStepId,
            qrToken: qrToken,
            latitude: latitude,
            longitude: longitude,
            accuracy: accuracy,
            isMocked: isMocked,
            recordedAt: recordedAt,
            photoPath: photoPath,
            createdAtDevice: createdAtDevice,
            syncStatus: syncStatus,
            retryCount: retryCount,
            lastError: lastError,
            nextRetryAt: nextRetryAt,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String clientEventId,
            required String missionStepId,
            required String qrToken,
            required double latitude,
            required double longitude,
            Value<double?> accuracy = const Value.absent(),
            Value<bool> isMocked = const Value.absent(),
            required DateTime recordedAt,
            required String photoPath,
            Value<DateTime> createdAtDevice = const Value.absent(),
            Value<SyncStatus> syncStatus = const Value.absent(),
            Value<int> retryCount = const Value.absent(),
            Value<String?> lastError = const Value.absent(),
            Value<DateTime?> nextRetryAt = const Value.absent(),
          }) =>
              PendingValidationsCompanion.insert(
            id: id,
            clientEventId: clientEventId,
            missionStepId: missionStepId,
            qrToken: qrToken,
            latitude: latitude,
            longitude: longitude,
            accuracy: accuracy,
            isMocked: isMocked,
            recordedAt: recordedAt,
            photoPath: photoPath,
            createdAtDevice: createdAtDevice,
            syncStatus: syncStatus,
            retryCount: retryCount,
            lastError: lastError,
            nextRetryAt: nextRetryAt,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable<$PendingValidationsTable, PendingValidation>(
                        table),
                    BaseReferences<_$AppDatabase, $PendingValidationsTable,
                        PendingValidation>(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$PendingValidationsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $PendingValidationsTable,
    PendingValidation,
    $$PendingValidationsTableFilterComposer,
    $$PendingValidationsTableOrderingComposer,
    $$PendingValidationsTableAnnotationComposer,
    $$PendingValidationsTableCreateCompanionBuilder,
    $$PendingValidationsTableUpdateCompanionBuilder,
    (
      PendingValidation,
      BaseReferences<_$AppDatabase, $PendingValidationsTable, PendingValidation>
    ),
    PendingValidation,
    PrefetchHooks Function()>;
typedef $$PendingFuelRecordsTableCreateCompanionBuilder
    = PendingFuelRecordsCompanion Function({
  Value<int> id,
  required String clientEventId,
  required String vehicleId,
  required double liters,
  required double totalCost,
  required double odometer,
  required String fuelType,
  Value<String?> stationName,
  required double latitude,
  required double longitude,
  required DateTime recordedAt,
  required String receiptPhotoPath,
  required String odometerPhotoPath,
  Value<DateTime> createdAtDevice,
  Value<SyncStatus> syncStatus,
  Value<int> retryCount,
  Value<String?> lastError,
  Value<DateTime?> nextRetryAt,
});
typedef $$PendingFuelRecordsTableUpdateCompanionBuilder
    = PendingFuelRecordsCompanion Function({
  Value<int> id,
  Value<String> clientEventId,
  Value<String> vehicleId,
  Value<double> liters,
  Value<double> totalCost,
  Value<double> odometer,
  Value<String> fuelType,
  Value<String?> stationName,
  Value<double> latitude,
  Value<double> longitude,
  Value<DateTime> recordedAt,
  Value<String> receiptPhotoPath,
  Value<String> odometerPhotoPath,
  Value<DateTime> createdAtDevice,
  Value<SyncStatus> syncStatus,
  Value<int> retryCount,
  Value<String?> lastError,
  Value<DateTime?> nextRetryAt,
});

class $$PendingFuelRecordsTableFilterComposer
    extends Composer<_$AppDatabase, $PendingFuelRecordsTable> {
  $$PendingFuelRecordsTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get clientEventId => $composableBuilder(
      column: $table.clientEventId, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get vehicleId => $composableBuilder(
      column: $table.vehicleId, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get liters => $composableBuilder(
      column: $table.liters, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get totalCost => $composableBuilder(
      column: $table.totalCost, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get odometer => $composableBuilder(
      column: $table.odometer, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get fuelType => $composableBuilder(
      column: $table.fuelType, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get stationName => $composableBuilder(
      column: $table.stationName, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get latitude => $composableBuilder(
      column: $table.latitude, builder: (column) => ColumnFilters(column));

  ColumnFilters<double> get longitude => $composableBuilder(
      column: $table.longitude, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get recordedAt => $composableBuilder(
      column: $table.recordedAt, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get receiptPhotoPath => $composableBuilder(
      column: $table.receiptPhotoPath,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get odometerPhotoPath => $composableBuilder(
      column: $table.odometerPhotoPath,
      builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get createdAtDevice => $composableBuilder(
      column: $table.createdAtDevice,
      builder: (column) => ColumnFilters(column));

  ColumnWithTypeConverterFilters<SyncStatus, SyncStatus, String>
      get syncStatus => $composableBuilder(
          column: $table.syncStatus,
          builder: (column) => ColumnWithTypeConverterFilters(column));

  ColumnFilters<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get lastError => $composableBuilder(
      column: $table.lastError, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get nextRetryAt => $composableBuilder(
      column: $table.nextRetryAt, builder: (column) => ColumnFilters(column));
}

class $$PendingFuelRecordsTableOrderingComposer
    extends Composer<_$AppDatabase, $PendingFuelRecordsTable> {
  $$PendingFuelRecordsTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get clientEventId => $composableBuilder(
      column: $table.clientEventId,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get vehicleId => $composableBuilder(
      column: $table.vehicleId, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get liters => $composableBuilder(
      column: $table.liters, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get totalCost => $composableBuilder(
      column: $table.totalCost, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get odometer => $composableBuilder(
      column: $table.odometer, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get fuelType => $composableBuilder(
      column: $table.fuelType, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get stationName => $composableBuilder(
      column: $table.stationName, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get latitude => $composableBuilder(
      column: $table.latitude, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<double> get longitude => $composableBuilder(
      column: $table.longitude, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get recordedAt => $composableBuilder(
      column: $table.recordedAt, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get receiptPhotoPath => $composableBuilder(
      column: $table.receiptPhotoPath,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get odometerPhotoPath => $composableBuilder(
      column: $table.odometerPhotoPath,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get createdAtDevice => $composableBuilder(
      column: $table.createdAtDevice,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get syncStatus => $composableBuilder(
      column: $table.syncStatus, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get lastError => $composableBuilder(
      column: $table.lastError, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get nextRetryAt => $composableBuilder(
      column: $table.nextRetryAt, builder: (column) => ColumnOrderings(column));
}

class $$PendingFuelRecordsTableAnnotationComposer
    extends Composer<_$AppDatabase, $PendingFuelRecordsTable> {
  $$PendingFuelRecordsTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get clientEventId => $composableBuilder(
      column: $table.clientEventId, builder: (column) => column);

  GeneratedColumn<String> get vehicleId =>
      $composableBuilder(column: $table.vehicleId, builder: (column) => column);

  GeneratedColumn<double> get liters =>
      $composableBuilder(column: $table.liters, builder: (column) => column);

  GeneratedColumn<double> get totalCost =>
      $composableBuilder(column: $table.totalCost, builder: (column) => column);

  GeneratedColumn<double> get odometer =>
      $composableBuilder(column: $table.odometer, builder: (column) => column);

  GeneratedColumn<String> get fuelType =>
      $composableBuilder(column: $table.fuelType, builder: (column) => column);

  GeneratedColumn<String> get stationName => $composableBuilder(
      column: $table.stationName, builder: (column) => column);

  GeneratedColumn<double> get latitude =>
      $composableBuilder(column: $table.latitude, builder: (column) => column);

  GeneratedColumn<double> get longitude =>
      $composableBuilder(column: $table.longitude, builder: (column) => column);

  GeneratedColumn<DateTime> get recordedAt => $composableBuilder(
      column: $table.recordedAt, builder: (column) => column);

  GeneratedColumn<String> get receiptPhotoPath => $composableBuilder(
      column: $table.receiptPhotoPath, builder: (column) => column);

  GeneratedColumn<String> get odometerPhotoPath => $composableBuilder(
      column: $table.odometerPhotoPath, builder: (column) => column);

  GeneratedColumn<DateTime> get createdAtDevice => $composableBuilder(
      column: $table.createdAtDevice, builder: (column) => column);

  GeneratedColumnWithTypeConverter<SyncStatus, String> get syncStatus =>
      $composableBuilder(
          column: $table.syncStatus, builder: (column) => column);

  GeneratedColumn<int> get retryCount => $composableBuilder(
      column: $table.retryCount, builder: (column) => column);

  GeneratedColumn<String> get lastError =>
      $composableBuilder(column: $table.lastError, builder: (column) => column);

  GeneratedColumn<DateTime> get nextRetryAt => $composableBuilder(
      column: $table.nextRetryAt, builder: (column) => column);
}

class $$PendingFuelRecordsTableTableManager extends RootTableManager<
    _$AppDatabase,
    $PendingFuelRecordsTable,
    PendingFuelRecord,
    $$PendingFuelRecordsTableFilterComposer,
    $$PendingFuelRecordsTableOrderingComposer,
    $$PendingFuelRecordsTableAnnotationComposer,
    $$PendingFuelRecordsTableCreateCompanionBuilder,
    $$PendingFuelRecordsTableUpdateCompanionBuilder,
    (
      PendingFuelRecord,
      BaseReferences<_$AppDatabase, $PendingFuelRecordsTable, PendingFuelRecord>
    ),
    PendingFuelRecord,
    PrefetchHooks Function()> {
  $$PendingFuelRecordsTableTableManager(
      _$AppDatabase db, $PendingFuelRecordsTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$PendingFuelRecordsTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$PendingFuelRecordsTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$PendingFuelRecordsTableAnnotationComposer(
                  $db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> clientEventId = const Value.absent(),
            Value<String> vehicleId = const Value.absent(),
            Value<double> liters = const Value.absent(),
            Value<double> totalCost = const Value.absent(),
            Value<double> odometer = const Value.absent(),
            Value<String> fuelType = const Value.absent(),
            Value<String?> stationName = const Value.absent(),
            Value<double> latitude = const Value.absent(),
            Value<double> longitude = const Value.absent(),
            Value<DateTime> recordedAt = const Value.absent(),
            Value<String> receiptPhotoPath = const Value.absent(),
            Value<String> odometerPhotoPath = const Value.absent(),
            Value<DateTime> createdAtDevice = const Value.absent(),
            Value<SyncStatus> syncStatus = const Value.absent(),
            Value<int> retryCount = const Value.absent(),
            Value<String?> lastError = const Value.absent(),
            Value<DateTime?> nextRetryAt = const Value.absent(),
          }) =>
              PendingFuelRecordsCompanion(
            id: id,
            clientEventId: clientEventId,
            vehicleId: vehicleId,
            liters: liters,
            totalCost: totalCost,
            odometer: odometer,
            fuelType: fuelType,
            stationName: stationName,
            latitude: latitude,
            longitude: longitude,
            recordedAt: recordedAt,
            receiptPhotoPath: receiptPhotoPath,
            odometerPhotoPath: odometerPhotoPath,
            createdAtDevice: createdAtDevice,
            syncStatus: syncStatus,
            retryCount: retryCount,
            lastError: lastError,
            nextRetryAt: nextRetryAt,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String clientEventId,
            required String vehicleId,
            required double liters,
            required double totalCost,
            required double odometer,
            required String fuelType,
            Value<String?> stationName = const Value.absent(),
            required double latitude,
            required double longitude,
            required DateTime recordedAt,
            required String receiptPhotoPath,
            required String odometerPhotoPath,
            Value<DateTime> createdAtDevice = const Value.absent(),
            Value<SyncStatus> syncStatus = const Value.absent(),
            Value<int> retryCount = const Value.absent(),
            Value<String?> lastError = const Value.absent(),
            Value<DateTime?> nextRetryAt = const Value.absent(),
          }) =>
              PendingFuelRecordsCompanion.insert(
            id: id,
            clientEventId: clientEventId,
            vehicleId: vehicleId,
            liters: liters,
            totalCost: totalCost,
            odometer: odometer,
            fuelType: fuelType,
            stationName: stationName,
            latitude: latitude,
            longitude: longitude,
            recordedAt: recordedAt,
            receiptPhotoPath: receiptPhotoPath,
            odometerPhotoPath: odometerPhotoPath,
            createdAtDevice: createdAtDevice,
            syncStatus: syncStatus,
            retryCount: retryCount,
            lastError: lastError,
            nextRetryAt: nextRetryAt,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable<$PendingFuelRecordsTable, PendingFuelRecord>(
                        table),
                    BaseReferences<_$AppDatabase, $PendingFuelRecordsTable,
                        PendingFuelRecord>(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$PendingFuelRecordsTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $PendingFuelRecordsTable,
    PendingFuelRecord,
    $$PendingFuelRecordsTableFilterComposer,
    $$PendingFuelRecordsTableOrderingComposer,
    $$PendingFuelRecordsTableAnnotationComposer,
    $$PendingFuelRecordsTableCreateCompanionBuilder,
    $$PendingFuelRecordsTableUpdateCompanionBuilder,
    (
      PendingFuelRecord,
      BaseReferences<_$AppDatabase, $PendingFuelRecordsTable, PendingFuelRecord>
    ),
    PendingFuelRecord,
    PrefetchHooks Function()>;
typedef $$TodayMissionsCacheTableCreateCompanionBuilder
    = TodayMissionsCacheCompanion Function({
  Value<int> id,
  required String responseJson,
  required DateTime fetchedAt,
});
typedef $$TodayMissionsCacheTableUpdateCompanionBuilder
    = TodayMissionsCacheCompanion Function({
  Value<int> id,
  Value<String> responseJson,
  Value<DateTime> fetchedAt,
});

class $$TodayMissionsCacheTableFilterComposer
    extends Composer<_$AppDatabase, $TodayMissionsCacheTable> {
  $$TodayMissionsCacheTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnFilters(column));

  ColumnFilters<String> get responseJson => $composableBuilder(
      column: $table.responseJson, builder: (column) => ColumnFilters(column));

  ColumnFilters<DateTime> get fetchedAt => $composableBuilder(
      column: $table.fetchedAt, builder: (column) => ColumnFilters(column));
}

class $$TodayMissionsCacheTableOrderingComposer
    extends Composer<_$AppDatabase, $TodayMissionsCacheTable> {
  $$TodayMissionsCacheTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
      column: $table.id, builder: (column) => ColumnOrderings(column));

  ColumnOrderings<String> get responseJson => $composableBuilder(
      column: $table.responseJson,
      builder: (column) => ColumnOrderings(column));

  ColumnOrderings<DateTime> get fetchedAt => $composableBuilder(
      column: $table.fetchedAt, builder: (column) => ColumnOrderings(column));
}

class $$TodayMissionsCacheTableAnnotationComposer
    extends Composer<_$AppDatabase, $TodayMissionsCacheTable> {
  $$TodayMissionsCacheTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get responseJson => $composableBuilder(
      column: $table.responseJson, builder: (column) => column);

  GeneratedColumn<DateTime> get fetchedAt =>
      $composableBuilder(column: $table.fetchedAt, builder: (column) => column);
}

class $$TodayMissionsCacheTableTableManager extends RootTableManager<
    _$AppDatabase,
    $TodayMissionsCacheTable,
    TodayMissionsCacheData,
    $$TodayMissionsCacheTableFilterComposer,
    $$TodayMissionsCacheTableOrderingComposer,
    $$TodayMissionsCacheTableAnnotationComposer,
    $$TodayMissionsCacheTableCreateCompanionBuilder,
    $$TodayMissionsCacheTableUpdateCompanionBuilder,
    (
      TodayMissionsCacheData,
      BaseReferences<_$AppDatabase, $TodayMissionsCacheTable,
          TodayMissionsCacheData>
    ),
    TodayMissionsCacheData,
    PrefetchHooks Function()> {
  $$TodayMissionsCacheTableTableManager(
      _$AppDatabase db, $TodayMissionsCacheTable table)
      : super(TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$TodayMissionsCacheTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$TodayMissionsCacheTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$TodayMissionsCacheTableAnnotationComposer(
                  $db: db, $table: table),
          updateCompanionCallback: ({
            Value<int> id = const Value.absent(),
            Value<String> responseJson = const Value.absent(),
            Value<DateTime> fetchedAt = const Value.absent(),
          }) =>
              TodayMissionsCacheCompanion(
            id: id,
            responseJson: responseJson,
            fetchedAt: fetchedAt,
          ),
          createCompanionCallback: ({
            Value<int> id = const Value.absent(),
            required String responseJson,
            required DateTime fetchedAt,
          }) =>
              TodayMissionsCacheCompanion.insert(
            id: id,
            responseJson: responseJson,
            fetchedAt: fetchedAt,
          ),
          withReferenceMapper: (p0) => p0
              .map((e) => (
                    e.readTable<$TodayMissionsCacheTable,
                        TodayMissionsCacheData>(table),
                    BaseReferences<_$AppDatabase, $TodayMissionsCacheTable,
                        TodayMissionsCacheData>(db, table, e)
                  ))
              .toList(),
          prefetchHooksCallback: null,
        ));
}

typedef $$TodayMissionsCacheTableProcessedTableManager = ProcessedTableManager<
    _$AppDatabase,
    $TodayMissionsCacheTable,
    TodayMissionsCacheData,
    $$TodayMissionsCacheTableFilterComposer,
    $$TodayMissionsCacheTableOrderingComposer,
    $$TodayMissionsCacheTableAnnotationComposer,
    $$TodayMissionsCacheTableCreateCompanionBuilder,
    $$TodayMissionsCacheTableUpdateCompanionBuilder,
    (
      TodayMissionsCacheData,
      BaseReferences<_$AppDatabase, $TodayMissionsCacheTable,
          TodayMissionsCacheData>
    ),
    TodayMissionsCacheData,
    PrefetchHooks Function()>;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$PendingGpsPositionsTableTableManager get pendingGpsPositions =>
      $$PendingGpsPositionsTableTableManager(_db, _db.pendingGpsPositions);
  $$PendingValidationsTableTableManager get pendingValidations =>
      $$PendingValidationsTableTableManager(_db, _db.pendingValidations);
  $$PendingFuelRecordsTableTableManager get pendingFuelRecords =>
      $$PendingFuelRecordsTableTableManager(_db, _db.pendingFuelRecords);
  $$TodayMissionsCacheTableTableManager get todayMissionsCache =>
      $$TodayMissionsCacheTableTableManager(_db, _db.todayMissionsCache);
}
