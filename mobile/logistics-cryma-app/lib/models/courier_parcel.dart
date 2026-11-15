enum CourierTaskType { pickup, delivery }

class CourierParcel {
  const CourierParcel({
    required this.id,
    required this.orderId,
    required this.type,
    required this.parcelCode,
    required this.status,
    required this.itemSummary,
    required this.address,
    required this.counterparty,
    required this.paymentMethod,
    required this.totalAmount,
    required this.deliveryAttempts,
    this.failureReason,
    this.updatedAt,
  });

  final int id;
  final int orderId;
  final CourierTaskType type;
  final String parcelCode;
  final String status;
  final String itemSummary;
  final String address;
  final String counterparty;
  final String paymentMethod;
  final double totalAmount;
  final int deliveryAttempts;
  final String? failureReason;
  final DateTime? updatedAt;

  bool get isPickup => type == CourierTaskType.pickup;
  bool get isCod => paymentMethod == 'cash_on_delivery';
  double get codAmount => isCod ? totalAmount : 0;

  bool get canAcceptPickup =>
      isPickup && status == 'ASSIGNED_TO_PICKUP_RIDER';
  bool get canCollectPickup =>
      isPickup && status == 'ACCEPTED_BY_PICKUP_RIDER';
  bool get canStartDelivery =>
      !isPickup && status == 'ASSIGNED_TO_RIDER';
  bool get canCompleteDelivery =>
      !isPickup && status == 'OUT_FOR_DELIVERY';
  bool get canFailDelivery => canCompleteDelivery;

  bool get isActive => switch (status) {
        'DELIVERED' || 'COMPLETED' || 'DELIVERY_FAILED' || 'RETURNED' || 'RECEIVED' =>
          false,
        _ => true,
      };

  String get statusLabel => switch (status) {
        'ASSIGNED_TO_PICKUP_RIDER' => 'Pickup assigned',
        'ACCEPTED_BY_PICKUP_RIDER' => 'Pickup accepted',
        'PICKED_UP' => 'Picked up',
        'RECEIVED' => 'Received at hub',
        'ASSIGNED_TO_RIDER' => 'Delivery assigned',
        'OUT_FOR_DELIVERY' => 'Out for delivery',
        'DELIVERED' || 'COMPLETED' => 'Delivered',
        'DELIVERY_FAILED' => 'Delivery failed',
        'RETURNED' => 'Returned',
        _ => status.replaceAll('_', ' ').toLowerCase(),
      };

  String get typeLabel => isPickup ? 'Pickup' : 'Delivery';
  String get routeType => isPickup ? 'pickups' : 'deliveries';

  factory CourierParcel.fromPickupJson(Map<String, dynamic> json) =>
      _fromJson(json, CourierTaskType.pickup);

  factory CourierParcel.fromDeliveryJson(Map<String, dynamic> json) =>
      _fromJson(json, CourierTaskType.delivery);

  static CourierParcel _fromJson(
    Map<String, dynamic> json,
    CourierTaskType type,
  ) {
    final id = _asInt(json['id']);
    final orderId = _asInt(json['order_id']);
    if (id == null || orderId == null || json['status'] is! String) {
      throw const FormatException('Invalid courier assignment data.');
    }

    final order = _asMap(json['order']);
    final items = _asList(order?['items']);
    final itemNames = <String>[];
    var counterparty = '';
    for (final rawItem in items) {
      final item = _asMap(rawItem);
      final product = _asMap(item?['product']);
      final name = product?['name'];
      if (name is String && name.isNotEmpty) itemNames.add(name);
      if (counterparty.isEmpty) {
        final seller = _asMap(item?['seller']);
        if (seller != null) {
          counterparty =
              '${seller['first_name'] ?? ''} ${seller['last_name'] ?? ''}'
                  .trim();
        }
      }
    }

    final address = type == CourierTaskType.pickup
        ? _formatAddress(json['pickup_address'])
        : _formatAddress(order?['delivery_address']);
    final updatedAt = _parseDate(
      json['delivered_at'] ??
          json['received_at'] ??
          json['picked_up_at'] ??
          json['scheduled_at'] ??
          json['assigned_at'],
    );

    return CourierParcel(
      id: id,
      orderId: orderId,
      type: type,
      parcelCode: _asText(json['parcel_code']),
      status: json['status'] as String,
      itemSummary: itemNames.isEmpty ? 'Order #$orderId' : itemNames.join(', '),
      address: address.isEmpty ? 'Address not provided' : address,
      counterparty: counterparty.isEmpty
          ? (type == CourierTaskType.pickup ? 'Seller' : 'Recipient')
          : counterparty,
      paymentMethod: _asText(order?['payment_method']),
      totalAmount: _asDouble(order?['total_amount']),
      deliveryAttempts: _asInt(json['delivery_attempts']) ?? 0,
      failureReason: json['failure_reason'] as String?,
      updatedAt: updatedAt,
    );
  }

  static Map<String, dynamic>? _asMap(dynamic value) =>
      value is Map ? Map<String, dynamic>.from(value) : null;

  static List<dynamic> _asList(dynamic value) =>
      value is List ? value : const [];

  static int? _asInt(dynamic value) =>
      value is num ? value.toInt() : int.tryParse('$value');

  static double _asDouble(dynamic value) =>
      value is num ? value.toDouble() : double.tryParse('$value') ?? 0;

  static String _asText(dynamic value) =>
      value is String ? value.trim() : '';

  static String _formatAddress(dynamic value) {
    if (value is String) return value.trim();
    final address = _asMap(value);
    if (address == null) return '';
    const fields = [
      'house_number',
      'street',
      'building_name',
      'unit_number',
      'barangay',
      'municipality',
      'province',
      'region',
      'postal_code',
    ];
    return fields
        .map((field) => _asText(address[field]))
        .where((part) => part.isNotEmpty)
        .join(', ');
  }

  static DateTime? _parseDate(dynamic value) =>
      value is String ? DateTime.tryParse(value) : null;
}
