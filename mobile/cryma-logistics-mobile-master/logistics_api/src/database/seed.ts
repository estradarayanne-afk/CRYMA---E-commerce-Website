import { initDb, closeDb } from './db';
import { passwordHash } from '../utils/passwordHash';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const seedAdminAccount = async () => {
  try {
    logger.info('Starting seed process...');

    const db = await initDb();

    // Check if admin already exists
    const existingAdmin = await db.get('SELECT id FROM users WHERE email = ? AND role = ?', [
      env.ADMIN_EMAIL,
      'admin',
    ]);

    if (existingAdmin) {
      logger.info(`Admin account already exists: ${env.ADMIN_EMAIL}`);
      await closeDb();
      process.exit(0);
      return;
    }

    // Hash password
    const hashedPassword = await passwordHash.hash(env.ADMIN_PASSWORD);

    // Create admin account
    const now = new Date().toISOString();
    await db.run(
      `INSERT INTO users (
        email, password, role, full_name, account_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [env.ADMIN_EMAIL, hashedPassword, 'admin', 'Super Admin', 'active', now, now]
    );

    logger.info(`✓ Admin account created: ${env.ADMIN_EMAIL}`);

    // Verify
    const admin = await db.get('SELECT id, email, role FROM users WHERE email = ? AND role = ?', [
      env.ADMIN_EMAIL,
      'admin',
    ]);

    if (admin) {
      logger.info(`✓ Verification successful: Admin ID ${admin.id}`);
    }

    await closeDb();
    logger.info('Seed process completed');
    process.exit(0);
  } catch (error) {
    logger.error('Seed process failed', error);
    process.exit(1);
  }
};

// Run if executed directly
if (require.main === module) {
  seedAdminAccount();
}

export { seedAdminAccount };
