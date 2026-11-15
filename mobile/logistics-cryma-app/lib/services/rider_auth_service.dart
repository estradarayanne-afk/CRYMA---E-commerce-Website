import 'api_client.dart';

class RiderRegistrationPolicies {
  const RiderRegistrationPolicies({
    required this.termsVersion,
    required this.privacyVersion,
  });

  final String termsVersion;
  final String privacyVersion;
}

class RiderAccount {
  const RiderAccount({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.role,
    required this.status,
    this.phone,
  });

  final int id;
  final String firstName;
  final String lastName;
  final String email;
  final String role;
  final String status;
  final String? phone;

  String get fullName => '$firstName $lastName'.trim();

  factory RiderAccount.fromJson(Map<String, dynamic> json) {
    final id = json['id'];
    if (id is! num ||
        json['email'] is! String ||
        json['role'] is! String ||
        json['status'] is! String) {
      throw const ApiException('The CRYMA server returned an invalid account.');
    }
    return RiderAccount(
      id: id.toInt(),
      firstName: json['first_name'] as String? ?? '',
      lastName: json['last_name'] as String? ?? '',
      email: json['email'] as String,
      role: json['role'] as String,
      status: json['status'] as String,
      phone: json['phone'] as String?,
    );
  }
}

class RiderAccountDetails {
  const RiderAccountDetails({
    required this.account,
    required this.middleName,
    required this.emailVerified,
    required this.sex,
    required this.birthday,
    required this.address,
    required this.vehicles,
    required this.driversLicense,
    required this.ewalletQrAvailable,
    this.isSummaryOnly = false,
  });

  final RiderAccount account;
  final String? middleName;
  final bool emailVerified;
  final String? sex;
  final String? birthday;
  final RiderAddress? address;
  final List<RiderVehicle> vehicles;
  final RiderDriverLicense? driversLicense;
  final bool ewalletQrAvailable;
  final bool isSummaryOnly;

  factory RiderAccountDetails.fromJson(Map<String, dynamic> response) {
    final rawData = response['data'];
    if (rawData is! Map) {
      throw const ApiException(
          'The CRYMA server returned invalid account details.');
    }
    final data = Map<String, dynamic>.from(rawData);
    final rawUser = data['user'];
    final rawProfile = data['profile'];
    final rawVehicles = data['vehicles'];
    final rawLicense = data['drivers_license'];
    if (rawUser is! Map ||
        rawProfile is! Map ||
        rawVehicles is! List ||
        (rawLicense != null && rawLicense is! Map) ||
        data['ewallet_qr_available'] is! bool) {
      throw const ApiException(
          'The CRYMA server returned invalid account details.');
    }

    final rawAddress = data['address'];
    if (rawAddress != null && rawAddress is! Map) {
      throw const ApiException(
          'The CRYMA server returned invalid account details.');
    }
    final vehicles = <RiderVehicle>[];
    for (final rawVehicle in rawVehicles) {
      if (rawVehicle is! Map) {
        throw const ApiException(
            'The CRYMA server returned invalid account details.');
      }
      vehicles
          .add(RiderVehicle.fromJson(Map<String, dynamic>.from(rawVehicle)));
    }

    final user = Map<String, dynamic>.from(rawUser);
    final profile = Map<String, dynamic>.from(rawProfile);
    final license = rawLicense is Map
        ? RiderDriverLicense.fromJson(Map<String, dynamic>.from(rawLicense))
        : null;

    return RiderAccountDetails(
      account: RiderAccount.fromJson(user),
      middleName: _optionalString(user['middle_name']),
      emailVerified: user['email_verified_at'] is String &&
          (user['email_verified_at'] as String).isNotEmpty,
      sex: _optionalString(profile['sex']),
      birthday: _optionalString(profile['birthday']),
      address: rawAddress is Map
          ? RiderAddress.fromJson(Map<String, dynamic>.from(rawAddress))
          : null,
      vehicles: vehicles,
      driversLicense: license,
      ewalletQrAvailable: data['ewallet_qr_available'] as bool,
    );
  }

  static String? _optionalString(dynamic value) =>
      value is String && value.isNotEmpty ? value : null;
}

class RiderAddress {
  const RiderAddress({
    this.region,
    this.province,
    this.municipality,
    this.barangay,
    this.street,
    this.houseNumber,
    this.buildingName,
    this.unitNumber,
    this.postalCode,
  });

  final String? region;
  final String? province;
  final String? municipality;
  final String? barangay;
  final String? street;
  final String? houseNumber;
  final String? buildingName;
  final String? unitNumber;
  final String? postalCode;

  String get formatted => [
        unitNumber,
        buildingName,
        houseNumber,
        street,
        barangay,
        municipality,
        province,
        region,
        postalCode,
      ].whereType<String>().where((part) => part.trim().isNotEmpty).join(', ');

  factory RiderAddress.fromJson(Map<String, dynamic> json) => RiderAddress(
        region: _readString(json['region']),
        province: _readString(json['province']),
        municipality: _readString(json['municipality']),
        barangay: _readString(json['barangay']),
        street: _readString(json['street']),
        houseNumber: _readString(json['house_number']),
        buildingName: _readString(json['building_name']),
        unitNumber: _readString(json['unit_number']),
        postalCode: _readString(json['postal_code']),
      );

  static String? _readString(dynamic value) =>
      value is String && value.isNotEmpty ? value : null;
}

class RiderVehicle {
  const RiderVehicle({required this.type, required this.plateNumber});

  final String type;
  final String plateNumber;

  factory RiderVehicle.fromJson(Map<String, dynamic> json) {
    if (json['vehicle_type'] is! String || json['plate_number'] is! String) {
      throw const ApiException(
          'The CRYMA server returned invalid account details.');
    }
    return RiderVehicle(
      type: json['vehicle_type'] as String,
      plateNumber: json['plate_number'] as String,
    );
  }
}

class RiderDriverLicense {
  const RiderDriverLicense({
    required this.status,
    required this.fileName,
    required this.mimeType,
    required this.uploadedAt,
  });

  final String status;
  final String fileName;
  final String mimeType;
  final String? uploadedAt;

  factory RiderDriverLicense.fromJson(Map<String, dynamic> json) {
    if (json['status'] is! String ||
        json['file_name'] is! String ||
        json['mime_type'] is! String) {
      throw const ApiException(
          'The CRYMA server returned invalid account details.');
    }
    return RiderDriverLicense(
      status: json['status'] as String,
      fileName: json['file_name'] as String,
      mimeType: json['mime_type'] is String
          ? json['mime_type'] as String
          : 'application/octet-stream',
      uploadedAt:
          json['uploaded_at'] is String ? json['uploaded_at'] as String : null,
    );
  }
}

class RiderAuthService {
  RiderAuthService({ApiClient? apiClient})
      : _api = apiClient ?? ApiClient.instance;

  static final instance = RiderAuthService();

  final ApiClient _api;

  Future<String?> readToken() => _api.readToken();

  Future<void> clearToken() => _api.clearToken();

  Future<RiderRegistrationPolicies> registrationPolicies() async {
    final response = await _api.get('policies/current');
    final data = response['data'];
    if (data is! Map ||
        data['terms'] is! Map ||
        data['privacy'] is! Map ||
        (data['terms'] as Map)['version'] is! String ||
        (data['privacy'] as Map)['version'] is! String) {
      throw const ApiException(
        'The CRYMA server returned invalid registration policy versions.',
      );
    }

    return RiderRegistrationPolicies(
      termsVersion: (data['terms'] as Map)['version'] as String,
      privacyVersion: (data['privacy'] as Map)['version'] as String,
    );
  }

  Future<void> registerRider({
    required Map<String, String> fields,
    required Map<String, String> documentPaths,
  }) async {
    await _api.postMultipartFiles(
      'register',
      fields: fields,
      files: documentPaths,
      authenticated: false,
    );
  }

  Future<void> verifyEmail({
    required String email,
    required String otp,
  }) async {
    await _api.post(
      'verify-email',
      body: {'email': email.trim().toLowerCase(), 'otp': otp},
      authenticated: false,
    );
  }

  Future<String> resendVerification(String email) async {
    final response = await _api.post(
      'resend-verification',
      body: {'email': email.trim().toLowerCase()},
      authenticated: false,
    );
    final message = response['message'];
    if (message is! String) {
      throw const ApiException(
        'The CRYMA server returned an invalid verification response.',
      );
    }
    return message;
  }

  Future<RiderAccount> login(String email, String password) async {
    final response = await _api.post(
      'login',
      body: {'email': email.trim(), 'password': password},
      authenticated: false,
    );
    final token = response['token'];
    final userData = response['user'];
    if (token is! String || token.isEmpty || userData is! Map) {
      throw const ApiException(
          'The CRYMA server returned an invalid login response.');
    }

    final user = RiderAccount.fromJson(Map<String, dynamic>.from(userData));
    if (user.role != 'rider') {
      await _api.post('logout', authenticated: false, tokenOverride: token);
      throw const ApiException(
        'This mobile app is for riders. Use the CRYMA website for other account types.',
      );
    }
    await _api.saveToken(token);
    return user;
  }

  Future<RiderAccount> currentUser() async {
    final response = await _api.get('user');
    final user = response['user'];
    if (user is! Map) {
      throw const ApiException('The CRYMA server returned an invalid account.');
    }
    final account = RiderAccount.fromJson(Map<String, dynamic>.from(user));
    if (account.role != 'rider') {
      await _api.clearToken();
      throw const ApiException(
        'This mobile app is for riders. Use the CRYMA website for other account types.',
        statusCode: 403,
      );
    }
    return account;
  }

  Future<RiderAccountDetails> accountDetails() async {
    try {
      final response = await _api.get('courier/account');
      return RiderAccountDetails.fromJson(response);
    } on ApiException catch (error) {
      if (error.statusCode != 404) rethrow;

      final response = await _api.get('user');
      final rawUser = response['user'];
      if (rawUser is! Map) {
        throw const ApiException(
            'The CRYMA server returned an invalid account.');
      }

      final user = Map<String, dynamic>.from(rawUser);
      final account = RiderAccount.fromJson(user);
      if (account.role != 'rider') {
        await _api.clearToken();
        throw const ApiException(
          'This mobile app is for riders. Use the CRYMA website for other account types.',
          statusCode: 403,
        );
      }

      return RiderAccountDetails(
        account: account,
        middleName: RiderAccountDetails._optionalString(user['middle_name']),
        emailVerified: user['email_verified_at'] is String &&
            (user['email_verified_at'] as String).isNotEmpty,
        sex: null,
        birthday: null,
        address: null,
        vehicles: const [],
        driversLicense: null,
        ewalletQrAvailable: false,
        isSummaryOnly: true,
      );
    }
  }

  Future<ApiFile> driversLicenseFile() =>
      _api.getFile('courier/account/drivers-license');

  Future<ApiFile> ewalletQrFile() => _api.getFile('courier/account/ewallet-qr');

  Future<void> uploadEwalletQr(String filePath) async {
    await _api.postMultipartFiles(
      'courier/account/ewallet-qr',
      fields: const {},
      files: {'qr_image': filePath},
    );
  }

  Future<void> logout() async {
    try {
      final token = await _api.readToken();
      if (token != null && token.isNotEmpty) {
        await _api.post('logout');
      }
    } finally {
      await _api.clearToken();
    }
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _api.patch(
      'account/password',
      body: {
        'current_password': currentPassword,
        'password': newPassword,
        'password_confirmation': newPassword,
      },
    );
  }
}
