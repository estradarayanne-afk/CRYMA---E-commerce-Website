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
  bool _acting = false;

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

  Future<void> _cancelOrder() async {
    final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
              title: const Text('Cancel this order?'),
              content: const Text(
                  'Cancellation is only available before shipment activity. The server will confirm whether this order is still eligible.'),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(context, false),
                    child: const Text('Keep order')),
                FilledButton(
                    onPressed: () => Navigator.pop(context, true),
                    child: const Text('Cancel order'))
              ],
            ));
    if (confirmed != true || !mounted) return;
    setState(() => _acting = true);
    try {
      await ApiService.instance.cancelBuyerOrder(widget.orderId!);
      await _loadOrder();
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Order cancelled.')));
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  Future<void> _requestRefund(Map<String, dynamic> order) async {
    final reason = TextEditingController();
    final amount =
        TextEditingController(text: order['total_amount']?.toString() ?? '');
    final values = await showDialog<Map<String, String>>(
        context: context,
        builder: (context) => AlertDialog(
              title: const Text('Request a refund'),
              content: Column(mainAxisSize: MainAxisSize.min, children: [
                TextField(
                    controller: amount,
                    keyboardType:
                        const TextInputType.numberWithOptions(decimal: true),
                    decoration:
                        const InputDecoration(labelText: 'Requested amount')),
                TextField(
                    controller: reason,
                    minLines: 3,
                    maxLines: 5,
                    decoration: const InputDecoration(
                        labelText: 'Reason (10–2000 characters)')),
              ]),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Close')),
                FilledButton(
                    onPressed: () => Navigator.pop(context,
                        {'reason': reason.text, 'amount': amount.text}),
                    child: const Text('Submit'))
              ],
            ));
    if (values == null || !mounted) {
      reason.dispose();
      amount.dispose();
      return;
    }
    final requested = double.tryParse(values['amount'] ?? '');
    final reasonText = values['reason']?.trim() ?? '';
    reason.dispose();
    amount.dispose();
    final total = double.tryParse(order['total_amount']?.toString() ?? '') ?? 0;
    if (requested == null ||
        requested <= 0 ||
        requested > total ||
        reasonText.length < 10 ||
        reasonText.length > 2000) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text(
              'Enter an amount within the order total and a reason of at least 10 characters.')));
      return;
    }
    setState(() => _acting = true);
    try {
      await ApiService.instance.requestBuyerRefund(
          orderId: widget.orderId!,
          reason: reasonText,
          requestedAmount: requested);
      await _loadOrder();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Refund request submitted for review.')));
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.toString())));
      }
    } finally {
      if (mounted) setState(() => _acting = false);
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
    final delivery = order?['delivery_progress'] is Map<String, dynamic>
        ? order!['delivery_progress'] as Map<String, dynamic>
        : <String, dynamic>{};
    final events =
        delivery['events'] is List ? delivery['events'] as List : const [];
    final refundRequest =
        order?['latest_refund_request'] is Map<String, dynamic>
            ? order!['latest_refund_request'] as Map<String, dynamic>
            : null;
    final refundStatus = refundRequest?['status']?.toString();
    return Scaffold(
      backgroundColor: AppColors.background,
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
                                Text(
                                    'Total: ₱${order['total_amount'] ?? '0.00'}'),
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
                                          ? item['product']['name']
                                                  ?.toString() ??
                                              'Product'
                                          : 'Product',
                                    ),
                                    subtitle: Text(
                                      'Quantity: ${item['quantity'] ?? 0}'
                                      '${item['variant_label'] == null ? '' : ' · ${item['variant_label']}'}',
                                    ),
                                    trailing:
                                        Text('₱${item['subtotal'] ?? '0.00'}'),
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
                                    style:
                                        TextStyle(fontWeight: FontWeight.bold),
                                  ),
                                  const SizedBox(height: 8),
                                  for (final event in events
                                      .whereType<Map<String, dynamic>>())
                                    ListTile(
                                      contentPadding: EdgeInsets.zero,
                                      leading: const Icon(
                                          Icons.check_circle_outline),
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
                        if (['PENDING', 'PLACED'].contains(
                                order['status']?.toString().toUpperCase()) &&
                            order['delivery_progress'] == null)
                          OutlinedButton.icon(
                              onPressed: _acting ? null : _cancelOrder,
                              icon: const Icon(Icons.cancel_outlined),
                              label: Text(
                                  _acting ? 'Please wait…' : 'Cancel order')),
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
                        if (order['status']?.toString().toUpperCase() ==
                            'COMPLETED')
                          Padding(
                            padding: const EdgeInsets.only(top: 12),
                            child: OutlinedButton.icon(
                              onPressed: () => Navigator.pushNamed(
                                context,
                                '/rate_feedback',
                                arguments: order['id'].toString(),
                              ),
                              icon: const Icon(Icons.star_outline),
                              label: const Text('Review a product'),
                            ),
                          ),
                        if (refundRequest != null)
                          Card(
                              child: ListTile(
                                  leading: const Icon(
                                      Icons.assignment_return_outlined,
                                      color: AppColors.primary),
                                  title: Text(
                                      'Refund request · ${_titleCase(refundStatus ?? 'pending')}'),
                                  subtitle: Text(
                                      'Requested ₱${refundRequest['requested_amount'] ?? '—'}${refundRequest['review_note'] == null ? '' : '\n${refundRequest['review_note']}'}'))),
                        if (['DELIVERED', 'COMPLETED'].contains(
                                order['status']?.toString().toUpperCase()) &&
                            (refundRequest == null ||
                                refundStatus == 'rejected'))
                          OutlinedButton.icon(
                            onPressed:
                                _acting ? null : () => _requestRefund(order),
                            icon: const Icon(Icons.assignment_return_outlined),
                            label: Text(refundRequest == null
                                ? 'Request a refund'
                                : 'Submit a new refund request'),
                          ),
                      ],
                    ),
    );
  }
}
