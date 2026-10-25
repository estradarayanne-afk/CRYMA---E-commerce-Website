import { loginSchema, registerRiderSchema } from '../validators/auth';
import { passwordHash } from '../utils/passwordHash';

describe('Authentication Validators', () => {
  describe('Login Schema', () => {
    test('should accept valid login credentials', async () => {
      const validLogin = {
        email: 'rider@example.com',
        password: 'ValidPass123',
      };

      const result = await loginSchema.parseAsync(validLogin);
      expect(result.email).toBe('rider@example.com');
      expect(result.password).toBe('ValidPass123');
    });

    test('should reject invalid email format', async () => {
      const invalidLogin = {
        email: 'notanemail',
        password: 'ValidPass123',
      };

      await expect(loginSchema.parseAsync(invalidLogin)).rejects.toThrow();
    });

    test('should reject missing password', async () => {
      const invalidLogin = {
        email: 'rider@example.com',
        password: '',
      };

      await expect(loginSchema.parseAsync(invalidLogin)).rejects.toThrow();
    });

    test('should normalize email to lowercase', async () => {
      const login = {
        email: 'RIDER@EXAMPLE.COM',
        password: 'ValidPass123',
      };

      const result = await loginSchema.parseAsync(login);
      expect(result.email).toBe('rider@example.com');
    });
  });

  describe('Register Rider Schema', () => {
    const validRegistration = {
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      email: 'juan@example.com',
      password: 'SecurePass123',
      confirmPassword: 'SecurePass123',
      phone: '09123456789',
      tin: '123456789',
      vehicleType: 'Motorcycle',
      licenseNumber: 'N01-23-456789',
      regionCode: 'NCR',
      regionName: 'National Capital Region',
      provinceCode: 'MET',
      provinceName: 'Metro Manila',
      municipalityCode: 'MAN',
      municipalityName: 'Manila',
      barangayCode: 'BAY',
      barangayName: 'Baywalk',
      termsVersion: '1.0',
      termsAcceptedAt: new Date().toISOString(),
      privacyVersion: '1.0',
      privacyAcceptedAt: new Date().toISOString(),
    };

    test('should accept valid registration data', async () => {
      const result = await registerRiderSchema.parseAsync(validRegistration);
      expect(result.email).toBe('juan@example.com');
      expect(result.phone).toBe('+639123456789');
    });

    test('should reject mismatched passwords', async () => {
      const invalid = { ...validRegistration, confirmPassword: 'DifferentPass123' };
      await expect(registerRiderSchema.parseAsync(invalid)).rejects.toThrow();
    });

    test('should reject invalid vehicle type', async () => {
      const invalid = { ...validRegistration, vehicleType: 'InvalidVehicle' };
      await expect(registerRiderSchema.parseAsync(invalid)).rejects.toThrow();
    });

    test('should normalize phone number', async () => {
      const withPlus = { ...validRegistration, phone: '+639123456789' };
      const result = await registerRiderSchema.parseAsync(withPlus);
      expect(result.phone).toBe('+639123456789');
    });

    test('should normalize email to lowercase', async () => {
      const withUppercase = { ...validRegistration, email: 'JUAN@EXAMPLE.COM' };
      const result = await registerRiderSchema.parseAsync(withUppercase);
      expect(result.email).toBe('juan@example.com');
    });

    test('should accept optional vehicle details', async () => {
      const withOptionals = {
        ...validRegistration,
        vehicleMake: 'Honda',
        vehicleModel: 'CB150',
        vehicleColor: 'Red',
        plateNumber: 'NCR-1234',
      };

      const result = await registerRiderSchema.parseAsync(withOptionals);
      expect(result.vehicleMake).toBe('Honda');
      expect(result.plateNumber).toBe('NCR-1234');
    });

    test('should reject password without uppercase', async () => {
      const invalid = { ...validRegistration, password: 'lowercase123', confirmPassword: 'lowercase123' };
      await expect(registerRiderSchema.parseAsync(invalid)).rejects.toThrow();
    });

    test('should reject password without lowercase', async () => {
      const invalid = { ...validRegistration, password: 'UPPERCASE123', confirmPassword: 'UPPERCASE123' };
      await expect(registerRiderSchema.parseAsync(invalid)).rejects.toThrow();
    });

    test('should reject password without number', async () => {
      const invalid = { ...validRegistration, password: 'NoNumbers', confirmPassword: 'NoNumbers' };
      await expect(registerRiderSchema.parseAsync(invalid)).rejects.toThrow();
    });

    test('should reject password shorter than 8 characters', async () => {
      const invalid = { ...validRegistration, password: 'Pass12', confirmPassword: 'Pass12' };
      await expect(registerRiderSchema.parseAsync(invalid)).rejects.toThrow();
    });

    test('should reject invalid TIN', async () => {
      const invalid = { ...validRegistration, tin: '12345678' }; // Only 8 digits
      await expect(registerRiderSchema.parseAsync(invalid)).rejects.toThrow();
    });

    test('should reject invalid license number', async () => {
      const invalid = { ...validRegistration, licenseNumber: '' };
      await expect(registerRiderSchema.parseAsync(invalid)).rejects.toThrow();
    });

    test('should enforce 50 char name limit', async () => {
      const longName = 'A'.repeat(51);
      const invalid = { ...validRegistration, firstName: longName };
      await expect(registerRiderSchema.parseAsync(invalid)).rejects.toThrow();
    });

    test('should enforce 50 char vehicle make limit', async () => {
      const longMake = 'X'.repeat(51);
      const invalid = { ...validRegistration, vehicleMake: longMake };
      await expect(registerRiderSchema.parseAsync(invalid)).rejects.toThrow();
    });
  });

  describe('Password Hashing', () => {
    test('should hash passwords consistently with bcrypt', async () => {
      const password = 'TestPassword123';
      const hash1 = await passwordHash.hash(password);
      const hash2 = await passwordHash.hash(password);

      // Different hashes due to salt
      expect(hash1).not.toBe(hash2);

      // Both verify against password
      expect(await passwordHash.compare(password, hash1)).toBe(true);
      expect(await passwordHash.compare(password, hash2)).toBe(true);
    });

    test('should reject wrong password on compare', async () => {
      const password = 'CorrectPassword123';
      const wrongPassword = 'WrongPassword123';
      const hash = await passwordHash.hash(password);

      expect(await passwordHash.compare(wrongPassword, hash)).toBe(false);
    });

    test('should handle special characters in password', async () => {
      const password = 'Special!@#Pass123';
      const hash = await passwordHash.hash(password);

      expect(await passwordHash.compare(password, hash)).toBe(true);
    });

    test('should handle unicode in password', async () => {
      const password = 'UnicødePass123';
      const hash = await passwordHash.hash(password);

      expect(await passwordHash.compare(password, hash)).toBe(true);
    });
  });

  describe('Name Validation', () => {
    test('should accept Filipino names with special characters', async () => {
      const validNames = [
        'José María',
        "O'Connor",
        'Jean-Pierre',
        'Ñiño Santos',
        'María José-García',
      ];

      for (const name of validNames) {
        const result = await registerRiderSchema.parseAsync({
          ...getValidRegistration(),
          firstName: name,
        });
        expect(result.firstName).toBe(name);
      }
    });

    test('should reject names with numbers', async () => {
      const invalid = {
        ...getValidRegistration(),
        firstName: 'Juan123',
      };
      await expect(registerRiderSchema.parseAsync(invalid)).rejects.toThrow();
    });

    test('should enforce name length limit', async () => {
      const tooLong = 'A'.repeat(51);
      const invalid = {
        ...getValidRegistration(),
        firstName: tooLong,
      };
      await expect(registerRiderSchema.parseAsync(invalid)).rejects.toThrow();
    });
  });

  describe('Email Validation', () => {
    test('should accept valid email formats', async () => {
      const validEmails = [
        'user@example.com',
        'test.user@domain.co.uk',
        'name+tag@example.com',
      ];

      for (const email of validEmails) {
        const result = await registerRiderSchema.parseAsync({
          ...getValidRegistration(),
          email,
        });
        expect(result.email).toBe(email.toLowerCase());
      }
    });

    test('should reject invalid email formats', async () => {
      const invalidEmails = ['notanemail', '@example.com', 'user@', 'user @example.com'];

      for (const email of invalidEmails) {
        await expect(
          registerRiderSchema.parseAsync({
            ...getValidRegistration(),
            email,
          })
        ).rejects.toThrow();
      }
    });
  });

  describe('Phone Validation', () => {
    test('should accept Philippine phone formats', async () => {
      const validPhones = ['09123456789', '+639123456789'];

      for (const phone of validPhones) {
        const result = await registerRiderSchema.parseAsync({
          ...getValidRegistration(),
          phone,
        });
        expect(result.phone).toBe('+639123456789');
      }
    });

    test('should reject invalid phone formats', async () => {
      const invalidPhones = ['1234567890', '+1234567890', '09', '0912345678'];

      for (const phone of invalidPhones) {
        await expect(
          registerRiderSchema.parseAsync({
            ...getValidRegistration(),
            phone,
          })
        ).rejects.toThrow();
      }
    });

    test('should normalize 09 format to +639', async () => {
      const result = await registerRiderSchema.parseAsync({
        ...getValidRegistration(),
        phone: '09876543210',
      });
      expect(result.phone).toBe('+639876543210');
    });
  });
});

// Helper function to get valid registration data
function getValidRegistration() {
  return {
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    email: 'juan@example.com',
    password: 'SecurePass123',
    confirmPassword: 'SecurePass123',
    phone: '09123456789',
    tin: '123456789',
    vehicleType: 'Motorcycle',
    licenseNumber: 'N01-23-456789',
    regionCode: 'NCR',
    regionName: 'National Capital Region',
    provinceCode: 'MET',
    provinceName: 'Metro Manila',
    municipalityCode: 'MAN',
    municipalityName: 'Manila',
    barangayCode: 'BAY',
    barangayName: 'Baywalk',
    termsVersion: '1.0',
    termsAcceptedAt: new Date().toISOString(),
    privacyVersion: '1.0',
    privacyAcceptedAt: new Date().toISOString(),
  };
}
