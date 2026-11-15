enum DeliveryStatus { pending, inTransit, delivered, failed }

class Delivery {
  final String id;
  final String orderId;
  final String customerName;
  final String address;
  final DeliveryStatus status;
  final DateTime scheduledDate;

  const Delivery({
    required this.id,
    required this.orderId,
    required this.customerName,
    required this.address,
    required this.status,
    required this.scheduledDate,
  });
}

// Sample data — replace with API
final sampleDeliveries = [
  Delivery(
    id: 'd1',
    orderId: 'ORD-001',
    customerName: 'Juan dela Cruz',
    address: '123 Rizal St, Makati',
    status: DeliveryStatus.pending,
    scheduledDate: DateTime.now(),
  ),
  Delivery(
    id: 'd2',
    orderId: 'ORD-002',
    customerName: 'Maria Santos',
    address: '456 Mabini Ave, BGC',
    status: DeliveryStatus.inTransit,
    scheduledDate: DateTime.now(),
  ),
  Delivery(
    id: 'd3',
    orderId: 'ORD-003',
    customerName: 'Pedro Reyes',
    address: '789 Luna Blvd, Pasig',
    status: DeliveryStatus.delivered,
    scheduledDate: DateTime.now().subtract(const Duration(days: 1)),
  ),
];
