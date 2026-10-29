import fs from 'fs';
import path from 'path';
import { env } from '../config/env';
import { logger } from './logger';

export const fileStorage = {
  ensureUploadsDir: () => {
    if (!fs.existsSync(env.UPLOAD_DIR)) {
      fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
      logger.info(`Created uploads directory: ${env.UPLOAD_DIR}`);
    }
  },

  getUploadPath: (filename: string): string => {
    return path.join(env.UPLOAD_DIR, filename);
  },

  fileExists: (filename: string): boolean => {
    return fs.existsSync(fileStorage.getUploadPath(filename));
  },

  deleteFile: (filename: string): void => {
    const filepath = fileStorage.getUploadPath(filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      logger.debug(`Deleted file: ${filename}`);
    }
  },

  getFileStats: (filename: string): fs.Stats | null => {
    const filepath = fileStorage.getUploadPath(filename);
    if (fs.existsSync(filepath)) {
      return fs.statSync(filepath);
    }
    return null;
  },
};
