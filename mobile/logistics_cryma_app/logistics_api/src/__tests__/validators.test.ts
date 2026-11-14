import { validators } from '../validators/common';
import { loginSchema, registerRiderSchema } from '../validators/auth';

describe('Common Validators', () => {
  describe('name validator', () => {
    test('should accept valid names', async () => {
      const validNames = [
        'John Smith',
        "Mary O'Connor",
        'José García',
        'Jean-Pierre',
      ];

      for (const name of validNames) {
        const schema = validators.name;
        const result = await schema.parseAsync(name);
        expect(result).toBeTruthy();
      }
    });

    test('should reject names with numbers', async () => {
      const schema = validators.name;
      await expect(schema.parseAsync('John123')).rejects.toThrow();
    });

    test('should reject names exceeding 50 characters', async () => {
      const longName = 'a'.repeat(51);
      const schema = validators.name;
      await expect(schema.parseAsync(longName)).rejects.toThrow();
    });
  });

  describe('email validator', () => {
    test('should accept valid emails', async () => {
      const validEmails = [
        'user@example.com',
        'test.user@domain.co.uk',
        'name+tag@example.com',
      ];

      for (const email of validEmails) {
        const schema = validators.email;
        const result = await schema.parseAsync(email);
        expect(result.toLowerCase()).toBe(email.toLowerCase());
      }
    });

    test('should reject invalid emails', async () => {
      const invalidEmails = ['notanemail', '@example.com', 'user@', 'user @example.com'];

      for (const email of invalidEmails) {
        const schema = validators.email;
        await expect(schema.parseAsync(email)).rejects.toThrow();
      }
    });
  });

  describe('phone validator', () => {
    test('should accept valid Philippine phone numbers', async () => {
      const validPhones = ['09123456789', '+639123456789'];

      for (const phone of validPhones) {
        const schema = validators.phone;
        const result = await schema.parseAsync(phone);
        expect(result).toBe('+639123456789');
      }
    });

    test('should reject invalid phone numbers', async () => {
      const invalidPhones = ['1234567890', '+1234567890', '09'];

      for (const phone of invalidPhones) {
        const schema = validators.phone;
        await expect(schema.parseAsync(phone)).rejects.toThrow();
      }
    });
  });

  describe('TIN validator', () => {
    test('should accept valid TINs', async () => {
      const validTIN = '123456789';
      const schema = validators.tin;
      const result = await schema.parseAsync(validTIN);
      expect(result).toBe(validTIN);
    });

    test('should reject TINs with non-digits', async () => {
      const invalidTIN = '12345678A';
      const schema = validators.tin;
      await expect(schema.parseAsync(invalidTIN)).rejects.toThrow();
    });

    test('should reject TINs with wrong length', async () => {
      const invalidTIN = '12345678'; // Only 8 digits
      const schema = validators.tin;
      await expect(schema.parseAsync(invalidTIN)).rejects.toThrow();
    });
  });

  describe('password validator', () => {
    test('should accept valid passwords', async () => {
      const validPassword = 'ValidPass123';
      const schema = validators.password;
      const result = await schema.parseAsync(validPassword);
      expect(result).toBe(validPassword);
    });

    test('should reject password without uppercase', async () => {
      const schema = validators.password;
      await expect(schema.parseAsync('validpass123')).rejects.toThrow();
    });

    test('should reject password without lowercase', async () => {
      const schema = validators.password;
      await expect(schema.parseAsync('VALIDPASS123')).rejects.toThrow();
    });

    test('should reject password without number', async () => {
      const schema = validators.password;
      await expect(schema.parseAsync('ValidPassword')).rejects.toThrow();
    });

    test('should reject password shorter than 8 characters', async () => {
      const schema = validators.password;
      await expect(schema.parseAsync('Pass12')).rejects.toThrow();
    });
  });
});

describe('Login Schema', () => {
  test('should validate correct login request', async () => {
    const validLogin = {
      email: 'user@example.com',
      password: 'ValidPass123',
    };

    const result = await loginSchema.parseAsync(validLogin);
    expect(result.email).toBe('user@example.com');
    expect(result.password).toBe('ValidPass123');
  });

  test('should reject invalid email', async () => {
    const invalidLogin = {
      email: 'notanemail',
      password: 'ValidPass123',
    };

    await expect(loginSchema.parseAsync(invalidLogin)).rejects.toThrow();
  });

  test('should reject missing password', async () => {
    const invalidLogin = {
      email: 'user@example.com',
      password: '',
    };

    await expect(loginSchema.parseAsync(invalidLogin)).rejects.toThrow();
  });
});

describe('Register Rider Schema', () => {
  const validRegistration = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'ValidPass123',
    confirmPassword: 'ValidPass123',
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

  test('should validate correct registration request', async () => {
    const result = await registerRiderSchema.parseAsync(validRegistration);
    expect(result.email).toBe('john@example.com');
    expect(result.phone).toBe('+639123456789');
  });

  test('should reject mismatched passwords', async () => {
    const invalidRegistration = { ...validRegistration, confirmPassword: 'DifferentPass123' };
    await expect(registerRiderSchema.parseAsync(invalidRegistration)).rejects.toThrow();
  });

  test('should reject invalid vehicle type', async () => {
    const invalidRegistration = { ...validRegistration, vehicleType: 'InvalidVehicle' };
    await expect(registerRiderSchema.parseAsync(invalidRegistration)).rejects.toThrow();
  });
});
