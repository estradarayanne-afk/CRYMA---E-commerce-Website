class User {
  final String? id;
  final String email;
  final String firstName;
  final String lastName;
  final String phone;
  final String role;
  final String accountStatus; // 'pending', 'active', 'rejected'
  final DateTime? createdAt;
  final DateTime? updatedAt;

  User({
    this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.phone,
    this.role = 'rider',
    this.accountStatus = 'pending',
    this.createdAt,
    this.updatedAt,
  });

  String get fullName => '$firstName $lastName';

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id']?.toString(),
      email: json['email'] as String? ?? '',
      firstName:
          json['first_name'] as String? ?? json['firstName'] as String? ?? '',
      lastName:
          json['last_name'] as String? ?? json['lastName'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      role: json['role'] as String? ?? 'rider',
      accountStatus:
          json['status'] as String? ??
          json['accountStatus'] as String? ??
          'pending',
      createdAt: (json['created_at'] ?? json['createdAt']) != null
          ? DateTime.tryParse(
              (json['created_at'] ?? json['createdAt']).toString(),
            )
          : null,
      updatedAt: (json['updated_at'] ?? json['updatedAt']) != null
          ? DateTime.tryParse(
              (json['updated_at'] ?? json['updatedAt']).toString(),
            )
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'firstName': firstName,
      'lastName': lastName,
      'phone': phone,
      'role': role,
      'accountStatus': accountStatus,
      'createdAt': createdAt?.toIso8601String(),
      'updatedAt': updatedAt?.toIso8601String(),
    };
  }

  User copyWith({
    String? id,
    String? email,
    String? firstName,
    String? lastName,
    String? phone,
    String? role,
    String? accountStatus,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      phone: phone ?? this.phone,
      role: role ?? this.role,
      accountStatus: accountStatus ?? this.accountStatus,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

class Rider extends User {
  final String? riderId;
  final String? vehicleType;
  final String? vehicleMake;
  final String? vehicleModel;
  final String? vehicleColor;
  final String? plateNumber;
  final String? licenseNumber;
  final DateTime? licenseExpiry;
  final String? licenseClassification;
  final String? licenseRestrictions;
  final String? licensePhotoPath;
  final String? tin;
  final String? region;
  final String? province;
  final String? municipality;
  final String? barangay;
  final String? houseNumber;
  final String? streetName;
  final String? additionalAddress;
  final String? rejectionReason;

  Rider({
    String? id,
    required String email,
    required String firstName,
    required String lastName,
    required String phone,
    String role = 'rider',
    String accountStatus = 'pending',
    DateTime? createdAt,
    DateTime? updatedAt,
    this.riderId,
    this.vehicleType,
    this.vehicleMake,
    this.vehicleModel,
    this.vehicleColor,
    this.plateNumber,
    this.licenseNumber,
    this.licenseExpiry,
    this.licenseClassification,
    this.licenseRestrictions,
    this.licensePhotoPath,
    this.tin,
    this.region,
    this.province,
    this.municipality,
    this.barangay,
    this.houseNumber,
    this.streetName,
    this.additionalAddress,
    this.rejectionReason,
  }) : super(
         id: id,
         email: email,
         firstName: firstName,
         lastName: lastName,
         phone: phone,
         role: role,
         accountStatus: accountStatus,
         createdAt: createdAt,
         updatedAt: updatedAt,
       );

  factory Rider.fromJson(Map<String, dynamic> json) {
    return Rider(
      id: json['id'] as String?,
      email: json['email'] as String? ?? '',
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      role: json['role'] as String? ?? 'rider',
      accountStatus: json['accountStatus'] as String? ?? 'pending',
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
      riderId: json['riderId'] as String?,
      vehicleType: json['vehicleType'] as String?,
      vehicleMake: json['vehicleMake'] as String?,
      vehicleModel: json['vehicleModel'] as String?,
      vehicleColor: json['vehicleColor'] as String?,
      plateNumber: json['plateNumber'] as String?,
      licenseNumber: json['licenseNumber'] as String?,
      licenseExpiry: json['licenseExpiry'] != null
          ? DateTime.parse(json['licenseExpiry'] as String)
          : null,
      licenseClassification: json['licenseClassification'] as String?,
      licenseRestrictions: json['licenseRestrictions'] as String?,
      licensePhotoPath: json['licensePhotoPath'] as String?,
      tin: json['tin'] as String?,
      region: json['region'] as String?,
      province: json['province'] as String?,
      municipality: json['municipality'] as String?,
      barangay: json['barangay'] as String?,
      houseNumber: json['houseNumber'] as String?,
      streetName: json['streetName'] as String?,
      additionalAddress: json['additionalAddress'] as String?,
      rejectionReason: json['rejectionReason'] as String?,
    );
  }

  @override
  Map<String, dynamic> toJson() {
    return {
      ...super.toJson(),
      'riderId': riderId,
      'vehicleType': vehicleType,
      'vehicleMake': vehicleMake,
      'vehicleModel': vehicleModel,
      'vehicleColor': vehicleColor,
      'plateNumber': plateNumber,
      'licenseNumber': licenseNumber,
      'licenseExpiry': licenseExpiry?.toIso8601String(),
      'licenseClassification': licenseClassification,
      'licenseRestrictions': licenseRestrictions,
      'licensePhotoPath': licensePhotoPath,
      'tin': tin,
      'region': region,
      'province': province,
      'municipality': municipality,
      'barangay': barangay,
      'houseNumber': houseNumber,
      'streetName': streetName,
      'additionalAddress': additionalAddress,
      'rejectionReason': rejectionReason,
    };
  }

  @override
  Rider copyWith({
    String? id,
    String? email,
    String? firstName,
    String? lastName,
    String? phone,
    String? role,
    String? accountStatus,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? riderId,
    String? vehicleType,
    String? vehicleMake,
    String? vehicleModel,
    String? vehicleColor,
    String? plateNumber,
    String? licenseNumber,
    DateTime? licenseExpiry,
    String? licenseClassification,
    String? licenseRestrictions,
    String? licensePhotoPath,
    String? tin,
    String? region,
    String? province,
    String? municipality,
    String? barangay,
    String? houseNumber,
    String? streetName,
    String? additionalAddress,
    String? rejectionReason,
  }) {
    return Rider(
      id: id ?? this.id,
      email: email ?? this.email,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      phone: phone ?? this.phone,
      role: role ?? this.role,
      accountStatus: accountStatus ?? this.accountStatus,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      riderId: riderId ?? this.riderId,
      vehicleType: vehicleType ?? this.vehicleType,
      vehicleMake: vehicleMake ?? this.vehicleMake,
      vehicleModel: vehicleModel ?? this.vehicleModel,
      vehicleColor: vehicleColor ?? this.vehicleColor,
      plateNumber: plateNumber ?? this.plateNumber,
      licenseNumber: licenseNumber ?? this.licenseNumber,
      licenseExpiry: licenseExpiry ?? this.licenseExpiry,
      licenseClassification:
          licenseClassification ?? this.licenseClassification,
      licenseRestrictions: licenseRestrictions ?? this.licenseRestrictions,
      licensePhotoPath: licensePhotoPath ?? this.licensePhotoPath,
      tin: tin ?? this.tin,
      region: region ?? this.region,
      province: province ?? this.province,
      municipality: municipality ?? this.municipality,
      barangay: barangay ?? this.barangay,
      houseNumber: houseNumber ?? this.houseNumber,
      streetName: streetName ?? this.streetName,
      additionalAddress: additionalAddress ?? this.additionalAddress,
      rejectionReason: rejectionReason ?? this.rejectionReason,
    );
  }
}
