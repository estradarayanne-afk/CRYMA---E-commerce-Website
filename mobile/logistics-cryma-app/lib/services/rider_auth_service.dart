import 'api_client.dart';

class RiderRegistrationPolicies {
  const RiderRegistrationPolicies({
    required this.termsVersion,
    required this.privacyVersion,
  });

  final String termsVersion;
  final String privacyVersion;
}

class RiderAccount {
  const RiderAccount({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.role,
    required this.status,
    this.phone,
  });

  final int id;
  final String firstName;
  final String lastName;
  final String email;
  final String role;
  final String status;
  final String? phone;

  String get fullName => '$firstName $lastName'.trim();

  factory RiderAccount.fromJson(Map<String, dynamic> json) {
    final id = json['id'];
    if (id is! num ||
        json['email'] is! String ||
        json['role'] is! String ||
        json['status'] is! String) {
      throw const ApiException('The CRYMA server returned an invalid account.');
    }
    return RiderAccount(
      id: id.toInt(),
      firstName: json['first_name'] as String? ?? '',
      lastName: json['last_name'] as String? ?? '',
      email: json['email'] as String,
      role: json['role'] as String,
      status: json['status'] as String,
      phone: json['phone'] as String?,
    );
  }
}

class RiderAuthService {
  RiderAuthService({ApiClient? apiClient})
      : _api = apiClient ?? ApiClient.instance;

  static final instance = RiderAuthService();

  final ApiClient _api;

  Future<String?> readToken() => _api.readToken();

  Future<void> clearToken() => _api.clearToken();

  Future<RiderRegistrationPolicies> registrationPolicies() async {
    final response = await _api.get('policies/current');
    final data = response['data'];
    if (data is! Map ||
        data['terms'] is! Map ||
        data['privacy'] is! Map ||
        (data['terms'] as Map)['version'] is! String ||
        (data['privacy'] as Map)['version'] is! String) {
      throw const ApiException(
        'The CRYMA server returned invalid registration policy versions.',
      );
    }

    return RiderRegistrationPolicies(
      termsVersion: (data['terms'] as Map)['version'] as String,
      privacyVersion: (data['privacy'] as Map)['version'] as String,
    );
  }

  Future<void> registerRider({
    required Map<String, String> fields,
    required Map<String, String> documentPaths,
  }) async {
    await _api.postMultipartFiles(
      'register',
      fields: fields,
      files: documentPaths,
      authenticated: false,
    );
  }

  Future<void> verifyEmail({
    required String email,
    required String otp,
  }) async {
    await _api.post(
      'verify-email',
      body: {'email': email.trim().toLowerCase(), 'otp': otp},
      authenticated: false,
    );
  }

  Future<String> resendVerification(String email) async {
    final response = await _api.post(
      'resend-verification',
      body: {'email': email.trim().toLowerCase()},
      authenticated: false,
    );
    final message = response['message'];
    if (message is! String) {
      throw const ApiException(
        'The CRYMA server returned an invalid verification response.',
      );
    }
    return message;
  }

  Future<RiderAccount> login(String email, String password) async {
    final response = await _api.post(
      'login',
      body: {'email': email.trim(), 'password': password},
      authenticated: false,
    );
    final token = response['token'];
    final userData = response['user'];
    if (token is! String || token.isEmpty || userData is! Map) {
      throw const ApiException('The CRYMA server returned an invalid login response.');
    }

    final user = RiderAccount.fromJson(Map<String, dynamic>.from(userData));
    if (user.role != 'rider') {
      await _api.post('logout', authenticated: false, tokenOverride: token);
      throw const ApiException(
        'This mobile app is for riders. Use the CRYMA website for other account types.',
      );
    }
    await _api.saveToken(token);
    return user;
  }

  Future<RiderAccount> currentUser() async {
    final response = await _api.get('user');
    final user = response['user'];
    if (user is! Map) {
      throw const ApiException('The CRYMA server returned an invalid account.');
    }
    final account = RiderAccount.fromJson(Map<String, dynamic>.from(user));
    if (account.role != 'rider') {
      await _api.clearToken();
      throw const ApiException(
        'This mobile app is for riders. Use the CRYMA website for other account types.',
        statusCode: 403,
      );
    }
    return account;
  }

  Future<void> logout() async {
    try {
      final token = await _api.readToken();
      if (token != null && token.isNotEmpty) {
        await _api.post('logout');
      }
    } finally {
      await _api.clearToken();
    }
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _api.patch(
      'account/password',
      body: {
        'current_password': currentPassword,
        'password': newPassword,
        'password_confirmation': newPassword,
      },
    );
  }
}
