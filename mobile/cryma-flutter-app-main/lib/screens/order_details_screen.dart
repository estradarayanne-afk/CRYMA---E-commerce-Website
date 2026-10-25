import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../utils/colors.dart';

class OrderDetailsScreen extends StatefulWidget {
  const OrderDetailsScreen({super.key, this.orderId});

  final String? orderId;

  @override
  State<OrderDetailsScreen> createState() => _OrderDetailsScreenState();
}

class _OrderDetailsScreenState extends State<OrderDetailsScreen> {
  Map<String, dynamic>? _order;
  String? _error;
  bool _loading = true;
  bool _confirming = false;

  @override
  void initState() {
    super.initState();
    _loadOrder();
  }

  Future<void> _loadOrder() async {
    if (widget.orderId == null) {
      setState(() {
        _loading = false;
        _error = 'No order was selected.';
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final order = await ApiService.instance.getBuyerOrder(widget.orderId!);
      if (!mounted) return;
      setState(() {
        _order = order;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<void> _confirmReceived() async {
    setState(() => _confirming = true);
    try {
      await ApiService.instance.confirmOrderReceived(widget.orderId!);
      await _loadOrder();
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => _confirming = false);
    }
  }

  String _titleCase(String value) => value
      .toLowerCase()
      .split('_')
      .map(
        (word) => word.isEmpty
            ? word
            : '${word[0].toUpperCase()}${word.substring(1)}',
      )
      .join(' ');

  @override
  Widget build(BuildContext context) {
    final order = _order;
    final items = order?['items'] is List ? order!['items'] as List : const [];
    final delivery = order?['delivery'] is Map<String, dynamic>
        ? order!['delivery'] as Map<String, dynamic>
        : <String, dynamic>{};
    final events = delivery['events'] is List
        ? delivery['events'] as List
        : const [];
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      appBar: AppBar(
        title: const Text('Order Details'),
        foregroundColor: AppColors.primary,
        backgroundColor: AppColors.white,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(_error!, textAlign: TextAlign.center),
                    TextButton(
                      onPressed: _loadOrder,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
              ),
            )
          : order == null
          ? const Center(child: Text('Order not found.'))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Order #${order['id']}',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Status: ${_titleCase(order['status']?.toString() ?? 'Unknown')}',
                        ),
                        Text(
                          'Payment: ${_titleCase(order['payment_method']?.toString() ?? 'Unknown')}',
                        ),
                        Text('Total: ₱${order['total_amount'] ?? '0.00'}'),
                        if ((order['delivery_address'] ?? '')
                            .toString()
                            .isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: Text(
                              'Delivery to: ${order['delivery_address']}',
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Items',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                        for (final item
                            in items.whereType<Map<String, dynamic>>())
                          ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(
                              item['product'] is Map<String, dynamic>
                                  ? item['product']['name']?.toString() ??
                                        'Product'
                                  : 'Product',
                            ),
                            subtitle: Text(
                              'Quantity: ${item['quantity'] ?? 0}'
                              '${item['variant_label'] == null ? '' : ' · ${item['variant_label']}'}',
                            ),
                            trailing: Text('₱${item['subtotal'] ?? '0.00'}'),
                          ),
                      ],
                    ),
                  ),
                ),
                if (events.isNotEmpty)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Delivery Updates',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          for (final event
                              in events.whereType<Map<String, dynamic>>())
                            ListTile(
                              contentPadding: EdgeInsets.zero,
                              leading: const Icon(Icons.check_circle_outline),
                              title: Text(
                                _titleCase(
                                  event['new_status']?.toString() ??
                                      event['event_type']?.toString() ??
                                      'Update',
                                ),
                              ),
                              subtitle: Text(
                                event['created_at']?.toString() ?? '',
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                if (order['status'] == 'DELIVERED')
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: ElevatedButton(
                      onPressed: _confirming ? null : _confirmReceived,
                      child: _confirming
                          ? const CircularProgressIndicator()
                          : const Text('Confirm Receipt'),
                    ),
                  ),
              ],
            ),
    );
  }
}
