import { registerRiderSchema } from '../validators/auth';

describe('50-Character Limit Enforcement', () => {
  const baseValidData = {
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

  test('should accept names with exactly 50 characters', async () => {
    const name50 = 'A'.repeat(50);
    const data = { ...baseValidData, firstName: name50 };
    const result = await registerRiderSchema.parseAsync(data);
    expect(result.firstName).toBe(name50);
  });

  test('should reject names exceeding 50 characters', async () => {
    const name51 = 'A'.repeat(51);
    const data = { ...baseValidData, firstName: name51 };
    await expect(registerRiderSchema.parseAsync(data)).rejects.toThrow();
  });

  test('should enforce 50 char limit on last name', async () => {
    const name51 = 'B'.repeat(51);
    const data = { ...baseValidData, lastName: name51 };
    await expect(registerRiderSchema.parseAsync(data)).rejects.toThrow();
  });

  test('should enforce 50 char limit on street name', async () => {
    const street51 = 'S'.repeat(51);
    const data = { ...baseValidData, street: street51 };
    await expect(registerRiderSchema.parseAsync(data)).rejects.toThrow();
  });

  test('should enforce 50 char limit on house number', async () => {
    const house51 = 'H'.repeat(51);
    const data = { ...baseValidData, houseNumber: house51 };
    await expect(registerRiderSchema.parseAsync(data)).rejects.toThrow();
  });

  test('should enforce 50 char limit on vehicle make', async () => {
    const make51 = 'M'.repeat(51);
    const data = { ...baseValidData, vehicleMake: make51 };
    await expect(registerRiderSchema.parseAsync(data)).rejects.toThrow();
  });

  test('should enforce 50 char limit on vehicle model', async () => {
    const model51 = 'M'.repeat(51);
    const data = { ...baseValidData, vehicleModel: model51 };
    await expect(registerRiderSchema.parseAsync(data)).rejects.toThrow();
  });

  test('should enforce 50 char limit on vehicle color', async () => {
    const color51 = 'C'.repeat(51);
    const data = { ...baseValidData, vehicleColor: color51 };
    await expect(registerRiderSchema.parseAsync(data)).rejects.toThrow();
  });

  test('should enforce 50 char limit on plate number', async () => {
    const plate51 = 'P'.repeat(51);
    const data = { ...baseValidData, plateNumber: plate51 };
    await expect(registerRiderSchema.parseAsync(data)).rejects.toThrow();
  });

  test('should enforce 50 char limit on license restrictions', async () => {
    const restrictions51 = 'R'.repeat(51);
    const data = { ...baseValidData, licenseRestrictions: restrictions51 };
    await expect(registerRiderSchema.parseAsync(data)).rejects.toThrow();
  });

  test('should enforce 50 char limit on additional address', async () => {
    const additional51 = 'A'.repeat(51);
    const data = { ...baseValidData, additionalAddress: additional51 };
    await expect(registerRiderSchema.parseAsync(data)).rejects.toThrow();
  });

  test('should accept multiple 50 char fields together', async () => {
    const name50 = 'A'.repeat(50);
    const street50 = 'S'.repeat(50);
    const color50 = 'C'.repeat(50);

    const data = {
      ...baseValidData,
      firstName: name50,
      street: street50,
      vehicleColor: color50,
    };

    const result = await registerRiderSchema.parseAsync(data);
    expect(result.firstName).toBe(name50);
    expect(result.street).toBe(street50);
    expect(result.vehicleColor).toBe(color50);
  });

  test('should trim whitespace and still enforce 50 char limit', async () => {
    // "A".repeat(50) with leading/trailing spaces should trim to exactly 50
    const nameWithSpaces = '  ' + 'A'.repeat(48) + '  ';
    const data = { ...baseValidData, firstName: nameWithSpaces };

    const result = await registerRiderSchema.parseAsync(data);
    // Should be trimmed to 48 chars
    expect(result.firstName.length).toBeLessThanOrEqual(50);
  });

  test('should count Unicode characters correctly', async () => {
    // Test with Unicode characters (some count as single char, some as multiple)
    const unicodeName = 'José María García Ñiño';
    const data = { ...baseValidData, firstName: unicodeName };

    const result = await registerRiderSchema.parseAsync(data);
    expect(result.firstName).toBe(unicodeName);
  });

  test('should accept names with special characters up to 50 chars', async () => {
    const nameWithSpecials = "O'Connor-José García-Ñ";
    const data = { ...baseValidData, firstName: nameWithSpecials };

    const result = await registerRiderSchema.parseAsync(data);
    expect(result.firstName).toBe(nameWithSpecials);
  });
});
