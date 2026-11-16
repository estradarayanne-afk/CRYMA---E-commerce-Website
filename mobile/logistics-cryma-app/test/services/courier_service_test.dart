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
        baseUrl: 'https://cryma.test',
      ),
    );

    await service.acceptPickup(12);
  });

  test('sends scanned parcel codes to the shared courier API', () async {
    const parcelCode = 'CRYMA-PCL-ABCDEFGHIJKLMNOPQRST';
    final tokenStore = _MemoryTokenStore()..token = 'local-test-token';
    final client = MockClient((request) async {
      expect(request.method, 'PATCH');
      expect(request.url.path,
          matches(r'^/api/courier/(pickups/12|deliveries/8)/status$'));
      expect(request.headers['authorization'], 'Bearer local-test-token');
      final expectedStatus = request.url.path.contains('/pickups/')
          ? {
              'status': 'PICKED_UP',
              'expected_status': 'ACCEPTED_BY_PICKUP_RIDER',
              'parcel_code': parcelCode,
            }
          : {
              'status': 'OUT_FOR_DELIVERY',
              'expected_status': 'ASSIGNED_TO_RIDER',
              'parcel_code': parcelCode,
            };
      expect(jsonDecode(request.body), expectedStatus);
      return http.Response('{}', 200);
    });
    final service = CourierService(
      apiClient: ApiClient(
        httpClient: client,
        tokenStore: tokenStore,
        baseUrl: 'https://cryma.test/api/',
      ),
    );

    await service.collectPickup(12, parcelCode);
    await service.startDelivery(8, parcelCode);
  });

  test('sends explicit failed-delivery resolutions', () async {
    final requests = <Map<String, dynamic>>[];
    final client = MockClient((request) async {
      expect(request.method, 'PATCH');
      expect(request.url.path, '/api/courier/deliveries/8/status');
      requests.add(jsonDecode(request.body) as Map<String, dynamic>);
      return http.Response('{}', 200);
    });
    final service = CourierService(
      apiClient: ApiClient(
        httpClient: client,
        tokenStore: _MemoryTokenStore(),
        baseUrl: 'https://cryma.test',
      ),
    );

    await service.failDelivery(8, 'No one answered');
    await service.failDelivery(
      8,
      'Recipient declined',
      resolution: DeliveryFailureResolution.returnToSender,
    );

    expect(requests, [
      {
        'status': 'DELIVERY_FAILED',
        'expected_status': 'OUT_FOR_DELIVERY',
        'reason': 'No one answered',
        'failure_resolution': 'redeliver_tomorrow',
      },
      {
        'status': 'DELIVERY_FAILED',
        'expected_status': 'OUT_FOR_DELIVERY',
        'reason': 'Recipient declined',
        'failure_resolution': 'return_to_sender',
      },
    ]);
  });

  test('sends a manually entered item ID to confirm pickup', () async {
    final tokenStore = _MemoryTokenStore()..token = 'local-test-token';
    final client = MockClient((request) async {
      expect(request.method, 'PATCH');
      expect(request.url.path, '/api/courier/pickups/12/status');
      expect(request.headers['authorization'], 'Bearer local-test-token');
      expect(jsonDecode(request.body), {
        'status': 'PICKED_UP',
        'expected_status': 'ACCEPTED_BY_PICKUP_RIDER',
        'order_id': 34,
      });
      return http.Response('{}', 200);
    });
    final service = CourierService(
      apiClient: ApiClient(
        httpClient: client,
        tokenStore: tokenStore,
        baseUrl: 'https://cryma.test',
      ),
    );

    await service.collectPickupByItemId(12, 34);
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
