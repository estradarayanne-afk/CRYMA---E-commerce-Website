import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { createError, ErrorCodes } from '../types/errors';
import { JwtPayload } from '../types/api';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const verifyToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw createError('TOKEN_EXPIRED', 'Token has expired', 401);
    }
    throw createError('INVALID_TOKEN', 'Invalid token', 401);
  }
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('UNAUTHORIZED', 'Missing or invalid authorization header', 401);
    }

    const token = authHeader.substring(7);
    req.user = verifyToken(token);
    next();
  } catch (err) {
    next(err);
  }
};

export const requireRiderRole = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw createError('UNAUTHORIZED', 'User not authenticated', 401);
  }

  if (req.user.role !== 'rider') {
    throw createError('FORBIDDEN', 'This action requires rider role', 403);
  }

  next();
};

export const requireAdminRole = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw createError('UNAUTHORIZED', 'User not authenticated', 401);
  }

  if (req.user.role !== 'admin') {
    throw createError('FORBIDDEN', 'This action requires admin role', 403);
  }

  next();
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      req.user = verifyToken(token);
    }

    next();
  } catch (err) {
    // Continue without authentication
    next();
  }
};
