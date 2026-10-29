import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:cryma_logistics/providers/address_provider.dart';
import 'package:cryma_logistics/services/address_service.dart';
import 'package:cryma_logistics/models/address_model.dart';

class MockAddressService extends Mock implements AddressService {}

void main() {
  group('AddressProvider - Cascading Dropdowns', () {
    late AddressProvider addressProvider;
    late MockAddressService mockAddressService;

    setUp(() {
      mockAddressService = MockAddressService();
      addressProvider = AddressProvider(addressService: mockAddressService);
    });

    test('fetchRegions populates regions list', () async {
      final mockRegions = [
        Region(code: 'NCR', name: 'National Capital Region'),
        Region(code: '010000000', name: 'Ilocos Region'),
      ];

      when(mockAddressService.getRegions())
          .thenAnswer((_) => Future.value(mockRegions));

      await addressProvider.fetchRegions();

      expect(addressProvider.regions, equals(mockRegions));
      expect(addressProvider.regions.length, 2);
    });

    test('selectRegion clears dependent selections', () async {
      final mockRegions = [
        Region(code: 'NCR', name: 'National Capital Region'),
      ];
      final mockProvinces = <Province>[];

      when(mockAddressService.getRegions())
          .thenAnswer((_) => Future.value(mockRegions));
      when(mockAddressService.getProvinces('NCR'))
          .thenAnswer((_) => Future.value(mockProvinces));

      await addressProvider.fetchRegions();
      await addressProvider.selectRegion('NCR');

      expect(addressProvider.selectedRegion?.code, 'NCR');
      expect(addressProvider.selectedProvince, isNull);
      expect(addressProvider.selectedMunicipality, isNull);
      expect(addressProvider.selectedBarangay, isNull);
    });

    test('selectRegion fetches provinces', () async {
      final mockRegions = [
        Region(code: 'NCR', name: 'National Capital Region'),
      ];
      final mockProvinces = [
        Province(code: '133900000', name: 'City of Manila', regionCode: 'NCR'),
      ];

      when(mockAddressService.getRegions())
          .thenAnswer((_) => Future.value(mockRegions));
      when(mockAddressService.getProvinces('NCR'))
          .thenAnswer((_) => Future.value(mockProvinces));

      await addressProvider.fetchRegions();
      await addressProvider.selectRegion('NCR');

      expect(addressProvider.provinces.length, 1);
      verify(mockAddressService.getProvinces('NCR')).called(1);
    });

    test('changing region clears province selection', () async {
      final mockRegions = [
        Region(code: 'NCR', name: 'National Capital Region'),
        Region(code: '010000000', name: 'Ilocos Region'),
      ];
      final mockProvinces1 = [
        Province(code: '133900000', name: 'Manila', regionCode: 'NCR'),
      ];
      final mockProvinces2 = <Province>[];

      when(mockAddressService.getRegions())
          .thenAnswer((_) => Future.value(mockRegions));
      when(mockAddressService.getProvinces('NCR'))
          .thenAnswer((_) => Future.value(mockProvinces1));
      when(mockAddressService.getProvinces('010000000'))
          .thenAnswer((_) => Future.value(mockProvinces2));

      await addressProvider.fetchRegions();
      await addressProvider.selectRegion('NCR');
      expect(addressProvider.selectedRegion?.code, 'NCR');

      await addressProvider.selectRegion('010000000');
      expect(addressProvider.selectedRegion?.code, '010000000');
      expect(addressProvider.selectedProvince, isNull);
    });

    test('reset clears all selections', () async {
      addressProvider.reset();
      expect(addressProvider.selectedRegion, isNull);
      expect(addressProvider.selectedProvince, isNull);
      expect(addressProvider.selectedMunicipality, isNull);
      expect(addressProvider.selectedBarangay, isNull);
    });
  });
}
