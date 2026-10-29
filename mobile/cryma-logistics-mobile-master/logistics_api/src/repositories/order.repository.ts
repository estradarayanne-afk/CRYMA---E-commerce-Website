import { Order } from '../types/models';
import { getDb } from '../database/db';

export class OrderRepository {
  async create(order: Omit<Order, 'id'>): Promise<Order> {
    const db = getDb();
    const result = await db.run(
      `INSERT INTO orders (
        order_id, item_name, item_description, sender, recipient,
        pickup_location, destination, status, assigned_rider_id, is_dummy, qr_code,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.orderId,
        order.itemName,
        order.itemDescription,
        order.sender,
        order.recipient,
        order.pickupLocation,
        order.destination,
        order.status,
        order.assignedRiderId,
        order.isDummy ? 1 : 0,
        order.qrCode,
        order.createdAt,
        order.updatedAt,
      ]
    );

    const newOrder = await this.getById(result.lastID);
    if (!newOrder) throw new Error('Failed to create order');
    return newOrder;
  }

  async getById(id: number): Promise<Order | null> {
    const db = getDb();
    const order = await db.get('SELECT * FROM orders WHERE id = ?', [id]);
    if (!order) return null;
    return this.mapOrder(order);
  }

  async getByOrderId(orderId: string): Promise<Order | null> {
    const db = getDb();
    const order = await db.get('SELECT * FROM orders WHERE order_id = ?', [orderId]);
    if (!order) return null;
    return this.mapOrder(order);
  }

  async update(id: number, data: Partial<Order>): Promise<void> {
    const db = getDb();
    const updates = Object.keys(data);
    if (updates.length === 0) return;

    const now = new Date().toISOString();
    const setClause = updates.map((key) => `${key} = ?`).join(', ');
    const values = [...Object.values(data), now, id];

    await db.run(`UPDATE orders SET ${setClause}, updated_at = ? WHERE id = ?`, values);
  }

  async updateStatus(id: number, status: Order['status']): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();
    await db.run('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?', [status, now, id]);
  }

  async delete(id: number): Promise<void> {
    const db = getDb();
    await db.run('DELETE FROM orders WHERE id = ?', [id]);
  }

  async getAll(limit: number = 100, offset: number = 0): Promise<Order[]> {
    const db = getDb();
    const orders = await db.all(
      'SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
    return (orders || []).map((o) => this.mapOrder(o));
  }

  async getByStatus(status: Order['status']): Promise<Order[]> {
    const db = getDb();
    const orders = await db.all('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC', [
      status,
    ]);
    return (orders || []).map((o) => this.mapOrder(o));
  }

  async getForRider(riderId: number): Promise<Order[]> {
    const db = getDb();
    const orders = await db.all(
      'SELECT * FROM orders WHERE assigned_rider_id = ? ORDER BY created_at DESC',
      [riderId]
    );
    return (orders || []).map((o) => this.mapOrder(o));
  }

  async getDeliveredForRider(riderId: number): Promise<Order[]> {
    const db = getDb();
    const orders = await db.all(
      'SELECT * FROM orders WHERE assigned_rider_id = ? AND status = ? ORDER BY created_at DESC',
      [riderId, 'DELIVERED']
    );
    return (orders || []).map((o) => this.mapOrder(o));
  }

  async assignRider(orderId: number, riderId: number): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();
    await db.run('UPDATE orders SET assigned_rider_id = ?, updated_at = ? WHERE id = ?', [
      riderId,
      now,
      orderId,
    ]);
  }

  async unassignRider(orderId: number): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();
    await db.run('UPDATE orders SET assigned_rider_id = NULL, updated_at = ? WHERE id = ?', [
      now,
      orderId,
    ]);
  }

  async countByStatus(status: Order['status']): Promise<number> {
    const db = getDb();
    const result = await db.get('SELECT COUNT(*) as count FROM orders WHERE status = ?', [status]);
    return result?.count || 0;
  }

  async countActiveDeliveries(): Promise<number> {
    const db = getDb();
    const result = await db.get(
      `SELECT COUNT(*) as count FROM orders WHERE status IN (?, ?)`,
      ['ON_TRANSIT', 'OUT_FOR_DELIVERY']
    );
    return result?.count || 0;
  }

  async countRidersTakingOrders(): Promise<number> {
    const db = getDb();
    const result = await db.get(
      `SELECT COUNT(DISTINCT assigned_rider_id) as count FROM orders WHERE assigned_rider_id IS NOT NULL AND status IN (?, ?)`,
      ['ON_TRANSIT', 'OUT_FOR_DELIVERY']
    );
    return result?.count || 0;
  }

  private mapOrder(dbOrder: any): Order {
    return {
      id: dbOrder.id,
      orderId: dbOrder.order_id,
      itemName: dbOrder.item_name,
      itemDescription: dbOrder.item_description,
      sender: dbOrder.sender,
      recipient: dbOrder.recipient,
      pickupLocation: dbOrder.pickup_location,
      destination: dbOrder.destination,
      status: dbOrder.status,
      assignedRiderId: dbOrder.assigned_rider_id,
      isDummy: dbOrder.is_dummy === 1,
      qrCode: dbOrder.qr_code,
      createdAt: dbOrder.created_at,
      updatedAt: dbOrder.updated_at,
    };
  }
}

export const orderRepository = new OrderRepository();
