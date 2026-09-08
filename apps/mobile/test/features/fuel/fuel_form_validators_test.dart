import 'package:flutter_test/flutter_test.dart';
import 'package:tracking_vehicles_mobile/features/fuel/application/fuel_form_validators.dart';

void main() {
  group('validateLiters/validateTotalCost/validateOdometer', () {
    for (final entry in {
      'validateLiters': validateLiters,
      'validateTotalCost': validateTotalCost,
      'validateOdometer': validateOdometer,
    }.entries) {
      final validator = entry.value;

      test('${entry.key} rejects an empty value', () {
        expect(validator(''), 'Ce champ est obligatoire.');
        expect(validator(null), 'Ce champ est obligatoire.');
        expect(validator('   '), 'Ce champ est obligatoire.');
      });

      test('${entry.key} rejects a non-numeric value', () {
        expect(validator('abc'), 'Entrez un nombre valide.');
      });

      test('${entry.key} rejects zero and negative values', () {
        expect(validator('0'), isNotNull);
        expect(validator('-5'), isNotNull);
      });

      test('${entry.key} accepts a positive value with comma or dot', () {
        expect(validator('45.5'), isNull);
        expect(validator('45,5'), isNull);
      });
    }
  });

  group('validateVehicleId', () {
    test('rejects an empty value', () {
      expect(validateVehicleId(''), isNotNull);
      expect(validateVehicleId(null), isNotNull);
      expect(validateVehicleId('   '), isNotNull);
    });

    test('accepts a non-empty value', () {
      expect(validateVehicleId('veh-1'), isNull);
    });
  });
}
