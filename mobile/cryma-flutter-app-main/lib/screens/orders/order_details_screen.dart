import 'package:flutter/material.dart';

import '../../services/api_service.dart';
import '../../utils/colors.dart';

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
      setState(() { _loading = false; _error = 'No order was selected.'; });
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final order = await ApiService.instance.getBuyerOrder(widget.orderId!);
      if (!mounted) return;
      setState(() { _order = order; _loading = false; });
    } catch (error) {
      if (!mounted) return;
      setState(() { _error = error.toString(); _loading = false; });
    }
  }

  Future<void> _confirmReceived() async {
    setState(() => _confirming = true);
    try {
      await ApiService.instance.confirmOrderReceived(widget.orderId!);
      await _loadOrder();
    } catch (error) {
      if (mounted) _snack(error.toString());
    } finally {
      if (mounted) setState(() => _confirming = false);
    }
  }

  Future<void> _cancelOrder() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Cancel this order?'),
        content: const Text(
            'Cancellation is only available before shipment activity. '
            'The server will confirm whether this order is still eligible.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Keep order')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Cancel order')),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;
    setState(() => _acting = true);
    try {
      await ApiService.instance.cancelBuyerOrder(widget.orderId!);
      await _loadOrder();
      if (mounted) _snack('Order cancelled.');
    } catch (error) {
      if (mounted) _snack(error.toString());
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  Future<void> _requestRefund(Map<String, dynamic> order) async {
    final reason = TextEditingController();
    final amount = TextEditingController(text: order['total_amount']?.toString() ?? '');
    final values = await showDialog<Map<String, String>>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Request a refund'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(
            controller: amount,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(labelText: 'Requested amount (₱)'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: reason,
            minLines: 3,
            maxLines: 5,
            decoration: const InputDecoration(
              labelText: 'Reason',
              hintText: 'Explain why you are requesting a refund (min 10 chars)',
              alignLabelWithHint: true,
            ),
          ),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
          FilledButton(
            onPressed: () => Navigator.pop(context, {'reason': reason.text, 'amount': amount.text}),
            child: const Text('Submit'),
          ),
        ],
      ),
    );
    if (values == null || !mounted) { reason.dispose(); amount.dispose(); return; }
    final requested = double.tryParse(values['amount'] ?? '');
    final reasonText = values['reason']?.trim() ?? '';
    reason.dispose();
    amount.dispose();
    final total = double.tryParse(order['total_amount']?.toString() ?? '') ?? 0;
    if (requested == null || requested <= 0 || requested > total || reasonText.length < 10 || reasonText.length > 2000) {
      _snack('Enter an amount within the order total and a reason of at least 10 characters.');
      return;
    }
    setState(() => _acting = true);
    try {
      await ApiService.instance.requestBuyerRefund(
        orderId: widget.orderId!,
        reason: reasonText,
        requestedAmount: requested,
      );
      await _loadOrder();
      if (mounted) _snack('Refund request submitted for review.');
    } catch (error) {
      if (mounted) _snack(error.toString());
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  Future<void> _contactSeller(Map<String, dynamic> order) async {
    final items = order['items'] is List ? order['items'] as List : const [];
    final first = items.whereType<Map<String, dynamic>>().firstOrNull;
    final productId = first?['product_id']?.toString() ??
        (first?['product'] is Map<String, dynamic>
            ? first!['product']['id']?.toString() : null);
    if (productId == null) {
      if (mounted) _snack('This order has no product to open a conversation with.');
      return;
    }
    setState(() => _acting = true);
    try {
      final response = await ApiService.instance.startBuyerSellerConversation(productId: productId);
      final conversationId = response['data']?['id']?.toString() ?? response['id']?.toString();
      if (conversationId == null || conversationId.isEmpty) {
        throw const ApiException('Conversation could not be opened.');
      }
      if (!mounted) return;
      Navigator.pushNamed(context, '/chat_conversation', arguments: conversationId);
    } catch (error) {
      if (mounted) _snack(error.toString());
    } finally {
      if (mounted) setState(() => _acting = false);
    }
  }

  void _snack(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  String _titleCase(String value) => value
      .toLowerCase().split('_')
      .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}')
      .join(' ');

  String _humanisePayment(String? raw) {
    if (raw == null || raw.isEmpty) return '—';
    return raw.split('_').map((w) =>
      w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}').join(' ');
  }

  String _fmtDate(String? raw) {
    if (raw == null) return '';
    try { return DateTime.parse(raw).toLocal().toString().substring(0, 16); }
    catch (_) { return raw; }
  }

  static const _statusColours = <String, Color>{
    'pending': AppColors.warning, 'placed': AppColors.warning,
    'confirmed': AppColors.primary, 'preparing': AppColors.primary,
    'ready_for_pickup': AppColors.primary,
    'picked_up': AppColors.info, 'at_sorting_center': AppColors.info,
    'sorted': AppColors.info, 'assigned_to_rider': AppColors.info,
    'out_for_delivery': AppColors.info,
    'delivered': AppColors.success, 'completed': AppColors.success,
    'cancelled': AppColors.danger, 'delivery_failed': AppColors.danger,
    'returned': AppColors.danger,
  };
  static const _statusBg = <String, Color>{
    'pending': AppColors.warningSoft, 'placed': AppColors.warningSoft,
    'confirmed': AppColors.softRose, 'preparing': AppColors.softRose,
    'ready_for_pickup': AppColors.softRose,
    'picked_up': AppColors.infoSoft, 'at_sorting_center': AppColors.infoSoft,
    'sorted': AppColors.infoSoft, 'assigned_to_rider': AppColors.infoSoft,
    'out_for_delivery': AppColors.infoSoft,
    'delivered': AppColors.successSoft, 'completed': AppColors.successSoft,
    'cancelled': AppColors.dangerSoft, 'delivery_failed': AppColors.dangerSoft,
    'returned': AppColors.dangerSoft,
  };

  Color _sc(String s) => _statusColours[s.toLowerCase()] ?? AppColors.primary;
  Color _sb(String s) => _statusBg[s.toLowerCase()] ?? AppColors.lightGray;

  @override
  Widget build(BuildContext context) {
    final order = _order;
    final statusUpper = order?['status']?.toString().toUpperCase() ?? '';
    final items = order?['items'] is List ? order!['items'] as List : const [];
    final delivery = order?['delivery_progress'] is Map<String, dynamic>
        ? order!['delivery_progress'] as Map<String, dynamic> : null;
    final events = (delivery?['events'] as List? ?? const [])
        .whereType<Map<String, dynamic>>().toList().reversed.toList();
    final refund = order?['latest_refund_request'] is Map<String, dynamic>
        ? order!['latest_refund_request'] as Map<String, dynamic> : null;

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text('Order Details'),
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.primary,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.error_outline, size: 42, color: AppColors.danger),
                      const SizedBox(height: 12),
                      Text(_error!, textAlign: TextAlign.center,
                          style: const TextStyle(color: AppColors.textSecondary, fontFamily: 'Poppins')),
                      const SizedBox(height: 14),
                      FilledButton(onPressed: _loadOrder, child: const Text('Retry')),
                    ]),
                  ),
                )
              : order == null
                  ? const Center(child: Text('Order not found.'))
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                      children: [
                        // ── ORDER SUMMARY HEADER ─────────────────────────
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.borderNeutral),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    '#${order['id']}',
                                    style: const TextStyle(
                                      fontFamily: 'Poppins', fontSize: 18,
                                      fontWeight: FontWeight.w800,
                                      color: AppColors.wine,
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: _sb(order['status']?.toString() ?? ''),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      _titleCase(order['status']?.toString() ?? 'Unknown'),
                                      style: TextStyle(
                                        fontFamily: 'Poppins', fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: _sc(order['status']?.toString() ?? ''),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 10),
                              _infoRow('Placed', _fmtDate(order['created_at']?.toString())),
                              _infoRow('Payment', _humanisePayment(order['payment_method']?.toString())),
                              _infoRow('Total', '₱${order['total_amount'] ?? '0.00'}',
                                  valueStyle: const TextStyle(
                                    fontFamily: 'Poppins', fontSize: 15,
                                    fontWeight: FontWeight.w800,
                                    color: AppColors.primary,
                                  )),
                              if ((order['delivery_address'] ?? '').toString().isNotEmpty)
                                _infoRow('Delivery to', order['delivery_address'].toString()),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),

                        // ── ITEMS ────────────────────────────────────────
                        _sectionTitle('Items'),
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.borderNeutral),
                          ),
                          child: Column(
                            children: [
                              for (final item in items.whereType<Map<String, dynamic>>())
                                Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 6),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              item['product'] is Map<String, dynamic>
                                                  ? item['product']['name']?.toString() ?? 'Product'
                                                  : 'Product',
                                              style: const TextStyle(
                                                fontFamily: 'Poppins', fontSize: 14,
                                                fontWeight: FontWeight.w600,
                                                color: AppColors.darkGray,
                                              ),
                                            ),
                                            const SizedBox(height: 3),
                                            Text(
                                              'Qty ${item['quantity'] ?? 0}${item['variant_label'] != null ? ' · ${item['variant_label']}' : ''}',
                                              style: const TextStyle(
                                                fontFamily: 'Poppins', fontSize: 12,
                                                color: AppColors.textSubtle,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Text(
                                        '₱${item['subtotal'] ?? '0.00'}',
                                        style: const TextStyle(
                                          fontFamily: 'Poppins', fontSize: 14,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                            ],
                          ),
                        ),

                        // ── DELIVERY TIMELINE ────────────────────────────
                        if (events.isNotEmpty) ...[
                          const SizedBox(height: 16),
                          _sectionTitle('Delivery updates'),
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.borderNeutral),
                            ),
                            child: Column(
                              children: [
                                for (int i = 0; i < events.length; i++)
                                  _TimelineItem(
                                    label: _titleCase(
                                      events[i]['new_status']?.toString() ??
                                          events[i]['event_type']?.toString() ??
                                          'Update',
                                    ),
                                    date: _fmtDate(events[i]['created_at']?.toString()),
                                    isLast: i == events.length - 1,
                                  ),
                              ],
                            ),
                          ),
                        ],

                        // ── REFUND CARD ──────────────────────────────────
                        if (refund != null) ...[
                          const SizedBox(height: 16),
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: AppColors.borderNeutral),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(children: [
                                  const Icon(Icons.assignment_return_outlined,
                                      color: AppColors.primary, size: 18),
                                  const SizedBox(width: 8),
                                  const Text('Refund request',
                                      style: TextStyle(
                                        fontFamily: 'Poppins', fontSize: 14,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.darkGray,
                                      )),
                                  const Spacer(),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: AppColors.softRose,
                                      borderRadius: BorderRadius.circular(7),
                                    ),
                                    child: Text(
                                      _titleCase(refund['status']?.toString() ?? 'pending'),
                                      style: const TextStyle(
                                        fontFamily: 'Poppins', fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  ),
                                ]),
                                const SizedBox(height: 6),
                                Text(
                                  'Requested ₱${refund['requested_amount'] ?? '—'}',
                                  style: const TextStyle(
                                    fontFamily: 'Poppins', fontSize: 13,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                                if (refund['review_note'] != null)
                                  Text(
                                    refund['review_note'].toString(),
                                    style: const TextStyle(
                                      fontFamily: 'Poppins', fontSize: 12,
                                      color: AppColors.textSubtle, height: 1.45,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ],

                        const SizedBox(height: 20),

                        // ── ACTION BUTTONS ───────────────────────────────
                        OutlinedButton.icon(
                          onPressed: _acting ? null : () => _contactSeller(order),
                          icon: const Icon(Icons.chat_bubble_outline, size: 18),
                          label: const Text('Contact seller'),
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size(double.infinity, 48),
                          ),
                        ),
                        const SizedBox(height: 10),
                        if (['PENDING', 'PLACED'].contains(statusUpper) && delivery == null)
                          OutlinedButton.icon(
                            onPressed: _acting ? null : _cancelOrder,
                            icon: const Icon(Icons.cancel_outlined, size: 18),
                            label: Text(_acting ? 'Please wait…' : 'Cancel order'),
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(double.infinity, 48),
                              foregroundColor: AppColors.danger,
                              side: const BorderSide(color: AppColors.danger),
                            ),
                          ),
                        if (statusUpper == 'DELIVERED') ...[
                          const SizedBox(height: 10),
                          FilledButton.icon(
                            onPressed: _confirming ? null : _confirmReceived,
                            icon: const Icon(Icons.check_circle_outline, size: 18),
                            label: Text(_confirming ? 'Confirming…' : 'Confirm Receipt'),
                            style: FilledButton.styleFrom(
                              minimumSize: const Size(double.infinity, 50),
                            ),
                          ),
                        ],
                        if (statusUpper == 'COMPLETED') ...[
                          const SizedBox(height: 10),
                          OutlinedButton.icon(
                            onPressed: () => Navigator.pushNamed(
                              context, '/rate_feedback',
                              arguments: order['id'].toString(),
                            ),
                            icon: const Icon(Icons.star_outline, size: 18),
                            label: const Text('Review a product'),
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(double.infinity, 48),
                            ),
                          ),
                        ],
                        if (['DELIVERED', 'COMPLETED'].contains(statusUpper) &&
                            (refund == null || refund['status']?.toString() == 'rejected')) ...[
                          const SizedBox(height: 10),
                          OutlinedButton.icon(
                            onPressed: _acting ? null : () => _requestRefund(order),
                            icon: const Icon(Icons.assignment_return_outlined, size: 18),
                            label: Text(refund == null ? 'Request a refund' : 'Submit a new refund request'),
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(double.infinity, 48),
                            ),
                          ),
                        ],
                      ],
                    ),
    );
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 0, 4, 8),
      child: Text(
        title,
        style: const TextStyle(
          fontFamily: 'Poppins', fontSize: 15,
          fontWeight: FontWeight.w700, color: AppColors.darkGray,
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value, {TextStyle? valueStyle}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 90,
            child: Text(label,
                style: const TextStyle(
                  fontFamily: 'Poppins', fontSize: 13,
                  color: AppColors.textSubtle,
                )),
          ),
          Expanded(
            child: Text(value,
                style: valueStyle ??
                    const TextStyle(
                      fontFamily: 'Poppins', fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.darkGray,
                    )),
          ),
        ],
      ),
    );
  }
}

// ── TIMELINE ITEM ──────────────────────────────────────────────────────────
class _TimelineItem extends StatelessWidget {
  const _TimelineItem({
    required this.label,
    required this.date,
    required this.isLast,
  });
  final String label;
  final String date;
  final bool isLast;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Timeline marker column
        Column(
          children: [
            Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: AppColors.success.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_rounded,
                  size: 14, color: AppColors.success),
            ),
            if (!isLast)
              Container(
                width: 1.5,
                height: 36,
                color: AppColors.borderNeutral,
              ),
          ],
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Padding(
            padding: EdgeInsets.only(bottom: isLast ? 0 : 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label,
                    style: const TextStyle(
                      fontFamily: 'Poppins', fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.darkGray,
                    )),
                if (date.isNotEmpty)
                  Text(date,
                      style: const TextStyle(
                        fontFamily: 'Poppins', fontSize: 11,
                        color: AppColors.textSubtle,
                      )),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
