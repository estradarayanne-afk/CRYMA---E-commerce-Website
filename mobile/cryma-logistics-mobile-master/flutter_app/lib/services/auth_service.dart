import '../models/api_response.dart';
import '../models/user_model.dart';
import 'api_client.dart';
import 'token_storage.dart';

class AuthService {
  final ApiClient apiClient;
  final TokenStorage tokenStorage;

  AuthService({required this.apiClient, required this.tokenStorage});

  Future<LoginResponse> login(String email, String password) async {
    final response = await apiClient.post<LoginResponse>(
      '/api/login',
      body: {'email': email.trim(), 'password': password},
      dataDecoder: (json) {
        final result = LoginResponse.fromJson(json);
        if (result.token.isEmpty || result.user['role'] != 'rider') {
          throw ApiException(
            statusCode: 403,
            code: 'RIDER_ACCOUNT_REQUIRED',
            message: 'Sign in with a CRYMA rider account.',
          );
        }
        return result;
      },
      includeAuth: false,
    );
    await tokenStorage.saveToken(response.token, expiresIn: response.expiresIn);
    return response;
  }

  Future<RegisterResponse> registerRider(
    Map<String, String> formData, {
    String? licensePhotoPath,
  }) async {
    throw ApiException(
      statusCode: 501,
      code: 'RIDER_REGISTRATION_FORM_INCOMPLETE',
      message: 'Rider registration must be completed on the CRYMA website. The mobile form does not yet collect the required identity, vehicle, address, and verification documents.',
    );
  }

  Future<User> getProfile() {
    return apiClient.get<User>(
      '/api/user',
      dataDecoder: (json) {
        final userData = json['user'];
        if (userData is! Map<String, dynamic>) {
          throw ApiException(
            statusCode: 502,
            code: 'INVALID_USER_RESPONSE',
            message: 'The server returned an invalid profile response.',
          );
        }
        final user = User.fromJson(userData);
        if (user.role != 'rider') {
          throw ApiException(
            statusCode: 403,
            code: 'RIDER_ACCOUNT_REQUIRED',
            message: 'This app is only available to rider accounts.',
          );
        }
        return user;
      },
    );
  }

  Future<AccountStatusResponse> checkAccountStatus() async {
    final user = await getProfile();
    return AccountStatusResponse(status: user.accountStatus);
  }

  Future<void> logout() async {
    try {
      if (await tokenStorage.hasToken()) {
        await apiClient.post('/api/logout', includeAuth: true);
      }
    } finally {
      await tokenStorage.deleteToken();
    }
  }

  Future<String?> getToken() => tokenStorage.getToken();
  Future<bool> hasToken() => tokenStorage.hasToken();

  Future<bool> isTokenValid() async => tokenStorage.hasToken();
}
