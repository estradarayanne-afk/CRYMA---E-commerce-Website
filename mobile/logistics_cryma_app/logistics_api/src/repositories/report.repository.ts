import { Report } from '../types/models';
import { getDb } from '../database/db';

export class ReportRepository {
  async create(report: Omit<Report, 'id'>): Promise<Report> {
    const db = getDb();
    const result = await db.run(
      `INSERT INTO reports (
        rider_id, reason, description, status, order_id, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        report.riderId,
        report.reason,
        report.description,
        report.status,
        report.orderId,
        report.createdBy,
        report.createdAt,
      ]
    );

    const newReport = await this.getById(result.lastID);
    if (!newReport) throw new Error('Failed to create report');
    return newReport;
  }

  async getById(id: number): Promise<Report | null> {
    const db = getDb();
    return await db.get('SELECT * FROM reports WHERE id = ?', [id]);
  }

  async getForRider(riderId: number): Promise<Report[]> {
    const db = getDb();
    return await db.all('SELECT * FROM reports WHERE rider_id = ? ORDER BY created_at DESC', [
      riderId,
    ]);
  }

  async getActiveForRider(riderId: number): Promise<Report[]> {
    const db = getDb();
    return await db.all(
      'SELECT * FROM reports WHERE rider_id = ? AND status = ? ORDER BY created_at DESC',
      [riderId, 'active']
    );
  }

  async updateStatus(id: number, status: 'active' | 'resolved'): Promise<void> {
    const db = getDb();
    await db.run('UPDATE reports SET status = ? WHERE id = ?', [status, id]);
  }

  async delete(id: number): Promise<void> {
    const db = getDb();
    await db.run('DELETE FROM reports WHERE id = ?', [id]);
  }

  async countActiveForRider(riderId: number): Promise<number> {
    const db = getDb();
    const result = await db.get(
      'SELECT COUNT(*) as count FROM reports WHERE rider_id = ? AND status = ?',
      [riderId, 'active']
    );
    return result?.count || 0;
  }

  async countRidersWithActiveReports(): Promise<number> {
    const db = getDb();
    const result = await db.get(
      'SELECT COUNT(DISTINCT rider_id) as count FROM reports WHERE status = ?',
      ['active']
    );
    return result?.count || 0;
  }
}

export const reportRepository = new ReportRepository();
