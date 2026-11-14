import { AuditLog } from '../types/models';
import { getDb } from '../database/db';

export class AuditRepository {
  async log(
    adminId: number,
    action: string,
    targetId?: number,
    targetType?: string,
    details?: string
  ): Promise<AuditLog> {
    const db = getDb();
    const now = new Date().toISOString();
    const result = await db.run(
      `INSERT INTO audit_logs (admin_id, action, target_id, target_type, details, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [adminId, action, targetId, targetType, details, now]
    );

    const log = await this.getById(result.lastID);
    if (!log) throw new Error('Failed to create audit log');
    return log;
  }

  async getById(id: number): Promise<AuditLog | null> {
    const db = getDb();
    return await db.get('SELECT * FROM audit_logs WHERE id = ?', [id]);
  }

  async getForAdmin(adminId: number, limit: number = 100): Promise<AuditLog[]> {
    const db = getDb();
    return await db.all(
      'SELECT * FROM audit_logs WHERE admin_id = ? ORDER BY created_at DESC LIMIT ?',
      [adminId, limit]
    );
  }

  async getAll(limit: number = 100, offset: number = 0): Promise<any[]> {
    const db = getDb();
    return await db.all(
      `SELECT 
        al.*,
        u.fullName as adminName,
        u.email as adminEmail
       FROM audit_logs al
       LEFT JOIN users u ON al.admin_id = u.id
       ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
  }

  async getByActionAndTarget(
    action: string,
    targetType?: string,
    limit: number = 100
  ): Promise<any[]> {
    const db = getDb();
    if (targetType) {
      return await db.all(
        'SELECT * FROM audit_logs WHERE action = ? AND target_type = ? ORDER BY created_at DESC LIMIT ?',
        [action, targetType, limit]
      );
    }
    return await db.all(
      'SELECT * FROM audit_logs WHERE action = ? ORDER BY created_at DESC LIMIT ?',
      [action, limit]
    );
  }
}

export const auditRepository = new AuditRepository();
