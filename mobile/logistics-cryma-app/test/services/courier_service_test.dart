import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:logistics_cryma_app/services/api_client.dart';
import 'package:logistics_cryma_app/services/courier_service.dart';

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
  test('uses the production API by default', () async {
    final client = ApiClient(
      httpClient: MockClient((request) async {
        expect(request.url.origin, 'https://api.cryma.store');
        expect(request.url.path, '/api/courier/pickups');
        return http.Response('{}', 200);
      }),
      tokenStore: _MemoryTokenStore(),
    );

    await client.get('courier/pickups');
  });

  test('accepts a pickup with the Laravel courier status contract', () async {
    final tokenStore = _MemoryTokenStore()..token = 'local-test-token';
    final client = MockClient((request) async {
      expect(request.method, 'PATCH');
      expect(request.url.path, '/api/courier/pickups/12/status');
      expect(request.headers['authorization'], 'Bearer local-test-token');
      expect(jsonDecode(request.body), {
        'status': 'ACCEPTED_BY_PICKUP_RIDER',
        'expected_status': 'ASSIGNED_TO_PICKUP_RIDER',
      });
      return http.Response('{}', 200);
    });
    final service = CourierService(
      apiClient: ApiClient(
        httpClient: client,
        tokenStore: tokenStore,
        baseUrl: 'https://cryma.test/api',
      ),
    );

    await service.acceptPickup(12);
  });

  test('submits the decoded parcel QR when confirming pickup', () async {
    final tokenStore = _MemoryTokenStore()..token = 'local-test-token';
    const scannedCode = 'CRYMA-PCL-ABCDEFGHIJKLMNOPQRST';
    final client = MockClient((request) async {
      expect(request.method, 'PATCH');
      expect(request.url.path, '/api/courier/pickups/12/status');
      expect(request.headers['authorization'], 'Bearer local-test-token');
      expect(jsonDecode(request.body), {
        'status': 'PICKED_UP',
        'expected_status': 'ACCEPTED_BY_PICKUP_RIDER',
        'parcel_code': scannedCode,
      });
      return http.Response('{}', 200);
    });
    final service = CourierService(
      apiClient: ApiClient(
        httpClient: client,
        tokenStore: tokenStore,
        baseUrl: 'https://cryma.test/api',
      ),
    );

    await service.collectPickup(12, scannedCode);
  });

  test('submits the decoded parcel QR when starting delivery', () async {
    final tokenStore = _MemoryTokenStore()..token = 'local-test-token';
    const scannedCode = 'CRYMA-PCL-ABCDEFGHIJKLMNOPQRST';
    final client = MockClient((request) async {
      expect(request.method, 'PATCH');
      expect(request.url.path, '/api/courier/deliveries/8/status');
      expect(request.headers['authorization'], 'Bearer local-test-token');
      expect(jsonDecode(request.body), {
        'status': 'OUT_FOR_DELIVERY',
        'expected_status': 'ASSIGNED_TO_RIDER',
        'parcel_code': scannedCode,
      });
      return http.Response('{}', 200);
    });
    final service = CourierService(
      apiClient: ApiClient(
        httpClient: client,
        tokenStore: tokenStore,
        baseUrl: 'https://cryma.test/api',
      ),
    );

    await service.startDelivery(8, scannedCode);
  });

  test('sends delivery proof as multipart with required backend fields',
      () async {
    final tokenStore = _MemoryTokenStore()..token = 'local-test-token';
    final tempDir = await Directory.systemTemp.createTemp('cryma-proof-test-');
    final photo = File(
      '${tempDir.path}${Platform.pathSeparator}proof.jpg',
    );
    await photo.writeAsBytes([1, 2, 3]);
    addTearDown(() => tempDir.delete(recursive: true));
    final client = MockClient((request) async {
      expect(request.method, 'POST');
      expect(request.url.path, '/api/courier/deliveries/8/proof');
      expect(request.headers['authorization'], 'Bearer local-test-token');
      expect(
        request.headers['content-type'],
        startsWith('multipart/form-data; boundary='),
      );
      final multipartBody = request.body;
      expect(multipartBody, contains('name="expected_status"'));
      expect(multipartBody, contains('OUT_FOR_DELIVERY'));
      expect(multipartBody, contains('name="recipient_full_name"'));
      expect(multipartBody, contains('Juan Dela Cruz'));
      expect(multipartBody, contains('name="cod_amount_collected"'));
      expect(multipartBody, contains('349.50'));
      expect(multipartBody, contains('name="photo"'));
      return http.Response('{}', 200);
    });
    final service = CourierService(
      apiClient: ApiClient(
        httpClient: client,
        tokenStore: tokenStore,
        baseUrl: 'https://cryma.test/api',
      ),
    );

    await service.completeDelivery(
      id: 8,
      recipientName: 'Juan Dela Cruz',
      photoPath: photo.path,
      codAmountCollected: 349.5,
    );
  });
}
