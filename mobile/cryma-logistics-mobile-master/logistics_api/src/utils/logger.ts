import { env } from '../config/env';

enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

const logLevelMap: Record<string, LogLevel> = {
  error: LogLevel.ERROR,
  warn: LogLevel.WARN,
  info: LogLevel.INFO,
  debug: LogLevel.DEBUG,
};

const currentLogLevel = logLevelMap[env.LOG_LEVEL] || LogLevel.INFO;

const timestamp = () => new Date().toISOString();

export const logger = {
  error: (message: string, error?: any) => {
    if (currentLogLevel >= LogLevel.ERROR) {
      console.error(`[${timestamp()}] ERROR: ${message}`, error || '');
    }
  },

  warn: (message: string) => {
    if (currentLogLevel >= LogLevel.WARN) {
      console.warn(`[${timestamp()}] WARN: ${message}`);
    }
  },

  info: (message: string) => {
    if (currentLogLevel >= LogLevel.INFO) {
      console.log(`[${timestamp()}] INFO: ${message}`);
    }
  },

  debug: (message: string, data?: any) => {
    if (currentLogLevel >= LogLevel.DEBUG) {
      console.log(`[${timestamp()}] DEBUG: ${message}`, data || '');
    }
  },
};
