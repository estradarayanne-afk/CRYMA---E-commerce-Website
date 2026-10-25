import { passwordHash } from '../utils/passwordHash';

describe('Password Hashing', () => {
  test('should hash a password', async () => {
    const password = 'MySecurePassword123';
    const hash = await passwordHash.hash(password);

    expect(hash).not.toBe(password);
    expect(hash).toHaveLength(60); // bcrypt hash length
  });

  test('should compare correct password', async () => {
    const password = 'MySecurePassword123';
    const hash = await passwordHash.hash(password);
    const isMatch = await passwordHash.compare(password, hash);

    expect(isMatch).toBe(true);
  });

  test('should not match incorrect password', async () => {
    const password = 'MySecurePassword123';
    const wrongPassword = 'WrongPassword123';
    const hash = await passwordHash.hash(password);
    const isMatch = await passwordHash.compare(wrongPassword, hash);

    expect(isMatch).toBe(false);
  });

  test('should produce different hashes for same password', async () => {
    const password = 'MySecurePassword123';
    const hash1 = await passwordHash.hash(password);
    const hash2 = await passwordHash.hash(password);

    expect(hash1).not.toBe(hash2);
    expect(await passwordHash.compare(password, hash1)).toBe(true);
    expect(await passwordHash.compare(password, hash2)).toBe(true);
  });
});
