import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

class BuyerRegistrationRules {
  static const maxEmailLength = 254;
  static const maxPasswordLength = 128;
  static const maxNameLength = 30;
  static const maxHouseNumberLength = 20;
  static const maxStreetLength = 100;
  static const maxBuildingNameLength = 80;
  static const maxUnitNumberLength = 30;

  static final _namePattern = RegExp(
    r"^[\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+)*$",
    unicode: true,
  );
  static final _middleInitialPattern =
      RegExp(r'^\p{L}\p{M}*\.?$', unicode: true);
  static final _emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

  static int characterLength(String value) => value.runes.length;

  static DateTime latestEligibleBirthday({DateTime? today}) {
    final current =
        today ?? DateTime.now().toUtc().add(const Duration(hours: 8));
    final year = current.year - 13;
    final candidate = DateTime(year, current.month, current.day);
    if (candidate.month != current.month || candidate.day != current.day) {
      return DateTime(year, current.month + 1, 0);
    }
    return candidate;
  }

  static String capitalizeNameWords(String value) => value.replaceAllMapped(
        RegExp(r"(^|[\s'-])(\p{L})", unicode: true),
        (match) => '${match.group(1)}${match.group(2)!.toUpperCase()}',
      );

  static String? validateName(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) return 'This field is required.';
    if (characterLength(trimmed) > maxNameLength) {
      return 'Must not exceed $maxNameLength characters.';
    }
    if (!_namePattern.hasMatch(trimmed)) {
      return 'Use letters, spaces, hyphens, or apostrophes.';
    }
    return null;
  }

  static String? validateMiddleInitial(String? value) {
    final trimmed = value?.trim() ?? '';
    if (trimmed.isEmpty) return null;
    if (characterLength(trimmed) > 2 ||
        !_middleInitialPattern.hasMatch(trimmed)) {
      return 'Enter one letter with an optional period.';
    }
    return null;
  }

  static String? validateEmail(String? value) {
    final email = value?.trim() ?? '';
    final length = characterLength(email);
    if (length < 3 ||
        length > maxEmailLength ||
        !_emailPattern.hasMatch(email)) {
      return 'Enter a valid email address (3–254 characters).';
    }
    return null;
  }

  static String compactPhone(String value) =>
      value.replaceAll(RegExp(r'[\s()-]'), '');

  static String? validatePhone(String? value) {
    final phone = compactPhone(value ?? '');
    if (!RegExp(r'^09\d{9}$').hasMatch(phone)) {
      return 'Enter an 11-digit mobile number starting with 09.';
    }
    return null;
  }

  static String normalizePhone(String value) {
    final compact = compactPhone(value);
    if (RegExp(r'^09\d{9}$').hasMatch(compact)) {
      return '+63${compact.substring(1)}';
    }
    return compact;
  }

  static String? validatePassword(String? value) {
    final password = value ?? '';
    final length = characterLength(password);
    if (length < 8 || length > maxPasswordLength) {
      return 'Password must be 8–128 characters.';
    }
    return null;
  }

  static String? validatePasswordConfirmation(
    String? value,
    String password,
  ) {
    if ((value ?? '').isEmpty) return 'Please confirm your password.';
    if (value != password) return 'Passwords do not match.';
    return null;
  }

  static int? ageOnDate(String value, {DateTime? today}) {
    final match = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$').firstMatch(value);
    if (match == null) return null;
    final year = int.parse(match.group(1)!);
    final month = int.parse(match.group(2)!);
    final day = int.parse(match.group(3)!);
    final birthday = DateTime.utc(year, month, day);
    if (birthday.year != year ||
        birthday.month != month ||
        birthday.day != day) {
      return null;
    }
    final localToday =
        today ?? DateTime.now().toUtc().add(const Duration(hours: 8));
    final current =
        DateTime.utc(localToday.year, localToday.month, localToday.day);
    if (birthday.isAfter(current)) return null;
    var age = current.year - year;
    if (current.month < month ||
        (current.month == month && current.day < day)) {
      age--;
    }
    return age;
  }

  static String? validateBirthday(String? value, {DateTime? today}) {
    final age = ageOnDate(value ?? '', today: today);
    if (age == null) return 'Enter a valid birthday that is not in the future.';
    if (age < 13) return 'You must be at least 13 years old to register.';
    return null;
  }

  static String? validateDocument({required String name, required int size}) {
    final extension = name.split('.').last.toLowerCase();
    if (!const {'jpg', 'jpeg', 'png', 'pdf'}.contains(extension)) {
      return 'Choose a JPG, JPEG, PNG, or PDF file.';
    }
    if (size <= 0 || size > 5 * 1024 * 1024) {
      return 'The file must be no larger than 5 MB.';
    }
    return null;
  }

  static String? validateConsent({
    required bool termsAccepted,
    required bool privacyAcknowledged,
  }) {
    if (!termsAccepted) return 'Accept the Terms and Conditions to continue.';
    if (!privacyAcknowledged) {
      return 'Acknowledge the Privacy Notice to continue.';
    }
    return null;
  }

  static Map<String, dynamic> buildPayload({
    required Map<String, dynamic> personal,
    required Map<String, dynamic> contact,
    required Map<String, dynamic> address,
    required String password,
    required String passwordConfirmation,
    required String termsVersion,
    required String privacyVersion,
  }) {
    final rawSex = (personal['sex'] as String? ?? '').toLowerCase();
    final sex = rawSex == 'male'
        ? 'male'
        : rawSex == 'female'
            ? 'female'
            : 'prefer_not_to_say';

    return {
      'first_name': personal['firstName'] ?? '',
      'middle_name': personal['middleInitial'] ?? '',
      'last_name': personal['lastName'] ?? '',
      'sex': sex,
      'birthday': personal['birthday'] ?? '',
      'email': (contact['email'] as String? ?? '').trim().toLowerCase(),
      'phone': normalizePhone(contact['contactNumber'] as String? ?? ''),
      'password': password,
      'password_confirmation': passwordConfirmation,
      'role': 'buyer',
      'region': address['region'] ?? '',
      'province': address['province'] ?? '',
      'municipality': address['municipality'] ?? '',
      'barangay': address['barangay'] ?? '',
      'house_number': address['houseNumber'] ?? '',
      'street': address['street'] ?? '',
      'building_name': address['buildingName'] ?? '',
      'unit_number': address['unitNumber'] ?? '',
      'postal_code': address['postalCode'] ?? '',
      'terms_accepted': '1',
      'terms_version': termsVersion,
      'privacy_notice_acknowledged': '1',
      'privacy_version': privacyVersion,
    };
  }

  static String? routeForField(String field) {
    if (const {
      'first_name',
      'middle_name',
      'last_name',
      'sex',
      'birthday',
    }.contains(field)) {
      return '/register_personal';
    }
    if (field == 'phone') return '/register_address';
    if (field == 'email') return '/register_account';
    if (const {
      'region',
      'province',
      'municipality',
      'barangay',
      'house_number',
      'street',
      'building_name',
      'unit_number',
      'postal_code',
    }.contains(field)) {
      return '/register_address';
    }
    if (const {'password', 'password_confirmation'}.contains(field)) {
      return '/register_account';
    }
    if (field == 'valid_id') return '/register_id';
    return null;
  }
}

class CapitalizeNameWordsFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final text = BuyerRegistrationRules.capitalizeNameWords(newValue.text);
    if (text == newValue.text) return newValue;

    int transformOffset(int offset) {
      if (offset < 0) return offset;
      final safeOffset = offset.clamp(0, newValue.text.length);
      return BuyerRegistrationRules.capitalizeNameWords(
        newValue.text.substring(0, safeOffset),
      ).length;
    }

    return newValue.copyWith(
      text: text,
      selection: TextSelection(
        baseOffset: transformOffset(newValue.selection.baseOffset),
        extentOffset: transformOffset(newValue.selection.extentOffset),
        affinity: newValue.selection.affinity,
        isDirectional: newValue.selection.isDirectional,
      ),
    );
  }
}

class BuyerRegistrationErrorStore extends ChangeNotifier {
  BuyerRegistrationErrorStore._();

  static final instance = BuyerRegistrationErrorStore._();

  Map<String, String> _errors = {};

  Map<String, String> get errors => Map.unmodifiable(_errors);

  String? errorFor(String field) => _errors[field];

  void setErrors(Map<String, String> errors) {
    _errors = Map.of(errors);
    notifyListeners();
  }

  void clearField(String field) {
    if (_errors.remove(field) != null) notifyListeners();
  }

  void clear() {
    if (_errors.isEmpty) return;
    _errors = {};
    notifyListeners();
  }
}
