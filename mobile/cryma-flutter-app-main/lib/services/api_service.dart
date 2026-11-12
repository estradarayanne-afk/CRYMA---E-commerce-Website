import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'cart_store.dart';
import 'favorites_store.dart';
import 'push_notification_service.dart';

class ApiService {
  ApiService({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        _baseUrl = baseUrl ?? apiBaseUrl;

  ApiService._() : this();

  static final ApiService instance = ApiService._();
  static final ValueNotifier<int> activeRequests = ValueNotifier<int>(0);
  static const _tokenKey = 'cryma_api_token';
  static const _userKey = 'cryma_api_user';
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.cryma.store',
  );
  static const _timeout = Duration(seconds: 20);
  final http.Client _client;
  final String _baseUrl;

  static Future<T> trackRequest<T>(Future<T> Function() request) async {
    activeRequests.value += 1;
    try {
      return await request();
    } finally {
      activeRequests.value =
          activeRequests.value > 0 ? activeRequests.value - 1 : 0;
    }
  }

  Uri _uri(String path, [Map<String, String>? query]) {
    final base = Uri.parse(_baseUrl);
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
    return trackRequest(() async {
      final response = await _client
          .get(
            _uri(path, query),
            headers: await _headers(authenticated: authenticated),
          )
          .timeout(_timeout);
      return _decode(response);
    });
  }

  Future<Map<String, dynamic>> post(
    String path, {
    required Map<String, dynamic> body,
    bool authenticated = false,
    String? idempotencyKey,
    String? unauthorizedMessage,
  }) async {
    return trackRequest(() async {
      final headers = await _headers(authenticated: authenticated);
      if (idempotencyKey != null) headers['Idempotency-Key'] = idempotencyKey;
      final response = await _client
          .post(_uri(path), headers: headers, body: jsonEncode(body))
          .timeout(_timeout);
      return _decode(response, unauthorizedMessage: unauthorizedMessage);
    });
  }

  Future<Map<String, dynamic>> patch(
    String path, {
    required Map<String, dynamic> body,
    bool authenticated = false,
  }) async {
    return trackRequest(() async {
      final headers = await _headers(authenticated: authenticated);
      final response = await _client
          .patch(_uri(path), headers: headers, body: jsonEncode(body))
          .timeout(_timeout);
      return _decode(response);
    });
  }

  Future<Map<String, dynamic>> updateProfileImage(
    XFile file, {
    required Map<String, String?> fields,
  }) async {
    return trackRequest(() async {
      final request =
          http.MultipartRequest('POST', _uri('/api/account/profile'));
      final headers = await _headers(authenticated: true);
      headers.remove('Content-Type');
      request.headers.addAll(headers);
      request.fields['_method'] = 'PATCH';
      fields.forEach((key, value) {
        if (value != null) request.fields[key] = value;
      });
      request.files
          .add(await http.MultipartFile.fromPath('profile_image', file.path));
      final streamed = await _client.send(request).timeout(_timeout);
      return _decode(await http.Response.fromStream(streamed));
    });
  }

  Future<Uint8List?> getProfileImageBytes() async {
    return trackRequest(() async {
      final response = await _client
          .get(_uri('/api/account/profile-image'),
              headers: await _headers(authenticated: true))
          .timeout(_timeout);
      if (response.statusCode == 404) return null;
      if (response.statusCode < 200 || response.statusCode >= 300) {
        _decode(response);
      }
      return response.bodyBytes;
    });
  }

  Future<Map<String, dynamic>?> login(String email, String password) async {
    late final Map<String, dynamic> response;
    try {
      response = await post(
        '/api/login',
        body: {'email': email.trim(), 'password': password},
        unauthorizedMessage: 'Invalid email or password.',
      );
    } on SocketException {
      throw const ApiException(
        'Cannot connect to CRYMA. Check that your phone and computer are on the same Wi-Fi and that the API URL uses the computer\'s current IPv4 address.',
      );
    } on TimeoutException {
      throw const ApiException(
        'The CRYMA server took too long to respond. Check the connection and try again.',
      );
    } on http.ClientException {
      throw const ApiException(
        'Cannot connect to CRYMA. Check the server address and local network connection.',
      );
    }
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
    await PushNotificationService.syncToken();
    return user;
  }

  Future<void> logout() async {
    final preferences = await SharedPreferences.getInstance();
    final token = preferences.getString(_tokenKey);
    await PushNotificationService.unregisterCurrentToken();
    await CartStore.instance.clear();
    await FavoritesStore.instance.clear();
    await preferences.remove('cryma_pending_checkout');
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

  Future<Map<String, dynamic>> getCachedBuyerProfile() async {
    final preferences = await SharedPreferences.getInstance();
    final rawUser = preferences.getString(_userKey);
    if (rawUser == null) {
      throw const ApiException(
        'Buyer profile details are unavailable. Please sign in again.',
      );
    }

    try {
      final decoded = jsonDecode(rawUser);
      if (decoded is Map<String, dynamic> && decoded['role'] == 'buyer') {
        return decoded;
      }
    } on FormatException {
      throw const ApiException(
        'Saved buyer profile details are invalid. Please sign in again.',
      );
    }
    throw const ApiException(
      'Buyer profile details are unavailable. Please sign in again.',
    );
  }

  Future<Map<String, dynamic>> getCurrentPolicies() async {
    final response = await get('/api/policies/current');
    final data = response['data'];
    if (response['success'] != true || data is! Map<String, dynamic>) {
      throw const ApiException('The server returned invalid policy versions.');
    }
    return data;
  }

  Future<Map<String, dynamic>?> restoreBuyerSession() async {
    final preferences = await SharedPreferences.getInstance();
    if (!preferences.containsKey(_tokenKey)) return null;
    try {
      final response = await get('/api/user', authenticated: true);
      final user = response['user'];
      if (user is Map<String, dynamic> && user['role'] == 'buyer') {
        await preferences.setString(_userKey, jsonEncode(user));
        await PushNotificationService.syncToken();
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
    return (await getProductsPage(search: search, category: category)).items;
  }

  Future<ApiPage> getProductsPage({
    String? search,
    String? category,
    double? minPrice,
    double? maxPrice,
    bool inStockOnly = false,
    String sort = 'featured',
    String? shuffleDay,
    int page = 1,
    int perPage = 20,
  }) async {
    final query = <String, String>{
      'page': '$page',
      'per_page': '$perPage',
      'sort': sort
    };
    if (search != null && search.trim().isNotEmpty) {
      query['search'] = search.trim();
    }
    if (category != null && category.trim().isNotEmpty && category != 'All') {
      query['category'] = category.trim();
    }
    if (minPrice != null) query['min_price'] = '$minPrice';
    if (maxPrice != null) query['max_price'] = '$maxPrice';
    if (inStockOnly) query['stock'] = '1';
    if (shuffleDay != null && shuffleDay.isNotEmpty) {
      query['shuffle_day'] = shuffleDay;
    }
    final response = await get('/api/products', query: query);
    final data = response['data'];
    final rows = data is Map<String, dynamic> ? data['data'] : null;
    if (rows is! List) {
      throw const ApiException('The server returned an invalid product list.');
    }
    return ApiPage.fromJson(data as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> getStorefront(String slug) async {
    final response = await get('/api/stores/${Uri.encodeComponent(slug)}');
    final data = response['data'];
    if (response['success'] != true || data is! Map<String, dynamic>) {
      throw const ApiException('The server returned an invalid storefront.');
    }
    return data;
  }

  Future<Map<String, dynamic>> getProduct(String id) async {
    final response = await get('/api/products/$id');
    final product = response['data'];
    if (product is! Map<String, dynamic>) {
      throw const ApiException('The server returned an invalid product.');
    }
    return product;
  }

  Future<void> recordProductView(String productId) async {
    await post('/api/products/$productId/view', body: const {});
  }

  Future<void> recordProductImpressions(List<String> productIds) async {
    if (productIds.isEmpty) return;
    await post(
      '/api/products/impressions',
      body: {'product_ids': productIds.map(int.parse).toList()},
    );
  }

  Future<List<Map<String, dynamic>>> getProductAvailability(
    List<Map<String, dynamic>> items,
  ) async {
    late final Map<String, dynamic> response;
    try {
      response = await post(
        '/api/products/availability',
        body: {'items': items},
      );
    } on SocketException {
      throw const ApiException('Unable to check current product stock. Check your connection and try again.');
    } on TimeoutException {
      throw const ApiException('The stock check took too long. Please try again.');
    } on http.ClientException {
      throw const ApiException('Unable to check current product stock. Check your connection and try again.');
    }
    final data = response['data'];
    final rows = data is Map<String, dynamic> ? data['items'] : null;
    if (response['success'] != true || rows is! List) {
      throw const ApiException(
        'The server returned invalid product availability data.',
      );
    }
    return rows.whereType<Map<String, dynamic>>().toList();
  }

  Future<Map<String, dynamic>> reportDeliveryIssue({
    required int orderId,
    required String issueType,
    required String description,
  }) async {
    return post(
      '/api/orders/$orderId/delivery-issues',
      authenticated: true,
      body: {
        'issue_type': issueType,
        'description': description.trim(),
      },
    );
  }

  Future<Map<String, dynamic>> getProductReviews(String productId) async {
    final response = await get('/api/products/$productId/reviews');
    final data = response['data'];
    if (response['success'] != true || data is! Map<String, dynamic>) {
      throw const ApiException('The server returned invalid product reviews.');
    }
    return data;
  }

  Future<Map<String, dynamic>> submitProductReview({
    required String productId,
    required int orderId,
    required int rating,
    String? comment,
  }) {
    return post(
      '/api/products/$productId/reviews',
      authenticated: true,
      body: {
        'order_id': orderId,
        'rating': rating,
        if (comment != null && comment.trim().isNotEmpty)
          'comment': comment.trim(),
      },
    );
  }

  Future<List<Map<String, dynamic>>> getBuyerChatConversations() async {
    final response =
        await get('/api/buyer/chat/conversations', authenticated: true);
    final rows = response['data'];
    if (response['success'] != true || rows is! List) {
      throw const ApiException('The server returned invalid conversations.');
    }
    return rows.whereType<Map<String, dynamic>>().toList();
  }

  Future<Map<String, dynamic>> getBuyerChatConversation(String id) async {
    final response =
        await get('/api/buyer/chat/conversations/$id', authenticated: true);
    final data = response['data'];
    if (response['success'] != true || data is! Map<String, dynamic>) {
      throw const ApiException('The server returned an invalid conversation.');
    }
    return data;
  }

  Future<Map<String, dynamic>> sendBuyerChatMessage(
    String conversationId,
    String message, {
    int? orderId,
    int? productId,
  }) {
    return post(
      '/api/buyer/chat/conversations/$conversationId/messages',
      authenticated: true,
      body: {
        'message': message.trim(),
        if (orderId != null) 'order_id': orderId,
        if (productId != null) 'product_id': productId,
      },
    );
  }

  Future<Map<String, dynamic>> shareBuyerChatProduct(
      String conversationId, int productId) {
    return post('/api/buyer/chat/conversations/$conversationId/products',
        authenticated: true, body: {'product_id': productId});
  }

  Future<Map<String, dynamic>> sendBuyerChatAttachment(
    String conversationId,
    XFile file, {
    int? orderId,
  }) async {
    return trackRequest(() async {
      final request = http.MultipartRequest('POST',
          _uri('/api/buyer/chat/conversations/$conversationId/attachments'));
      final headers = await _headers(authenticated: true);
      headers.remove('Content-Type');
      request.headers.addAll(headers);
      if (orderId != null) request.fields['order_id'] = orderId.toString();
      request.files
          .add(await http.MultipartFile.fromPath('attachment', file.path));
      final streamed = await _client.send(request).timeout(_timeout);
      return _decode(await http.Response.fromStream(streamed));
    });
  }

  Future<http.Response> downloadBuyerChatAttachment(
      String conversationId, String messageId) async {
    return trackRequest(() async {
      final headers = await _headers(authenticated: true);
      headers.remove('Content-Type');
      final response = await _client
          .get(
            _uri(
                '/api/buyer/chat/conversations/$conversationId/messages/$messageId/attachment'),
            headers: headers,
          )
          .timeout(_timeout);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        _decode(response);
      }
      return response;
    });
  }

  Future<void> markBuyerChatRead(String conversationId) async {
    await patch(
      '/api/buyer/chat/conversations/$conversationId/read',
      authenticated: true,
      body: const {},
    );
  }

  Future<Map<String, dynamic>> startBuyerSellerConversation({
    String? productId,
    String? sellerId,
  }) {
    return post(
      '/api/buyer/chat/seller-conversations',
      authenticated: true,
      body: {
        if (productId != null)
          'product_id': int.tryParse(productId) ?? productId,
        if (sellerId != null) 'seller_id': int.tryParse(sellerId) ?? sellerId,
      },
    );
  }

  /// Read-only connectivity check against the existing public product API.
  Future<void> verifyApiConnection() async {
    late final Map<String, dynamic> response;
    try {
      response = await get(
        '/api/products',
        query: const {'per_page': '1'},
      );
    } on SocketException {
      throw const ApiException(
        'Cannot connect to CRYMA. Check that your phone and computer are on the same Wi-Fi and that the API URL uses the computer\'s current IPv4 address.',
      );
    } on TimeoutException {
      throw const ApiException(
        'The CRYMA server took too long to respond. Check the connection and try again.',
      );
    } on http.ClientException {
      throw const ApiException(
        'Cannot connect to CRYMA. Check the server address and local network connection.',
      );
    }
    final page = response['data'];
    if (response['success'] != true ||
        page is! Map<String, dynamic> ||
        page['data'] is! List) {
      throw const ApiException(
        'CRYMA responded, but the product API response was unexpected.',
      );
    }
  }

  Future<Map<String, dynamic>> getCheckoutData() async {
    final response = await get('/api/buyer/checkout-data', authenticated: true);
    final data = response['data'];
    if (data is! Map<String, dynamic>) {
      throw const ApiException('The server returned invalid checkout data.');
    }
    return data;
  }

  Future<List<Map<String, dynamic>>> getBuyerAddresses() async {
    final response = await get('/api/buyer/addresses', authenticated: true);
    final rows = response['data'];
    if (response['success'] != true || rows is! List) {
      throw const ApiException('The server returned an invalid address list.');
    }
    return rows.whereType<Map<String, dynamic>>().toList();
  }

  Future<List<Map<String, dynamic>>> getBuyerAddressOptions(String path) async {
    final response = await get(
      '/api/buyer/address-options',
      query: {'path': path},
      authenticated: true,
    );
    final rows = response['data'];
    if (response['success'] != true || rows is! List) {
      throw const ApiException(
        'The server returned invalid Philippine address options.',
      );
    }
    return rows.whereType<Map<String, dynamic>>().toList();
  }

  Future<Map<String, dynamic>> createBuyerAddress(
    Map<String, dynamic> address,
  ) async {
    return post('/api/buyer/addresses', body: address, authenticated: true);
  }

  Future<Map<String, dynamic>> updateBuyerAddress(
    int id,
    Map<String, dynamic> address,
  ) async {
    return patch('/api/buyer/addresses/$id',
        body: address, authenticated: true);
  }

  Future<Map<String, dynamic>> setDefaultBuyerAddress(int id) async {
    return patch('/api/buyer/addresses/$id/default',
        body: const {}, authenticated: true);
  }

  Future<Map<String, dynamic>> deleteBuyerAddress(int id) async {
    final headers = await _headers(authenticated: true);
    final response = await _client
        .delete(_uri('/api/buyer/addresses/$id'), headers: headers)
        .timeout(_timeout);
    return _decode(response);
  }

  Future<List<Map<String, dynamic>>> getBuyerVouchers() async {
    final response = await get('/api/buyer/vouchers', authenticated: true);
    final rows = response['data'];
    if (response['success'] != true || rows is! List) {
      throw const ApiException('The server returned an invalid voucher list.');
    }
    return rows.whereType<Map<String, dynamic>>().toList();
  }

  Future<Map<String, dynamic>> claimBuyerVoucher(int id) async {
    return post('/api/buyer/vouchers/$id/claim',
        body: const {}, authenticated: true);
  }

  Future<Map<String, dynamic>> validateBuyerVoucher({
    required String code,
    required List<Map<String, dynamic>> items,
    int? addressId,
  }) async {
    final response = await post(
      '/api/buyer/vouchers/validate',
      body: {
        'code': code.trim(),
        'items': items,
        if (addressId != null) 'address_id': addressId,
      },
      authenticated: true,
    );
    final data = response['data'];
    if (response['success'] != true || data is! Map<String, dynamic>) {
      throw const ApiException(
          'The server returned an invalid voucher result.');
    }
    return data;
  }

  Future<Map<String, dynamic>> getShippingQuote(
    int addressId, [
    List<Map<String, dynamic>> items = const [],
  ]) async {
    final response = await post(
      '/api/buyer/shipping-quote',
      body: {'address_id': addressId, 'items': items},
      authenticated: true,
    );
    final data = response['data'];
    if (response['success'] != true ||
        data is! Map<String, dynamic> ||
        data['shipping_fee'] == null) {
      throw const ApiException(
          'The server returned an invalid shipping quote.');
    }
    return data;
  }

  Future<Map<String, dynamic>> createOrder({
    required int addressId,
    required String deliveryAddress,
    required String paymentMethod,
    required List<Map<String, dynamic>> items,
    required String idempotencyKey,
    String? voucherCode,
    String? shippingVoucherCode,
  }) {
    final body = <String, dynamic>{
      'address_id': addressId,
      'delivery_address': deliveryAddress,
      'payment_method': paymentMethod,
      'items': items,
    };
    if (voucherCode != null && voucherCode.trim().isNotEmpty) {
      body['voucher_code'] = voucherCode.trim();
    }
    if (shippingVoucherCode != null && shippingVoucherCode.trim().isNotEmpty) {
      body['shipping_voucher_code'] = shippingVoucherCode.trim();
    }
    return post(
      '/api/orders',
      authenticated: true,
      idempotencyKey: idempotencyKey,
      body: body,
    );
  }

  Future<ApiPage> getBuyerOrdersPage({
    int page = 1,
    String? search,
    String? status,
    String? dateFrom,
    String? dateTo,
    String sort = 'newest',
  }) async {
    final query = <String, String>{'page': '$page', 'sort': sort};
    if (search != null && search.trim().isNotEmpty) {
      query['search'] = search.trim();
    }
    if (status != null && status.isNotEmpty) query['status'] = status;
    if (dateFrom != null && dateFrom.isNotEmpty) query['date_from'] = dateFrom;
    if (dateTo != null && dateTo.isNotEmpty) query['date_to'] = dateTo;
    final response =
        await get('/api/orders', query: query, authenticated: true);
    final data = response['data'];
    if (data is! Map<String, dynamic> || data['data'] is! List) {
      throw const ApiException('The server returned an invalid order list.');
    }
    return ApiPage.fromJson(data);
  }

  Future<List<Map<String, dynamic>>> getBuyerOrders() async {
    return (await getBuyerOrdersPage()).items;
  }

  Future<Map<String, dynamic>> cancelBuyerOrder(String id) {
    return post('/api/orders/$id/cancel', body: const {}, authenticated: true);
  }

  Future<Map<String, dynamic>> requestBuyerRefund({
    required String orderId,
    required String reason,
    required double requestedAmount,
  }) {
    return post('/api/orders/$orderId/refund-requests',
        authenticated: true,
        body: {
          'reason': reason.trim(),
          'requested_amount': requestedAmount,
        });
  }

  Future<Map<String, dynamic>> getBuyerOrder(String id) async {
    final response = await get('/api/orders/$id', authenticated: true);
    final order = response['data'];
    if (order is! Map<String, dynamic>) {
      throw const ApiException('The server returned an invalid order.');
    }
    return order;
  }

  Future<Map<String, dynamic>> getBuyerNotifications() async {
    final response = await get('/api/buyer/notifications', authenticated: true);
    final data = response['data'];
    if (data is! Map<String, dynamic> || data['notifications'] is! List) {
      throw const ApiException(
          'The server returned an invalid notification list.');
    }
    return {
      'notifications': (data['notifications'] as List)
          .whereType<Map<String, dynamic>>()
          .toList(),
      'unread_count': data['unread_count'] is num
          ? (data['unread_count'] as num).toInt()
          : 0,
    };
  }

  Future<void> markBuyerNotificationRead(String id) async {
    await patch('/api/buyer/notifications/$id/read',
        body: const {}, authenticated: true);
  }

  Future<void> markAllBuyerNotificationsRead() async {
    await patch('/api/buyer/notifications/read-all',
        body: const {}, authenticated: true);
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
    return trackRequest(() async {
      final uri = _uri('/api/register');
      final request = http.MultipartRequest('POST', uri)
        ..headers['Accept'] = 'application/json';
      fields.forEach((key, value) {
        if (value != null) request.fields[key] = value.toString();
      });
      request.files
          .add(await http.MultipartFile.fromPath('valid_id', validIdPath));
      final streamed = await request.send().timeout(_timeout);
      final response = await http.Response.fromStream(streamed);
      return _decode(response);
    });
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

  Map<String, dynamic> _decode(
    http.Response response, {
    String? unauthorizedMessage,
  }) {
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
    final fieldErrors = <String, String>{};
    if (errors is Map<String, dynamic>) {
      errors.forEach((field, messages) {
        if (messages is List && messages.isNotEmpty) {
          fieldErrors[field] = messages.first.toString();
        }
      });
    }
    final message = switch (response.statusCode) {
      401 => unauthorizedMessage ??
          'Your session is invalid or has expired. Please sign in again.',
      403 => json['message']?.toString() ??
          'This account is not currently allowed to sign in.',
      422 => validationMessage ??
          json['message']?.toString() ??
          'Check the submitted information and try again.',
      >= 500 => 'CRYMA is temporarily unavailable. Please try again later.',
      _ => validationMessage ??
          json['message']?.toString() ??
          'The request could not be completed.',
    };
    throw ApiException(
      message,
      statusCode: response.statusCode,
      fieldErrors: fieldErrors,
      responseData: json,
    );
  }
}

class ApiException implements Exception {
  const ApiException(this.message,
      {this.statusCode,
      this.fieldErrors = const {},
      this.responseData = const {}});

  final String message;
  final int? statusCode;
  final Map<String, String> fieldErrors;
  final Map<String, dynamic> responseData;

  @override
  String toString() => message;
}

class ApiPage {
  const ApiPage(
      {required this.items,
      required this.currentPage,
      required this.lastPage,
      required this.total,
      this.shuffleDay});
  final List<Map<String, dynamic>> items;
  final int currentPage;
  final int lastPage;
  final int total;
  final String? shuffleDay;

  factory ApiPage.fromJson(Map<String, dynamic> json) => ApiPage(
        items: (json['data'] as List? ?? const [])
            .whereType<Map<String, dynamic>>()
            .toList(),
        currentPage: int.tryParse(json['current_page']?.toString() ?? '') ?? 1,
        lastPage: int.tryParse(json['last_page']?.toString() ?? '') ?? 1,
        total: int.tryParse(json['total']?.toString() ?? '') ?? 0,
        shuffleDay: json['shuffle_day']?.toString(),
      );
}
