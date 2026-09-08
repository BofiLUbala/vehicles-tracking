/// Type de carburant déclaré (écran 12, section 14 du cahier des charges).
/// Valeurs alignées sur l'enum Prisma `FuelType`
/// (`apps/api/prisma/schema.prisma`) — ne pas renommer sans mettre à jour
/// les deux côtés.
enum FuelType {
  diesel('DIESEL', 'Diesel'),
  petrol('PETROL', 'Essence'),
  electric('ELECTRIC', 'Électrique'),
  other('OTHER', 'Autre');

  const FuelType(this.apiValue, this.label);

  /// Valeur brute envoyée/reçue de l'API.
  final String apiValue;

  /// Libellé affiché au chauffeur.
  final String label;

  static FuelType fromApiValue(String value) {
    return FuelType.values.firstWhere(
      (t) => t.apiValue == value,
      orElse: () => FuelType.other,
    );
  }
}
