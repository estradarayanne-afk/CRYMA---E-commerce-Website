import 'dart:convert';

import 'package:cryma_flutter_app/models/buyer_address.dart';
import 'package:cryma_flutter_app/screens/account/add_address_screen.dart';
import 'package:cryma_flutter_app/screens/account/address_book_screen.dart';
import 'package:cryma_flutter_app/services/api_service.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  final row = <String, dynamic>{
    'id': 17,
    'label': 'home',
    'recipient_name': 'QA Buyer',
    'phone': '+639171234567',
    'region': 'Region VII',
    'province': 'Cebu',
    'municipality': 'Carmen',
    'barangay': 'Luyang',
    'house_number': '12',
    'building_name': 'Tower A',
    'unit_number': '4B',
    'street': 'Sample Road',
    'postal_code': '1105',
    'is_default': true,
  };

  setUp(() => SharedPreferences.setMockInitialValues({
        'cryma_api_token': 'qa-token',
        'cryma_api_user': jsonEncode({
          'role': 'buyer',
          'first_name': 'QA',
          'middle_name': null,
          'last_name': 'Buyer',
          'phone': '+639171234567',
        }),
      }));

  test('address parser and payload retain backend field names and default flag',
      () {
    final address = BuyerAddress.fromJson(row);
    expect(address.id, 17);
    expect(address.isDefault, isTrue);
    expect(address.formattedAddress, contains('Luyang'));
    expect(address.toPayload(makeDefault: false), {
      'label': 'home',
      'recipient_name': 'QA Buyer',
      'phone': '+639171234567',
      'region': 'Region VII',
      'province': 'Cebu',
      'municipality': 'Carmen',
      'barangay': 'Luyang',
      'house_number': '12',
      'building_name': 'Tower A',
      'unit_number': '4B',
      'street': 'Sample Road',
      'postal_code': '1105',
      'is_default': false,
    });
  });

  test('address list and checkout use authenticated Buyer API contracts',
      () async {
    final seen = <http.Request>[];
    final api = ApiService(
      baseUrl: 'https://qa.example.test',
      client: MockClient((request) async {
        seen.add(request);
        final body = request.url.path.endsWith('/buyer/addresses')
            ? {
                'success': true,
                'data': [row]
              }
            : {
                'success': true,
                'data': {
                  'addresses': [row]
                }
              };
        return http.Response(jsonEncode(body), 200,
            headers: {'content-type': 'application/json'});
      }),
    );

    final addresses = await api.getBuyerAddresses();
    final checkout = await api.getCheckoutData();
    expect(addresses.single['id'], 17);
    expect(checkout['addresses'], hasLength(1));
    expect(seen.map((request) => request.url.path), [
      '/api/buyer/addresses',
      '/api/buyer/checkout-data',
    ]);
    expect(
      seen.every((request) => request.headers.entries.any(
            (entry) =>
                entry.key.toLowerCase() == 'authorization' &&
                entry.value == 'Bearer qa-token',
          )),
      isTrue,
    );
  });

  test('cached buyer profile exposes delivery recipient information', () async {
    final api = ApiService(
      baseUrl: 'https://qa.example.test',
      client: MockClient((_) async => http.Response('{}', 200)),
    );

    final buyer = await api.getCachedBuyerProfile();

    expect(buyer['first_name'], 'QA');
    expect(buyer['last_name'], 'Buyer');
    expect(buyer['phone'], '+639171234567');
  });

  testWidgets('address form generates a postal code for a known locality',
      (tester) async {
    final api = ApiService(
      baseUrl: 'https://qa.example.test',
      client: MockClient((request) async {
        final options = switch (request.url.queryParameters['path']) {
          'regions' => [
              {'name': 'Cordillera Administrative Region', 'code': '1400000000'}
            ],
          'regions/1400000000/provinces' => [
              {'name': 'Benguet', 'code': '1401100000'}
            ],
          'regions/1400000000/provinces/1401100000/cities-municipalities' => [
              {'name': 'Baguio', 'code': '1401101000'}
            ],
          'regions/1400000000/provinces/1401100000/cities-municipalities/1401101000/barangays' =>
            [
              {'name': 'Camp 7', 'code': '1401101001'}
            ],
          _ => <Map<String, dynamic>>[],
        };
        return http.Response(
          jsonEncode({'success': true, 'data': options}),
          200,
          headers: {'content-type': 'application/json'},
        );
      }),
    );

    await tester
        .pumpWidget(MaterialApp(home: AddAddressScreen(apiService: api)));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Select Region'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cordillera Administrative Region').last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Select Province'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Benguet').last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Select City / Municipality'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Baguio').last);
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 100)),
    );
    await tester.pump();
    await tester.scrollUntilVisible(
      find.text('POSTAL CODE *'),
      300,
      scrollable: find.byType(Scrollable).first,
    );

    final postalFieldFinder = find.byWidgetPredicate(
      (widget) =>
          widget is TextField &&
          widget.decoration?.hintText == '4-digit postal code',
    );
    final postalField = tester.widget<TextField>(postalFieldFinder);
    expect(
      postalField.decoration?.helperText,
      'Generated from the locality postal-code reference.',
    );
    expect(postalField.controller!.text, '2600');
    expect(postalField.readOnly, isTrue);
  });

  test('address options are fetched through the authenticated buyer API',
      () async {
    http.Request? seen;
    final api = ApiService(
      baseUrl: 'https://qa.example.test',
      client: MockClient((request) async {
        seen = request;
        return http.Response(
          jsonEncode({
            'success': true,
            'data': [
              {'name': 'Region VII', 'code': '070000000'}
            ],
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }),
    );

    final options = await api.getBuyerAddressOptions('regions');

    expect(options.single['name'], 'Region VII');
    expect(seen?.url.path, '/api/buyer/address-options');
    expect(seen?.url.queryParameters['path'], 'regions');
    expect(
      seen?.headers.entries.any(
        (entry) =>
            entry.key.toLowerCase() == 'authorization' &&
            entry.value.isNotEmpty,
      ),
      isTrue,
    );
  });

  testWidgets('address book opens add form and edits a saved address',
      (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final seen = <http.Request>[];
    final api = ApiService(
      baseUrl: 'https://qa.example.test',
      client: MockClient((request) async {
        seen.add(request);
        if (request.url.path == '/api/buyer/addresses' &&
            request.method == 'GET') {
          return http.Response(
            jsonEncode({
              'success': true,
              'data': [row],
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (request.url.path == '/api/buyer/address-options') {
          final options = switch (request.url.queryParameters['path']) {
            'regions' => [
                {'name': 'Region VII', 'code': '0700000000'}
              ],
            'regions/0700000000/provinces' => [
                {'name': 'Cebu', 'code': '0702200000'}
              ],
            'regions/0700000000/provinces/0702200000/cities-municipalities' => [
                {'name': 'Carmen', 'code': '0702215000'}
              ],
            'regions/0700000000/provinces/0702200000/cities-municipalities/0702215000/barangays' =>
              [
                {'name': 'Luyang', 'code': '0702215015'}
              ],
            _ => <Map<String, String>>[],
          };
          return http.Response(
            jsonEncode({'success': true, 'data': options}),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        if (request.url.path == '/api/buyer/addresses/17' &&
            request.method == 'PATCH') {
          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                ...row,
                ...jsonDecode(request.body) as Map<String, dynamic>
              }
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        }
        return http.Response(
          jsonEncode({'success': true, 'data': row}),
          200,
          headers: {'content-type': 'application/json'},
        );
      }),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: AddressBookScreen(apiService: api),
        onGenerateRoute: (settings) {
          if (settings.name == '/add_address') {
            return MaterialPageRoute<bool>(
              builder: (_) => AddAddressScreen(
                address: settings.arguments as BuyerAddress?,
                apiService: api,
              ),
            );
          }
          return null;
        },
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Add New Address'));
    await tester.pumpAndSettle();
    expect(find.text('Add New Address'), findsOneWidget);
    expect(find.text('Recipient name'), findsNothing);
    expect(find.text('Philippine mobile number'), findsNothing);
    expect(find.text('PHILIPPINE LOCATION'), findsOneWidget);
    expect(find.text('MANUAL ADDRESS'), findsOneWidget);
    await tester.tap(find.text('Select Region'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Region VII').last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Select Province'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cebu').last);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Select City / Municipality'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Carmen').last);
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 100)),
    );
    await tester.pump();
    await tester.tap(find.text('Select Barangay'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Choose Barangay'), findsOneWidget);
    await tester.tap(find.text('Luyang').last);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    final scrollable = find.byType(Scrollable).first;
    await tester.scrollUntilVisible(
      find.text('HOUSE / LOT NUMBER *'),
      300,
      scrollable: scrollable,
    );
    final houseField = find.descendant(
      of: find
          .ancestor(
            of: find.text('HOUSE / LOT NUMBER *'),
            matching: find.byType(Column),
          )
          .first,
      matching: find.byType(TextFormField),
    );
    await tester.enterText(houseField, '123');
    await tester.scrollUntilVisible(
      find.text('STREET *'),
      300,
      scrollable: scrollable,
    );
    final streetField = find.descendant(
      of: find
          .ancestor(
            of: find.text('STREET *'),
            matching: find.byType(Column),
          )
          .first,
      matching: find.byType(TextFormField),
    );
    await tester.enterText(streetField, 'Main Road');
    await tester.scrollUntilVisible(
      find.text('POSTAL CODE *'),
      300,
      scrollable: scrollable,
    );
    final postalFieldFinder = find.byWidgetPredicate(
      (widget) =>
          widget is TextField &&
          widget.decoration?.hintText == '4-digit postal code',
    );
    await tester.enterText(postalFieldFinder, '6005');
    await tester.scrollUntilVisible(
      find.text('Save Address'),
      400,
      scrollable: scrollable,
    );
    await tester.tap(find.text('Save Address'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('Add this address?'), findsOneWidget);
    await tester.tap(find.text('Add address'));
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));
    await tester.runAsync(
      () => Future<void>.delayed(const Duration(milliseconds: 100)),
    );
    await tester.pump();
    expect(find.text('Address saved.'), findsOneWidget);
    final createRequest = seen.firstWhere(
      (request) =>
          request.method == 'POST' &&
          request.url.path == '/api/buyer/addresses',
    );
    final createdAddress =
        jsonDecode(createRequest.body) as Map<String, dynamic>;
    expect(createdAddress['recipient_name'], 'QA Buyer');
    expect(createdAddress['phone'], '+639171234567');
    expect(createdAddress['region'], 'Region VII');
    expect(createdAddress['province'], 'Cebu');
    expect(createdAddress['municipality'], 'Carmen');
    expect(createdAddress['barangay'], 'Luyang');
    expect(createdAddress['house_number'], '123');
    expect(createdAddress['street'], 'Main Road');
    expect(createdAddress['postal_code'], '6005');

    await tester.tap(find.byTooltip('Edit address'));
    await tester.pumpAndSettle();
    expect(find.text('Edit Address'), findsOneWidget);
    expect(
      tester
          .widget<TextFormField>(find.byType(TextFormField).first)
          .controller!
          .text,
      '12',
    );
    expect(
      seen.map((request) => '${request.method} ${request.url.path}'
          '${request.url.query.isEmpty ? '' : '?${request.url.query}'}'),
      containsAll([
        'GET /api/buyer/address-options?path=regions',
        'GET /api/buyer/address-options?path=regions%2F0700000000%2Fprovinces',
      ]),
    );
    await tester.scrollUntilVisible(
      find.text('Save Changes'),
      400,
      scrollable: find
          .descendant(
            of: find.byType(ListView),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    await tester.tap(find.text('Save Changes'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Save changes'));
    await tester.pumpAndSettle();

    expect(
      seen.any((request) =>
          request.method == 'PATCH' &&
          request.url.path == '/api/buyer/addresses/17'),
      isTrue,
    );
  });

  test('create, edit, default, and delete use the registered endpoint methods',
      () async {
    final seen = <http.Request>[];
    final api = ApiService(
      baseUrl: 'https://qa.example.test',
      client: MockClient((request) async {
        seen.add(request);
        return http.Response(jsonEncode({'success': true, 'data': row}), 200,
            headers: {'content-type': 'application/json'});
      }),
    );
    final payload = BuyerAddress.fromJson(row).toPayload(makeDefault: true);

    await api.createBuyerAddress(payload);
    await api.updateBuyerAddress(17, payload);
    await api.setDefaultBuyerAddress(17);
    await api.deleteBuyerAddress(17);

    expect(seen.map((request) => '${request.method} ${request.url.path}'), [
      'POST /api/buyer/addresses',
      'PATCH /api/buyer/addresses/17',
      'PATCH /api/buyer/addresses/17/default',
      'DELETE /api/buyer/addresses/17',
    ]);
    expect(jsonDecode(seen.first.body)['recipient_name'], 'QA Buyer');
  });

  test('validation errors preserve backend field messages and status',
      () async {
    final api = ApiService(
      baseUrl: 'https://qa.example.test',
      client: MockClient((_) async => http.Response(
            jsonEncode({
              'message': 'The given data was invalid.',
              'errors': {
                'region': ['Select a supported region.']
              },
            }),
            422,
            headers: {'content-type': 'application/json'},
          )),
    );
    await expectLater(
      api.createBuyerAddress(
          BuyerAddress.fromJson(row).toPayload(makeDefault: false)),
      throwsA(isA<ApiException>()
          .having((error) => error.statusCode, 'statusCode', 422)
          .having((error) => error.fieldErrors['region'], 'region error',
              'Select a supported region.')),
    );
  });

  test(
      'authenticated address requests fail before network when token is absent',
      () async {
    SharedPreferences.setMockInitialValues({});
    var requested = false;
    final api = ApiService(
      baseUrl: 'https://qa.example.test',
      client: MockClient((_) async {
        requested = true;
        return http.Response('{}', 200);
      }),
    );
    await expectLater(api.getBuyerAddresses(), throwsA(isA<ApiException>()));
    expect(requested, isFalse);
  });
}
