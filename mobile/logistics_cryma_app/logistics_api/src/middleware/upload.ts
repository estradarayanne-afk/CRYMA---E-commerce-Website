import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { env } from '../config/env';
import { createError } from '../types/errors';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, env.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${uuid()}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/png'];

  if (!allowedMimes.includes(file.mimetype)) {
    return cb(
      createError('INVALID_FILE_TYPE', 'Only JPG and PNG files are allowed', 400) as any
    );
  }

  cb(null, true);
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.UPLOAD_MAX_SIZE,
  },
});
