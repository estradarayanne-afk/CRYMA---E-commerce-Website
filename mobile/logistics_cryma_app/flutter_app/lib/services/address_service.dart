import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/address_model.dart';

/// Uses the PSGC public API: https://psgc.gitlab.io/api/
/// Documentation: https://psgc.gitlab.io/api/
class AddressService {
  static const String _baseUrl = 'https://psgc.gitlab.io/api';
  static const Duration _timeout = Duration(seconds: 20);

  // In-memory cache
  List<Region>? _regionsCache;
  final Map<String, List<Province>> _provincesCache = {};
  final Map<String, List<Municipality>> _municipalitiesCache = {};
  final Map<String, List<Barangay>> _barangaysCache = {};

  AddressService();

  Future<List<Region>> getRegions() async {
    if (_regionsCache != null) return _regionsCache!;

    final response = await http
        .get(Uri.parse('$_baseUrl/regions/'))
        .timeout(_timeout);

    if (response.statusCode != 200) {
      throw Exception('Failed to load regions (${response.statusCode})');
    }

    final List<dynamic> data = jsonDecode(response.body) as List<dynamic>;
    _regionsCache = data
        .map((item) => Region.fromPsgc(item as Map<String, dynamic>))
        .toList()
      ..sort((a, b) => a.name.compareTo(b.name));
    return _regionsCache!;
  }

  Future<List<Province>> getProvinces(String regionCode) async {
    if (_provincesCache.containsKey(regionCode)) {
      return _provincesCache[regionCode]!;
    }

    final response = await http
        .get(Uri.parse('$_baseUrl/regions/$regionCode/provinces/'))
        .timeout(_timeout);

    if (response.statusCode != 200) {
      throw Exception('Failed to load provinces (${response.statusCode})');
    }

    final List<dynamic> data = jsonDecode(response.body) as List<dynamic>;
    final provinces = data
        .map((item) => Province.fromPsgc(item as Map<String, dynamic>, regionCode))
        .toList()
      ..sort((a, b) => a.name.compareTo(b.name));
    _provincesCache[regionCode] = provinces;
    return provinces;
  }

  Future<List<Municipality>> getMunicipalities(String provinceCode) async {
    if (_municipalitiesCache.containsKey(provinceCode)) {
      return _municipalitiesCache[provinceCode]!;
    }

    final response = await http
        .get(Uri.parse('$_baseUrl/provinces/$provinceCode/cities-municipalities/'))
        .timeout(_timeout);

    if (response.statusCode != 200) {
      throw Exception('Failed to load municipalities (${response.statusCode})');
    }

    final List<dynamic> data = jsonDecode(response.body) as List<dynamic>;
    final municipalities = data
        .map((item) => Municipality.fromPsgc(item as Map<String, dynamic>, provinceCode))
        .toList()
      ..sort((a, b) => a.name.compareTo(b.name));
    _municipalitiesCache[provinceCode] = municipalities;
    return municipalities;
  }

  Future<List<Barangay>> getBarangays(String municipalityCode) async {
    if (_barangaysCache.containsKey(municipalityCode)) {
      return _barangaysCache[municipalityCode]!;
    }

    final response = await http
        .get(Uri.parse('$_baseUrl/cities-municipalities/$municipalityCode/barangays/'))
        .timeout(_timeout);

    if (response.statusCode != 200) {
      throw Exception('Failed to load barangays (${response.statusCode})');
    }

    final List<dynamic> data = jsonDecode(response.body) as List<dynamic>;
    final barangays = data
        .map((item) => Barangay.fromPsgc(item as Map<String, dynamic>, municipalityCode))
        .toList()
      ..sort((a, b) => a.name.compareTo(b.name));
    _barangaysCache[municipalityCode] = barangays;
    return barangays;
  }

  void clearCache() {
    _regionsCache = null;
    _provincesCache.clear();
    _municipalitiesCache.clear();
    _barangaysCache.clear();
  }
}
