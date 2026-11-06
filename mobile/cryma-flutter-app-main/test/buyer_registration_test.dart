import 'package:flutter_test/flutter_test.dart';
import 'package:cryma_flutter_app/utils/buyer_registration.dart';

void main() {
  group('BuyerRegistrationRules', () {
    test('validates name length and rejects unsupported characters', () {
      final thirtyCharacters = List.filled(30, 'A').join();
      final thirtyOneCharacters = List.filled(31, 'A').join();

      expect(BuyerRegistrationRules.validateName(thirtyCharacters), isNull);
      expect(
        BuyerRegistrationRules.validateName(thirtyOneCharacters),
        isNotNull,
      );
      expect(BuyerRegistrationRules.validateName('Ana Maria'), isNull);
      expect(BuyerRegistrationRules.validateName('Ana_1'), isNotNull);
    });

    test('keeps middle initial optional and enforces the two-character rule',
        () {
      expect(BuyerRegistrationRules.validateMiddleInitial(''), isNull);
      expect(BuyerRegistrationRules.validateMiddleInitial('Q.'), isNull);
      expect(BuyerRegistrationRules.validateMiddleInitial('AB'), isNotNull);
    });

    test('accepts 254-character email and rejects longer or invalid values',
        () {
      final email = '${List.filled(242, 'a').join()}@example.com';

      expect(email.length, 254);
      expect(BuyerRegistrationRules.validateEmail(email), isNull);
      expect(
        BuyerRegistrationRules.validateEmail(
            '${List.filled(243, 'a').join()}@example.com'),
        isNotNull,
      );
      expect(BuyerRegistrationRules.validateEmail('not-an-email'), isNotNull);
    });

    test('normalizes an 09 mobile number to the Laravel international format',
        () {
      expect(BuyerRegistrationRules.validatePhone('09171234567'), isNull);
      expect(
        BuyerRegistrationRules.normalizePhone('09171234567'),
        '+639171234567',
      );
      expect(BuyerRegistrationRules.validatePhone('08171234567'), isNotNull);
    });

    test('accepts password length boundaries without composition rules', () {
      expect(BuyerRegistrationRules.validatePassword('abcdefgh'), isNull);
      expect(
        BuyerRegistrationRules.validatePassword(List.filled(128, 'a').join()),
        isNull,
      );
      expect(BuyerRegistrationRules.validatePassword('short'), isNotNull);
      expect(
        BuyerRegistrationRules.validatePassword(
          List.filled(129, 'a').join(),
        ),
        isNotNull,
      );
      expect(
        BuyerRegistrationRules.validatePasswordConfirmation(
          'different',
          'abcdefgh',
        ),
        isNotNull,
      );
    });

    test('requires an exact eighteenth birthday and rejects younger users', () {
      final today = DateTime.utc(2025, 3, 1);

      expect(
        BuyerRegistrationRules.validateBirthday(
          '2007-03-01',
          today: today,
        ),
        isNull,
      );
      expect(
        BuyerRegistrationRules.validateBirthday(
          '2007-03-02',
          today: today,
        ),
        isNotNull,
      );
    });

    test('matches Laravel valid ID types and five-megabyte maximum', () {
      expect(
        BuyerRegistrationRules.validateDocument(
          name: 'identity.pdf',
          size: 5 * 1024 * 1024,
        ),
        isNull,
      );
      expect(
        BuyerRegistrationRules.validateDocument(
          name: 'identity.gif',
          size: 100,
        ),
        isNotNull,
      );
      expect(
        BuyerRegistrationRules.validateDocument(
          name: 'identity.png',
          size: 5 * 1024 * 1024 + 1,
        ),
        isNotNull,
      );
    });

    test('requires terms and privacy consent independently', () {
      expect(
        BuyerRegistrationRules.validateConsent(
          termsAccepted: true,
          privacyAcknowledged: false,
        ),
        isNotNull,
      );
      expect(
        BuyerRegistrationRules.validateConsent(
          termsAccepted: false,
          privacyAcknowledged: true,
        ),
        isNotNull,
      );
      expect(
        BuyerRegistrationRules.validateConsent(
          termsAccepted: true,
          privacyAcknowledged: true,
        ),
        isNull,
      );
    });

    test('builds the full backend address payload and field-error destinations',
        () {
      final payload = BuyerRegistrationRules.buildPayload(
        personal: {
          'firstName': 'Ana',
          'middleInitial': 'Q.',
          'lastName': 'Santos',
          'sex': 'female',
          'birthday': '2000-01-01',
        },
        contact: {
          'email': 'ANA@example.com',
          'contactNumber': '09171234567',
        },
        address: {
          'region': 'NCR',
          'province': 'Metro Manila',
          'municipality': 'Manila',
          'barangay': 'Sample',
          'houseNumber': '12',
          'street': 'Rizal Street',
          'buildingName': 'Tower A',
          'unitNumber': '4B',
          'postalCode': '1000',
        },
        password: 'abcdefgh',
        passwordConfirmation: 'abcdefgh',
        termsVersion: 'terms-v1',
        privacyVersion: 'privacy-v1',
      );

      expect(payload['email'], 'ana@example.com');
      expect(payload['phone'], '+639171234567');
      expect(payload['building_name'], 'Tower A');
      expect(payload['unit_number'], '4B');
      expect(payload['postal_code'], '1000');
      expect(payload['terms_accepted'], '1');
      expect(payload['privacy_notice_acknowledged'], '1');
      expect(
        BuyerRegistrationRules.routeForField('building_name'),
        '/register_address',
      );
      expect(
        BuyerRegistrationRules.routeForField('valid_id'),
        '/register_id',
      );
    });
  });
}
