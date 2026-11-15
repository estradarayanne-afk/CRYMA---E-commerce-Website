import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:logistics_cryma_app/services/address_service.dart';
import 'package:logistics_cryma_app/services/api_client.dart';

class _EmptyTokenStore implements TokenStore {
  @override
  Future<String?> read() async => null;

  @override
  Future<void> write(String token) async {}

  @override
  Future<void> delete() async {}
}

void main() {
  test('loads each address level from the local Laravel geography endpoint',
      () async {
    const expectedPaths = [
      'regions',
      'regions/1300000000/provinces',
      'regions/1300000000/provinces/1374000000/cities-municipalities',
      'regions/1300000000/provinces/1374000000/cities-municipalities/'
          '1374040000/barangays',
    ];
    var requestIndex = 0;
    final client = MockClient((request) async {
      expect(request.url.host, 'cryma.test');
      expect(request.url.path, '/api/philippine-address-options');
      expect(
        request.url.queryParameters['path'],
        expectedPaths[requestIndex++],
      );
      return http.Response(
        jsonEncode({
          'success': true,
          'data': [
            {'code': '1374040001', 'name': 'Barangay One'},
          ],
        }),
        200,
      );
    });
    final service = AddressService(
      apiClient: ApiClient(
        httpClient: client,
        tokenStore: _EmptyTokenStore(),
        baseUrl: 'https://cryma.test/api',
      ),
    );

    expect((await service.getRegions()).single.name, 'Barangay One');
    await service.getProvinces('1300000000');
    await service.getMunicipalities(
      '1300000000',
      provinceCode: '1374000000',
    );
    await service.getBarangays(
      '1300000000',
      '1374040000',
      provinceCode: '1374000000',
    );

    expect(requestIndex, expectedPaths.length);
  });
}
