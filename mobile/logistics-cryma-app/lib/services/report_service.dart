import '../database/db_helper.dart';
import '../database/app_constants.dart';

class ReportModel {
  final int id;
  final int riderId;
  final String reason;
  final String? description;
  final ReportStatus status;
  final String? orderId;
  final int? createdBy;
  final String createdAt;

  const ReportModel({
    required this.id,
    required this.riderId,
    required this.reason,
    this.description,
    required this.status,
    this.orderId,
    this.createdBy,
    required this.createdAt,
  });

  factory ReportModel.fromMap(Map<String, dynamic> m) => ReportModel(
        id: m['id'] as int,
        riderId: m['rider_id'] as int,
        reason: m['reason'] as String,
        description: m['description'] as String?,
        status: ReportStatusX.fromString(m['status'] as String),
        orderId: m['order_id'] as String?,
        createdBy: m['created_by'] as int?,
        createdAt: m['created_at'] as String,
      );
}

class ReportService {
  ReportService._();
  static final ReportService instance = ReportService._();

  final _db = DbHelper.instance;

  Future<void> createReport({
    required int riderId,
    required String reason,
    String? description,
    String? orderId,
    int? createdBy,
  }) async {
    await _db.insert('reports', {
      'rider_id': riderId,
      'reason': reason.trim(),
      'description': description?.trim(),
      'status': ReportStatus.active.value,
      'order_id': orderId,
      'created_by': createdBy,
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  Future<List<ReportModel>> getReportsForRider(int riderId) async {
    final rows = await _db.query(
      'reports',
      where: 'rider_id = ?',
      whereArgs: [riderId],
      orderBy: 'created_at DESC',
    );
    return rows.map(ReportModel.fromMap).toList();
  }

  Future<int> countActiveReportsForRider(int riderId) async {
    final r = await _db.rawQuery(
      'SELECT COUNT(*) as c FROM reports WHERE rider_id = ? AND status = ?',
      [riderId, ReportStatus.active.value],
    );
    return r.first['c'] as int;
  }

  Future<void> resolveReport(int reportId) async {
    await _db.update(
      'reports',
      {'status': ReportStatus.resolved.value},
      where: 'id = ?',
      whereArgs: [reportId],
    );
  }

  Future<void> deleteReport(int reportId) async {
    await _db.delete('reports', where: 'id = ?', whereArgs: [reportId]);
  }

  Future<int> countRidersWithActiveReports() async {
    final r = await _db.rawQuery('''
      SELECT COUNT(DISTINCT rider_id) as c
      FROM reports
      WHERE status = ?
    ''', [ReportStatus.active.value]);
    return r.first['c'] as int;
  }
}
