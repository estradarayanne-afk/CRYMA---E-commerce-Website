import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

/// On-device SQLite database.
/// Used when the local API server is unreachable.
/// ALL data here gets OVERWRITTEN when the server becomes available.
/// See DataSourceManager for the overwrite logic.
class LocalDatabase {
  static Database? _db;

  static Future<Database> get instance async {
    _db ??= await _open();
    return _db!;
  }

  static Future<Database> _open() async {
    final dbPath = join(await getDatabasesPath(), 'cryma_local.db');
    return openDatabase(
      dbPath,
      version: 1,
      onCreate: (db, _) async {
        await db.execute('''
          CREATE TABLE users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'rider',
            first_name TEXT,
            last_name TEXT,
            full_name TEXT,
            phone TEXT,
            tin TEXT,
            vehicle_type TEXT,
            vehicle_make TEXT,
            vehicle_model TEXT,
            vehicle_color TEXT,
            plate_number TEXT,
            license_number TEXT,
            license_expiry TEXT,
            license_classification TEXT,
            license_restrictions TEXT,
            rider_id TEXT,
            license_photo_path TEXT,
            account_status TEXT NOT NULL DEFAULT 'pending',
            region_name TEXT,
            province_name TEXT,
            municipality_name TEXT,
            barangay_name TEXT,
            house_number TEXT,
            street TEXT,
            additional_address TEXT,
            terms_accepted_at TEXT,
            privacy_accepted_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )
        ''');

        await db.execute('''
          CREATE TABLE orders (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL UNIQUE,
            item_name TEXT NOT NULL,
            item_description TEXT,
            sender TEXT,
            recipient TEXT NOT NULL,
            pickup_location TEXT NOT NULL,
            destination TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'FOR_PICKUP',
            assigned_rider_id TEXT,
            is_dummy INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
          )
        ''');

        await db.execute('''
          CREATE TABLE sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            token TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL
          )
        ''');
      },
    );
  }

  /// Wipes all local data — called when server data takes over.
  /// RIGHT HERE STUPID — after this wipe, server data gets written in
  /// DataSourceManager._syncFromServer()
  static Future<void> clearAll() async {
    final db = await instance;
    await db.delete('orders');
    await db.delete('sessions');
    // Keep users so login still works offline after a sync
  }

  static Future<void> close() async {
    await _db?.close();
    _db = null;
  }
}
