import 'dart:io';

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';

import 'big_button.dart';
import 'error_view.dart';
import 'loading_view.dart';

/// Vue générique de capture photo : aperçu caméra en direct, prise de vue,
/// "Reprendre"/"Confirmer". Extraite de l'écran de photo de preuve QR
/// (Phase 2) pour être réutilisée partout où l'app a besoin d'une preuve
/// photo (validation d'étape, déclaration de plein — écran 12).
///
/// Ne fait aucun appel réseau ni logique métier : [onConfirmed] reçoit
/// simplement le chemin local du fichier capturé, l'appelant décide de la
/// suite (soumission immédiate, passage à une deuxième photo, etc.).
class PhotoCaptureView extends StatefulWidget {
  const PhotoCaptureView({
    super.key,
    required this.onConfirmed,
    this.instructions,
    this.captureLabel = 'Prendre la photo',
    this.confirmLabel = 'Confirmer',
    this.isConfirming = false,
  });

  final ValueChanged<String> onConfirmed;

  /// Texte optionnel affiché au-dessus de l'aperçu caméra (ex. "Photographiez
  /// le reçu de la station-service").
  final String? instructions;
  final String captureLabel;
  final String confirmLabel;

  /// `true` pendant qu'une soumission déclenchée par [onConfirmed] est en
  /// cours côté appelant — désactive le bouton "Confirmer" et affiche son
  /// indicateur de chargement.
  final bool isConfirming;

  @override
  State<PhotoCaptureView> createState() => _PhotoCaptureViewState();
}

class _PhotoCaptureViewState extends State<PhotoCaptureView> {
  CameraController? _controller;
  Future<void>? _initFuture;
  String? _capturedPath;
  String? _error;

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
      if (!mounted) return;
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

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return ErrorView(message: _error!);
    }
    return FutureBuilder<void>(
      future: _initFuture,
      builder: (context, snapshot) {
        if (_controller == null) {
          return const LoadingView(message: 'Ouverture de la caméra…');
        }
        return _capturedPath != null
            ? _buildPreview(_capturedPath!)
            : _buildLiveCamera(_controller!);
      },
    );
  }

  Widget _buildLiveCamera(CameraController controller) {
    return Column(
      children: [
        if (widget.instructions != null)
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              widget.instructions!,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
          ),
        Expanded(child: CameraPreview(controller)),
        Padding(
          padding: const EdgeInsets.all(20),
          child: BigButton(
            label: widget.captureLabel,
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
                  onPressed: widget.isConfirming ? null : _retake,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: BigButton(
                  label: widget.confirmLabel,
                  isLoading: widget.isConfirming,
                  onPressed: () => widget.onConfirmed(path),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
