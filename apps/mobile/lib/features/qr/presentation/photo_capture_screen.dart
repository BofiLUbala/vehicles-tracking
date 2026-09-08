import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/widgets/photo_capture_view.dart';
import '../application/qr_flow_notifier.dart';

/// Écran 10 — Capture photo (preuve de collecte/dépôt) : aperçu, reprendre,
/// confirmer. Après confirmation, déclenche la validation (GPS + QR +
/// photo) auprès de l'API et enchaîne vers l'écran de résultat.
class PhotoCaptureScreen extends ConsumerStatefulWidget {
  const PhotoCaptureScreen({
    super.key,
    required this.missionId,
    required this.stepId,
  });

  final String missionId;
  final String stepId;

  @override
  ConsumerState<PhotoCaptureScreen> createState() =>
      _PhotoCaptureScreenState();
}

class _PhotoCaptureScreenState extends ConsumerState<PhotoCaptureScreen> {
  bool _submitting = false;

  Future<void> _confirm(String path) async {
    setState(() => _submitting = true);
    final args = (missionId: widget.missionId, stepId: widget.stepId);
    final notifier = ref.read(qrFlowProvider(args).notifier);
    notifier.onPhotoTaken(path);
    await notifier.submit();
    if (mounted) {
      context.push(
        '/missions/${widget.missionId}/steps/${widget.stepId}/result',
      );
      setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Photo de preuve')),
      body: PhotoCaptureView(
        isConfirming: _submitting,
        onConfirmed: _confirm,
      ),
    );
  }
}
