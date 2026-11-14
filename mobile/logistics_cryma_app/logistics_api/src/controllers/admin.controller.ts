import { Request, Response } from 'express';
import { userRepository } from '../repositories/user.repository';
import { orderRepository } from '../repositories/order.repository';
import { auditRepository } from '../repositories/audit.repository';
import { createError } from '../types/errors';
import { logger } from '../utils/logger';

export class AdminController {
  /**
   * Get pending rider registrations
   * GET /api/admin/riders/pending
   */
  static async getPendingRiders(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw createError('UNAUTHORIZED', 'User not authenticated', 401);
    }

    logger.debug(`Admin ${req.user.email} fetching pending riders`);

    const pending = await userRepository.getPendingRiders();

    res.json({
      success: true,
      data: {
        riders: pending,
        count: pending.length,
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
  }

  /**
   * Get a specific pending rider details
   * GET /api/admin/riders/:riderId
   */
  static async getRiderDetails(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw createError('UNAUTHORIZED', 'User not authenticated', 401);
    }

    const riderId = parseInt(req.params.riderId);
    logger.debug(`Admin ${req.user.email} fetching rider details: ${riderId}`);

    const rider = await userRepository.getById(riderId);

    if (!rider) {
      throw createError('NOT_FOUND', 'Rider not found', 404);
    }

    if (rider.role !== 'rider') {
      throw createError('FORBIDDEN', 'Can only view rider accounts', 403);
    }

    res.json({
      success: true,
      data: { rider },
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
  }

  /**
   * Approve a pending rider registration
   * POST /api/admin/riders/:riderId/approve
   */
  static async approveRider(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw createError('UNAUTHORIZED', 'User not authenticated', 401);
    }

    const riderId = parseInt(req.params.riderId);
    logger.debug(`Admin ${req.user.email} approving rider: ${riderId}`);

    // Get rider
    const rider = await userRepository.getById(riderId);
    if (!rider) {
      throw createError('NOT_FOUND', 'Rider not found', 404);
    }

    if (rider.role !== 'rider') {
      throw createError('FORBIDDEN', 'Can only approve rider accounts', 403);
    }

    if (rider.accountStatus !== 'pending') {
      throw createError(
        'CONFLICT',
        `Rider account status is ${rider.accountStatus}, not pending`,
        409
      );
    }

    // Approve rider
    await userRepository.approvePendingRider(riderId, req.user.userId);

    // Log audit
    await auditRepository.log(
      req.user.userId,
      'APPROVE_RIDER_REGISTRATION',
      riderId,
      'rider',
      `Approved registration for ${rider.email}`
    );

    logger.info(`Rider ${riderId} (${rider.email}) approved by admin ${req.user.email}`);

    const updatedRider = await userRepository.getById(riderId);

    res.json({
      success: true,
      data: { rider: updatedRider },
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
  }

  /**
   * Reject a pending rider registration
   * POST /api/admin/riders/:riderId/reject
   */
  static async rejectRider(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw createError('UNAUTHORIZED', 'User not authenticated', 401);
    }

    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw createError('VALIDATION_ERROR', 'Rejection reason is required', 400);
    }

    const riderId = parseInt(req.params.riderId);
    logger.debug(`Admin ${req.user.email} rejecting rider: ${riderId}`);

    // Get rider
    const rider = await userRepository.getById(riderId);
    if (!rider) {
      throw createError('NOT_FOUND', 'Rider not found', 404);
    }

    if (rider.role !== 'rider') {
      throw createError('FORBIDDEN', 'Can only reject rider accounts', 403);
    }

    if (rider.accountStatus !== 'pending') {
      throw createError(
        'CONFLICT',
        `Rider account status is ${rider.accountStatus}, not pending`,
        409
      );
    }

    // Reject rider
    await userRepository.rejectPendingRider(riderId, req.user.userId, reason.trim());

    // Log audit
    await auditRepository.log(
      req.user.userId,
      'REJECT_RIDER_REGISTRATION',
      riderId,
      'rider',
      `Rejected registration for ${rider.email}: ${reason}`
    );

    logger.info(`Rider ${riderId} (${rider.email}) rejected by admin ${req.user.email}`);

    res.json({
      success: true,
      data: {
        message: 'Rider registration rejected',
        riderId,
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
  }

  /**
   * Get rider statistics
   * GET /api/admin/stats
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw createError('UNAUTHORIZED', 'User not authenticated', 401);
    }

    logger.debug(`Admin ${req.user.email} fetching statistics`);

    const pendingCount = await userRepository.countPendingRiders();
    const activeCount = await userRepository.countActiveRiders();

    res.json({
      success: true,
      data: {
        stats: {
          pendingRiders: pendingCount,
          activeRiders: activeCount,
          totalRiders: pendingCount + activeCount,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
  }

  /**
   * Get all riders (active)
   * GET /api/admin/riders
   */
  static async getAllRiders(req: Request, res: Response): Promise<void> {
    if (!req.user) throw createError('UNAUTHORIZED', 'User not authenticated', 401);
    const riders = await userRepository.getActiveRiders();
    res.json({ success: true, data: { riders, count: riders.length } });
  }

  /**
   * Get all orders
   * GET /api/admin/orders
   */
  static async getOrders(req: Request, res: Response): Promise<void> {
    if (!req.user) throw createError('UNAUTHORIZED', 'User not authenticated', 401);
    const orders = await orderRepository.getAll(200, 0);
    res.json({ success: true, data: { orders, count: orders.length } });
  }

  /**
   * Create a fake/dummy order
   * POST /api/admin/orders
   */
  static async createOrder(req: Request, res: Response): Promise<void> {
    if (!req.user) throw createError('UNAUTHORIZED', 'User not authenticated', 401);

    const { itemName, itemDescription, sender, recipient, pickupLocation, destination } = req.body;
    if (!itemName || !recipient || !pickupLocation || !destination) {
      throw createError('VALIDATION_ERROR', 'itemName, recipient, pickupLocation, destination are required', 400);
    }

    const now = new Date().toISOString();
    const orderId = `ORD-${Date.now()}`;

    const order = await orderRepository.create({
      orderId,
      itemName,
      itemDescription: itemDescription || null,
      sender: sender || 'CRYMA Admin',
      recipient,
      pickupLocation,
      destination,
      status: 'FOR_PICKUP',
      assignedRiderId: null,
      isDummy: true,
      qrCode: null,
      createdAt: now,
      updatedAt: now,
    });

    await auditRepository.log(req.user.userId, 'CREATE_DUMMY_ORDER', order.id, 'order', `Created dummy order ${orderId}`);
    res.status(201).json({ success: true, data: { order } });
  }

  /**
   * Delete an order
   * DELETE /api/admin/orders/:orderId
   */
  static async deleteOrder(req: Request, res: Response): Promise<void> {
    if (!req.user) throw createError('UNAUTHORIZED', 'User not authenticated', 401);
    const orderId = parseInt(req.params.orderId);
    const order = await orderRepository.getById(orderId);
    if (!order) throw createError('NOT_FOUND', 'Order not found', 404);
    await orderRepository.delete(orderId);
    await auditRepository.log(req.user.userId, 'DELETE_ORDER', orderId, 'order', `Deleted order ${order.orderId}`);
    res.json({ success: true, data: { message: 'Order deleted' } });
  }

  /**
   * Get audit logs
   * GET /api/admin/audit?limit=50&offset=0
   */
  static async getAuditLogs(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      throw createError('UNAUTHORIZED', 'User not authenticated', 401);
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    logger.debug(`Admin ${req.user.email} fetching audit logs`);

    const logs = await auditRepository.getAll(limit, offset);

    res.json({
      success: true,
      data: {
        logs,
        count: logs.length,
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: req.path,
      },
    });
  }
}
