import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';

/// Adaptateur Dio minimal pour les tests : ne fait aucun appel réseau réel,
/// délègue à [handler] qui décide de la réponse à renvoyer en fonction du
/// chemin appelé.
class FakeHttpClientAdapter implements HttpClientAdapter {
  FakeHttpClientAdapter(this.handler);

  final FakeResponse Function(RequestOptions options) handler;

  final List<RequestOptions> requests = [];

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    final response = handler(options);
    final bytes = utf8.encode(jsonEncode(response.data));
    return ResponseBody.fromBytes(
      bytes,
      response.statusCode,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }
}

class FakeResponse {
  const FakeResponse({required this.statusCode, required this.data});

  final int statusCode;

  /// Corps de la réponse, encodé en JSON tel quel — peut être une [Map]
  /// (objet JSON) ou une [List] (tableau JSON), selon l'endpoint simulé.
  final dynamic data;
}
