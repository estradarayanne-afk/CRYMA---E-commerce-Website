import '../database/db_helper.dart';
import '../database/app_constants.dart';

class UserModel {
  final int id;
  final String email;
  final String role;
  final String fullName;
  final String? firstName;
  final String? lastName;
  final String? phone;
  final String? tin;
  final String? vehicleType;
  final String? vehicleMake;
  final String? vehicleModel;
  final String? vehicleColor;
  final String? plateNumber;
  final String? licenseNumber;
  final String? licenseExpiry;
  final String? licenseClassification;
  final String? licenseRestrictions;
  final String? riderId;
  final String? licensePhotoPath;
  final String? licensePhotoPending;
  final String accountStatus;
  final String? rejectionReason;
  final String? regionCode;
  final String? regionName;
  final String? provinceCode;
  final String? provinceName;
  final String? municipalityCode;
  final String? municipalityName;
  final String? barangayCode;
  final String? barangayName;
  final String? houseNumber;
  final String? street;
  final String? additionalAddress;
  final String? termsVersion;
  final String? termsAcceptedAt;
  final String? privacyVersion;
  final String? privacyAcceptedAt;
  final String createdAt;

  const UserModel({
    required this.id,
    required this.email,
    required this.role,
    required this.fullName,
    this.firstName,
    this.lastName,
    this.phone,
    this.tin,
    this.vehicleType,
    this.vehicleMake,
    this.vehicleModel,
    this.vehicleColor,
    this.plateNumber,
    this.licenseNumber,
    this.licenseExpiry,
    this.licenseClassification,
    this.licenseRestrictions,
    this.riderId,
    this.licensePhotoPath,
    this.licensePhotoPending,
    this.accountStatus = 'active',
    this.rejectionReason,
    this.regionCode,
    this.regionName,
    this.provinceCode,
    this.provinceName,
    this.municipalityCode,
    this.municipalityName,
    this.barangayCode,
    this.barangayName,
    this.houseNumber,
    this.street,
    this.additionalAddress,
    this.termsVersion,
    this.termsAcceptedAt,
    this.privacyVersion,
    this.privacyAcceptedAt,
    required this.createdAt,
  });

  factory UserModel.fromMap(Map<String, dynamic> m) => UserModel(
        id: m['id'] as int,
        email: m['email'] as String,
        role: m['role'] as String,
        fullName: m['full_name'] as String,
        firstName: m['first_name'] as String?,
        lastName: m['last_name'] as String?,
        phone: m['phone'] as String?,
        tin: m['tin'] as String?,
        vehicleType: m['vehicle_type'] as String?,
        vehicleMake: m['vehicle_make'] as String?,
        vehicleModel: m['vehicle_model'] as String?,
        vehicleColor: m['vehicle_color'] as String?,
        plateNumber: m['plate_number'] as String?,
        licenseNumber: m['license_number'] as String?,
        licenseExpiry: m['license_expiry'] as String?,
        licenseClassification: m['license_classification'] as String?,
        licenseRestrictions: m['license_restrictions'] as String?,
        riderId: m['rider_id'] as String?,
        licensePhotoPath: m['license_photo_path'] as String?,
        licensePhotoPending: m['license_photo_pending'] as String?,
        accountStatus: m['account_status'] as String? ?? 'active',
        rejectionReason: m['rejection_reason'] as String?,
        regionCode: m['region_code'] as String?,
        regionName: m['region_name'] as String?,
        provinceCode: m['province_code'] as String?,
        provinceName: m['province_name'] as String?,
        municipalityCode: m['municipality_code'] as String?,
        municipalityName: m['municipality_name'] as String?,
        barangayCode: m['barangay_code'] as String?,
        barangayName: m['barangay_name'] as String?,
        houseNumber: m['house_number'] as String?,
        street: m['street'] as String?,
        additionalAddress: m['additional_address'] as String?,
        termsVersion: m['terms_version'] as String?,
        termsAcceptedAt: m['terms_accepted_at'] as String?,
        privacyVersion: m['privacy_version'] as String?,
        privacyAcceptedAt: m['privacy_accepted_at'] as String?,
        createdAt: m['created_at'] as String,
      );

  UserRole get userRole => UserRoleX.fromString(role);
}

class AuthService {
  AuthService._();
  static final AuthService instance = AuthService._();

  final _db = DbHelper.instance;

  Future<UserModel?> login(String email, String password) async {
    // Hardcoded admin account
    const adminEmail = kSuperUserEmail;
    const adminPassword = kSuperUserPassword;

    if (email.trim() == adminEmail && password == adminPassword) {
      return UserModel(
        id: 1,
        email: adminEmail,
        role: 'super_user',
        fullName: 'SMgr Ruffles',
        accountStatus: 'active',
        createdAt: DateTime.now().toIso8601String(),
      );
    }

    // Check database for other users
    final rows = await _db.query(
      'users',
      where: 'email = ? AND password = ?',
      whereArgs: [email.trim(), password],
    );
    if (rows.isEmpty) return null;
    final user = UserModel.fromMap(rows.first);
    if (user.accountStatus != 'active') return null;
    return user;
  }

  Future<bool> isAccountPending(String email, String password) async {
    final rows = await _db.query(
      'users',
      where: "email = ? AND password = ? AND account_status = 'pending'",
      whereArgs: [email.trim(), password],
    );
    return rows.isNotEmpty;
  }

  Future<bool> isAccountSuspended(String email, String password) async {
    final rows = await _db.query(
      'users',
      where: "email = ? AND password = ? AND account_status = 'suspended'",
      whereArgs: [email.trim(), password],
    );
    return rows.isNotEmpty;
  }

  Future<String?> getRejectionReason(String email, String password) async {
    final rows = await _db.query(
      'users',
      where: "email = ? AND password = ? AND account_status = 'rejected'",
      whereArgs: [email.trim(), password],
    );
    if (rows.isEmpty) return null;
    return rows.first['rejection_reason'] as String?;
  }

  Future<String?> registerRider({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    required String phone,
    required String tin,
    required String vehicleType,
    String? vehicleMake,
    String? vehicleModel,
    String? vehicleColor,
    String? plateNumber,
    required String licenseNumber,
    String? licenseExpiry,
    String? licenseClassification,
    String? licenseRestrictions,
    String? licensePhotoPath,
    String? regionCode,
    String? regionName,
    String? provinceCode,
    String? provinceName,
    String? municipalityCode,
    String? municipalityName,
    String? barangayCode,
    String? barangayName,
    String? houseNumber,
    String? street,
    String? additionalAddress,
    String? termsVersion,
    String? termsAcceptedAt,
    String? privacyVersion,
    String? privacyAcceptedAt,
  }) async {
    final namePattern = RegExp(r"^[\p{L}\s'\-]+$", unicode: true);
    if (firstName.trim().isEmpty ||
        lastName.trim().isEmpty ||
        firstName.trim().length > 50 ||
        lastName.trim().length > 50 ||
        !namePattern.hasMatch(firstName.trim()) ||
        !namePattern.hasMatch(lastName.trim())) {
      return 'First and last names must use letters only and be no more than 50 characters.';
    }
    if (!RegExp(r'^\+639\d{9}$').hasMatch(phone.trim())) {
      return 'Enter a valid Philippine mobile number in +63 format.';
    }
    final existing =
        await _db.query('users', where: 'email = ?', whereArgs: [email.trim()]);
    if (existing.isNotEmpty) return 'Email already registered.';

    final count = await _db
        .rawQuery('SELECT COUNT(*) as c FROM users WHERE role = ?', ['rider']);
    final n = (count.first['c'] as int) + 1;
    final riderId = 'RID-${n.toString().padLeft(4, '0')}';
    final fullName = '${firstName.trim()} ${lastName.trim()}';

    try {
      await _db.insert('users', {
        'email': email.trim().toLowerCase(),
        'password': password,
        'role': 'rider',
        'full_name': fullName,
        'first_name': firstName.trim(),
        'last_name': lastName.trim(),
        'phone': phone.trim(),
        'tin': tin.trim(),
        'vehicle_type': vehicleType,
        'vehicle_make': vehicleMake?.trim(),
        'vehicle_model': vehicleModel?.trim(),
        'vehicle_color': vehicleColor?.trim(),
        'plate_number': plateNumber?.trim().toUpperCase(),
        'license_number': licenseNumber.trim(),
        'license_expiry': licenseExpiry,
        'license_classification': licenseClassification,
        'license_restrictions': licenseRestrictions?.trim(),
        'rider_id': riderId,
        'license_photo_path': licensePhotoPath,
        'account_status': 'pending',
        'region_code': regionCode,
        'region_name': regionName,
        'province_code': provinceCode,
        'province_name': provinceName,
        'municipality_code': municipalityCode,
        'municipality_name': municipalityName,
        'barangay_code': barangayCode,
        'barangay_name': barangayName,
        'house_number': houseNumber?.trim(),
        'street': street?.trim(),
        'additional_address': additionalAddress?.trim(),
        'terms_version': termsVersion,
        'terms_accepted_at': termsAcceptedAt,
        'privacy_version': privacyVersion,
        'privacy_accepted_at': privacyAcceptedAt,
        'created_at': DateTime.now().toIso8601String(),
      });
      return null;
    } catch (e) {
      return 'Registration failed. Please try again.';
    }
  }

  Future<List<UserModel>> getAllRiders() async {
    final rows = await _db.query(
      'users',
      where: "role = ? AND account_status = 'active'",
      whereArgs: ['rider'],
      orderBy: 'created_at DESC',
    );
    return rows.map(UserModel.fromMap).toList();
  }

  Future<List<UserModel>> getPendingRiders() async {
    final rows = await _db.query(
      'users',
      where: "role = ? AND account_status = 'pending'",
      whereArgs: ['rider'],
      orderBy: 'created_at DESC',
    );
    return rows.map(UserModel.fromMap).toList();
  }

  Future<void> approveRider(int userId) async {
    await _db.update('users', {'account_status': 'active'},
        where: 'id = ?', whereArgs: [userId]);
  }

  Future<void> rejectRider(int userId, String reason) async {
    await _db.update(
      'users',
      {'account_status': 'rejected', 'rejection_reason': reason.trim()},
      where: 'id = ? AND role = ?',
      whereArgs: [userId, 'rider'],
    );
  }

  Future<void> submitLicenseUpdateRequest(
      int userId, String newPhotoPath) async {
    await _db.update('users', {'license_photo_pending': newPhotoPath},
        where: 'id = ?', whereArgs: [userId]);
  }

  Future<List<UserModel>> getRidersWithPendingLicenseUpdate() async {
    final rows = await _db.query(
      'users',
      where: 'role = ? AND license_photo_pending IS NOT NULL',
      whereArgs: ['rider'],
      orderBy: 'created_at DESC',
    );
    return rows.map(UserModel.fromMap).toList();
  }

  Future<void> approveLicenseUpdate(int userId) async {
    // Copy pending path to active, clear pending
    final rows = await _db.query('users', where: 'id = ?', whereArgs: [userId]);
    if (rows.isEmpty) return;
    final pending = rows.first['license_photo_pending'] as String?;
    if (pending == null) return;
    await _db.update(
        'users', {'license_photo_path': pending, 'license_photo_pending': null},
        where: 'id = ?', whereArgs: [userId]);
  }

  Future<void> rejectLicenseUpdate(int userId) async {
    await _db.update('users', {'license_photo_pending': null},
        where: 'id = ?', whereArgs: [userId]);
  }

  Future<UserModel?> getRiderById(int id) async {
    final rows = await _db
        .query('users', where: 'id = ? AND role = ?', whereArgs: [id, 'rider']);
    if (rows.isEmpty) return null;
    return UserModel.fromMap(rows.first);
  }

  Future<UserModel?> getUserById(int id) async {
    final rows = await _db.query('users', where: 'id = ?', whereArgs: [id]);
    if (rows.isEmpty) return null;
    return UserModel.fromMap(rows.first);
  }

  Future<String?> updateProfile(int userId,
      {required String fullName, required String phone}) async {
    await _db.update(
      'users',
      {'full_name': fullName.trim(), 'phone': phone.trim()},
      where: 'id = ?',
      whereArgs: [userId],
    );
    return null;
  }

  Future<String?> updatePassword(
      int userId, String currentPassword, String newPassword) async {
    final rows = await _db.query('users',
        where: 'id = ? AND password = ?', whereArgs: [userId, currentPassword]);
    if (rows.isEmpty) return 'Current password is incorrect.';
    await _db.update('users', {'password': newPassword},
        where: 'id = ?', whereArgs: [userId]);
    return null;
  }

  Future<String?> updateCredentials(
      int userId, String email, String password) async {
    // Check duplicate email (excluding self)
    final existing = await _db.query(
      'users',
      where: 'email = ? AND id != ?',
      whereArgs: [email.trim(), userId],
    );
    if (existing.isNotEmpty) return 'Email already in use.';
    await _db.update(
      'users',
      {'email': email.trim(), 'password': password},
      where: 'id = ?',
      whereArgs: [userId],
    );
    return null;
  }

  Future<void> deleteRider(int riderId) async {
    // Unassign orders first
    await _db.update(
      'orders',
      {'assigned_rider_id': null},
      where: 'assigned_rider_id = ?',
      whereArgs: [riderId],
    );
    // Delete user (cascade deletes reports, conversations, messages)
    await _db.delete('users',
        where: 'id = ? AND role = ?', whereArgs: [riderId, 'rider']);
  }

  Future<int> getTotalRiders() async {
    final r = await _db
        .rawQuery('SELECT COUNT(*) as c FROM users WHERE role = ?', ['rider']);
    return r.first['c'] as int;
  }

  // ── Online / Offline toggle (RID-AVAIL-001 to RID-AVAIL-007) ───────────────
  Future<bool> getRiderOnlineStatus(int userId) async {
    final rows =
        await _db.query('users', where: 'id = ?', whereArgs: [userId]);
    if (rows.isEmpty) return false;
    return (rows.first['is_online'] as int? ?? 0) == 1;
  }

  /// Returns an error message if going online is blocked, null on success.
  Future<String?> setOnlineStatus(int userId, bool online) async {
    if (online) {
      final rows =
          await _db.query('users', where: 'id = ?', whereArgs: [userId]);
      if (rows.isEmpty) return 'User not found.';
      final status = rows.first['account_status'] as String? ?? 'active';
      if (status == 'suspended') {
        return 'Your account is suspended. You cannot go Online.';
      }
    }
    await _db.update(
      'users',
      {'is_online': online ? 1 : 0},
      where: 'id = ?',
      whereArgs: [userId],
    );
    return null;
  }

  Future<void> suspendRider(int userId) async {
    await _db.update(
      'users',
      {'account_status': 'suspended', 'is_online': 0},
      where: 'id = ? AND role = ?',
      whereArgs: [userId, 'rider'],
    );
  }

  Future<void> unsuspendRider(int userId) async {
    await _db.update(
      'users',
      {'account_status': 'active'},
      where: 'id = ? AND role = ?',
      whereArgs: [userId, 'rider'],
    );
  }
}
