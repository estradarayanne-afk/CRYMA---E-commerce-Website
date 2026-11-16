class CourierAppNotification {
  const CourierAppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.taskType,
    required this.taskId,
    required this.orderId,
    required this.createdAt,
    this.readAt,
  });

  final String id;
  final String title;
  final String message;
  final String taskType;
  final int taskId;
  final int orderId;
  final DateTime? createdAt;
  final DateTime? readAt;

  bool get isRead => readAt != null;

  factory CourierAppNotification.fromJson(Map<String, dynamic> json) {
    final id = json['id'];
    final rawData = json['data'];
    if (id is! String || rawData is! Map) {
      throw const FormatException('Invalid courier notification data.');
    }

    final data = Map<String, dynamic>.from(rawData);
    final taskId = _asInt(data['task_id']);
    final orderId = _asInt(data['order_id']);
    if (data['title'] is! String ||
        data['message'] is! String ||
        !const ['pickup', 'delivery'].contains(data['task_type']) ||
        taskId == null ||
        orderId == null) {
      throw const FormatException('Invalid courier notification data.');
    }

    return CourierAppNotification(
      id: id,
      title: data['title'] as String,
      message: data['message'] as String,
      taskType: data['task_type'] as String,
      taskId: taskId,
      orderId: orderId,
      createdAt: _asDate(json['created_at']),
      readAt: _asDate(json['read_at']),
    );
  }

  static int? _asInt(dynamic value) =>
      value is num ? value.toInt() : int.tryParse('$value');

  static DateTime? _asDate(dynamic value) =>
      value is String ? DateTime.tryParse(value) : null;
}
