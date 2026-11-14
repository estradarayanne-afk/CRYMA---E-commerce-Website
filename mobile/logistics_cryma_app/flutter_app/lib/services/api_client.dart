import 'dart:convert';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import 'token_storage.dart';

class ApiClient {
  final String baseUrl;
  final Duration timeout;
  final TokenStorage tokenStorage;

  ApiClient({String? baseUrl, Duration? timeout, TokenStorage? tokenStorage})
    : baseUrl = baseUrl ?? AppConfig.apiBaseUrl,
      timeout = timeout ?? AppConfig.defaultTimeout,
      tokenStorage = tokenStorage ?? TokenStorage();

  Future<Map<String, String>> _getHeaders({bool includeAuth = true}) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (includeAuth) {
      final token = await tokenStorage.getToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  Future<T> get<T>(
    String endpoint, {
    T Function(Map<String, dynamic>)? dataDecoder,
    bool includeAuth = true,
  }) async {
    final url = Uri.parse('$baseUrl$endpoint');
    final headers = await _getHeaders(includeAuth: includeAuth);
    final response = await http.get(url, headers: headers).timeout(timeout);
    return _handleResponse(response, dataDecoder);
  }

  Future<T> post<T>(
    String endpoint, {
    Map<String, dynamic>? body,
    T Function(Map<String, dynamic>)? dataDecoder,
    bool includeAuth = true,
  }) async {
    final url = Uri.parse('$baseUrl$endpoint');
    final headers = await _getHeaders(includeAuth: includeAuth);
    final response = await http
        .post(url, headers: headers, body: jsonEncode(body))
        .timeout(timeout);
    return _handleResponse(response, dataDecoder);
  }

  Future<T> postMultipart<T>(
    String endpoint, {
    Map<String, String>? fields,
    Map<String, String>? files,
    T Function(Map<String, dynamic>)? dataDecoder,
    bool includeAuth = true,
  }) async {
    final url = Uri.parse('$baseUrl$endpoint');
    final headers = await _getHeaders(includeAuth: includeAuth)
      ..remove('Content-Type');
    final request = http.MultipartRequest('POST', url);
    request.headers.addAll(headers);
    if (fields != null) request.fields.addAll(fields);
    if (files != null) {
      for (final entry in files.entries) {
        final file = await http.MultipartFile.fromPath(entry.key, entry.value);
        request.files.add(file);
      }
    }
    final streamed = await request.send().timeout(timeout);
    final response = await http.Response.fromStream(streamed);
    return _handleResponse(response, dataDecoder);
  }

  Future<T> put<T>(
    String endpoint, {
    Map<String, dynamic>? body,
    T Function(Map<String, dynamic>)? dataDecoder,
    bool includeAuth = true,
  }) async {
    final url = Uri.parse('$baseUrl$endpoint');
    final headers = await _getHeaders(includeAuth: includeAuth);
    final response = await http
        .put(url, headers: headers, body: jsonEncode(body))
        .timeout(timeout);
    return _handleResponse(response, dataDecoder);
  }

  Future<T> patch<T>(
    String endpoint, {
    Map<String, dynamic>? body,
    T Function(Map<String, dynamic>)? dataDecoder,
    bool includeAuth = true,
  }) async {
    final url = Uri.parse('$baseUrl$endpoint');
    final headers = await _getHeaders(includeAuth: includeAuth);
    final response = await http
        .patch(url, headers: headers, body: jsonEncode(body))
        .timeout(timeout);
    return _handleResponse(response, dataDecoder);
  }

  Future<T> delete<T>(
    String endpoint, {
    T Function(Map<String, dynamic>)? dataDecoder,
    bool includeAuth = true,
  }) async {
    final url = Uri.parse('$baseUrl$endpoint');
    final headers = await _getHeaders(includeAuth: includeAuth);
    final response = await http.delete(url, headers: headers).timeout(timeout);
    return _handleResponse(response, dataDecoder);
  }

  T _handleResponse<T>(
    http.Response response,
    T Function(Map<String, dynamic>)? dataDecoder,
  ) {
    final statusCode = response.statusCode;
    try {
      final jsonBody = jsonDecode(response.body) as Map<String, dynamic>;
      if (statusCode >= 200 && statusCode < 300) {
        if (dataDecoder != null) return dataDecoder(jsonBody);
        return jsonBody as T;
      } else if (statusCode == 401) {
        throw ApiException(
          statusCode: statusCode,
          code: 'UNAUTHORIZED',
          message: 'Your session has expired. Please login again.',
          details: jsonBody,
        );
      } else if (statusCode == 403) {
        throw ApiException(
          statusCode: statusCode,
          code: 'FORBIDDEN',
          message: jsonBody['message'] as String? ?? 'Access forbidden',
          details: jsonBody,
        );
      } else if (statusCode >= 400 && statusCode < 500) {
        throw ApiException(
          statusCode: statusCode,
          code: jsonBody['code'] as String?,
          message: jsonBody['message'] as String? ?? 'Client error',
          details: jsonBody,
        );
      } else if (statusCode >= 500) {
        throw ApiException(
          statusCode: statusCode,
          code: 'SERVER_ERROR',
          message: 'Server error. Please try again later.',
          details: jsonBody,
        );
      } else {
        throw ApiException(
          statusCode: statusCode,
          code: 'UNKNOWN_ERROR',
          message: 'An unknown error occurred',
          details: jsonBody,
        );
      }
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(
        statusCode: response.statusCode,
        code: 'PARSE_ERROR',
        message: 'Failed to parse response: ${response.body}',
      );
    }
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String? code;
  final String message;
  final Map<String, dynamic>? details;

  ApiException({
    required this.statusCode,
    this.code,
    required this.message,
    this.details,
  });

  @override
  String toString() => 'ApiException($statusCode): $message';

  bool get isUnauthorized => statusCode == 401;
  bool get isForbidden => statusCode == 403;
  bool get isNotFound => statusCode == 404;
  bool get isServerError => statusCode >= 500;

  String get userMessage {
    final errors = details?['errors'];
    if (errors is Map<String, dynamic> && errors.isNotEmpty) {
      final first = errors.values.first;
      if (first is List && first.isNotEmpty) return first.first.toString();
    }
    if (details != null && details!['message'] != null) {
      return details!['message'] as String;
    }
    return message;
  }
}
