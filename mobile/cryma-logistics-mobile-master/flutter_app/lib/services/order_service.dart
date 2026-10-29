import '../models/order_model.dart';
import 'api_client.dart';

class OrderService {
  final ApiClient apiClient;

  OrderService({required this.apiClient});

  Future<List<Order>> getOrders() async {
    final results = await Future.wait([
      _getTasks('/api/courier/pickups', taskType: 'pickup'),
      _getTasks('/api/courier/pickup-history', taskType: 'pickup'),
      _getTasks('/api/courier/deliveries', taskType: 'delivery'),
      _getTasks('/api/courier/delivery-history', taskType: 'delivery'),
    ]);
    final orders = results.expand((result) => result).toList()
      ..sort(
        (a, b) =>
            (b.updatedAt ?? DateTime(0)).compareTo(a.updatedAt ?? DateTime(0)),
      );
    return orders;
  }

  Future<List<Order>> _getTasks(String path, {required String taskType}) async {
    return apiClient.get<List<Order>>(
      path,
      dataDecoder: (json) {
        final data = json['data'];
        if (data is! List) {
          throw ApiException(
            statusCode: 502,
            code: 'INVALID_TASK_RESPONSE',
            message: 'The server returned an invalid courier task list.',
          );
        }
        return data
            .whereType<Map<String, dynamic>>()
            .map((row) => Order.fromCourierRecord(row, taskType: taskType))
            .toList();
      },
    );
  }

  Future<Order?> getActiveOrder() async {
    final orders = await getOrders();
    for (final order in orders) {
      if (order.isActive) return order;
    }
    return null;
  }

  Future<OrderStats> getOrderStats() async {
    final orders = await getOrders();
    return OrderStats(
      forPickUp: orders
          .where((order) => order.taskType == 'pickup' && order.isActive)
          .length,
      active: orders
          .where((order) => order.taskType == 'delivery' && order.isActive)
          .length,
      delivered: orders
          .where(
            (order) =>
                order.status == 'DELIVERED' || order.status == 'COMPLETED',
          )
          .length,
    );
  }

  Future<Order> getOrderDetail(String orderKey) async {
    final parsed = _parseTaskKey(orderKey);
    return apiClient.get<Order>(
      '/api/courier/${parsed.taskType == 'pickup' ? 'pickups' : 'deliveries'}/${parsed.id}',
      dataDecoder: (json) {
        final data = json['data'];
        if (data is! Map<String, dynamic>) {
          throw ApiException(
            statusCode: 502,
            code: 'INVALID_TASK_RESPONSE',
            message: 'The server returned an invalid courier task.',
          );
        }
        return Order.fromCourierRecord(data, taskType: parsed.taskType);
      },
    );
  }

  Future<void> updateTaskStatus(Order order, String status) async {
    final path = order.taskType == 'pickup'
        ? '/api/courier/pickups/${order.assignmentId}/status'
        : '/api/courier/deliveries/${order.assignmentId}/status';
    await apiClient.patch<Map<String, dynamic>>(
      path,
      body: {'status': status, 'expected_status': order.status},
    );
  }

  Future<void> completeDelivery({
    required Order order,
    required String recipientName,
    required String photoPath,
  }) async {
    await apiClient.postMultipart<Map<String, dynamic>>(
      '/api/courier/deliveries/${order.assignmentId}/proof',
      fields: {
        'expected_status': 'OUT_FOR_DELIVERY',
        'recipient_full_name': recipientName.trim(),
      },
      files: {'photo': photoPath},
    );
  }

  ({String taskType, String id}) _parseTaskKey(String key) {
    final separator = key.indexOf(':');
    if (separator < 0) {
      throw ApiException(
        statusCode: 400,
        code: 'INVALID_TASK_ID',
        message: 'The courier task identifier is invalid.',
      );
    }
    final taskType = key.substring(0, separator);
    final id = key.substring(separator + 1);
    if ((taskType != 'pickup' && taskType != 'delivery') || id.isEmpty) {
      throw ApiException(
        statusCode: 400,
        code: 'INVALID_TASK_ID',
        message: 'The courier task identifier is invalid.',
      );
    }
    return (taskType: taskType, id: id);
  }
}
