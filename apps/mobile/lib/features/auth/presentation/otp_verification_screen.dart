import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/big_button.dart';
import '../application/auth_notifier.dart';

/// Écran 3 — Vérification du code OTP reçu par WhatsApp.
///
/// Comprend : saisie à 6 chiffres, compte à rebours avant renvoi possible,
/// et affichage des erreurs (code incorrect / expiré).
class OtpVerificationScreen extends ConsumerStatefulWidget {
  const OtpVerificationScreen({super.key});

  @override
  ConsumerState<OtpVerificationScreen> createState() =>
      _OtpVerificationScreenState();
}

class _OtpVerificationScreenState
    extends ConsumerState<OtpVerificationScreen> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final code = _controller.text.trim();
    if (code.length != 6) return;
    final ok = await ref.read(authNotifierProvider.notifier).verifyOtp(code);
    if (ok && mounted) {
      context.go('/gps-permission');
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);
    final cooldown = authState.resendCooldownSeconds;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Vérification'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () =>
              ref.read(authNotifierProvider.notifier).resetToPhoneEntry(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Code envoyé par WhatsApp',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Text('Numéro : ${authState.identifier ?? ''}'),
              const SizedBox(height: 32),
              AppTextField(
                label: 'Code à 6 chiffres',
                controller: _controller,
                keyboardType: TextInputType.number,
                maxLength: 6,
                autofocus: true,
                textAlign: TextAlign.center,
                errorText: authState.errorMessage,
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 32),
              BigButton(
                label: 'Valider',
                isLoading: authState.isSubmitting,
                onPressed:
                    _controller.text.trim().length == 6 ? _submit : null,
              ),
              const SizedBox(height: 24),
              Center(
                child: cooldown > 0
                    ? Text('Renvoyer le code dans ${cooldown}s')
                    : TextButton(
                        onPressed: () =>
                            ref.read(authNotifierProvider.notifier).resendOtp(),
                        child: const Text('Renvoyer le code'),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
