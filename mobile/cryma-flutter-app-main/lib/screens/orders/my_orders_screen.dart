import 'package:flutter/material.dart';

import '../../services/api_service.dart';
import '../../utils/colors.dart';
import '../../widgets/buyer_bottom_navigation_bar.dart';

class MyOrdersScreen extends StatefulWidget {
  const MyOrdersScreen({super.key});

  @override
  State<MyOrdersScreen> createState() => _MyOrdersScreenState();
}

class _MyOrdersScreenState extends State<MyOrdersScreen> {
  String _activeTab = '';
  List<Map<String, dynamic>> _orders = [];
  bool _loading = true;
  String? _error;
  int _currentPage = 1;
  int _lastPage = 1;
  bool _loadingMore = false;
  final _searchController = TextEditingController();
  String _sort = 'newest';
  String? _dateFrom;
  String? _dateTo;
  late final ScrollController _scrollController;

  static const _statusTabs = <String, String>{
    '': 'All',
    'pending': 'Pending',
    'placed': 'Placed',
    'confirmed': 'Confirmed',
    'preparing': 'Preparing',
    'ready_for_pickup': 'Ready',
    'out_for_delivery': 'In Transit',
    'delivered': 'Delivered',
    'completed': 'Completed',
    'cancelled': 'Cancelled',
    'delivery_failed': 'Failed',
  };

  static const _statusColours = <String, Color>{
    'pending': AppColors.warning,
    'placed': AppColors.warning,
    'confirmed': AppColors.primary,
    'preparing': AppColors.primary,
    'ready_for_pickup': AppColors.primary,
    'picked_up': AppColors.info,
    'at_sorting_center': AppColors.info,
    'sorted': AppColors.info,
    'assigned_to_rider': AppColors.info,
    'out_for_delivery': AppColors.info,
    'delivered': AppColors.success,
    'completed': AppColors.success,
    'cancelled': AppColors.danger,
    'delivery_failed': AppColors.danger,
    'returned': AppColors.danger,
  };

  static const _statusBg = <String, Color>{
    'pending': AppColors.warningSoft,
    'placed': AppColors.warningSoft,
    'confirmed': AppColors.softRose,
    'preparing': AppColors.softRose,
    'ready_for_pickup': AppColors.softRose,
    'picked_up': AppColors.infoSoft,
    'at_sorting_center': AppColors.infoSoft,
    'sorted': AppColors.infoSoft,
    'assigned_to_rider': AppColors.infoSoft,
    'out_for_delivery': AppColors.infoSoft,
    'delivered': AppColors.successSoft,
    'completed': AppColors.successSoft,
    'cancelled': AppColors.dangerSoft,
    'delivery_failed': AppColors.dangerSoft,
    'returned': AppColors.dangerSoft,
  };

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController()..addListener(_onScroll);
    _loadOrders();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
            _scrollController.position.maxScrollExtent - 200 &&
        !_loadingMore &&
        _currentPage < _lastPage) {
      _loadMore();
    }
  }

  Future<void> _loadOrders() async {
    setState(() { _loading = true; _error = null; });
    try {
      final page = await ApiService.instance.getBuyerOrdersPage(
        search: _searchController.text,
        status: _activeTab.isEmpty ? null : _activeTab,
        sort: _sort,
        dateFrom: _dateFrom,
        dateTo: _dateTo,
      );
      if (!mounted) return;
      setState(() {
        _orders = page.items;
        _currentPage = page.currentPage;
        _lastPage = page.lastPage;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() { _error = error.toString(); _loading = false; });
    }
  }

  Future<void> _loadMore() async {
    if (_loadingMore || _currentPage >= _lastPage) return;
    setState(() => _loadingMore = true);
    try {
      final page = await ApiService.instance.getBuyerOrdersPage(
        page: _currentPage + 1,
        search: _searchController.text,
        status: _activeTab.isEmpty ? null : _activeTab,
        sort: _sort,
        dateFrom: _dateFrom,
        dateTo: _dateTo,
      );
      if (!mounted) return;
      setState(() {
        _orders.addAll(page.items);
        _currentPage = page.currentPage;
        _lastPage = page.lastPage;
        _loadingMore = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() { _loadingMore = false; _error = error.toString(); });
    }
  }

  String _statusLabel(String raw) {
    final lower = raw.toLowerCase();
    if (_statusTabs.containsKey(lower)) return _statusTabs[lower]!;
    return raw
        .replaceAll('_', ' ')
        .split(' ')
        .map((w) => w.isEmpty ? w : '${w[0].toUpperCase()}${w.substring(1)}')
        .join(' ');
  }

  Color _statusColour(String status) =>
      _statusColours[status.toLowerCase()] ?? AppColors.primary;
  Color _statusBgColour(String status) =>
      _statusBg[status.toLowerCase()] ?? AppColors.lightGray;

  String _fmtPrice(dynamic value) {
    final n = double.tryParse(value?.toString() ?? '') ?? 0;
    final s = n == n.roundToDouble() ? n.toInt().toString() : n.toStringAsFixed(2);
    return '₱${s.replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
  }

  String _fmtDate(String? raw) {
    if (raw == null) return '';
    try {
      return DateTime.parse(raw).toLocal().toString().substring(0, 16);
    } catch (_) {
      return raw;
    }
  }

  String _actionLabel(String status) {
    switch (status.toLowerCase()) {
      case 'delivered':
        return 'Confirm Receipt';
      case 'completed':
        return 'Rate Order';
      case 'pending':
      case 'placed':
        return 'View / Cancel';
      default:
        return 'View Order';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── HEADER ────────────────────────────────────────────
            _buildHeader(),

            // ── STATUS TABS ────────────────────────────────────────
            _buildTabs(),

            const Divider(height: 1, color: AppColors.borderNeutral),

            // ── CONTENT ────────────────────────────────────────────
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? _buildError()
                      : _orders.isEmpty
                          ? _buildEmpty()
                          : ListView.builder(
                              controller: _scrollController,
                              padding: const EdgeInsets.fromLTRB(16, 14, 16, 24),
                              itemCount: _orders.length + (_loadingMore ? 1 : 0),
                              itemBuilder: (context, index) {
                                if (index >= _orders.length) {
                                  return const Padding(
                                    padding: EdgeInsets.all(16),
                                    child: Center(
                                      child: SizedBox(
                                        width: 22,
                                        height: 22,
                                        child: CircularProgressIndicator(strokeWidth: 2),
                                      ),
                                    ),
                                  );
                                }
                                return _buildOrderCard(_orders[index]);
                              },
                            ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: BuyerBottomNavigationBar(
        currentIndex: 2,
        onDestinationSelected: (i) =>
            BuyerBottomNavigationBar.navigateToTab(context, i, 2),
      ),
    );
  }

  // ── HEADER ─────────────────────────────────────────────────────────────
  Widget _buildHeader() {
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.fromLTRB(16, 14, 8, 8),
      child: Row(
        children: [
          const Expanded(
            child: Text(
              'My Orders',
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppColors.wine,
              ),
            ),
          ),
          IconButton(
            tooltip: 'Filter by date',
            icon: const Icon(Icons.date_range_rounded,
                color: AppColors.darkGray, size: 21),
            onPressed: () async {
              final range = await showDateRangePicker(
                context: context,
                firstDate: DateTime(2024),
                lastDate: DateTime.now(),
                initialDateRange: _dateFrom == null
                    ? null
                    : DateTimeRange(
                        start: DateTime.parse(_dateFrom!),
                        end: DateTime.parse(_dateTo!)),
              );
              if (range != null && mounted) {
                setState(() {
                  _dateFrom = range.start.toIso8601String().substring(0, 10);
                  _dateTo = range.end.toIso8601String().substring(0, 10);
                });
                _loadOrders();
              }
            },
          ),
          if (_dateFrom != null)
            IconButton(
              tooltip: 'Clear date filter',
              icon: const Icon(Icons.filter_alt_off_rounded,
                  color: AppColors.danger, size: 20),
              onPressed: () {
                setState(() { _dateFrom = null; _dateTo = null; });
                _loadOrders();
              },
            ),
          IconButton(
            tooltip: 'Sort',
            icon: const Icon(Icons.sort_rounded,
                color: AppColors.darkGray, size: 21),
            onPressed: () async {
              const options = ['newest', 'oldest', 'highest', 'lowest'];
              final value = await showModalBottomSheet<String>(
                context: context,
                shape: const RoundedRectangleBorder(
                  borderRadius:
                      BorderRadius.vertical(top: Radius.circular(18)),
                ),
                builder: (context) => SafeArea(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Padding(
                        padding: EdgeInsets.fromLTRB(16, 16, 16, 8),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Text(
                            'Sort by',
                            style: TextStyle(
                              fontFamily: 'Poppins',
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: AppColors.darkGray,
                            ),
                          ),
                        ),
                      ),
                      for (final option in options)
                        ListTile(
                          title: Text(switch (option) {
                            'newest' => 'Newest',
                            'oldest' => 'Oldest',
                            'highest' => 'Highest total',
                            _ => 'Lowest total'
                          }),
                          trailing: _sort == option
                              ? const Icon(Icons.check_rounded,
                                  color: AppColors.primary)
                              : null,
                          onTap: () => Navigator.pop(context, option),
                        ),
                      const SizedBox(height: 8),
                    ],
                  ),
                ),
              );
              if (value != null && mounted) {
                setState(() => _sort = value);
                _loadOrders();
              }
            },
          ),
        ],
      ),
    );
  }

  // ── STATUS TABS ────────────────────────────────────────────────────────
  Widget _buildTabs() {
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.fromLTRB(16, 4, 0, 10),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        child: Row(
          children: _statusTabs.entries
              .map((entry) => _buildTab(entry.key, entry.value))
              .toList(),
        ),
      ),
    );
  }

  Widget _buildTab(String value, String label) {
    final isActive = _activeTab == value;
    return GestureDetector(
      onTap: () {
        if (_activeTab == value) return;
        setState(() => _activeTab = value);
        _loadOrders();
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        height: 36,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        margin: const EdgeInsets.only(right: 8),
        decoration: BoxDecoration(
          color: isActive ? AppColors.primary : Colors.transparent,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isActive ? AppColors.primary : AppColors.borderNeutral,
          ),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            fontFamily: 'Poppins',
            fontSize: 13,
            fontWeight: isActive ? FontWeight.w700 : FontWeight.w500,
            color: isActive ? Colors.white : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }

  // ── ORDER CARD ──────────────────────────────────────────────────────────
  Widget _buildOrderCard(Map<String, dynamic> json) {
    final id = json['id'].toString();
    final status = _statusLabel(json['status']?.toString() ?? '');
    final rawStatus = json['status']?.toString().toLowerCase() ?? '';
    final items = (json['items'] as List? ?? [])
        .whereType<Map<String, dynamic>>().toList();
    final totalQty = items.fold(0, (sum, item) =>
        sum + (int.tryParse(item['quantity']?.toString() ?? '') ?? 0));
    final first = items.isNotEmpty ? items.first : null;
    final product = first?['product'] is Map<String, dynamic>
        ? first!['product'] as Map<String, dynamic>
        : <String, dynamic>{};
    final productName = product['name']?.toString() ??
        (items.length > 1 ? '${items.length} products' : 'Order #$id');
    final image = product['image']?.toString() ?? '';
    final imageUrl =
        image.isEmpty ? '' : ApiService.instance.resolveImageUrl(image);
    final total = _fmtPrice(json['total_amount'] ?? json['subtotal']);
    final date = _fmtDate(json['created_at']?.toString());
    final extra = items.length > 1 ? ' +${items.length - 1} more' : '';
    final colour = _statusColour(rawStatus);
    final bgColour = _statusBgColour(rawStatus);

    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, '/order_details', arguments: id),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.borderNeutral),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Order # and status badge
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '#$id',
                  style: const TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: AppColors.darkGray,
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: bgColour,
                    borderRadius: BorderRadius.circular(7),
                  ),
                  child: Text(
                    status,
                    style: TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: colour,
                    ),
                  ),
                ),
              ],
            ),
            if (date.isNotEmpty) ...[
              const SizedBox(height: 3),
              Text(
                date,
                style: const TextStyle(
                  fontFamily: 'Poppins',
                  fontSize: 11,
                  color: AppColors.textSubtle,
                ),
              ),
            ],
            const SizedBox(height: 10),
            // Product row
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: SizedBox(
                    width: 64,
                    height: 64,
                    child: imageUrl.isEmpty
                        ? Container(
                            color: AppColors.softRose,
                            child: const Icon(Icons.inventory_2_outlined,
                                color: AppColors.borderStrong, size: 24))
                        : Image(
                            image: NetworkImage(imageUrl),
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                                color: AppColors.softRose,
                                child: const Icon(Icons.inventory_2_outlined,
                                    color: AppColors.borderStrong,
                                    size: 24)),
                          ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Product name — tappable to open product detail
                      GestureDetector(
                        onTap: () {
                          final firstItem = items.isNotEmpty ? items.first : null;
                          final product = firstItem is Map<String, dynamic>
                              ? firstItem['product'] as Map<String, dynamic>?
                              : null;
                          final productId = product?['id']?.toString();
                          if (productId != null) {
                            Navigator.pushNamed(context, '/product_detail',
                                arguments: productId);
                          }
                        },
                        child: Text(
                          '$productName$extra',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                            decoration: TextDecoration.underline,
                            decorationColor: AppColors.primary,
                            height: 1.3,
                          ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$totalQty item${totalQty == 1 ? '' : 's'} · $total',
                        style: const TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 13,
                          color: AppColors.primary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            // Action button
            Align(
              alignment: Alignment.centerRight,
              child: OutlinedButton(
                onPressed: () => Navigator.pushNamed(
                    context, '/order_details', arguments: id),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(0, 40),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  side: const BorderSide(color: AppColors.primary, width: 1.5),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
                child: Text(
                  _actionLabel(rawStatus),
                  style: const TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── ERROR ──────────────────────────────────────────────────────────────
  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Icon(Icons.wifi_off_rounded, size: 42, color: AppColors.danger),
          const SizedBox(height: 12),
          Text(_error!,
              textAlign: TextAlign.center,
              style: const TextStyle(
                  color: AppColors.textSecondary, fontFamily: 'Poppins')),
          const SizedBox(height: 14),
          FilledButton(onPressed: _loadOrders, child: const Text('Retry')),
        ]),
      ),
    );
  }

  // ── EMPTY ───────────────────────────────────────────────────────────────
  Widget _buildEmpty() {
    final hasFilters = _activeTab.isNotEmpty || _dateFrom != null;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.receipt_long_outlined,
              size: 52,
              color: AppColors.gray.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 16),
            Text(
              hasFilters ? 'No orders match your filters' : 'No orders yet',
              style: const TextStyle(
                fontFamily: 'Poppins',
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: AppColors.darkGray,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              hasFilters
                  ? 'Try clearing filters or using a different status.'
                  : 'Start shopping to place your first order.',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontFamily: 'Poppins',
                fontSize: 13,
                color: AppColors.gray,
                height: 1.45,
              ),
            ),
            if (hasFilters) ...[
              const SizedBox(height: 16),
              OutlinedButton(
                onPressed: () {
                  setState(() {
                    _activeTab = '';
                    _dateFrom = null;
                    _dateTo = null;
                  });
                  _loadOrders();
                },
                child: const Text('Clear filters'),
              ),
            ] else ...[
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: () =>
                    Navigator.pushReplacementNamed(context, '/home'),
                icon: const Icon(Icons.storefront_outlined, size: 18),
                label: const Text(
                  'Shop now',
                  style: TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 14,
                      fontWeight: FontWeight.w700),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
