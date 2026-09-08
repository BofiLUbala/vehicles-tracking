import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/widgets/app_text_field.dart';
import '../../../shared/widgets/big_button.dart';
import '../application/auth_notifier.dart';

/// Écran 2 — Connexion par téléphone (E.164, ex. +243999000000).
class LoginPhoneScreen extends ConsumerStatefulWidget {
  const LoginPhoneScreen({super.key});

  @override
  ConsumerState<LoginPhoneScreen> createState() => _LoginPhoneScreenState();
}

class _LoginPhoneScreenState extends ConsumerState<LoginPhoneScreen> {
  final _controller = TextEditingController(text: '+243');
  static final _e164 = RegExp(r'^\+[1-9]\d{7,14}$');

  String? _localError;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final phone = _controller.text.trim();
    if (!_e164.hasMatch(phone)) {
      setState(() {
        _localError =
            "Entrez un numéro valide au format international, ex. +243999000000";
      });
      return;
    }
    setState(() => _localError = null);

    final ok = await ref.read(authNotifierProvider.notifier).requestOtp(phone);
    if (ok && mounted) {
      context.go('/otp');
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authNotifierProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Connexion')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Entrez votre numéro de téléphone',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              const Text(
                "Un code de vérification vous sera envoyé par WhatsApp.",
              ),
              const SizedBox(height: 32),
              AppTextField(
                label: 'Numéro de téléphone',
                controller: _controller,
                hintText: '+243999000000',
                keyboardType: TextInputType.phone,
                errorText: _localError ?? authState.errorMessage,
              ),
              const SizedBox(height: 32),
              BigButton(
                label: 'Recevoir le code',
                isLoading: authState.isSubmitting,
                onPressed: _submit,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
