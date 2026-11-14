import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode, this.data});

  final String message;
  final int? statusCode;
  final Map<String, dynamic>? data;

  @override
  String toString() => message;
}

abstract interface class TokenStore {
  Future<String?> read();
  Future<void> write(String token);
  Future<void> delete();
}

class SecureTokenStore implements TokenStore {
  SecureTokenStore([FlutterSecureStorage? storage])
      : _storage = storage ?? const FlutterSecureStorage();

  static const _key = 'cryma_api_token';
  final FlutterSecureStorage _storage;

  @override
  Future<String?> read() => _storage.read(key: _key);

  @override
  Future<void> write(String token) => _storage.write(key: _key, value: token);

  @override
  Future<void> delete() => _storage.delete(key: _key);
}

class ApiClient {
  ApiClient({
    http.Client? httpClient,
    TokenStore? tokenStore,
    String? baseUrl,
  })  : _httpClient = httpClient ?? http.Client(),
        _tokenStore = tokenStore ?? SecureTokenStore(),
        _baseUri = _parseBaseUri(baseUrl ?? _defaultBaseUrl);

  static const _defaultBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://127.0.0.1:8000/api',
  );

  static final instance = ApiClient();

  final http.Client _httpClient;
  final TokenStore _tokenStore;
  final Uri _baseUri;

  static Uri _parseBaseUri(String value) {
    final normalized = value.endsWith('/') ? value : '$value/';
    final uri = Uri.parse(normalized);
    if (!uri.hasScheme || uri.host.isEmpty) {
      throw ArgumentError.value(value, 'baseUrl', 'Must be an absolute URL.');
    }
    return uri;
  }

  Uri _uri(String path) =>
      _baseUri.resolve(path.replaceFirst(RegExp(r'^/+'), ''));

  Future<String?> readToken() => _tokenStore.read();

  Future<void> saveToken(String token) => _tokenStore.write(token);

  Future<void> clearToken() => _tokenStore.delete();

  Future<Map<String, dynamic>> get(String path) =>
      _sendJson('GET', path);

  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? body,
    bool authenticated = true,
    String? tokenOverride,
  }) =>
      _sendJson(
        'POST',
        path,
        body: body,
        authenticated: authenticated,
        tokenOverride: tokenOverride,
      );

  Future<Map<String, dynamic>> patch(
    String path, {
    required Map<String, dynamic> body,
  }) =>
      _sendJson('PATCH', path, body: body);

  Future<Map<String, dynamic>> postMultipart(
    String path, {
    required Map<String, String> fields,
    required String fileField,
    required String filePath,
  }) =>
      postMultipartFiles(
        path,
        fields: fields,
        files: {fileField: filePath},
      );

  Future<Map<String, dynamic>> postMultipartFiles(
    String path, {
    required Map<String, String> fields,
    required Map<String, String> files,
    bool authenticated = true,
  }) async {
    final request = http.MultipartRequest('POST', _uri(path))
      ..headers['Accept'] = 'application/json'
      ..fields.addAll(fields);
    if (authenticated) {
      final token = await _tokenStore.read();
      if (token != null && token.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer $token';
      }
    }

    try {
      for (final entry in files.entries) {
        request.files.add(
          await http.MultipartFile.fromPath(entry.key, entry.value),
        );
      }
      final streamed = await _httpClient
          .send(request)
          .timeout(const Duration(seconds: 30));
      final response = await http.Response.fromStream(streamed)
          .timeout(const Duration(seconds: 30));
      return _decode(response);
    } on TimeoutException {
      throw const ApiException('The request timed out. Please try again.');
    } on SocketException {
      throw const ApiException(
        'Could not connect to the CRYMA server. Check your connection and try again.',
      );
    } on http.ClientException {
      throw const ApiException(
        'Could not connect to the CRYMA server. Check your connection and try again.',
      );
    }
  }

  Future<Map<String, dynamic>> _sendJson(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool authenticated = true,
    String? tokenOverride,
  }) async {
    final headers = <String, String>{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (authenticated) {
      final token = tokenOverride ?? await _tokenStore.read();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    } else if (tokenOverride != null && tokenOverride.isNotEmpty) {
      headers['Authorization'] = 'Bearer $tokenOverride';
    }

    final uri = _uri(path);
    final encodedBody = body == null ? null : jsonEncode(body);
    try {
      final response = await switch (method) {
        'GET' => _httpClient.get(uri, headers: headers),
        'POST' => _httpClient.post(uri, headers: headers, body: encodedBody),
        'PATCH' => _httpClient.patch(uri, headers: headers, body: encodedBody),
        _ => throw ArgumentError.value(method, 'method'),
      }.timeout(const Duration(seconds: 20));
      return _decode(response);
    } on TimeoutException {
      throw const ApiException('The request timed out. Please try again.');
    } on SocketException {
      throw const ApiException(
        'Could not connect to the CRYMA server. Check your connection and try again.',
      );
    } on http.ClientException {
      throw const ApiException(
        'Could not connect to the CRYMA server. Check your connection and try again.',
      );
    }
  }

  Map<String, dynamic> _decode(http.Response response) {
    Map<String, dynamic> data = {};
    if (response.body.trim().isNotEmpty) {
      try {
        final decoded = jsonDecode(response.body);
        if (decoded is Map) {
          data = Map<String, dynamic>.from(decoded);
        } else {
          throw const FormatException('Expected a JSON object.');
        }
      } on FormatException {
        throw ApiException(
          'The CRYMA server returned an invalid response.',
          statusCode: response.statusCode,
        );
      }
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      final validationMessage = _validationMessage(data['errors']);
      final message = validationMessage ??
          (data['message'] is String
              ? data['message'] as String
              : 'The request failed (${response.statusCode}).');
      throw ApiException(
        message,
        statusCode: response.statusCode,
        data: data,
      );
    }
    return data;
  }

  String? _validationMessage(dynamic errors) {
    if (errors is! Map) return null;
    for (final value in errors.values) {
      if (value is List && value.isNotEmpty && value.first is String) {
        return value.first as String;
      }
      if (value is String) return value;
    }
    return null;
  }
}
