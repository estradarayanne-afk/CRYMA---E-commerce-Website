import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/order_provider.dart';
import '../../widgets/loading_indicator.dart';
import '../../widgets/error_widget.dart';
import '../../widgets/order_card.dart';
import 'order_detail_screen.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({Key? key}) : super(key: key);

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  String? _selectedStatus;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<OrderProvider>().fetchOrders();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Orders')),
      body: Consumer<OrderProvider>(
        builder: (context, orderProvider, _) {
          final orders = orderProvider.orders.where((order) {
            switch (_selectedStatus) {
              case 'PICKUPS':
                return order.taskType == 'pickup' && order.isActive;
              case 'DELIVERIES':
                return order.taskType == 'delivery' && order.isActive;
              case 'HISTORY':
                return !order.isActive;
              default:
                return true;
            }
          }).toList();

          return Column(
            children: [
              // Filter chips
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    FilterChip(
                      label: const Text('All'),
                      selected: _selectedStatus == null,
                      onSelected: (selected) {
                        setState(() => _selectedStatus = null);
                      },
                    ),
                    const SizedBox(width: 8),
                    FilterChip(
                      label: const Text('Pickups'),
                      selected: _selectedStatus == 'PICKUPS',
                      onSelected: (selected) {
                        setState(
                          () => _selectedStatus = selected ? 'PICKUPS' : null,
                        );
                      },
                    ),
                    const SizedBox(width: 8),
                    FilterChip(
                      label: const Text('Deliveries'),
                      selected: _selectedStatus == 'DELIVERIES',
                      onSelected: (selected) {
                        setState(
                          () =>
                              _selectedStatus = selected ? 'DELIVERIES' : null,
                        );
                      },
                    ),
                    const SizedBox(width: 8),
                    FilterChip(
                      label: const Text('History'),
                      selected: _selectedStatus == 'HISTORY',
                      onSelected: (selected) {
                        setState(
                          () => _selectedStatus = selected ? 'HISTORY' : null,
                        );
                      },
                    ),
                  ],
                ),
              ),

              // Orders list
              Expanded(
                child: orderProvider.isLoading
                    ? const LoadingIndicator()
                    : orderProvider.errorMessage != null
                    ? AppErrorWidget(
                        message: orderProvider.errorMessage!,
                        onRetry: () => orderProvider.fetchOrders(),
                      )
                    : orders.isEmpty
                    ? Center(
                        child: Text(
                          'No orders found',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      )
                    : ListView.builder(
                        itemCount: orders.length,
                        itemBuilder: (context, index) {
                          final order = orders[index];
                          return OrderCard(
                            order: order,
                            onTap: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(
                                  builder: (context) =>
                                      OrderDetailScreen(orderId: order.id),
                                ),
                              );
                            },
                          );
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}
