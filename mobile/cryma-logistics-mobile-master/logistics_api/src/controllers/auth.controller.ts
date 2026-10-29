import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { userRepository } from '../repositories/user.repository';
import { logger } from '../utils/logger';

export class AuthController {
  /**
   * Login endpoint
   * POST /api/auth/login
   */
  static async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    logger.debug(`Login attempt for email: ${email}`);

    const result = await authService.login(email, password);

    logger.info(`User logged in: ${result.user.email} (ID: ${result.user.id})`);

    res.json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
        expiresIn: result.expiresIn,
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
  }

  /**
   * Register rider endpoint
   * POST /api/auth/register
   */
  static async registerRider(req: Request, res: Response): Promise<void> {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      tin,
      vehicleType,
      vehicleMake,
      vehicleModel,
      vehicleColor,
      plateNumber,
      licenseNumber,
      licenseExpiry,
      licenseClassification,
      licenseRestrictions,
      regionCode,
      regionName,
      provinceCode,
      provinceName,
      municipalityCode,
      municipalityName,
      barangayCode,
      barangayName,
      houseNumber,
      street,
      additionalAddress,
      termsVersion,
      termsAcceptedAt,
      privacyVersion,
      privacyAcceptedAt,
    } = req.body;

    // Get license photo path if uploaded
    const licensePhotoPath = req.file ? req.file.filename : undefined;

    logger.debug(`Registration attempt for email: ${email}`);

    const result = await authService.registerRider({
      firstName,
      lastName,
      email,
      password,
      phone,
      tin,
      vehicleType,
      vehicleMake,
      vehicleModel,
      vehicleColor,
      plateNumber,
      licenseNumber,
      licenseExpiry,
      licenseClassification,
      licenseRestrictions,
      licensePhotoPath,
      regionCode,
      regionName,
      provinceCode,
      provinceName,
      municipalityCode,
      municipalityName,
      barangayCode,
      barangayName,
      houseNumber,
      street,
      additionalAddress,
      termsVersion,
      termsAcceptedAt,
      privacyVersion,
      privacyAcceptedAt,
    });

    logger.info(`New rider registered: ${result.user.email} (RID: ${result.riderId})`);

    res.status(201).json({
      success: true,
      data: {
        user: result.user,
        token: result.token,
        expiresIn: result.expiresIn,
        riderId: result.riderId,
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
  }

  /**
   * Get current user profile
   * GET /api/auth/profile
   */
  static async getProfile(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
        meta: {
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
      return;
    }

    const user = await userRepository.getById(req.user.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
        meta: {
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: { user },
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
  }

  /**
   * Check account status (for pending registrations)
   * GET /api/auth/account-status
   */
  static async checkAccountStatus(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
        },
        meta: {
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
      return;
    }

    const user = await userRepository.getById(req.user.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
        },
        meta: {
          timestamp: new Date().toISOString(),
          path: req.path,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        status: user.accountStatus,
        email: user.email,
        riderId: user.riderId,
        createdAt: user.createdAt,
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
  }
}
