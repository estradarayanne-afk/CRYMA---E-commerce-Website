import 'api_client.dart';

class PsgcEntry {
  const PsgcEntry({required this.code, required this.name});

  final String code;
  final String name;

  factory PsgcEntry.fromJson(Map<String, dynamic> json) {
    final code = json['code'];
    final name = json['name'];
    if (code is! String || name is! String) {
      throw const ApiException(
        'The CRYMA server returned invalid Philippine address data.',
      );
    }
    return PsgcEntry(code: code, name: name);
  }
}

class AddressService {
  AddressService({ApiClient? apiClient})
      : _api = apiClient ?? ApiClient.instance;

  static final instance = AddressService();

  final ApiClient _api;
  final Map<String, Future<List<PsgcEntry>>> _cache = {};

  Future<List<PsgcEntry>> getRegions() => _load('regions');

  Future<List<PsgcEntry>> getProvinces(String regionCode) =>
      _load('regions/$regionCode/provinces');

  Future<List<PsgcEntry>> getMunicipalities(
    String regionCode, {
    String? provinceCode,
  }) {
    final path = provinceCode == null
        ? 'regions/$regionCode/cities-municipalities'
        : 'regions/$regionCode/provinces/$provinceCode/cities-municipalities';
    return _load(path);
  }

  Future<List<PsgcEntry>> getBarangays(
    String regionCode,
    String municipalityCode, {
    String? provinceCode,
  }) {
    final path = provinceCode == null
        ? 'regions/$regionCode/cities-municipalities/$municipalityCode/barangays'
        : 'regions/$regionCode/provinces/$provinceCode/'
            'cities-municipalities/$municipalityCode/barangays';
    return _load(path);
  }

  Future<List<PsgcEntry>> _load(String path) async {
    final cached = _cache[path];
    if (cached != null) return cached;

    final request = _fetch(path);
    _cache[path] = request;
    try {
      return await request;
    } catch (_) {
      _cache.remove(path);
      rethrow;
    }
  }

  Future<List<PsgcEntry>> _fetch(String path) async {
    final response = await _api.get(
      'philippine-address-options?path=${Uri.encodeQueryComponent(path)}',
    );
    final options = response['data'];
    if (options is! List) {
      throw const ApiException(
        'The CRYMA server returned invalid Philippine address data.',
      );
    }
    return options
        .map((option) {
          if (option is! Map) {
            throw const ApiException(
              'The CRYMA server returned invalid Philippine address data.',
            );
          }
          return PsgcEntry.fromJson(Map<String, dynamic>.from(option));
        })
        .toList(growable: false);
  }
}
