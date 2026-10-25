// lib/utils/validators.dart

class AppValidators {
  // ============================================================
  // EMAIL
  // ============================================================
  static String? email(String? value) {
    if (value == null || value.isEmpty) {
      return 'Email is required';
    }
    final emailRegex = RegExp(r'^[\w\.\-]+@[\w\-]+\.[\w\.\-]+$');
    if (!emailRegex.hasMatch(value)) {
      return 'Invalid email format';
    }
    if (value.length > 100) {
      return 'Email is too long';
    }
    return null;
  }

  // ============================================================
  // MOBILE NUMBER (PH format — 11 digits, starts with 09)
  // ============================================================
  static String? mobileNumber(String? value) {
    if (value == null || value.isEmpty) {
      return 'Contact number is required';
    }
    final cleaned = value.replaceAll(RegExp(r'[\s\-]'), '');
    if (cleaned.length != 11) {
      return 'Must be 11 digits';
    }
    if (!cleaned.startsWith('09')) {
      return 'Must start with 09';
    }
    if (!RegExp(r'^[0-9]+$').hasMatch(cleaned)) {
      return 'Numbers only';
    }
    return null;
  }

  // ============================================================
  // PASSWORD
  // ============================================================
  static String? password(String? value) {
    if (value == null || value.isEmpty) {
      return 'Password is required';
    }
    if (value.length < 8) {
      return 'Min 8 characters required';
    }
    if (!RegExp(r'[A-Za-z]').hasMatch(value)) {
      return 'Add at least 1 letter';
    }
    if (!RegExp(r'[0-9]').hasMatch(value)) {
      return 'Add at least 1 number';
    }
    if (value.length > 30) {
      return 'Max 30 characters';
    }
    return null;
  }

  // ============================================================
  // CONFIRM PASSWORD
  // ============================================================
  static String? confirmPassword(String? value, String originalPassword) {
    if (value == null || value.isEmpty) {
      return 'Please confirm password';
    }
    if (value != originalPassword) {
      return 'Passwords do not match';
    }
    return null;
  }

  // ============================================================
  // PASSWORD STRENGTH
  // ============================================================
  static String passwordStrength(String password) {
    if (password.isEmpty) return '';
    if (password.length < 6) return 'Weak';
    if (password.length < 8) return 'Fair';

    final hasLetter = RegExp(r'[A-Za-z]').hasMatch(password);
    final hasNumber = RegExp(r'[0-9]').hasMatch(password);
    final hasSpecial = RegExp(r'[!@#\$%^&*(),.?":{}|<>]').hasMatch(password);

    if (hasLetter && hasNumber && hasSpecial && password.length >= 10) {
      return 'Strong';
    }
    if (hasLetter && hasNumber && password.length >= 8) {
      return 'Good';
    }
    return 'Fair';
  }

  // ============================================================
  // NAME (Last Name, First Name)
  // ============================================================
  static String? name(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'This field is required';
    }
    if (value.trim().length < 2) {
      return 'Min 2 characters required';
    }
    if (value.trim().length > 50) {
      return 'Max 50 characters';
    }
    final nameRegex = RegExp(r"^[a-zA-ZñÑ\s\-'\.]+$");
    if (!nameRegex.hasMatch(value)) {
      return 'Letters only';
    }
    return null;
  }

  // ============================================================
  // MIDDLE INITIAL (Optional, 1-2 chars)
  // ============================================================
  static String? middleInitial(String? value) {
    if (value == null || value.trim().isEmpty) {
      return null;
    }
    final trimmed = value.trim();
    if (trimmed.length > 2) {
      return 'Max 2 characters';
    }
    final miRegex = RegExp(r'^[a-zA-Z]\.?$');
    if (!miRegex.hasMatch(trimmed)) {
      return 'Invalid format (e.g., R.)';
    }
    return null;
  }
}
