import { createApp } from './app';
import { initDb, closeDb } from './database/db';
import { env } from './config/env';
import { logger } from './utils/logger';

const start = async () => {
  try {
    // Initialize database
    logger.info('Initializing database...');
    await initDb();
    logger.info('✓ Database initialized');

    // Create app
    const app = createApp();
    logger.info('✓ Express app created');

    // Start server
    const server = app.listen(env.PORT, env.HOST, () => {
      logger.info(`✓ Server running at http://${env.HOST}:${env.PORT}`);
      logger.info(`✓ Environment: ${env.NODE_ENV}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down gracefully...');
      server.close(async () => {
        await closeDb();
        logger.info('✓ Server closed');
        process.exit(0);
      });

      // Force exit after 10 seconds
      setTimeout(() => {
        logger.error('Forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
};

start();
