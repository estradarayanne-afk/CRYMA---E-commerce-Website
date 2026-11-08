import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../services/api_service.dart';
import '../../utils/colors.dart';
import '../../widgets/buyer_bottom_navigation_bar.dart';

/// Order Activity — shows the buyer's recent orders as an activity feed.
/// This is NOT a push-notification system; the backend does not have a
/// dedicated notifications endpoint for buyers. This screen surfaces
/// order updates instead, which is the closest equivalent.
class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key, this.apiService});

  final ApiService? apiService;

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  ApiService get _api => widget.apiService ?? ApiService.instance;

  List<Map<String, dynamic>> _orders = [];
  bool _loading = true;
  String? _error;

  static const _statusColors = <String, Color>{
    'completed': AppColors.success,
    'delivered': AppColors.success,
    'cancelled': AppColors.danger,
    'delivery_failed': AppColors.danger,
    'out_for_delivery': Color(0xFF285C76),
    'at_sorting_center': Color(0xFF285C76),
    'ready_for_pickup': AppColors.primary,
    'pending': AppColors.gold,
    'placed': AppColors.gold,
  };

  Color _statusColor(String status) =>
      _statusColors[status.toLowerCase()] ?? AppColors.primary;

  String _label(String value) => value
      .toLowerCase()
      .split('_')
      .map((p) => p.isEmpty ? p : '${p[0].toUpperCase()}${p.substring(1)}')
      .join(' ');

  String _formatDate(String? raw) {
    if (raw == null) return '';
    try {
      return DateFormat('MMM d, yyyy · h:mm a')
          .format(DateTime.parse(raw).toLocal());
    } catch (_) {
      return raw;
    }
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final page = await _api.getBuyerOrdersPage(
        sort: 'newest',
      );
      if (!mounted) return;
      setState(() {
        _orders = page.items;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        toolbarHeight: 72,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Order Activity'),
            SizedBox(height: 2),
            Text(
              'The latest updates on your purchases.',
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: 11,
                fontWeight: FontWeight.w400,
                color: AppColors.textSubtle,
              ),
            ),
          ],
        ),
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.wine,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: const TextStyle(
          fontFamily: 'Poppins',
          fontSize: 19,
          fontWeight: FontWeight.w700,
          color: AppColors.wine,
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh activity',
            onPressed: _loading ? null : _load,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      const Icon(Icons.error_outline,
                          size: 42, color: AppColors.danger),
                      const SizedBox(height: 12),
                      Text(_error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                              color: AppColors.textSecondary,
                              fontFamily: 'Poppins')),
                      const SizedBox(height: 14),
                      FilledButton(
                          onPressed: _load, child: const Text('Retry')),
                    ]),
                  ),
                )
              : _orders.isEmpty
                  ? const Center(
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.inbox_outlined,
                            size: 48, color: AppColors.gray),
                        SizedBox(height: 14),
                        Text('No order activity yet.',
                            style: TextStyle(
                                color: AppColors.textSecondary,
                                fontFamily: 'Poppins')),
                      ]),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 10),
                        itemCount: _orders.length,
                        itemBuilder: (context, index) {
                          final order = _orders[index];
                          final id = order['id'].toString();
                          final status =
                              order['status']?.toString() ?? 'unknown';
                          final color = _statusColor(status);
                          final updatedAt = _formatDate(
                              order['updated_at']?.toString() ??
                                  order['created_at']?.toString());
                          final items = (order['items'] as List? ?? [])
                              .whereType<Map<String, dynamic>>()
                              .toList();
                          final firstItem =
                              items.isNotEmpty ? items.first : null;
                          final productName =
                              firstItem?['product']?['name']?.toString() ??
                                  'Order #$id';
                          final extraCount = items.length > 1
                              ? ' +${items.length - 1} more'
                              : '';

                          return Card(
                            color: AppColors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(18),
                              side: const BorderSide(
                                color: AppColors.borderNeutral,
                              ),
                            ),
                            margin: const EdgeInsets.only(bottom: 11),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(18),
                              onTap: () => Navigator.pushNamed(
                                  context, '/order_details',
                                  arguments: id),
                              child: Padding(
                                padding: const EdgeInsets.all(15),
                                child: Row(
                                  children: [
                                    CircleAvatar(
                                      backgroundColor:
                                          color.withValues(alpha: 0.1),
                                      child: Icon(
                                        Icons.local_shipping_rounded,
                                        color: color,
                                        size: 21,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            'Order #$id',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.w700,
                                              color: AppColors.darkGray,
                                              fontFamily: 'Poppins',
                                            ),
                                          ),
                                          const SizedBox(height: 3),
                                          Text(
                                            '$productName$extraCount',
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w500,
                                              color: AppColors.textSecondary,
                                              fontFamily: 'Poppins',
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Row(children: [
                                            Container(
                                              padding:
                                                  const EdgeInsets.symmetric(
                                                      horizontal: 9,
                                                      vertical: 4),
                                              decoration: BoxDecoration(
                                                color: color.withValues(
                                                    alpha: 0.12),
                                                borderRadius:
                                                    BorderRadius.circular(999),
                                              ),
                                              child: Text(
                                                _label(status),
                                                style: TextStyle(
                                                  fontSize: 11,
                                                  fontWeight: FontWeight.w700,
                                                  color: color,
                                                  fontFamily: 'Poppins',
                                                ),
                                              ),
                                            ),
                                          ]),
                                          if (updatedAt.isNotEmpty) ...[
                                            const SizedBox(height: 4),
                                            Text(
                                              updatedAt,
                                              style: const TextStyle(
                                                fontSize: 11,
                                                color: AppColors.gray,
                                                fontFamily: 'Poppins',
                                              ),
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                    const Icon(Icons.chevron_right,
                                        color: AppColors.gray, size: 18),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
      bottomNavigationBar: BuyerBottomNavigationBar(
        currentIndex: 1,
        onDestinationSelected: (i) =>
            BuyerBottomNavigationBar.navigateToTab(context, i, 1),
      ),
    );
  }
}
