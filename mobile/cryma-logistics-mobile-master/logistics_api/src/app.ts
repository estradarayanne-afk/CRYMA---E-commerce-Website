import express, { Express } from 'express';
import helmet from 'helmet';
import path from 'path';
import { corsOptions } from './middleware/cors';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { fileStorage } from './utils/fileStorage';
import authRoutes from './routes/auth.routes';
import addressRoutes from './routes/address.routes';
import adminRoutes from './routes/admin.routes';
import { env } from './config/env';

export const createApp = (): Express => {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(corsOptions);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  fileStorage.ensureUploadsDir();

  // Serve license photos for admin panel
  app.use('/uploads', express.static(env.UPLOAD_DIR));

  // Serve admin panel
  app.use('/admin', express.static(path.join(__dirname, '../../tempdev')));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/address', addressRoutes);
  app.use('/api/admin', adminRoutes);

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Route not found: ${req.method} ${req.path}` },
      meta: { timestamp: new Date().toISOString(), path: req.path },
    });
  });

  app.use(errorHandler);
  return app;
};
