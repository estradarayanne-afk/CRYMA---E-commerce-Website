import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { requireAuth, requireAdminRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// All admin routes require authentication and admin role
router.use(requireAuth, requireAdminRole);

/**
 * GET /api/admin/riders/pending
 * Get all pending rider registrations
 */
router.get('/riders/pending', asyncHandler(AdminController.getPendingRiders));

/**
 * GET /api/admin/riders
 * Get all active riders
 */
router.get('/riders', asyncHandler(AdminController.getAllRiders));

/**
 * GET /api/admin/orders
 * Get all orders
 */
router.get('/orders', asyncHandler(AdminController.getOrders));

/**
 * POST /api/admin/orders
 * Create a dummy order
 */
router.post('/orders', asyncHandler(AdminController.createOrder));

/**
 * DELETE /api/admin/orders/:orderId
 * Delete an order
 */
router.delete('/orders/:orderId', asyncHandler(AdminController.deleteOrder));

/**
 * GET /api/admin/riders/:riderId
 * Get specific rider details
 */
router.get('/riders/:riderId', asyncHandler(AdminController.getRiderDetails));

/**
 * POST /api/admin/riders/:riderId/approve
 * Approve a pending rider registration
 */
router.post('/riders/:riderId/approve', asyncHandler(AdminController.approveRider));

/**
 * POST /api/admin/riders/:riderId/reject
 * Reject a pending rider registration
 */
router.post('/riders/:riderId/reject', asyncHandler(AdminController.rejectRider));

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
router.get('/stats', asyncHandler(AdminController.getStats));

/**
 * GET /api/admin/audit
 * Get audit logs
 */
router.get('/audit', asyncHandler(AdminController.getAuditLogs));

export default router;
