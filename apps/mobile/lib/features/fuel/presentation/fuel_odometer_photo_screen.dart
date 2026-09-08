import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/widgets/photo_capture_view.dart';
import '../application/fuel_flow_notifier.dart';

/// Écran 12 — étape 3 : photo du compteur kilométrique. Après confirmation,
/// déclenche la soumission (métadonnées + les deux photos) et enchaîne vers
/// l'écran de résultat.
class FuelOdometerPhotoScreen extends ConsumerStatefulWidget {
  const FuelOdometerPhotoScreen({super.key, required this.vehicleId});

  final String vehicleId;

  @override
  ConsumerState<FuelOdometerPhotoScreen> createState() =>
      _FuelOdometerPhotoScreenState();
}

class _FuelOdometerPhotoScreenState
    extends ConsumerState<FuelOdometerPhotoScreen> {
  bool _submitting = false;

  Future<void> _confirm(String path) async {
    setState(() => _submitting = true);
    final notifier = ref.read(fuelFlowProvider(widget.vehicleId).notifier);
    notifier.onOdometerPhotoTaken(path);
    await notifier.submit();
    if (mounted) {
      context.push('/fuel/${widget.vehicleId}/result');
      setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Photo du compteur')),
      body: PhotoCaptureView(
        instructions: 'Photographiez le compteur kilométrique du véhicule.',
        isConfirming: _submitting,
        onConfirmed: _confirm,
      ),
    );
  }
}
