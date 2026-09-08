import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/widgets/big_button.dart';
import '../../../shared/widgets/error_view.dart';
import '../../../shared/widgets/loading_view.dart';
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
  CameraController? _controller;
  Future<void>? _initFuture;
  String? _capturedPath;
  String? _error;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _initFuture = _initCamera();
  }

  Future<void> _initCamera() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        setState(() => _error = 'Aucune caméra disponible sur cet appareil.');
        return;
      }
      final camera = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );
      final controller = CameraController(
        camera,
        ResolutionPreset.medium,
        enableAudio: false,
      );
      await controller.initialize();
      if (!mounted) return;
      setState(() => _controller = controller);
    } catch (e) {
      setState(() => _error = "Impossible d'accéder à la caméra.");
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  Future<void> _takePhoto() async {
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized) return;
    try {
      final file = await controller.takePicture();
      setState(() => _capturedPath = file.path);
    } catch (e) {
      setState(() => _error = "La prise de photo a échoué. Réessayez.");
    }
  }

  void _retake() {
    setState(() => _capturedPath = null);
  }

  Future<void> _confirm() async {
    final path = _capturedPath;
    if (path == null) return;
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
      body: _error != null
          ? ErrorView(message: _error!)
          : FutureBuilder<void>(
              future: _initFuture,
              builder: (context, snapshot) {
                if (_controller == null) {
                  return const LoadingView(message: 'Ouverture de la caméra…');
                }
                return _capturedPath != null
                    ? _buildPreview(_capturedPath!)
                    : _buildLiveCamera(_controller!);
              },
            ),
    );
  }

  Widget _buildLiveCamera(CameraController controller) {
    return Column(
      children: [
        Expanded(child: CameraPreview(controller)),
        Padding(
          padding: const EdgeInsets.all(20),
          child: BigButton(
            label: 'Prendre la photo',
            icon: Icons.camera_alt,
            onPressed: _takePhoto,
          ),
        ),
      ],
    );
  }

  Widget _buildPreview(String path) {
    return Column(
      children: [
        Expanded(child: Image.file(File(path), fit: BoxFit.contain)),
        Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Expanded(
                child: BigButton(
                  label: 'Reprendre',
                  variant: BigButtonVariant.secondary,
                  onPressed: _retake,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: BigButton(
                  label: 'Confirmer',
                  isLoading: _submitting,
                  onPressed: _confirm,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
