import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation';
import { requireAuth } from '../middleware/auth';
import { uploadMiddleware } from '../middleware/upload';
import { asyncHandler } from '../middleware/errorHandler';
import { loginSchema, registerRiderSchema } from '../validators/auth';

const router = Router();

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', validateRequest(loginSchema), asyncHandler(AuthController.login));

/**
 * POST /api/auth/register
 * Register as a rider with license photo upload
 */
router.post(
  '/register',
  uploadMiddleware.single('licensePhoto'),
  validateRequest(registerRiderSchema),
  asyncHandler(AuthController.registerRider)
);

/**
 * GET /api/auth/profile
 * Get current user profile (requires authentication)
 */
router.get('/profile', requireAuth, asyncHandler(AuthController.getProfile));

/**
 * GET /api/auth/account-status
 * Check registration account status (requires authentication)
 */
router.get(
  '/account-status',
  requireAuth,
  asyncHandler(AuthController.checkAccountStatus)
);

export default router;
