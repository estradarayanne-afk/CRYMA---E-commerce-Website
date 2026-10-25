import { User } from '../types/models';
import { getDb } from '../database/db';
import { logger } from '../utils/logger';

export class UserRepository {
  async create(
    email: string,
    password: string,
    fullName: string,
    role: 'rider' | 'admin' = 'rider',
    accountStatus: 'pending' | 'active' | 'rejected' = 'pending',
    additionalData?: Partial<User>
  ): Promise<User> {
    const db = getDb();
    const now = new Date().toISOString();

    const result = await db.run(
      `INSERT INTO users (
        email, password, role, full_name, account_status, created_at, updated_at
        ${additionalData ? ', ' + Object.keys(additionalData).join(', ') : ''}
      ) VALUES (
        ?, ?, ?, ?, ?, ?
        ${additionalData ? ', ' + Object.keys(additionalData).map(() => '?').join(', ') : ''}
      )`,
      [
        email.toLowerCase().trim(),
        password,
        role,
        fullName.trim(),
        accountStatus,
        now,
        ...(additionalData ? Object.values(additionalData) : []),
      ]
    );

    const user = await this.getById(result.lastID);
    if (!user) throw new Error('Failed to create user');
    return user;
  }

  async getById(id: number): Promise<User | null> {
    const db = getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ?', [id]);
    return user || null;
  }

  async getByEmail(email: string): Promise<User | null> {
    const db = getDb();
    const user = await db.get('SELECT * FROM users WHERE email = ? AND role = ?', [
      email.toLowerCase().trim(),
      'rider',
    ]);
    return user || null;
  }

  async getAdminByEmail(email: string): Promise<User | null> {
    const db = getDb();
    const user = await db.get('SELECT * FROM users WHERE email = ? AND role = ?', [
      email.toLowerCase().trim(),
      'admin',
    ]);
    return user || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const db = getDb();
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    return user || null;
  }

  async emailExists(email: string): Promise<boolean> {
    const db = getDb();
    const result = await db.get('SELECT id FROM users WHERE email = ?', [
      email.toLowerCase().trim(),
    ]);
    return !!result;
  }

  async update(id: number, data: Partial<User>): Promise<void> {
    const db = getDb();
    const updates = Object.keys(data);
    if (updates.length === 0) return;

    const now = new Date().toISOString();
    const setClause = updates.map((key) => `${key} = ?`).join(', ');
    const values = [...Object.values(data), now, id];

    await db.run(`UPDATE users SET ${setClause}, updated_at = ? WHERE id = ?`, values);
  }

  async delete(id: number): Promise<void> {
    const db = getDb();
    await db.run('DELETE FROM users WHERE id = ?', [id]);
  }

  async getPendingRiders(): Promise<User[]> {
    const db = getDb();
    const riders = await db.all(
      `SELECT * FROM users WHERE role = ? AND account_status = ? ORDER BY created_at DESC`,
      ['rider', 'pending']
    );
    return riders || [];
  }

  async getActiveRiders(): Promise<User[]> {
    const db = getDb();
    const riders = await db.all(
      `SELECT * FROM users WHERE role = ? AND account_status = ? ORDER BY created_at DESC`,
      ['rider', 'active']
    );
    return riders || [];
  }

  async getRidersWithPendingLicenseUpdate(): Promise<User[]> {
    const db = getDb();
    const riders = await db.all(
      `SELECT * FROM users WHERE role = ? AND license_photo_pending IS NOT NULL ORDER BY created_at DESC`,
      ['rider']
    );
    return riders || [];
  }

  async countRiders(status?: 'pending' | 'active' | 'rejected'): Promise<number> {
    const db = getDb();
    let query = 'SELECT COUNT(*) as count FROM users WHERE role = ?';
    const params: any[] = ['rider'];

    if (status) {
      query += ' AND account_status = ?';
      params.push(status);
    }

    const result = await db.get(query, params);
    return result?.count || 0;
  }

  async searchRiders(query: string, status?: string): Promise<User[]> {
    const db = getDb();
    let sql = `SELECT * FROM users WHERE role = ? AND (
      email LIKE ? OR 
      full_name LIKE ? OR 
      phone LIKE ? OR 
      rider_id LIKE ?
    )`;
    const params: any[] = ['rider', `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`];

    if (status) {
      sql += ' AND account_status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';
    const riders = await db.all(sql, params);
    return riders || [];
  }

  async getRiderById(id: number): Promise<User | null> {
    const db = getDb();
    const user = await db.get('SELECT * FROM users WHERE id = ? AND role = ?', ['rider', id]);
    return user || null;
  }

  async approvePendingRider(riderId: number, adminId: number): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    // Update user status
    await db.run('UPDATE users SET account_status = ?, updated_at = ? WHERE id = ? AND role = ?', [
      'active',
      now,
      riderId,
      'rider',
    ]);

    // Log approval
    await db.run(
      `INSERT INTO registration_approvals (
        user_id, approval_status, approved_by, approved_at, created_at
      ) VALUES (?, ?, ?, ?, ?)`,
      [riderId, 'approved', adminId, now, now]
    );
  }

  async rejectPendingRider(riderId: number, adminId: number, reason: string): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    // Update user status
    await db.run('UPDATE users SET account_status = ?, updated_at = ? WHERE id = ? AND role = ?', [
      'rejected',
      now,
      riderId,
      'rider',
    ]);

    // Log rejection
    await db.run(
      `INSERT INTO registration_approvals (
        user_id, approval_status, approved_by, rejection_reason, approved_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [riderId, 'rejected', adminId, reason, now, now]
    );
  }

  async countPendingRiders(): Promise<number> {
    return this.countRiders('pending');
  }

  async countActiveRiders(): Promise<number> {
    return this.countRiders('active');
  }
}

export const userRepository = new UserRepository();
