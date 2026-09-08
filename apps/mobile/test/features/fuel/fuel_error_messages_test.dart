import 'package:flutter_test/flutter_test.dart';
import 'package:tracking_vehicles_mobile/features/fuel/application/fuel_error_messages.dart';

void main() {
  test('maps MISSING_PHOTO to a French message containing "Photo manquante"',
      () {
    expect(
      frenchMessageForFuelErrorCode('MISSING_PHOTO'),
      contains('Photo manquante'),
    );
  });

  test('maps LOCATION_UNAVAILABLE to a French message containing '
      '"position GPS"', () {
    expect(
      frenchMessageForFuelErrorCode('LOCATION_UNAVAILABLE'),
      contains('position GPS'),
    );
  });

  test('maps INVALID_VEHICLE to a French message containing "véhicule"', () {
    expect(
      frenchMessageForFuelErrorCode('INVALID_VEHICLE').toLowerCase(),
      contains('véhicule'),
    );
  });

  test('maps NETWORK_ERROR to a French message containing "Connexion '
      'impossible"', () {
    expect(
      frenchMessageForFuelErrorCode('NETWORK_ERROR'),
      contains('Connexion impossible'),
    );
  });

  test('unknown error code falls back to server message when provided', () {
    expect(
      frenchMessageForFuelErrorCode('SOME_UNKNOWN_CODE', 'Message serveur'),
      'Message serveur',
    );
  });

  test('unknown error code falls back to generic French message when no '
      'server message', () {
    expect(
      frenchMessageForFuelErrorCode('SOME_UNKNOWN_CODE'),
      contains('Une erreur est survenue'),
    );
  });

  test('null error code falls back to generic French message', () {
    expect(frenchMessageForFuelErrorCode(null), contains('Une erreur est survenue'));
  });

  test('empty fallback string is treated as absent', () {
    expect(
      frenchMessageForFuelErrorCode('SOME_UNKNOWN_CODE', ''),
      contains('Une erreur est survenue'),
    );
  });
}
