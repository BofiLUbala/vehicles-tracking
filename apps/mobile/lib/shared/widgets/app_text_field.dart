import 'package:flutter/material.dart';

/// Champ de saisie standard, texte large, peu de fioritures — conforme à la
/// contrainte "peu de saisies, textes lisibles".
class AppTextField extends StatelessWidget {
  const AppTextField({
    super.key,
    required this.label,
    this.controller,
    this.hintText,
    this.keyboardType,
    this.errorText,
    this.autofocus = false,
    this.maxLength,
    this.textAlign = TextAlign.start,
    this.onChanged,
  });

  final String label;
  final TextEditingController? controller;
  final String? hintText;
  final TextInputType? keyboardType;
  final String? errorText;
  final bool autofocus;
  final int? maxLength;
  final TextAlign textAlign;
  final ValueChanged<String>? onChanged;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          autofocus: autofocus,
          maxLength: maxLength,
          textAlign: textAlign,
          style: const TextStyle(fontSize: 22, letterSpacing: 1.5),
          onChanged: onChanged,
          decoration: InputDecoration(
            hintText: hintText,
            errorText: errorText,
            counterText: '',
          ),
        ),
      ],
    );
  }
}
