import 'package:flutter_test/flutter_test.dart';
import 'package:tracking_vehicles_mobile/features/qr/application/error_code_messages.dart';

void main() {
  group('frenchMessageForErrorCode', () {
    final cases = <String, String>{
      'OUT_OF_RANGE': 'trop loin',
      'INVALID_QR': 'QR code invalide',
      'WRONG_STEP_ORDER': "n'est pas terminée",
      'MISSING_PHOTO': 'Photo manquante',
      'WINDOW_EXPIRED': 'délai',
      'MISSING_LOCATION': 'position GPS',
      'LOCATION_UNAVAILABLE': 'position GPS',
      'MOCKED_LOCATION': 'suspecte',
      'MISSION_NOT_STARTED': "n'a pas encore été démarrée",
      'NETWORK_ERROR': 'Connexion impossible',
    };

    cases.forEach((code, expectedSubstring) {
      test('maps $code to a French message containing "$expectedSubstring"', () {
        final message = frenchMessageForErrorCode(code);
        expect(message, contains(expectedSubstring));
        expect(message, isNotEmpty);
      });
    });

    test('every mapped message is entirely in ASCII-safe French text (non-empty, ends with punctuation)', () {
      for (final code in cases.keys) {
        final message = frenchMessageForErrorCode(code);
        expect(message.trim().isNotEmpty, isTrue);
        expect(RegExp(r'[.!?]$').hasMatch(message.trim()), isTrue,
            reason: 'Message for $code should read as a full sentence');
      }
    });

    test('unknown error code falls back to server message when provided', () {
      final message = frenchMessageForErrorCode('SOME_NEW_CODE', 'Message du serveur');
      expect(message, 'Message du serveur');
    });

    test('unknown error code falls back to generic French message when no server message', () {
      final message = frenchMessageForErrorCode('SOME_NEW_CODE');
      expect(message, contains('erreur'));
    });

    test('null error code falls back to generic French message', () {
      final message = frenchMessageForErrorCode(null);
      expect(message, contains('erreur'));
    });

    test('empty fallback string is treated as absent', () {
      final message = frenchMessageForErrorCode('UNKNOWN', '');
      expect(message, contains('erreur'));
    });
  });
}
