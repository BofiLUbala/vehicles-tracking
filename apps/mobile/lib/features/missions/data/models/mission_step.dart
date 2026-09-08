/// Point géographique associé à une étape de mission.
class StepLocation {
  const StepLocation({required this.name, required this.lat, required this.lng});

  final String name;
  final double lat;
  final double lng;

  factory StepLocation.fromJson(Map<String, dynamic> json) {
    return StepLocation(
      name: (json['name'] ?? '').toString(),
      lat: (json['lat'] as num?)?.toDouble() ?? 0,
      lng: (json['lng'] as num?)?.toDouble() ?? 0,
    );
  }
}

/// Une étape (collecte ou dépôt) d'une mission, telle que renvoyée par
/// `GET /mobile/missions/today` et `GET /mobile/missions/:id`.
class MissionStep {
  const MissionStep({
    required this.id,
    required this.order,
    required this.actionType,
    required this.location,
    required this.plannedAt,
    required this.toleranceMin,
    required this.allowedRadius,
    required this.status,
  });

  final String id;
  final int order;
  final String actionType;
  final StepLocation location;
  final DateTime? plannedAt;
  final int toleranceMin;
  final double allowedRadius;
  final String status;

  bool get isCompleted =>
      status.toUpperCase() == 'COMPLETED' ||
      status.toUpperCase() == 'DONE' ||
      status.toUpperCase() == 'VALIDATED';

  factory MissionStep.fromJson(Map<String, dynamic> json) {
    return MissionStep(
      id: json['id'].toString(),
      order: (json['order'] as num?)?.toInt() ?? 0,
      actionType: (json['actionType'] ?? '').toString(),
      location: StepLocation.fromJson(
        ((json['location'] as Map?) ?? const {}).cast<String, dynamic>(),
      ),
      plannedAt: json['plannedAt'] != null
          ? DateTime.tryParse(json['plannedAt'].toString())
          : null,
      toleranceMin: (json['toleranceMin'] as num?)?.toInt() ?? 0,
      allowedRadius: (json['allowedRadius'] as num?)?.toDouble() ?? 0,
      status: (json['status'] ?? 'PENDING').toString(),
    );
  }
}
