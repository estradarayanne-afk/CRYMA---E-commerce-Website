import 'package:flutter_test/flutter_test.dart';
import 'package:cryma_logistics/utils/validators.dart';

void main() {
  group('Name Validator', () {
    test('valid name with letters only', () {
      expect(Validators.validateName('John'), isNull);
      expect(Validators.validateName('María José'), isNull);
    });

    test('valid name with hyphens and apostrophes', () {
      expect(Validators.validateName("Mary-Jane"), isNull);
      expect(Validators.validateName("O'Brien"), isNull);
    });

    test('reject empty name', () {
      expect(Validators.validateName(''), isNotNull);
      expect(Validators.validateName('   '), isNotNull);
    });

    test('reject name exceeding 50 chars', () {
      expect(Validators.validateName('A' * 51), isNotNull);
    });

    test('reject name with numbers', () {
      expect(Validators.validateName('John123'), isNotNull);
    });

    test('reject name with special characters', () {
      expect(Validators.validateName('John@Doe'), isNotNull);
      expect(Validators.validateName('John#Doe'), isNotNull);
    });
  });

  group('Email Validator', () {
    test('valid email addresses', () {
      expect(Validators.validateEmail('test@example.com'), isNull);
      expect(Validators.validateEmail('user.name+tag@example.co.uk'), isNull);
    });

    test('reject invalid email', () {
      expect(Validators.validateEmail('invalid.email'), isNotNull);
      expect(Validators.validateEmail('@example.com'), isNotNull);
      expect(Validators.validateEmail('test@'), isNotNull);
    });

    test('reject empty email', () {
      expect(Validators.validateEmail(''), isNotNull);
    });
  });

  group('Password Validator', () {
    test('valid password with all requirements', () {
      expect(Validators.validatePassword('Password123'), isNull);
      expect(Validators.validatePassword('MyP@ssw0rd'), isNull);
    });

    test('reject password without uppercase', () {
      expect(Validators.validatePassword('password123'), isNotNull);
    });

    test('reject password without lowercase', () {
      expect(Validators.validatePassword('PASSWORD123'), isNotNull);
    });

    test('reject password without number', () {
      expect(Validators.validatePassword('PasswordTest'), isNotNull);
    });

    test('reject password too short', () {
      expect(Validators.validatePassword('Pass1'), isNotNull);
    });

    test('reject password too long', () {
      final long = '${'A' * 50}${'b' * 50}${'c' * 29}1';
      expect(Validators.validatePassword(long), isNotNull);
    });

    test('reject empty password', () {
      expect(Validators.validatePassword(''), isNotNull);
    });
  });

  group('Password Confirmation Validator', () {
    test('matching passwords', () {
      expect(
        Validators.validatePasswordConfirm('Password123', 'Password123'),
        isNull,
      );
    });

    test('non-matching passwords', () {
      expect(
        Validators.validatePasswordConfirm('Password123', 'Password456'),
        isNotNull,
      );
    });

    test('empty confirmation password', () {
      expect(
        Validators.validatePasswordConfirm('', 'Password123'),
        isNotNull,
      );
    });
  });

  group('Phone Validator', () {
    test('valid Philippine phone numbers', () {
      expect(Validators.validatePhone('09123456789'), isNull);
      expect(Validators.validatePhone('+639123456789'), isNull);
    });

    test('reject invalid Philippine phone', () {
      expect(Validators.validatePhone('08123456789'), isNotNull);
      expect(Validators.validatePhone('9123456789'), isNotNull);
      expect(Validators.validatePhone('123456789'), isNotNull);
    });

    test('reject empty phone', () {
      expect(Validators.validatePhone(''), isNotNull);
    });
  });

  group('Phone Normalization', () {
    test('normalize 09 format', () {
      expect(Validators.normalizePhone('09123456789'), '09123456789');
    });

    test('normalize +63 format', () {
      expect(Validators.normalizePhone('+639123456789'), '09123456789');
    });

    test('normalize 9 format to 09', () {
      expect(Validators.normalizePhone('9123456789'), '09123456789');
    });

    test('return null for invalid format', () {
      expect(Validators.normalizePhone('123456789'), isNull);
      expect(Validators.normalizePhone('08123456789'), isNull);
    });
  });

  group('TIN Validator', () {
    test('valid TIN', () {
      expect(Validators.validateTIN('123456789'), isNull);
    });

    test('valid empty TIN (optional)', () {
      expect(Validators.validateTINOptional(''), isNull);
      expect(Validators.validateTINOptional('   '), isNull);
    });

    test('reject TIN with wrong length', () {
      expect(Validators.validateTIN('12345678'), isNotNull);
      expect(Validators.validateTIN('1234567890'), isNotNull);
    });

    test('reject TIN with non-digits', () {
      expect(Validators.validateTIN('12345678A'), isNotNull);
    });
  });

  group('License Number Validator', () {
    test('valid license number', () {
      expect(Validators.validateLicenseNumber('ABC123456'), isNull);
      expect(Validators.validateLicenseNumber('N01-23-456789'), isNull);
    });

    test('reject empty license number', () {
      expect(Validators.validateLicenseNumber(''), isNotNull);
    });

    test('reject license number exceeding 50 chars', () {
      expect(Validators.validateLicenseNumber('A' * 51), isNotNull);
    });
  });

  group('Plate Number Validator', () {
    test('valid plate number', () {
      expect(Validators.validatePlateNumber('ABC123'), isNull);
      expect(Validators.validatePlateNumber('ABC 1234'), isNull);
    });

    test('reject empty plate number', () {
      expect(Validators.validatePlateNumber(''), isNotNull);
    });

    test('reject plate number exceeding 20 chars', () {
      expect(Validators.validatePlateNumber('A' * 21), isNotNull);
    });
  });

  group('File Size Validator', () {
    test('valid file size', () {
      expect(Validators.validateFileSize(1024 * 1024), isNull);
      expect(Validators.validateFileSize(5 * 1024 * 1024), isNull);
    });

    test('reject file exceeding 5MB', () {
      expect(Validators.validateFileSize(6 * 1024 * 1024), isNotNull);
    });
  });

  group('File Type Validator', () {
    test('valid image types', () {
      expect(Validators.validateFileType('image/jpeg'), isNull);
      expect(Validators.validateFileType('image/png'), isNull);
      expect(Validators.validateFileType('image/jpg'), isNull);
    });

    test('reject invalid file types', () {
      expect(Validators.validateFileType('application/pdf'), isNotNull);
      expect(Validators.validateFileType('video/mp4'), isNotNull);
      expect(Validators.validateFileType('text/plain'), isNotNull);
    });
  });
}
