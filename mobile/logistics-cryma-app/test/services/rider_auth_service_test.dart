import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:logistics_cryma_app/services/api_client.dart';
import 'package:logistics_cryma_app/services/rider_auth_service.dart';

class _MemoryTokenStore implements TokenStore {
  String? token;

  @override
  Future<String?> read() async => token;

  @override
  Future<void> write(String value) async => token = value;

  @override
  Future<void> delete() async => token = null;
}

void main() {
  test('logs in through Laravel and stores the rider token', () async {
    final tokenStore = _MemoryTokenStore();
    final client = MockClient((request) async {
      expect(request.method, 'POST');
      expect(request.url.path, '/api/login');
      expect(jsonDecode(request.body), {
        'email': 'rider@example.com',
        'password': 'secret',
      });
      return http.Response(
        jsonEncode({
          'token': 'rider-token',
          'user': {
            'id': 42,
            'first_name': 'Juan',
            'last_name': 'Dela Cruz',
            'email': 'rider@example.com',
            'role': 'rider',
            'status': 'active',
          },
        }),
        200,
      );
    });
    final service = RiderAuthService(
      apiClient: ApiClient(
        httpClient: client,
        tokenStore: tokenStore,
        baseUrl: 'https://cryma.test/api',
      ),
    );

    final account = await service.login(' rider@example.com ', 'secret');

    expect(account.id, 42);
    expect(account.fullName, 'Juan Dela Cruz');
    expect(tokenStore.token, 'rider-token');
  });

  test('rejects non-rider accounts and revokes their API token', () async {
    final tokenStore = _MemoryTokenStore();
    final client = MockClient((request) async {
      if (request.url.path == '/api/login') {
        return http.Response(
          jsonEncode({
            'token': 'admin-token',
            'user': {
              'id': 7,
              'first_name': 'System',
              'last_name': 'Administrator',
              'email': 'admin@example.com',
              'role': 'admin',
              'status': 'active',
            },
          }),
          200,
        );
      }
      expect(request.url.path, '/api/logout');
      expect(request.headers['authorization'], 'Bearer admin-token');
      return http.Response('{}', 200);
    });
    final service = RiderAuthService(
      apiClient: ApiClient(
        httpClient: client,
        tokenStore: tokenStore,
        baseUrl: 'https://cryma.test/api',
      ),
    );

    await expectLater(
      service.login('admin@example.com', 'secret'),
      throwsA(
        isA<ApiException>().having(
          (error) => error.message,
          'message',
          contains('This mobile app is for riders'),
        ),
      ),
    );
    expect(tokenStore.token, isNull);
  });

  test('loads current policy versions from Laravel', () async {
    final client = MockClient((request) async {
      expect(request.method, 'GET');
      expect(request.url.path, '/api/policies/current');
      return http.Response(
        jsonEncode({
          'success': true,
          'data': {
            'terms': {'version': '1.3'},
            'privacy': {'version': '1.1'},
          },
        }),
        200,
      );
    });
    final service = RiderAuthService(
      apiClient: ApiClient(
        httpClient: client,
        tokenStore: _MemoryTokenStore(),
        baseUrl: 'https://cryma.test/api',
      ),
    );

    final policies = await service.registrationPolicies();

    expect(policies.termsVersion, '1.3');
    expect(policies.privacyVersion, '1.1');
  });

  test('submits the website rider fields and all three documents as multipart',
      () async {
    final directory =
        await Directory.systemTemp.createTemp('cryma-registration-');
    try {
      final validId = await File('${directory.path}\\valid-id.pdf')
          .writeAsString('valid id');
      final orCr = await File('${directory.path}\\or-cr.jpg')
          .writeAsString('vehicle registration');
      final license = await File('${directory.path}\\license.png')
          .writeAsString('driver license');
      final client = MockClient((request) async {
        expect(request.method, 'POST');
        expect(request.url.path, '/api/register');
        expect(request.headers['content-type'],
            startsWith('multipart/form-data;'));
        expect(request.headers.containsKey('authorization'), isFalse);
        final body = request.body;
        for (final field in [
          'name="role"',
          'name="terms_accepted"',
          'name="terms_version"',
          'name="privacy_notice_acknowledged"',
          'name="privacy_version"',
          'name="birthday"',
          'name="phone"',
          'name="vehicle_type"',
          'name="plate_number"',
          'name="valid_id"',
          'name="or_cr"',
          'name="drivers_license"',
        ]) {
          expect(body, contains(field));
        }
        expect(body, contains('name="terms_version"'));
        expect(body, contains('1.3'));
        expect(body, contains('1.1'));
        expect(body, contains('valid-id.pdf'));
        expect(body, contains('or-cr.jpg'));
        expect(body, contains('license.png'));
        return http.Response('{"success":true}', 201);
      });
      final service = RiderAuthService(
        apiClient: ApiClient(
          httpClient: client,
          tokenStore: _MemoryTokenStore(),
          baseUrl: 'https://cryma.test/api',
        ),
      );

      await service.registerRider(
        fields: {
          'role': 'rider',
          'terms_accepted': '1',
          'terms_version': '1.3',
          'privacy_notice_acknowledged': '1',
          'privacy_version': '1.1',
          'birthday': '1995-01-01',
          'phone': '+639171234567',
          'vehicle_type': 'motorcycle',
          'plate_number': 'ABC1234',
        },
        documentPaths: {
          'valid_id': validId.path,
          'or_cr': orCr.path,
          'drivers_license': license.path,
        },
      );
    } finally {
      await directory.delete(recursive: true);
    }
  });

  test('preserves a registration-saved response for verification recovery',
      () async {
    final client = MockClient((request) async => http.Response(
          jsonEncode({
            'success': false,
            'registration_saved': true,
            'message': 'Registration saved, but email delivery failed.',
          }),
          503,
        ));
    final service = RiderAuthService(
      apiClient: ApiClient(
        httpClient: client,
        tokenStore: _MemoryTokenStore(),
        baseUrl: 'https://cryma.test/api',
      ),
    );

    await expectLater(
      service.registerRider(
        fields: const {'role': 'rider'},
        documentPaths: const {},
      ),
      throwsA(
        isA<ApiException>().having(
          (error) => error.data?['registration_saved'],
          'registration_saved',
          true,
        ),
      ),
    );
  });

  test('verifies and resends email codes through Laravel', () async {
    var requestCount = 0;
    final client = MockClient((request) async {
      requestCount++;
      expect(request.method, 'POST');
      if (request.url.path == '/api/verify-email') {
        expect(jsonDecode(request.body), {
          'email': 'rider@example.com',
          'otp': '123456',
        });
        return http.Response('{"success":true}', 200);
      }
      expect(request.url.path, '/api/resend-verification');
      expect(jsonDecode(request.body), {'email': 'rider@example.com'});
      return http.Response(
        '{"success":true,"message":"A new verification code has been sent."}',
        200,
      );
    });
    final service = RiderAuthService(
      apiClient: ApiClient(
        httpClient: client,
        tokenStore: _MemoryTokenStore(),
        baseUrl: 'https://cryma.test/api',
      ),
    );

    await service.verifyEmail(email: ' Rider@Example.com ', otp: '123456');
    final message = await service.resendVerification(' Rider@Example.com ');

    expect(message, 'A new verification code has been sent.');
    expect(requestCount, 2);
  });
}
