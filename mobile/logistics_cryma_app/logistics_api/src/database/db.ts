import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let db: Database | null = null;

export const getDb = (): Database => {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
};

export const initDb = async (): Promise<Database> => {
  if (db) {
    logger.debug('Database already initialized, reusing connection');
    return db;
  }

  // Ensure directory exists
  const dbDir = path.dirname(env.DATABASE_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    logger.info(`Created database directory: ${dbDir}`);
  }

  db = await open({
    filename: env.DATABASE_PATH,
    driver: sqlite3.Database,
  });

  // Enable foreign keys
  await db.exec('PRAGMA foreign_keys = ON;');

  logger.info(`Database initialized at: ${env.DATABASE_PATH}`);
  return db;
};

export const closeDb = async (): Promise<void> => {
  if (db) {
    await db.close();
    db = null;
    logger.info('Database connection closed');
  }
};
