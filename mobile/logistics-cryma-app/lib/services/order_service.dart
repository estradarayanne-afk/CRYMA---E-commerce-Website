import 'dart:math';
import '../database/db_helper.dart';
import '../database/app_constants.dart';
import 'chat_service.dart';

class OrderModel {
  final int id;
  final String orderId;
  final String itemName;
  final String? itemDescription;
  final String? sender;
  final String recipient;
  final String? pickupLocation;
  final String destination;
  final OrderStatus status;
  final int? assignedRiderId;
  final String? assignedRiderName;
  final bool isDummy;
  final String? qrCode;
  final bool qrScanned;
  final String? trackingNumber;
  final double codAmount;
  final bool codCollected;
  final String? otpCode;
  final int otpAttempts;
  final String? otpLockedUntil;
  final String? podPhotoPath;
  final int deliveryAttempt;
  final String? failedReason;
  final double pickupPay;
  final double deliveryPay;
  final String? pickupTime;
  final String? deliveryTime;
  final String createdAt;
  final String updatedAt;

  const OrderModel({
    required this.id,
    required this.orderId,
    required this.itemName,
    this.itemDescription,
    this.sender,
    required this.recipient,
    this.pickupLocation,
    required this.destination,
    required this.status,
    this.assignedRiderId,
    this.assignedRiderName,
    required this.isDummy,
    this.qrCode,
    this.qrScanned = false,
    this.trackingNumber,
    this.codAmount = 0,
    this.codCollected = false,
    this.otpCode,
    this.otpAttempts = 0,
    this.otpLockedUntil,
    this.podPhotoPath,
    this.deliveryAttempt = 0,
    this.failedReason,
    this.pickupPay = 0,
    this.deliveryPay = 0,
    this.pickupTime,
    this.deliveryTime,
    required this.createdAt,
    required this.updatedAt,
  });

  factory OrderModel.fromMap(Map<String, dynamic> m) => OrderModel(
        id: m['id'] as int,
        orderId: m['order_id'] as String,
        itemName: m['item_name'] as String,
        itemDescription: m['item_description'] as String?,
        sender: m['sender'] as String?,
        recipient: m['recipient'] as String,
        pickupLocation: m['pickup_location'] as String?,
        destination: m['destination'] as String,
        status: OrderStatusX.fromString(m['status'] as String),
        assignedRiderId: m['assigned_rider_id'] as int?,
        assignedRiderName: m['rider_name'] as String?,
        isDummy: (m['is_dummy'] as int) == 1,
        qrCode: m['qr_code'] as String?,
        qrScanned: (m['qr_scanned'] as int? ?? 0) == 1,
        trackingNumber: m['tracking_number'] as String?,
        codAmount: (m['cod_amount'] as num?)?.toDouble() ?? 0,
        codCollected: (m['cod_collected'] as int?) == 1,
        otpCode: m['otp_code'] as String?,
        otpAttempts: m['otp_attempts'] as int? ?? 0,
        otpLockedUntil: m['otp_locked_until'] as String?,
        podPhotoPath: m['pod_photo_path'] as String?,
        deliveryAttempt: m['delivery_attempt'] as int? ?? 0,
        failedReason: m['failed_reason'] as String?,
        pickupPay: (m['pickup_pay'] as num?)?.toDouble() ?? 0,
        deliveryPay: (m['delivery_pay'] as num?)?.toDouble() ?? 0,
        pickupTime: m['pickup_time'] as String?,
        deliveryTime: m['delivery_time'] as String?,
        createdAt: m['created_at'] as String,
        updatedAt: m['updated_at'] as String,
      );
}

class OrderService {
  OrderService._();
  static final OrderService instance = OrderService._();

  final _db = DbHelper.instance;

  static String generateOrderId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    final rng = Random.secure();
    return List.generate(12, (_) => chars[rng.nextInt(chars.length)]).join();
  }

  static String generateQrCode(String orderId) =>
      'Item delivered Alpha to Omega|$orderId';

  Future<String> _uniqueOrderId() async {
    while (true) {
      final id = generateOrderId();
      final existing =
          await _db.query('orders', where: 'order_id = ?', whereArgs: [id]);
      if (existing.isEmpty) return id;
    }
  }

  Future<List<OrderModel>> getAllOrders() async {
    final rows = await _db.rawQuery('''
      SELECT o.*, u.full_name as rider_name
      FROM orders o
      LEFT JOIN users u ON o.assigned_rider_id = u.id
      ORDER BY o.created_at DESC
    ''');
    return rows.map(OrderModel.fromMap).toList();
  }

  Future<List<OrderModel>> getOrdersForRider(int riderId) async {
    final rows = await _db.rawQuery('''
      SELECT o.*, u.full_name as rider_name
      FROM orders o
      LEFT JOIN users u ON o.assigned_rider_id = u.id
      WHERE o.assigned_rider_id = ? AND o.status NOT IN (?, ?)
      ORDER BY o.created_at DESC
    ''', [riderId, OrderStatus.delivered.value, OrderStatus.returnToSender.value]);
    return rows.map(OrderModel.fromMap).toList();
  }

  Future<List<OrderModel>> getDeliveredOrdersForRider(int riderId) async {
    final rows = await _db.rawQuery('''
      SELECT o.*, u.full_name as rider_name
      FROM orders o
      LEFT JOIN users u ON o.assigned_rider_id = u.id
      WHERE o.assigned_rider_id = ? AND o.status = ?
      ORDER BY o.updated_at DESC
    ''', [riderId, OrderStatus.delivered.value]);
    return rows.map(OrderModel.fromMap).toList();
  }

  Future<List<OrderModel>> getAvailableOrders() async {
    final rows = await _db.rawQuery('''
      SELECT o.*, NULL as rider_name
      FROM orders o
      WHERE o.status = ? AND o.assigned_rider_id IS NULL
      ORDER BY o.created_at DESC
    ''', [OrderStatus.forPickUp.value]);
    return rows.map(OrderModel.fromMap).toList();
  }

  Future<OrderModel?> getOrderByOrderId(String orderId) async {
    final rows = await _db.rawQuery('''
      SELECT o.*, u.full_name as rider_name
      FROM orders o
      LEFT JOIN users u ON o.assigned_rider_id = u.id
      WHERE o.order_id = ?
    ''', [orderId]);
    if (rows.isEmpty) return null;
    return OrderModel.fromMap(rows.first);
  }

  Future<String?> createOrder({
    required String itemName,
    String? itemDescription,
    String? sender,
    required String recipient,
    String? pickupLocation,
    required String destination,
    required OrderStatus status,
    int? assignedRiderId,
    bool isDummy = false,
    double codAmount = 0,
  }) async {
    final orderId = await _uniqueOrderId();
    final now = DateTime.now().toIso8601String();
    try {
      final qrCode = generateQrCode(orderId);
      // Generate a tracking number: TRK- + 7 random alphanumeric chars
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      final rng = Random.secure();
      final trackingNumber =
          'TRK-${List.generate(7, (_) => chars[rng.nextInt(chars.length)]).join()}';
      // Generate a 6-digit OTP for delivery
      final otp = (100000 + rng.nextInt(900000)).toString();
      await _db.insert('orders', {
        'order_id': orderId,
        'item_name': itemName.trim(),
        'item_description': itemDescription?.trim(),
        'sender': sender?.trim(),
        'recipient': recipient.trim(),
        'pickup_location': pickupLocation?.trim(),
        'destination': destination.trim(),
        'status': status.value,
        'assigned_rider_id': assignedRiderId,
        'is_dummy': isDummy ? 1 : 0,
        'qr_code': qrCode,
        'tracking_number': trackingNumber,
        'cod_amount': codAmount,
        'cod_collected': 0,
        'otp_code': otp,
        'otp_attempts': 0,
        'delivery_attempt': 0,
        'pickup_pay': 0,
        'delivery_pay': 0,
        'created_at': now,
        'updated_at': now,
      });
      return orderId;
    } catch (_) {
      return null;
    }
  }

  Future<void> updateStatus(String orderId, OrderStatus status) async {
    await _db.update(
      'orders',
      {'status': status.value, 'updated_at': DateTime.now().toIso8601String()},
      where: 'order_id = ?',
      whereArgs: [orderId],
    );
  }

  Future<void> assignRider(String orderId, int riderId) async {
    await _db.update(
      'orders',
      {
        'assigned_rider_id': riderId,
        'status': OrderStatus.assigned.value,
        'updated_at': DateTime.now().toIso8601String(),
      },
      where: 'order_id = ?',
      whereArgs: [orderId],
    );
    // Create seller conversation and post acceptance message
    final order = await getOrderByOrderId(orderId);
    if (order != null) {
      final riderRows = await _db.query('users', where: 'id = ?', whereArgs: [riderId]);
      final riderName = riderRows.isNotEmpty ? riderRows.first['full_name'] as String : 'Rider';
      final convoId = await ChatService.instance.getOrCreateConversation(
        riderId,
        'Seller — ${order.itemName}',
        ConversationType.seller,
      );
      await ChatService.instance.sendMessage(
        conversationId: convoId,
        senderId: null,
        senderName: 'CRYMA Logistics',
        body: '📦 Order ${order.orderId} has been accepted by rider $riderName.\n'
            'Item: ${order.itemName}\n'
            'Pickup: ${order.pickupLocation ?? "—"}\n'
            'Status: Assigned',
      );
    }
  }

  /// Posts a status update message to the seller conversation for this order.
  Future<void> _postSellerUpdate(String orderId, int riderId, String message) async {
    final rows = await _db.rawQuery(
      "SELECT id FROM conversations WHERE rider_id = ? AND conversation_type = 'seller' LIMIT 1",
      [riderId],
    );
    if (rows.isEmpty) return;
    final convoId = rows.first['id'] as int;
    await ChatService.instance.sendMessage(
      conversationId: convoId,
      senderId: null,
      senderName: 'CRYMA Logistics',
      body: message,
    );
  }

  Future<void> deleteOrder(String orderId) async {
    await _db.delete('orders', where: 'order_id = ?', whereArgs: [orderId]);
  }

  Future<int> countActiveDeliveries() async {
    final r = await _db.rawQuery(
      'SELECT COUNT(*) as c FROM orders WHERE status IN (?, ?)',
      [OrderStatus.onTransit.value, OrderStatus.outForDelivery.value],
    );
    return r.first['c'] as int;
  }

  Future<int> countRidersTakingOrders() async {
    final r = await _db.rawQuery('''
      SELECT COUNT(DISTINCT assigned_rider_id) as c
      FROM orders
      WHERE assigned_rider_id IS NOT NULL AND status NOT IN (?, ?)
    ''', [OrderStatus.delivered.value, OrderStatus.returnToSender.value]);
    return r.first['c'] as int;
  }

  // ── Pickup confirmation (RID-PICK-002, RID-PICK-003, RID-PICK-004) ─────────
  /// Returns null on success, or an error message string.
  Future<String?> confirmPickup(String orderId, String input) async {
    final order = await getOrderByOrderId(orderId);
    if (order == null || order.status != OrderStatus.assigned) {
      return 'Order is not in Assigned status.';
    }
    final entered = input.trim().toUpperCase();
    final expected = (order.trackingNumber ?? '').toUpperCase();
    if (entered != expected) {
      return 'Tracking number does not match this job.';
    }
    final now = DateTime.now().toIso8601String();
    await _db.update(
      'orders',
      {
        'status': OrderStatus.pickedUp.value,
        'pickup_pay': 30.0,
        'pickup_time': now,
        'updated_at': now,
      },
      where: 'order_id = ?',
      whereArgs: [orderId],
    );
    await _postSellerUpdate(
      orderId,
      order.assignedRiderId!,
      '📦 Order ${order.orderId} has been picked up.\n'
      'Item: ${order.itemName}\n'
      'Status: Picked Up — on the way to buyer.',
    );
    return null;
  }

  // ── OTP verification (RID-DLV-004) ─────────────────────────────────────────
  /// Returns null on success, or an error message.
  Future<String?> verifyOtp(String orderId, String enteredOtp) async {
    final order = await getOrderByOrderId(orderId);
    if (order == null) return 'Order not found.';
    final now = DateTime.now();
    // Check lock
    if (order.otpLockedUntil != null) {
      final lockUntil = DateTime.tryParse(order.otpLockedUntil!);
      if (lockUntil != null && now.isBefore(lockUntil)) {
        final remaining = lockUntil.difference(now).inMinutes + 1;
        return 'OTP entry is locked. Try again in $remaining minute(s).';
      }
      // Lock expired — reset attempts
      await _db.update('orders', {'otp_attempts': 0, 'otp_locked_until': null},
          where: 'order_id = ?', whereArgs: [orderId]);
    }
    if (enteredOtp.trim().length != 6) return 'OTP must be 6 digits.';
    if (enteredOtp.trim() != order.otpCode) {
      final newAttempts = order.otpAttempts + 1;
      if (newAttempts >= 5) {
        final lockUntil =
            now.add(const Duration(minutes: 15)).toIso8601String();
        await _db.update(
            'orders',
            {'otp_attempts': newAttempts, 'otp_locked_until': lockUntil},
            where: 'order_id = ?',
            whereArgs: [orderId]);
        return 'Too many wrong attempts. OTP entry locked for 15 minutes.';
      }
      await _db.update('orders', {'otp_attempts': newAttempts},
          where: 'order_id = ?', whereArgs: [orderId]);
      return 'Incorrect OTP. ${5 - newAttempts} attempt(s) remaining.';
    }
    // OTP correct — reset attempts
    await _db.update('orders', {'otp_attempts': 0, 'otp_locked_until': null},
        where: 'order_id = ?', whereArgs: [orderId]);
    return null;
  }

  Future<void> markQrScanned(String orderId) async {
    await _db.update(
      'orders',
      {'qr_scanned': 1, 'updated_at': DateTime.now().toIso8601String()},
      where: 'order_id = ?',
      whereArgs: [orderId],
    );
  }

  // ── Delivery confirmation (RID-DLV-001, RID-DLV-003, RID-DLV-005) ─────────
  /// Returns null on success, or an error message.
  Future<String?> confirmDelivery({
    required String orderId,
    required String scannedQr,
    required String otp,
    required double codEntered,
    required String podPhotoPath,
  }) async {
    final order = await getOrderByOrderId(orderId);
    if (order == null || order.status != OrderStatus.outForDelivery) {
      return 'Order is not Out for Delivery.';
    }
    if (order.qrScanned) {
      return 'This QR code has already been used for a delivery confirmation.';
    }
    if (podPhotoPath.isEmpty) return 'Proof of delivery photo is required.';
    if (scannedQr.trim() != order.qrCode) return 'QR code does not match.';
    final otpErr = await verifyOtp(orderId, otp);
    if (otpErr != null) return otpErr;
    if (order.codAmount > 0 && (codEntered - order.codAmount).abs() > 0.001) {
      return 'COD amount does not match. Expected ₱${order.codAmount.toStringAsFixed(2)}';
    }
    final now = DateTime.now().toIso8601String();
    await _db.update(
      'orders',
      {
        'status': OrderStatus.delivered.value,
        'qr_scanned': 1,
        'cod_collected': order.codAmount > 0 ? 1 : 0,
        'pod_photo_path': podPhotoPath,
        'delivery_pay': 50.0,
        'delivery_time': now,
        'updated_at': now,
      },
      where: 'order_id = ?',
      whereArgs: [orderId],
    );
    await _postSellerUpdate(
      orderId,
      order.assignedRiderId!,
      '✅ Order ${order.orderId} has been successfully delivered.\n'
      'Item: ${order.itemName}\n'
      'Recipient: ${order.recipient}\n'
      'Status: Delivered',
    );
    return null;
  }

  // ── Failed delivery (RID-FAIL-001 to RID-FAIL-005) ─────────────────────────
  static const failedDeliveryReasons = [
    'Buyer not home',
    'Wrong address',
    'Refused',
    'No access to location',
    'Buyer unreachable',
  ];

  /// Returns null on success, or an error message.
  Future<String?> markFailedDelivery(
      String orderId, String reason) async {
    if (reason.trim().isEmpty) return 'A reason is required.';
    final order = await getOrderByOrderId(orderId);
    if (order == null || order.status != OrderStatus.outForDelivery) {
      return 'Order is not Out for Delivery.';
    }
    final now = DateTime.now().toIso8601String();
    // Refused → immediately Return to Sender (RID-FAIL-003)
    if (reason == 'Refused') {
      await _db.update(
        'orders',
        {
          'status': OrderStatus.returnToSender.value,
          'failed_reason': reason,
          'delivery_attempt': order.deliveryAttempt + 1,
          'updated_at': now,
        },
        where: 'order_id = ?',
        whereArgs: [orderId],
      );
      await _postSellerUpdate(
        orderId,
        order.assignedRiderId!,
        '⚠️ Order ${order.orderId} delivery failed — Refused by recipient.\n'
        'Item: ${order.itemName}\n'
        'Status: Returning to Sender.',
      );
      return null;
    }
    final newAttempt = order.deliveryAttempt + 1;
    // 3rd failed attempt → Return to Sender (RID-FAIL-005)
    if (newAttempt >= 3) {
      await _db.update(
        'orders',
        {
          'status': OrderStatus.returnToSender.value,
          'failed_reason': reason,
          'delivery_attempt': newAttempt,
          'updated_at': now,
        },
        where: 'order_id = ?',
        whereArgs: [orderId],
      );
      await _postSellerUpdate(
        orderId,
        order.assignedRiderId!,
        '⚠️ Order ${order.orderId} failed delivery 3 times — $reason.\n'
        'Item: ${order.itemName}\n'
        'Status: Returning to Sender.',
      );
      return null;
    }
    await _db.update(
      'orders',
      {
        'status': OrderStatus.failedDelivery.value,
        'failed_reason': reason,
        'delivery_attempt': newAttempt,
        'updated_at': now,
      },
      where: 'order_id = ?',
      whereArgs: [orderId],
    );
    await _postSellerUpdate(
      orderId,
      order.assignedRiderId!,
      '⚠️ Order ${order.orderId} delivery attempt $newAttempt failed — $reason.\n'
      'Item: ${order.itemName}\n'
      'Status: Failed Delivery (attempt $newAttempt of 3).',
    );
    return null;
  }

  // ── Earnings (RID-EARN-001, RID-EARN-002) ──────────────────────────────────
  Future<List<OrderModel>> getHistoryForRider(int riderId) async {
    final rows = await _db.rawQuery('''
      SELECT o.*, u.full_name as rider_name
      FROM orders o
      LEFT JOIN users u ON o.assigned_rider_id = u.id
      WHERE o.assigned_rider_id = ?
      ORDER BY o.updated_at DESC
    ''', [riderId]);
    return rows.map(OrderModel.fromMap).toList();
  }

  Future<Map<String, double>> getEarningsForRider(int riderId) async {
    final rows = await _db.rawQuery('''
      SELECT SUM(pickup_pay) as total_pickup, SUM(delivery_pay) as total_delivery
      FROM orders
      WHERE assigned_rider_id = ?
    ''', [riderId]);
    final r = rows.first;
    return {
      'pickup': (r['total_pickup'] as num?)?.toDouble() ?? 0,
      'delivery': (r['total_delivery'] as num?)?.toDouble() ?? 0,
    };
  }

  // ── COD & Remittance (RID-EARN-003 to RID-EARN-006) ────────────────────────
  Future<double> getCodBalanceForRider(int riderId) async {
    // Sum of collected COD minus confirmed remittances
    final collected = await _db.rawQuery('''
      SELECT SUM(cod_amount) as total
      FROM orders
      WHERE assigned_rider_id = ? AND cod_collected = 1
    ''', [riderId]);
    final remitted = await _db.rawQuery('''
      SELECT SUM(amount) as total
      FROM remittances
      WHERE rider_id = ? AND status = 'confirmed'
    ''', [riderId]);
    final totalCollected =
        (collected.first['total'] as num?)?.toDouble() ?? 0;
    final totalRemitted =
        (remitted.first['total'] as num?)?.toDouble() ?? 0;
    return totalCollected - totalRemitted;
  }

  Future<List<OrderModel>> getCodOrdersForRider(int riderId) async {
    final rows = await _db.rawQuery('''
      SELECT o.*, u.full_name as rider_name
      FROM orders o
      LEFT JOIN users u ON o.assigned_rider_id = u.id
      WHERE o.assigned_rider_id = ? AND o.cod_collected = 1
      ORDER BY o.updated_at DESC
    ''', [riderId]);
    return rows.map(OrderModel.fromMap).toList();
  }

  Future<String?> submitRemittance(int riderId, double amount) async {
    if (amount <= 0) return 'Amount must be greater than zero.';
    final balance = await getCodBalanceForRider(riderId);
    if (amount > balance + 0.001) {
      return 'Amount exceeds your current COD balance.';
    }
    await _db.insert('remittances', {
      'rider_id': riderId,
      'amount': amount,
      'status': 'pending',
      'shortfall': balance - amount > 0.001 ? balance - amount : 0,
      'created_at': DateTime.now().toIso8601String(),
    });
    return null;
  }

  Future<List<Map<String, dynamic>>> getRemittancesForRider(
      int riderId) async {
    return _db.rawQuery(
        'SELECT * FROM remittances WHERE rider_id = ? ORDER BY created_at DESC',
        [riderId]);
  }

  Future<void> confirmRemittance(int remittanceId) async {
    await _db.update(
      'remittances',
      {
        'status': 'confirmed',
        'confirmed_at': DateTime.now().toIso8601String()
      },
      where: 'id = ?',
      whereArgs: [remittanceId],
    );
  }

  // ── Concurrent job limit (RID-JOB-006) ─────────────────────────────────────
  Future<int> countActiveJobsForRider(int riderId) async {
    final r = await _db.rawQuery('''
      SELECT COUNT(*) as c FROM orders
      WHERE assigned_rider_id = ? AND status NOT IN (?, ?)
    ''', [
      riderId,
      OrderStatus.delivered.value,
      OrderStatus.returnToSender.value,
    ]);
    return r.first['c'] as int;
  }
}
