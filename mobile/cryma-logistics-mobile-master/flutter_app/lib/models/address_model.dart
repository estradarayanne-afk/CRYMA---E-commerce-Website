class Region {
  final String code;
  final String name;

  Region({required this.code, required this.name});

  factory Region.fromJson(Map<String, dynamic> json) {
    return Region(
      code: json['code'] as String? ?? '',
      name: json['name'] as String? ?? '',
    );
  }

  /// PSGC API returns: { "code": "...", "name": "...", "regionName": "...", ... }
  factory Region.fromPsgc(Map<String, dynamic> json) {
    return Region(
      code: json['code'] as String? ?? '',
      name: json['name'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {'code': code, 'name': name};
}

class Province {
  final String code;
  final String name;
  final String regionCode;

  Province({required this.code, required this.name, required this.regionCode});

  factory Province.fromJson(Map<String, dynamic> json) {
    return Province(
      code: json['code'] as String? ?? '',
      name: json['name'] as String? ?? '',
      regionCode: json['regionCode'] as String? ?? '',
    );
  }

  factory Province.fromPsgc(Map<String, dynamic> json, String regionCode) {
    return Province(
      code: json['code'] as String? ?? '',
      name: json['name'] as String? ?? '',
      regionCode: regionCode,
    );
  }

  Map<String, dynamic> toJson() => {'code': code, 'name': name, 'regionCode': regionCode};
}

class Municipality {
  final String code;
  final String name;
  final String provinceCode;

  Municipality({required this.code, required this.name, required this.provinceCode});

  factory Municipality.fromJson(Map<String, dynamic> json) {
    return Municipality(
      code: json['code'] as String? ?? '',
      name: json['name'] as String? ?? '',
      provinceCode: json['provinceCode'] as String? ?? '',
    );
  }

  factory Municipality.fromPsgc(Map<String, dynamic> json, String provinceCode) {
    return Municipality(
      code: json['code'] as String? ?? '',
      name: json['name'] as String? ?? '',
      provinceCode: provinceCode,
    );
  }

  Map<String, dynamic> toJson() => {'code': code, 'name': name, 'provinceCode': provinceCode};
}

class Barangay {
  final String code;
  final String name;
  final String municipalityCode;

  Barangay({required this.code, required this.name, required this.municipalityCode});

  factory Barangay.fromJson(Map<String, dynamic> json) {
    return Barangay(
      code: json['code'] as String? ?? '',
      name: json['name'] as String? ?? '',
      municipalityCode: json['municipalityCode'] as String? ?? '',
    );
  }

  factory Barangay.fromPsgc(Map<String, dynamic> json, String municipalityCode) {
    return Barangay(
      code: json['code'] as String? ?? '',
      name: json['name'] as String? ?? '',
      municipalityCode: municipalityCode,
    );
  }

  Map<String, dynamic> toJson() => {'code': code, 'name': name, 'municipalityCode': municipalityCode};
}
