class Order {
  final String id;
  final String orderId;
  final String itemName;
  final String status;
  final String taskType;
  final String assignmentId;
  final String? pickupAddress;
  final String? deliveryAddress;
  final String? recipient;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final String? riderId;

  Order({
    required this.id,
    required this.orderId,
    required this.itemName,
    required this.status,
    this.taskType = 'delivery',
    String? assignmentId,
    this.pickupAddress,
    this.deliveryAddress,
    this.recipient,
    this.createdAt,
    this.updatedAt,
    this.riderId,
  }) : assignmentId = assignmentId ?? id;

  factory Order.fromCourierRecord(
    Map<String, dynamic> json, {
    required String taskType,
  }) {
    final order = json['order'] is Map<String, dynamic>
        ? json['order'] as Map<String, dynamic>
        : <String, dynamic>{};
    final items = order['items'] is List ? order['items'] as List : const [];
    final itemNames = items
        .whereType<Map<String, dynamic>>()
        .map((item) {
          final product = item['product'];
          return product is Map<String, dynamic>
              ? product['name']?.toString()
              : null;
        })
        .whereType<String>()
        .where((name) => name.isNotEmpty)
        .toSet()
        .join(', ');
    final firstItem = items.isNotEmpty && items.first is Map<String, dynamic>
        ? items.first as Map<String, dynamic>
        : <String, dynamic>{};
    final seller = firstItem['seller'];
    String? pickupAddress;
    if (seller is Map<String, dynamic> && seller['addresses'] is List) {
      final addresses = seller['addresses'] as List;
      if (addresses.isNotEmpty && addresses.first is Map<String, dynamic>) {
        final address = addresses.first as Map<String, dynamic>;
        pickupAddress = [
          address['house_number'],
          address['building_name'],
          address['unit_number'],
          address['street'],
          address['barangay'],
          address['municipality'],
          address['province'],
          address['region'],
          address['postal_code'],
        ]
            .where((value) => value != null && value.toString().isNotEmpty)
            .join(', ');
      }
    }
    final assignmentId = json['id'].toString();
    final orderId =
        order['id']?.toString() ?? json['order_id']?.toString() ?? '';
    return Order(
      id: '$taskType:$assignmentId',
      orderId: orderId,
      assignmentId: assignmentId,
      taskType: taskType,
      itemName: itemNames,
      status: json['status']?.toString() ?? 'UNKNOWN',
      pickupAddress: pickupAddress,
      deliveryAddress: order['delivery_address']?.toString(),
      recipient: null,
      createdAt: DateTime.tryParse(
        (json['assigned_at'] ?? json['created_at'] ?? '').toString(),
      ),
      updatedAt: DateTime.tryParse(
        (json['updated_at'] ?? json['assigned_at'] ?? '').toString(),
      ),
    );
  }

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id']?.toString() ?? '',
      orderId: (json['order_id'] ?? json['orderId'])?.toString() ?? '',
      itemName: (json['item_name'] ?? json['itemName'])?.toString() ?? '',
      status: json['status'] as String? ?? 'UNKNOWN',
      taskType: json['task_type'] as String? ?? 'delivery',
      assignmentId:
          (json['assignment_id'] ?? json['assignmentId'] ?? json['id'])
                  ?.toString() ??
              '',
      pickupAddress:
          (json['pickup_address'] ?? json['pickupAddress'])?.toString(),
      deliveryAddress:
          (json['delivery_address'] ?? json['deliveryAddress'])?.toString(),
      recipient: json['recipient']?.toString(),
      createdAt: DateTime.tryParse(
        (json['created_at'] ?? json['createdAt'] ?? '').toString(),
      ),
      updatedAt: DateTime.tryParse(
        (json['updated_at'] ?? json['updatedAt'] ?? '').toString(),
      ),
      riderId: (json['rider_id'] ?? json['riderId'])?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'order_id': orderId,
        'assignment_id': assignmentId,
        'item_name': itemName,
        'status': status,
        'task_type': taskType,
        'pickup_address': pickupAddress,
        'delivery_address': deliveryAddress,
        'recipient': recipient,
        'created_at': createdAt?.toIso8601String(),
        'updated_at': updatedAt?.toIso8601String(),
        'rider_id': riderId,
      };

  String get statusLabel {
    switch (status) {
      case 'ASSIGNED_TO_PICKUP_RIDER':
        return 'Assigned For Pickup';
      case 'ACCEPTED_BY_PICKUP_RIDER':
        return 'Pickup Accepted';
      case 'PICKED_UP':
        return 'Picked Up';
      case 'AT_SORTING_CENTER':
        return 'At Sorting Center';
      case 'ASSIGNED_TO_RIDER':
        return 'Assigned For Delivery';
      case 'OUT_FOR_DELIVERY':
        return 'Out For Delivery';
      case 'DELIVERED':
        return 'Delivered';
      case 'COMPLETED':
        return 'Completed';
      case 'DELIVERY_FAILED':
        return 'Delivery Failed';
      case 'RECEIVED_AT_SORTING_CENTER':
        return 'Received At Sorting Center';
      default:
        return status
            .toLowerCase()
            .split('_')
            .map(
              (word) => word.isEmpty
                  ? word
                  : '${word[0].toUpperCase()}${word.substring(1)}',
            )
            .join(' ');
    }
  }

  bool get isActive =>
      !(taskType == 'pickup' && status == 'AT_SORTING_CENTER') &&
      ![
        'RECEIVED_AT_SORTING_CENTER',
        'DELIVERED',
        'COMPLETED',
        'DELIVERY_FAILED',
        'RETURNED',
      ].contains(status);
}

class OrderStats {
  final int forPickUp;
  final int active;
  final int delivered;

  OrderStats({
    required this.forPickUp,
    required this.active,
    required this.delivered,
  });

  factory OrderStats.fromJson(Map<String, dynamic> json) {
    return OrderStats(
      forPickUp: json['forPickUp'] as int? ?? 0,
      active: json['active'] as int? ?? 0,
      delivered: json['delivered'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'forPickUp': forPickUp,
        'active': active,
        'delivered': delivered,
      };
}
