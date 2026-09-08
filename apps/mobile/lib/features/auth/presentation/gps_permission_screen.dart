import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/widgets/big_button.dart';

/// Écran 4 — Autorisations GPS.
///
/// La localisation est indispensable pour valider les étapes de mission
/// (le serveur vérifie la distance au point attendu — section 9/10 du
/// cahier des charges). Cet écran explique pourquoi et déclenche la
/// demande de permission native.
class GpsPermissionScreen extends StatefulWidget {
  const GpsPermissionScreen({super.key});

  @override
  State<GpsPermissionScreen> createState() => _GpsPermissionScreenState();
}

class _GpsPermissionScreenState extends State<GpsPermissionScreen> {
  bool _requesting = false;
  String? _error;

  Future<void> _requestPermission() async {
    setState(() {
      _requesting = true;
      _error = null;
    });

    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() {
          _requesting = false;
          _error =
              "Le GPS est désactivé sur votre téléphone. Activez-le dans les paramètres puis réessayez.";
        });
        return;
      }

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        setState(() {
          _requesting = false;
          _error =
              "Sans autorisation de localisation, vous ne pouvez pas valider vos étapes de mission. Ouvrez les paramètres de l'application pour l'activer.";
        });
        return;
      }

      if (mounted) {
        context.go('/missions');
      }
    } finally {
      if (mounted) setState(() => _requesting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Localisation')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.location_on, size: 64),
              const SizedBox(height: 24),
              Text(
                'Autoriser la localisation',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 16),
              const Text(
                "Nous avons besoin de votre position pour confirmer que "
                "vous êtes bien sur le lieu de collecte ou de dépôt lors "
                "de la validation d'une étape de mission. Votre position "
                "n'est utilisée que pendant vos missions.",
                style: TextStyle(fontSize: 17),
              ),
              if (_error != null) ...[
                const SizedBox(height: 16),
                Text(_error!, style: const TextStyle(color: Colors.red)),
              ],
              const Spacer(),
              BigButton(
                label: 'Autoriser la localisation',
                isLoading: _requesting,
                onPressed: _requestPermission,
              ),
              const SizedBox(height: 12),
              Center(
                child: TextButton(
                  onPressed: () => context.go('/missions'),
                  child: const Text('Plus tard'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
