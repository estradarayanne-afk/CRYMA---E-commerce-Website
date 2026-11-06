import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../utils/colors.dart';

class OrderTrackingScreen extends StatefulWidget {
  const OrderTrackingScreen({super.key, this.orderId});
  final String? orderId;
  @override
  State<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends State<OrderTrackingScreen> {
  Map<String, dynamic>? _order;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final id = widget.orderId;
    if (id == null || id.isEmpty) {
      setState(() {
        _error = 'Select an order to view its tracking updates.';
        _loading = false;
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final order = await ApiService.instance.getBuyerOrder(id);
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

  String _label(String value) => value
      .toLowerCase()
      .split('_')
      .map((part) =>
          part.isEmpty ? part : '${part[0].toUpperCase()}${part.substring(1)}')
      .join(' ');

  @override
  Widget build(BuildContext context) {
    final delivery = _order?['delivery_progress'] is Map<String, dynamic>
        ? _order!['delivery_progress'] as Map<String, dynamic>
        : null;
    final events = (delivery?['events'] as List? ?? const [])
        .whereType<Map<String, dynamic>>()
        .toList()
        .reversed
        .toList();
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
          title: const Text('Order Tracking'),
          backgroundColor: AppColors.white,
          foregroundColor: AppColors.primary,
          elevation: 0),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Text(_error!, textAlign: TextAlign.center),
                        TextButton(onPressed: _load, child: const Text('Retry'))
                      ])))
              : _order == null
                  ? const Center(child: Text('Order not found.'))
                  : ListView(padding: const EdgeInsets.all(16), children: [
                      Card(
                          child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Order #${_order!['id']}',
                                        style: Theme.of(context)
                                            .textTheme
                                            .titleLarge),
                                    const SizedBox(height: 8),
                                    Text(
                                        'Order status: ${_label(_order!['status']?.toString() ?? 'unknown')}'),
                                    if (delivery != null) ...[
                                      const SizedBox(height: 6),
                                      Text(
                                          'Delivery status: ${_label(delivery['status']?.toString() ?? 'unknown')}'),
                                      if (delivery['parcel_code'] != null)
                                        Text(
                                            'Parcel code: ${delivery['parcel_code']}'),
                                      if ((delivery['current_hub']
                                              as Map?)?['name'] !=
                                          null)
                                        Text(
                                            'Current hub: ${(delivery['current_hub'] as Map)['name']}'),
                                      if ((delivery['delivery_area']
                                              as Map?)?['name'] !=
                                          null)
                                        Text(
                                            'Delivery area: ${(delivery['delivery_area'] as Map)['name']}'),
                                    ] else
                                      const Padding(
                                          padding: EdgeInsets.only(top: 8),
                                          child: Text(
                                              'Shipment tracking will appear here once the parcel is assigned.')),
                                  ]))),
                      if (events.isNotEmpty)
                        Card(
                            child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text('Delivery updates',
                                          style: Theme.of(context)
                                              .textTheme
                                              .titleMedium),
                                      const SizedBox(height: 8),
                                      for (final event in events)
                                        ListTile(
                                            contentPadding: EdgeInsets.zero,
                                            leading: const Icon(
                                                Icons.local_shipping_outlined,
                                                color: AppColors.primary),
                                            title: Text(_label(
                                                (event['new_status'] ??
                                                        event['event_type'] ??
                                                        'Update')
                                                    .toString())),
                                            subtitle: Text(event['created_at']
                                                    ?.toString() ??
                                                '')),
                                    ]))),
                      if (events.isEmpty && delivery != null)
                        const Card(
                            child: Padding(
                                padding: EdgeInsets.all(16),
                                child: Text(
                                    'No carrier or rider details are available from the order service yet.'))),
                      OutlinedButton.icon(
                          onPressed: () => Navigator.pushNamed(
                              context, '/order_details',
                              arguments: widget.orderId),
                          icon: const Icon(Icons.receipt_long_outlined),
                          label: const Text('Order details')),
                    ]),
    );
  }
}
