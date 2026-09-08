/// Validateurs purs du formulaire de déclaration de plein (écran 12) —
/// fonctions testées exhaustivement, indépendantes de Flutter/Riverpod.
library;

/// Valide un texte censé représenter un nombre strictement positif (litres,
/// coût total, kilométrage). Renvoie `null` si valide, sinon le message
/// d'erreur français à afficher sous le champ.
String? validatePositiveNumber(String? text, {required String fieldLabel}) {
  if (text == null || text.trim().isEmpty) {
    return 'Ce champ est obligatoire.';
  }
  final value = double.tryParse(text.trim().replaceAll(',', '.'));
  if (value == null) {
    return 'Entrez un nombre valide.';
  }
  if (value <= 0) {
    return '$fieldLabel doit être supérieur à 0.';
  }
  return null;
}

String? validateLiters(String? text) =>
    validatePositiveNumber(text, fieldLabel: 'La quantité');

String? validateTotalCost(String? text) =>
    validatePositiveNumber(text, fieldLabel: 'Le coût total');

String? validateOdometer(String? text) =>
    validatePositiveNumber(text, fieldLabel: 'Le kilométrage');

String? validateVehicleId(String? text) {
  if (text == null || text.trim().isEmpty) {
    return 'Sélectionnez ou saisissez le véhicule.';
  }
  return null;
}
