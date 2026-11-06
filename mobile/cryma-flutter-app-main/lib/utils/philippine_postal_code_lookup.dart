import 'dart:convert';

import 'package:flutter/services.dart';

class PhilippinePostalCodeLookup {
  PhilippinePostalCodeLookup._();

  static Future<Map<String, Set<String>>>? _postalCodes;

  static Future<String> forLocality(String province, String locality) async {
    final normalizedProvince = _normalizePlaceName(province);
    final normalizedLocality = _normalizePlaceName(locality);
    if (normalizedProvince.isEmpty || normalizedLocality.isEmpty) return '';

    final index = await (_postalCodes ??= _loadPostalCodes());
    final codes = index['$normalizedProvince|$normalizedLocality'];
    return codes?.length == 1 ? codes!.single : '';
  }

  static Future<Map<String, Set<String>>> _loadPostalCodes() async {
    final contents =
        await rootBundle.loadString('assets/data/philpostZipCodes.json');
    final decoded = jsonDecode(contents);
    if (decoded is! Map<String, dynamic> || decoded['records'] is! List) {
      throw const FormatException('Postal-code reference data is invalid.');
    }

    final index = <String, Set<String>>{};
    for (final record in decoded['records'] as List) {
      if (record is! Map<String, dynamic>) continue;
      final province = _normalizePlaceName(record['province']?.toString() ?? '');
      final locality = _normalizePlaceName(record['locality']?.toString() ?? '');
      final postalCode = record['postalCode']?.toString().trim() ?? '';
      if (province.isEmpty || locality.isEmpty || postalCode.isEmpty) continue;

      index.putIfAbsent('$province|$locality', () => <String>{}).add(postalCode);
    }
    return index;
  }

  static String _normalizePlaceName(String value) {
    final words = value
        .toLowerCase()
        .replaceAll(RegExp(r'[^\p{L}\p{N}]+', unicode: true), ' ')
        .trim()
        .replaceFirst(
          RegExp(r'^(?:(?:city|municipality|province) of)\s+'),
          '',
        )
        .replaceFirst(RegExp(r'\s+(?:city|municipality|province)$'), '')
        .split(RegExp(r'\s+'))
        .where((word) => word.isNotEmpty)
        .map((word) {
          if (word == 'sta') return 'santa';
          if (word == 'sto') return 'santo';
          return word;
        });
    return words.join(' ');
  }
}
