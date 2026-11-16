import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:logistics_cryma_app/services/api_client.dart';
import 'package:logistics_cryma_app/services/rider_auth_service.dart';

class _MemoryTokenStore implements TokenStore {
  @override
  Future<String?> read() async => 'rider-token';

  @override
  Future<void> write(String token) async {}

  @override
  Future<void> delete() async {}
}

void main() {
  test('uses the deployed CRYMA API by default', () async {
    final client = MockClient((request) async {
      expect(
        request.url,
        Uri.parse('https://api.cryma.store/api/courier/account'),
      );
      return http.Response('{}', 200);
    });
    final api = ApiClient(
      httpClient: client,
      tokenStore: _MemoryTokenStore(),
    );

    await api.get('courier/account');
  });

  test('loads the full rider account details from the courier endpoint',
      () async {
    final client = MockClient((request) async {
      expect(request.method, 'GET');
      expect(request.url.path, '/api/courier/account');
      expect(request.headers['authorization'], 'Bearer rider-token');
      return http.Response(
        jsonEncode({
          'success': true,
          'data': {
            'user': {
              'id': 42,
              'first_name': 'Juan',
              'middle_name': 'Dela',
              'last_name': 'Cruz',
              'email': 'rider@example.com',
              'phone': '+639171234567',
              'role': 'rider',
              'status': 'active',
              'email_verified_at': '2026-11-15T10:00:00Z',
            },
            'profile': {
              'sex': 'prefer_not_to_say',
              'birthday': '1995-01-02',
            },
            'address': {
              'region': 'NCR',
              'province': '',
              'municipality': 'Makati City',
              'barangay': 'Poblacion',
              'street': 'Example Street',
              'house_number': '12',
              'building_name': null,
              'unit_number': null,
              'postal_code': '1200',
            },
            'vehicles': [
              {'vehicle_type': 'motorcycle', 'plate_number': 'ABC-1234'},
            ],
            'drivers_license': {
              'status': 'approved',
              'file_name': 'license.png',
              'mime_type': 'image/png',
              'uploaded_at': '2026-11-15T10:00:00Z',
            },
            'ewallet_qr_available': true,
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

    final details = await service.accountDetails();

    expect(details.account.fullName, 'Juan Cruz');
    expect(details.middleName, 'Dela');
    expect(details.emailVerified, isTrue);
    expect(details.sex, 'prefer_not_to_say');
    expect(details.birthday, '1995-01-02');
    expect(
      details.address?.formatted,
      '12, Example Street, Poblacion, Makati City, NCR, 1200',
    );
    expect(details.vehicles.single.plateNumber, 'ABC-1234');
    expect(details.driversLicense?.status, 'approved');
    expect(details.driversLicense?.mimeType, 'image/png');
    expect(details.ewalletQrAvailable, isTrue);
  });

  test('downloads the authenticated driver-license image as bytes', () async {
    final client = MockClient((request) async {
      expect(request.method, 'GET');
      expect(request.url.path, '/api/courier/account/drivers-license');
      expect(request.headers['authorization'], 'Bearer rider-token');
      return http.Response.bytes(
        [1, 2, 3, 4],
        200,
        headers: {'content-type': 'image/png'},
      );
    });
    final service = RiderAuthService(
      apiClient: ApiClient(
        httpClient: client,
        tokenStore: _MemoryTokenStore(),
        baseUrl: 'https://cryma.test/api',
      ),
    );

    final file = await service.driversLicenseFile();

    expect(file.contentType, 'image/png');
    expect(file.bytes, [1, 2, 3, 4]);
  });
}
