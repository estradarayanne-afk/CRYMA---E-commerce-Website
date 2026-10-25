import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  HOST: process.env.HOST || 'localhost',

  DATABASE_PATH: process.env.DATABASE_PATH || './storage/db/cryma_logistics.db',

  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '24h',

  UPLOAD_DIR: path.resolve(process.env.UPLOAD_DIR || './storage/uploads'),
  UPLOAD_MAX_SIZE: parseInt(process.env.UPLOAD_MAX_SIZE || '5242880', 10),

  ADMIN_EMAIL: process.env.ADMIN_EMAIL || '111000111@alphamains.4evr',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '100102005',

  CORS_ORIGIN: (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001').split(','),

  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',

  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};
