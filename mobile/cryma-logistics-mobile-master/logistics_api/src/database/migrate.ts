import fs from 'fs';
import path from 'path';
import { initDb, closeDb } from './db';
import { logger } from '../utils/logger';

const runMigrations = async () => {
  try {
    logger.info('Starting database migrations...');

    // Initialize database
    const db = await initDb();

    // Read schema SQL file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    // Split into individual statements and execute
    const statements = schema
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    for (const statement of statements) {
      await db.exec(statement);
    }

    logger.info(`Successfully executed ${statements.length} schema statements`);

    // Verify tables were created
    const tables = await db.all(
      `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
    );

    if (tables && tables.length > 0) {
      logger.info(`Created ${tables.length} tables:`);
      tables.forEach((t: any) => logger.info(`  - ${t.name}`));
    }

    await closeDb();
    logger.info('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed', error);
    process.exit(1);
  }
};

// Run if executed directly
if (require.main === module) {
  runMigrations();
}

export { runMigrations };
