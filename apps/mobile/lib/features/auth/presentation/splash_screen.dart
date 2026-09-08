import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';

/// Écran de démarrage : affiché pendant que [AuthNotifier] vérifie s'il
/// existe un token stocké. Le routeur redirige automatiquement dès que
/// l'état d'authentification est connu (voir `app_router.dart`).
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      backgroundColor: AppTheme.primary,
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.local_shipping, size: 72, color: Colors.white),
            SizedBox(height: 24),
            Text(
              'Suivi des véhicules',
              style: TextStyle(
                color: Colors.white,
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: 32),
            CircularProgressIndicator(color: Colors.white),
          ],
        ),
      ),
    );
  }
}
