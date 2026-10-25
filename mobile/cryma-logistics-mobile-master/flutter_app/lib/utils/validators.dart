class Validators {
  // Name: max 50 chars, Unicode letters/spaces/hyphens/apostrophes
  static String? validateName(String? value) {
    if (value == null || value.trim().isEmpty) return 'Name is required';
    if (value.length > 50) return 'Name must be 50 characters or less';
    final nameRegex = RegExp(r"^[\p{L}\s'\-]+$", unicode: true);
    if (!nameRegex.hasMatch(value.trim())) {
      return 'Name can only contain letters, spaces, hyphens, and apostrophes';
    }
    return null;
  }

  // Email: RFC-ish format, max 100 chars
  static String? validateEmail(String? value) {
    if (value == null || value.trim().isEmpty) return 'Email is required';
    if (value.length > 100) return 'Email must be 100 characters or less';
    final emailRegex = RegExp(
      r'^[a-zA-Z0-9.!#$%&*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$',
    );
    if (!emailRegex.hasMatch(value.trim())) {
      return 'Please enter a valid email address';
    }
    return null;
  }

  // Phone: Philippine mobile (09XXXXXXXXX or +639XXXXXXXXX)
  static String? validatePhone(String? value) {
    if (value == null || value.trim().isEmpty) return 'Phone number is required';
    if (normalizePhone(value) == null) {
      return 'Enter a valid Philippine mobile number (09XXXXXXXXX)';
    }
    return null;
  }

  // Normalize phone → 09XXXXXXXXX
  static String? normalizePhone(String value) {
    final cleaned = value.replaceAll(RegExp(r'[\s\-()]'), '');
    if (cleaned.startsWith('+63') && cleaned.length == 13) {
      final rest = cleaned.substring(3);
      if (rest.startsWith('9')) return '0$rest';
    }
    if (cleaned.startsWith('09') && cleaned.length == 11) return cleaned;
    if (cleaned.startsWith('9') && cleaned.length == 10) return '0$cleaned';
    return null;
  }

  // Password: 8-128 chars, upper + lower + digit
  static String? validatePassword(String? value) {
    if (value == null || value.isEmpty) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (value.length > 128) return 'Password must be 128 characters or less';
    if (!RegExp(r'[A-Z]').hasMatch(value)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!RegExp(r'[a-z]').hasMatch(value)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!RegExp(r'[0-9]').hasMatch(value)) {
      return 'Password must contain at least one number';
    }
    return null;
  }

  // TIN: required, exactly 9 digits
  static String? validateTIN(String? value) {
    if (value == null || value.trim().isEmpty) return 'TIN is required';
    if (!RegExp(r'^\d{9}$').hasMatch(value.trim())) {
      return 'TIN must be exactly 9 digits';
    }
    return null;
  }

  // TIN optional variant
  static String? validateTINOptional(String? value) {
    if (value == null || value.trim().isEmpty) return null;
    if (!RegExp(r'^\d{9}$').hasMatch(value.trim())) {
      return 'TIN must be exactly 9 digits';
    }
    return null;
  }

  // License number: max 50 chars, alphanumeric + hyphens (LTO format e.g. N01-23-456789)
  static String? validateLicenseNumber(String? value) {
    if (value == null || value.trim().isEmpty) return 'License number is required';
    if (value.length > 50) return 'License number must be 50 characters or less';
    if (!RegExp(r'^[a-zA-Z0-9\-]+$').hasMatch(value.trim())) {
      return 'License number can only contain letters, numbers, and hyphens';
    }
    return null;
  }

  // Plate number: max 20 chars, alphanumeric + hyphens/spaces (LTO format)
  static String? validatePlateNumber(String? value) {
    if (value == null || value.trim().isEmpty) return 'Plate number is required';
    if (value.length > 20) return 'Plate number must be 20 characters or less';
    if (!RegExp(r'^[a-zA-Z0-9\- ]+$').hasMatch(value.trim())) {
      return 'Plate number can only contain letters, numbers, hyphens, and spaces';
    }
    return null;
  }

  // Plate number optional (for vehicle types that don't require it)
  static String? validatePlateNumberOptional(String? value) {
    if (value == null || value.trim().isEmpty) return null;
    return validatePlateNumber(value);
  }

  // File size: max 5MB
  static String? validateFileSize(int sizeInBytes) {
    if (sizeInBytes > 5 * 1024 * 1024) return 'File size must be less than 5MB';
    return null;
  }

  // File type: JPG/PNG
  static String? validateFileType(String mimeType) {
    if (!['image/jpeg', 'image/png', 'image/jpg'].contains(mimeType)) {
      return 'Only JPG and PNG files are allowed';
    }
    return null;
  }

  // Password confirmation
  static String? validatePasswordConfirm(String? value, String? password) {
    if (value == null || value.isEmpty) return 'Please confirm your password';
    if (value != password) return 'Passwords do not match';
    return null;
  }

  // Generic required
  static String? validateRequired(String? value, String fieldName) {
    if (value == null || value.trim().isEmpty) return '$fieldName is required';
    return null;
  }

  // License expiry: must not be in the past
  static String? validateLicenseExpiry(String? value) {
    if (value == null || value.trim().isEmpty) return 'License expiry date is required';
    try {
      final date = DateTime.parse(value.trim());
      if (date.isBefore(DateTime.now())) return 'License has already expired';
    } catch (_) {
      return 'Invalid date format';
    }
    return null;
  }
}
