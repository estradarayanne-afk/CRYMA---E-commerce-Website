export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const ErrorCodes = {
  // Auth errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_PENDING: 'ACCOUNT_PENDING',
  ACCOUNT_REJECTED: 'ACCOUNT_REJECTED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_PHONE: 'INVALID_PHONE',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  PASSWORD_MISMATCH: 'PASSWORD_MISMATCH',
  INVALID_TIN: 'INVALID_TIN',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',

  // File upload errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',

  // Server errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
};

export function createError(
  code: keyof typeof ErrorCodes,
  message: string,
  statusCode: number = 400,
  details?: any
): AppError {
  return new AppError(ErrorCodes[code], statusCode, message, details);
}
