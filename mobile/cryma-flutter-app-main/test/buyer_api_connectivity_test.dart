import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:cryma_flutter_app/services/api_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  const baseUrl = 'http://192.168.1.20:8000/';

  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('public connectivity probe uses the existing product API', () async {
    late http.Request request;
    final api = ApiService(
      baseUrl: baseUrl,
      client: MockClient((value) async {
        request = value;
        return http.Response(
          jsonEncode({
            'success': true,
            'data': {
              'data': [],
              'current_page': 1,
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }),
    );

    await api.verifyApiConnection();

    expect(request.url.toString(),
        'http://192.168.1.20:8000/api/products?per_page=1');
    expect(request.headers['authorization'], isNull);
  });

  test(
      'login stores only the real Buyer token and user, then restores via bearer token',
      () async {
    final requests = <http.Request>[];
    final api = ApiService(
      baseUrl: baseUrl,
      client: MockClient((request) async {
        requests.add(request);
        if (request.url.path == '/api/login') {
          expect(jsonDecode(request.body), {
            'email': 'buyer@example.test',
            'password': 'test-password',
          });
          return http.Response(
            jsonEncode({
              'token': 'actual-sanctum-token',
              'user': {'id': 12, 'role': 'buyer', 'first_name': 'Test'},
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        expect(request.url.path, '/api/user');
        expect(request.headers['authorization'], 'Bearer actual-sanctum-token');
        return http.Response(
          jsonEncode({
            'user': {'id': 12, 'role': 'buyer'}
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }),
    );

    await api.login(' buyer@example.test ', 'test-password');
    expect(await api.restoreBuyerSession(), {'id': 12, 'role': 'buyer'});
    expect(requests.map((request) => request.url.path),
        ['/api/login', '/api/user']);
    expect(requests.first.url.host, '192.168.1.20');
  });

  test('401, 403, 422, and 500 are reported without exposing server internals',
      () async {
    for (final item in [
      (
        401,
        {'message': 'Invalid email or password.'},
        'Invalid email or password.'
      ),
      (
        403,
        {'message': 'Your account is not active.'},
        'Your account is not active.'
      ),
      (
        422,
        {
          'message': 'Invalid data.',
          'errors': {
            'email': ['Enter a valid email.']
          }
        },
        'Enter a valid email.'
      ),
      (
        500,
        {'message': 'SQL password and stack trace'},
        'CRYMA is temporarily unavailable. Please try again later.'
      ),
    ]) {
      final api = ApiService(
        baseUrl: baseUrl,
        client: MockClient((_) async => http.Response(
              jsonEncode(item.$2),
              item.$1,
              headers: {'content-type': 'application/json'},
            )),
      );
      await expectLater(
        api.login('buyer@example.test', 'test-password'),
        throwsA(isA<ApiException>().having(
          (error) => error.message,
          'safe user-facing message',
          item.$3,
        )),
      );
      final preferences = await SharedPreferences.getInstance();
      expect(preferences.containsKey('cryma_api_token'), isFalse);
    }

    final expiredSessionApi = ApiService(
      baseUrl: baseUrl,
      client: MockClient((_) async => http.Response(
            jsonEncode({'message': 'Unauthenticated.'}),
            401,
            headers: {'content-type': 'application/json'},
          )),
    );
    await expectLater(
      expiredSessionApi.get('/api/user'),
      throwsA(isA<ApiException>().having(
        (error) => error.message,
        'expired-session message',
        contains('session is invalid or has expired'),
      )),
    );
  });

  test('socket and timeout failures have distinct connection guidance',
      () async {
    final socketApi = ApiService(
      baseUrl: baseUrl,
      client:
          MockClient((_) async => throw const SocketException('hidden detail')),
    );
    await expectLater(
      socketApi.login('buyer@example.test', 'test-password'),
      throwsA(isA<ApiException>().having(
        (error) => error.message,
        'connection guidance',
        contains('same Wi-Fi'),
      )),
    );

    final timeoutApi = ApiService(
      baseUrl: baseUrl,
      client: MockClient((_) async => throw TimeoutException('hidden detail')),
    );
    await expectLater(
      timeoutApi.login('buyer@example.test', 'test-password'),
      throwsA(isA<ApiException>().having(
        (error) => error.message,
        'timeout guidance',
        contains('too long to respond'),
      )),
    );
  });
}
