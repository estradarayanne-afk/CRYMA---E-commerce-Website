import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  ApiService._();

  static final ApiService instance = ApiService._();
  static const _tokenKey = 'cryma_api_token';
  static const _userKey = 'cryma_api_user';
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.cryma.store',
  );
  static const _timeout = Duration(seconds: 20);

  Uri _uri(String path, [Map<String, String>? query]) {
    final base = Uri.parse(apiBaseUrl);
    final uri = base.resolve(path);
    return query == null ? uri : uri.replace(queryParameters: query);
  }

  Future<Map<String, String>> _headers({bool authenticated = false}) async {
    final headers = <String, String>{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (authenticated) {
      final preferences = await SharedPreferences.getInstance();
      final token = preferences.getString(_tokenKey);
      if (token == null || token.isEmpty) {
        throw const ApiException('Please sign in to continue.');
      }
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, String>? query,
    bool authenticated = false,
  }) async {
    final response = await http
        .get(
          _uri(path, query),
          headers: await _headers(authenticated: authenticated),
        )
        .timeout(_timeout);
    return _decode(response);
  }

  Future<Map<String, dynamic>> post(
    String path, {
    required Map<String, dynamic> body,
    bool authenticated = false,
    String? idempotencyKey,
  }) async {
    final headers = await _headers(authenticated: authenticated);
    if (idempotencyKey != null) headers['Idempotency-Key'] = idempotencyKey;
    final response = await http
        .post(_uri(path), headers: headers, body: jsonEncode(body))
        .timeout(_timeout);
    return _decode(response);
  }

  Future<Map<String, dynamic>> patch(
    String path, {
    required Map<String, dynamic> body,
    bool authenticated = false,
  }) async {
    final headers = await _headers(authenticated: authenticated);
    final response = await http
        .patch(_uri(path), headers: headers, body: jsonEncode(body))
        .timeout(_timeout);
    return _decode(response);
  }

  Future<Map<String, dynamic>?> login(String email, String password) async {
    final response = await post(
      '/api/login',
      body: {'email': email.trim(), 'password': password},
    );
    final token = response['token'];
    final user = response['user'];
    if (token is! String || token.isEmpty || user is! Map<String, dynamic>) {
      throw const ApiException(
        'The server returned an invalid login response.',
      );
    }
    if (user['role'] != 'buyer') {
      throw const ApiException(
        'Please use a buyer account in the shopping app.',
      );
    }

    final preferences = await SharedPreferences.getInstance();
    await preferences.setString(_tokenKey, token);
    await preferences.setString(_userKey, jsonEncode(user));
    return user;
  }

  Future<void> logout() async {
    final preferences = await SharedPreferences.getInstance();
    final token = preferences.getString(_tokenKey);
    if (token != null && token.isNotEmpty) {
      try {
        await post('/api/logout', body: const {}, authenticated: true);
      } finally {
        await preferences.remove(_tokenKey);
        await preferences.remove(_userKey);
      }
    } else {
      await preferences.remove(_userKey);
    }
  }

  Future<Map<String, dynamic>?> restoreBuyerSession() async {
    final preferences = await SharedPreferences.getInstance();
    if (!preferences.containsKey(_tokenKey)) return null;
    try {
      final response = await get('/api/user', authenticated: true);
      final user = response['user'];
      if (user is Map<String, dynamic> && user['role'] == 'buyer') {
        await preferences.setString(_userKey, jsonEncode(user));
        return user;
      }
    } on ApiException catch (error) {
      if (error.statusCode != 401) rethrow;
    }
    await preferences.remove(_tokenKey);
    await preferences.remove(_userKey);
    return null;
  }

  Future<List<Map<String, dynamic>>> getProducts({
    String? search,
    String? category,
  }) async {
    final query = <String, String>{};
    if (search != null && search.trim().isNotEmpty) {
      query['search'] = search.trim();
    }
    if (category != null && category.trim().isNotEmpty && category != 'All') {
      query['category'] = category.trim();
    }
    final response = await get('/api/products', query: query);
    final data = response['data'];
    final rows = data is Map<String, dynamic> ? data['data'] : data;
    if (rows is! List) {
      throw const ApiException('The server returned an invalid product list.');
    }
    return rows.whereType<Map<String, dynamic>>().toList();
  }

  Future<Map<String, dynamic>> getProduct(String id) async {
    final response = await get('/api/products/$id');
    final product = response['data'];
    if (product is! Map<String, dynamic>) {
      throw const ApiException('The server returned an invalid product.');
    }
    return product;
  }

  Future<Map<String, dynamic>> getCheckoutData() async {
    final response = await get('/api/buyer/checkout-data', authenticated: true);
    final data = response['data'];
    if (data is! Map<String, dynamic>) {
      throw const ApiException('The server returned invalid checkout data.');
    }
    return data;
  }

  Future<Map<String, dynamic>> createOrder({
    required int addressId,
    required String deliveryAddress,
    required String paymentMethod,
    required List<Map<String, dynamic>> items,
    required String idempotencyKey,
  }) {
    return post(
      '/api/orders',
      authenticated: true,
      idempotencyKey: idempotencyKey,
      body: {
        'address_id': addressId,
        'delivery_address': deliveryAddress,
        'payment_method': paymentMethod,
        'items': items,
      },
    );
  }

  Future<List<Map<String, dynamic>>> getBuyerOrders() async {
    final response = await get('/api/orders', authenticated: true);
    final page = response['data'];
    final rows = page is Map<String, dynamic> ? page['data'] : page;
    if (rows is! List) {
      throw const ApiException('The server returned an invalid order list.');
    }
    return rows.whereType<Map<String, dynamic>>().toList();
  }

  Future<Map<String, dynamic>> getBuyerOrder(String id) async {
    final response = await get('/api/orders/$id', authenticated: true);
    final order = response['data'];
    if (order is! Map<String, dynamic>) {
      throw const ApiException('The server returned an invalid order.');
    }
    return order;
  }

  Future<void> confirmOrderReceived(String id) async {
    await post(
      '/api/orders/$id/confirm-received',
      body: const {},
      authenticated: true,
    );
  }

  Future<Map<String, dynamic>> register({
    required Map<String, dynamic> fields,
    required String validIdPath,
  }) async {
    final uri = _uri('/api/register');
    final request = http.MultipartRequest('POST', uri)
      ..headers['Accept'] = 'application/json';
    fields.forEach((key, value) {
      if (value != null) request.fields[key] = value.toString();
    });
    request.files.add(await http.MultipartFile.fromPath('valid_id', validIdPath));
    final streamed = await request.send().timeout(_timeout);
    final response = await http.Response.fromStream(streamed);
    return _decode(response);
  }

  Future<Map<String, dynamic>> verifyEmail({
    required String email,
    required String otp,
  }) async {
    return post('/api/verify-email', body: {'email': email, 'otp': otp});
  }

  Future<Map<String, dynamic>> resendVerification(String email) async {
    return post('/api/resend-verification', body: {'email': email});
  }

  String resolveImageUrl(String path) {
    final uri = Uri.tryParse(path);
    if (uri != null && uri.hasScheme) {
      if (uri.host == 'localhost' ||
          uri.host == '127.0.0.1' ||
          uri.host == '0.0.0.0') {
        final base = Uri.parse(apiBaseUrl);
        return base
            .replace(path: uri.path, query: uri.query, fragment: uri.fragment)
            .toString();
      }
      return path;
    }
    return Uri.parse(apiBaseUrl).resolve(path).toString();
  }

  Map<String, dynamic> _decode(http.Response response) {
    Map<String, dynamic> json;
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is! Map<String, dynamic>) {
        throw const FormatException('Expected a JSON object.');
      }
      json = decoded;
    } on FormatException {
      throw ApiException(
        'The server returned an invalid response (${response.statusCode}).',
        statusCode: response.statusCode,
      );
    }
    if (response.statusCode >= 200 && response.statusCode < 300) return json;

    final errors = json['errors'];
    String? validationMessage;
    if (errors is Map<String, dynamic> && errors.isNotEmpty) {
      final first = errors.values.first;
      if (first is List && first.isNotEmpty) {
        validationMessage = first.first.toString();
      }
    }
    throw ApiException(
      validationMessage ?? json['message']?.toString() ?? 'Request failed.',
      statusCode: response.statusCode,
    );
  }
}

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}
