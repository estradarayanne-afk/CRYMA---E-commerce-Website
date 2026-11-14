import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:cryma_logistics/providers/auth_provider.dart';
import 'package:cryma_logistics/services/auth_service.dart';
import 'package:cryma_logistics/services/api_client.dart';
import 'package:cryma_logistics/models/api_response.dart';
import 'package:cryma_logistics/models/user_model.dart';

class MockAuthService extends Mock implements AuthService {}

void main() {
  group('AuthProvider - Authentication Flow', () {
    late AuthProvider authProvider;
    late MockAuthService mockAuthService;

    setUp(() {
      mockAuthService = MockAuthService();
      authProvider = AuthProvider(authService: mockAuthService);
    });

    test('initial state is not authenticated', () {
      expect(authProvider.isAuthenticated, false);
      expect(authProvider.currentUser, isNull);
      expect(authProvider.accountStatus, isNull);
    });

    test('successful login sets authenticated and user data', () async {
      final loginResponse = LoginResponse(
        token: 'test_token_123',
        expiresIn: 86400,
        user: {
          'id': '1',
          'email': 'test@example.com',
          'firstName': 'John',
          'lastName': 'Doe',
          'phone': '09123456789',
          'role': 'rider',
          'accountStatus': 'active',
        },
      );

      when(mockAuthService.login('test@example.com', 'Password123'))
          .thenAnswer((_) => Future.value(loginResponse));

      final success = await authProvider.login('test@example.com', 'Password123');

      expect(success, true);
      expect(authProvider.isAuthenticated, true);
      expect(authProvider.currentUser?.firstName, 'John');
      expect(authProvider.currentUser?.email, 'test@example.com');
      expect(authProvider.accountStatus, 'active');
      expect(authProvider.isLoading, false);
    });

    test('failed login does not set authenticated', () async {
      final exception = ApiException(
        statusCode: 401,
        message: 'Invalid email or password',
      );

      when(mockAuthService.login('wrong@example.com', 'WrongPass'))
          .thenThrow(exception);

      final success =
          await authProvider.login('wrong@example.com', 'WrongPass');

      expect(success, false);
      expect(authProvider.isAuthenticated, false);
      expect(authProvider.currentUser, isNull);
      expect(authProvider.errorMessage, isNotNull);
    });

    test('login with pending account status', () async {
      final loginResponse = LoginResponse(
        token: 'test_token',
        expiresIn: 86400,
        user: {
          'id': '2',
          'email': 'pending@example.com',
          'firstName': 'Jane',
          'lastName': 'Rider',
          'phone': '09987654321',
          'role': 'rider',
          'accountStatus': 'pending',
        },
      );

      when(mockAuthService.login('pending@example.com', 'Password123'))
          .thenAnswer((_) => Future.value(loginResponse));

      final success = await authProvider.login('pending@example.com', 'Password123');

      expect(success, true);
      expect(authProvider.accountStatus, 'pending');
      expect(authProvider.isAuthenticated, true);
    });

    test('login with rejected account fetches rejection reason', () async {
      final loginResponse = LoginResponse(
        token: 'test_token',
        expiresIn: 86400,
        user: {
          'id': '3',
          'email': 'rejected@example.com',
          'firstName': 'Bob',
          'lastName': 'Rider',
          'phone': '09111111111',
          'role': 'rider',
          'accountStatus': 'rejected',
        },
      );

      final statusResponse = AccountStatusResponse(
        status: 'rejected',
        rejectionReason: 'License documentation invalid',
      );

      when(mockAuthService.login('rejected@example.com', 'Password123'))
          .thenAnswer((_) => Future.value(loginResponse));
      when(mockAuthService.checkAccountStatus())
          .thenAnswer((_) => Future.value(statusResponse));

      final success = await authProvider.login('rejected@example.com', 'Password123');

      expect(success, true);
      expect(authProvider.accountStatus, 'rejected');
      expect(authProvider.rejectionReason, 'License documentation invalid');
    });

    test('checkAccountStatus updates account status', () async {
      final statusResponse = AccountStatusResponse(
        status: 'active',
        rejectionReason: null,
      );

      when(mockAuthService.checkAccountStatus())
          .thenAnswer((_) => Future.value(statusResponse));

      final isActive = await authProvider.checkAccountStatus();

      expect(isActive, true);
      expect(authProvider.accountStatus, 'active');
      expect(authProvider.isLoading, false);
    });

    test('logout clears all state', () async {
      // Setup authenticated state
      final loginResponse = LoginResponse(
        token: 'test_token',
        expiresIn: 86400,
        user: {
          'id': '1',
          'email': 'test@example.com',
          'firstName': 'John',
          'lastName': 'Doe',
          'phone': '09123456789',
          'role': 'rider',
          'accountStatus': 'active',
        },
      );

      when(mockAuthService.login('test@example.com', 'Password123'))
          .thenAnswer((_) => Future.value(loginResponse));

      await authProvider.login('test@example.com', 'Password123');
      expect(authProvider.isAuthenticated, true);

      // Logout
      when(mockAuthService.logout()).thenAnswer((_) => Future.value());
      await authProvider.logout();

      expect(authProvider.isAuthenticated, false);
      expect(authProvider.currentUser, isNull);
      expect(authProvider.accountStatus, isNull);
      expect(authProvider.rejectionReason, isNull);
      expect(authProvider.errorMessage, isNull);
    });

    test('fetchProfile updates user and account status', () async {
      final user = User(
        id: '1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '09123456789',
        role: 'rider',
        accountStatus: 'active',
        createdAt: DateTime.now(),
      );

      when(mockAuthService.getProfile()).thenAnswer((_) => Future.value(user));

      final success = await authProvider.fetchProfile();

      expect(success, true);
      expect(authProvider.currentUser?.firstName, 'John');
      expect(authProvider.accountStatus, 'active');
    });

    test('isLoading state during async operations', () async {
      final loginResponse = LoginResponse(
        token: 'test_token',
        expiresIn: 86400,
        user: {
          'id': '1',
          'email': 'test@example.com',
          'firstName': 'John',
          'lastName': 'Doe',
          'phone': '09123456789',
          'role': 'rider',
          'accountStatus': 'active',
        },
      );

      when(mockAuthService.login('test@example.com', 'Password123'))
          .thenAnswer((_) => Future.delayed(
            const Duration(milliseconds: 100),
            () => loginResponse,
          ));

      expect(authProvider.isLoading, false);

      final future = authProvider.login('test@example.com', 'Password123');
      expect(authProvider.isLoading, true);

      await future;
      expect(authProvider.isLoading, false);
    });

    test('registration sets pending account status', () async {
      final formData = {
        'firstName': 'Alice',
        'lastName': 'Rider',
        'email': 'alice@example.com',
        'phone': '09555555555',
      };

      final registerResponse = RegisterResponse(
        message: 'Registration successful',
        riderId: 'rider_123',
        accountStatus: 'pending',
      );

      when(mockAuthService.registerRider(
        <String, String>{'firstName': 'Alice', 'lastName': 'Rider', 'email': 'alice@example.com', 'phone': '09555555555'},
        licensePhotoPath: anyNamed('licensePhotoPath'),
      )).thenAnswer((_) => Future.value(registerResponse));

      final success = await authProvider.registerRider(formData);

      expect(success, true);
      expect(authProvider.accountStatus, 'pending');
      expect(authProvider.isLoading, false);
    });
  });
}
