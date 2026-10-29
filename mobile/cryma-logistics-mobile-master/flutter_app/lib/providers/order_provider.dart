import 'package:flutter/material.dart';

import '../models/order_model.dart';
import '../services/order_service.dart';
import '../services/api_client.dart';

class OrderProvider extends ChangeNotifier {
  final OrderService orderService;

  List<Order> _orders = [];
  Order? _activeOrder;
  OrderStats _stats = OrderStats(forPickUp: 0, active: 0, delivered: 0);

  bool _isLoading = false;
  String? _errorMessage;

  OrderProvider({required this.orderService});

  List<Order> get orders => _orders;
  Order? get activeOrder => _activeOrder;
  OrderStats get stats => _stats;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<Order> getOrderDetail(String orderKey) =>
      orderService.getOrderDetail(orderKey);

  Future<Order> updateTaskStatus(Order order, String status) async {
    await orderService.updateTaskStatus(order, status);
    final updated = await orderService.getOrderDetail(order.id);
    await fetchOrders();
    return updated;
  }

  Future<Order> completeDelivery({
    required Order order,
    required String recipientName,
    required String photoPath,
  }) async {
    await orderService.completeDelivery(
      order: order,
      recipientName: recipientName,
      photoPath: photoPath,
    );
    final updated = await orderService.getOrderDetail(order.id);
    await fetchOrders();
    return updated;
  }

  Future<void> fetchOrders() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _orders = await orderService.getOrders();
      _activeOrder = _orders.cast<Order?>().firstWhere(
        (order) => order?.isActive == true,
        orElse: () => null,
      );
      _stats = OrderStats(
        forPickUp: _orders
            .where((order) => order.taskType == 'pickup' && order.isActive)
            .length,
        active: _orders
            .where((order) => order.taskType == 'delivery' && order.isActive)
            .length,
        delivered: _orders
            .where(
              (order) =>
                  order.status == 'DELIVERED' || order.status == 'COMPLETED',
            )
            .length,
      );
      _isLoading = false;
      notifyListeners();
    } on ApiException catch (e) {
      _errorMessage = e.userMessage;
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchActiveOrder() async {
    try {
      _activeOrder = await orderService.getActiveOrder();
      notifyListeners();
    } on ApiException catch (e) {
      _errorMessage = e.userMessage;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
    }
  }

  Future<void> fetchStats() async {
    try {
      _stats = await orderService.getOrderStats();
      notifyListeners();
    } on ApiException catch (e) {
      _errorMessage = e.userMessage;
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
    }
  }

  Future<void> refresh() async {
    await fetchOrders();
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}
