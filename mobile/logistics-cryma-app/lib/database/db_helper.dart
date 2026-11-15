import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'app_constants.dart';

class DbHelper {
  DbHelper._();
  static final DbHelper instance = DbHelper._();

  static Database? _db;

  Future<Database> get db async {
    _db ??= await _initDb();
    return _db!;
  }

  Future<Database> _initDb() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'cryma_logistics.db');
    return openDatabase(
      path,
      version: 9,
      onCreate: _onCreate,
      onUpgrade: _onUpgrade,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    await db.execute('''
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT,
        vehicle_type TEXT,
        license_number TEXT,
        rider_id TEXT UNIQUE,
        license_photo_path TEXT,
        license_photo_pending TEXT,
        account_status TEXT NOT NULL DEFAULT 'pending',
        rejection_reason TEXT,
        first_name TEXT,
        last_name TEXT,
        tin TEXT,
        region_code TEXT,
        region_name TEXT,
        province_code TEXT,
        province_name TEXT,
        municipality_code TEXT,
        municipality_name TEXT,
        barangay_code TEXT,
        barangay_name TEXT,
        house_number TEXT,
        street TEXT,
        additional_address TEXT,
        license_expiry TEXT,
        license_classification TEXT,
        license_restrictions TEXT,
        vehicle_make TEXT,
        vehicle_model TEXT,
        vehicle_color TEXT,
        plate_number TEXT,
        terms_version TEXT,
        terms_accepted_at TEXT,
        privacy_version TEXT,
        privacy_accepted_at TEXT,
        is_online INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL UNIQUE,
        item_name TEXT NOT NULL,
        item_description TEXT,
        sender TEXT,
        recipient TEXT NOT NULL,
        pickup_location TEXT,
        destination TEXT NOT NULL,
        status TEXT NOT NULL,
        assigned_rider_id INTEGER,
        is_dummy INTEGER NOT NULL DEFAULT 0,
        qr_code TEXT,
        qr_scanned INTEGER NOT NULL DEFAULT 0,
        tracking_number TEXT,
        cod_amount REAL NOT NULL DEFAULT 0,
        cod_collected INTEGER NOT NULL DEFAULT 0,
        otp_code TEXT,
        otp_attempts INTEGER NOT NULL DEFAULT 0,
        otp_locked_until TEXT,
        pod_photo_path TEXT,
        delivery_attempt INTEGER NOT NULL DEFAULT 0,
        failed_reason TEXT,
        pickup_pay REAL NOT NULL DEFAULT 0,
        delivery_pay REAL NOT NULL DEFAULT 0,
        pickup_time TEXT,
        delivery_time TEXT,
        delivery_lat REAL,
        delivery_lng REAL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (assigned_rider_id) REFERENCES users(id) ON DELETE SET NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rider_id INTEGER NOT NULL,
        reason TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        order_id TEXT,
        created_by INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE
      )
    ''');

    await db.execute('''
      CREATE TABLE conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rider_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        conversation_type TEXT NOT NULL DEFAULT 'logistics',
        created_at TEXT NOT NULL,
        FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE
      )
    ''');

    await db.execute('''
      CREATE TABLE messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        sender_id INTEGER,
        sender_name TEXT NOT NULL,
        body TEXT NOT NULL,
        message_type TEXT NOT NULL DEFAULT 'normal',
        is_read INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )
    ''');

    await db.execute('''
      CREATE TABLE remittances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rider_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        shortfall REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        confirmed_at TEXT,
        FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE
      )
    ''');

    // Seed super user
    await db.insert('users', {
      'email': kSuperUserEmail,
      'password': kSuperUserPassword,
      'role': 'super_user',
      'full_name': 'SMgr Ruffles',
      'phone': null,
      'vehicle_type': null,
      'license_number': null,
      'rider_id': null,
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  // ── Generic helpers ──────────────────────────────────────────────────────

  Future<int> insert(String table, Map<String, dynamic> row) async {
    final d = await db;
    return d.insert(table, row, conflictAlgorithm: ConflictAlgorithm.abort);
  }

  Future<List<Map<String, dynamic>>> query(
    String table, {
    String? where,
    List<dynamic>? whereArgs,
    String? orderBy,
  }) async {
    final d = await db;
    return d.query(table, where: where, whereArgs: whereArgs, orderBy: orderBy);
  }

  Future<int> update(
    String table,
    Map<String, dynamic> row, {
    required String where,
    required List<dynamic> whereArgs,
  }) async {
    final d = await db;
    return d.update(table, row, where: where, whereArgs: whereArgs);
  }

  Future<int> delete(
    String table, {
    required String where,
    required List<dynamic> whereArgs,
  }) async {
    final d = await db;
    return d.delete(table, where: where, whereArgs: whereArgs);
  }

  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 2) {
      await db.execute('ALTER TABLE orders ADD COLUMN qr_code TEXT');
    }
    if (oldVersion < 3) {
      await db.execute('ALTER TABLE users ADD COLUMN license_photo_path TEXT');
      await db.execute(
          "ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active'");
    }
    if (oldVersion < 4) {
      await db
          .execute('ALTER TABLE users ADD COLUMN license_photo_pending TEXT');
    }
    if (oldVersion < 5) {
      for (final col in [
        'ALTER TABLE users ADD COLUMN first_name TEXT',
        'ALTER TABLE users ADD COLUMN last_name TEXT',
        'ALTER TABLE users ADD COLUMN tin TEXT',
        'ALTER TABLE users ADD COLUMN region_code TEXT',
        'ALTER TABLE users ADD COLUMN region_name TEXT',
        'ALTER TABLE users ADD COLUMN province_code TEXT',
        'ALTER TABLE users ADD COLUMN province_name TEXT',
        'ALTER TABLE users ADD COLUMN municipality_code TEXT',
        'ALTER TABLE users ADD COLUMN municipality_name TEXT',
        'ALTER TABLE users ADD COLUMN barangay_code TEXT',
        'ALTER TABLE users ADD COLUMN barangay_name TEXT',
        'ALTER TABLE users ADD COLUMN house_number TEXT',
        'ALTER TABLE users ADD COLUMN street TEXT',
        'ALTER TABLE users ADD COLUMN additional_address TEXT',
        'ALTER TABLE users ADD COLUMN license_expiry TEXT',
        'ALTER TABLE users ADD COLUMN license_classification TEXT',
        'ALTER TABLE users ADD COLUMN license_restrictions TEXT',
        'ALTER TABLE users ADD COLUMN vehicle_make TEXT',
        'ALTER TABLE users ADD COLUMN vehicle_model TEXT',
        'ALTER TABLE users ADD COLUMN vehicle_color TEXT',
        'ALTER TABLE users ADD COLUMN plate_number TEXT',
        'ALTER TABLE users ADD COLUMN terms_version TEXT',
        'ALTER TABLE users ADD COLUMN terms_accepted_at TEXT',
        'ALTER TABLE users ADD COLUMN privacy_version TEXT',
        'ALTER TABLE users ADD COLUMN privacy_accepted_at TEXT',
      ]) {
        try {
          await db.execute(col);
        } catch (_) {}
      }
    }
    if (oldVersion < 6) {
      await db.execute('ALTER TABLE users ADD COLUMN rejection_reason TEXT');
    }
    if (oldVersion < 7) {
      for (final col in [
        'ALTER TABLE orders ADD COLUMN tracking_number TEXT',
        'ALTER TABLE orders ADD COLUMN cod_amount REAL NOT NULL DEFAULT 0',
        'ALTER TABLE orders ADD COLUMN cod_collected INTEGER NOT NULL DEFAULT 0',
        'ALTER TABLE orders ADD COLUMN otp_code TEXT',
        'ALTER TABLE orders ADD COLUMN otp_attempts INTEGER NOT NULL DEFAULT 0',
        'ALTER TABLE orders ADD COLUMN otp_locked_until TEXT',
        'ALTER TABLE orders ADD COLUMN pod_photo_path TEXT',
        'ALTER TABLE orders ADD COLUMN delivery_attempt INTEGER NOT NULL DEFAULT 0',
        'ALTER TABLE orders ADD COLUMN failed_reason TEXT',
        'ALTER TABLE orders ADD COLUMN pickup_pay REAL NOT NULL DEFAULT 0',
        'ALTER TABLE orders ADD COLUMN delivery_pay REAL NOT NULL DEFAULT 0',
        'ALTER TABLE orders ADD COLUMN pickup_time TEXT',
        'ALTER TABLE orders ADD COLUMN delivery_time TEXT',
        'ALTER TABLE orders ADD COLUMN delivery_lat REAL',
        'ALTER TABLE orders ADD COLUMN delivery_lng REAL',
        'ALTER TABLE users ADD COLUMN is_online INTEGER NOT NULL DEFAULT 0',
      ]) {
        try { await db.execute(col); } catch (_) {}
      }
      try {
        await db.execute('''
          CREATE TABLE remittances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rider_id INTEGER NOT NULL,
            amount REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            shortfall REAL NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            confirmed_at TEXT,
            FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE
          )
        ''');
      } catch (_) {}
    }
    if (oldVersion < 9) {
      try { await db.execute('ALTER TABLE orders ADD COLUMN qr_scanned INTEGER NOT NULL DEFAULT 0'); } catch (_) {}
    }
  }

  Future<List<Map<String, dynamic>>> rawQuery(
    String sql, [
    List<dynamic>? args,
  ]) async {
    final d = await db;
    return d.rawQuery(sql, args);
  }
}
