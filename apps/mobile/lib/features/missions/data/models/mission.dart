import 'mission_step.dart';

/// Une mission du jour assignée au chauffeur (`GET /mobile/missions/today`,
/// `GET /mobile/missions/:id`).
class Mission {
  const Mission({
    required this.id,
    required this.status,
    required this.plannedStart,
    required this.plannedEnd,
    required this.steps,
  });

  final String id;
  final String status;
  final DateTime? plannedStart;
  final DateTime? plannedEnd;
  final List<MissionStep> steps;

  /// Première étape non terminée, ou `null` si toutes sont terminées.
  MissionStep? get currentStep {
    for (final step in steps) {
      if (!step.isCompleted) return step;
    }
    return null;
  }

  int get completedStepsCount => steps.where((s) => s.isCompleted).length;

  factory Mission.fromJson(Map<String, dynamic> json) {
    final stepsJson = (json['steps'] as List?) ?? const [];
    final steps = stepsJson
        .map((e) => MissionStep.fromJson((e as Map).cast<String, dynamic>()))
        .toList()
      ..sort((a, b) => a.order.compareTo(b.order));

    return Mission(
      id: json['id'].toString(),
      status: (json['status'] ?? 'PENDING').toString(),
      plannedStart: json['plannedStart'] != null
          ? DateTime.tryParse(json['plannedStart'].toString())
          : null,
      plannedEnd: json['plannedEnd'] != null
          ? DateTime.tryParse(json['plannedEnd'].toString())
          : null,
      steps: steps,
    );
  }
}
