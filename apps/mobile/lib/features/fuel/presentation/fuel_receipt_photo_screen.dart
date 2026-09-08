import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/widgets/photo_capture_view.dart';
import '../application/fuel_flow_notifier.dart';

/// Écran 12 — étape 2 : photo du reçu de la station-service.
class FuelReceiptPhotoScreen extends ConsumerWidget {
  const FuelReceiptPhotoScreen({super.key, required this.vehicleId});

  final String vehicleId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Photo du reçu')),
      body: PhotoCaptureView(
        instructions: 'Photographiez le reçu de la station-service.',
        onConfirmed: (path) {
          ref.read(fuelFlowProvider(vehicleId).notifier).onReceiptPhotoTaken(path);
          context.push('/fuel/$vehicleId/odometer-photo');
        },
      ),
    );
  }
}
