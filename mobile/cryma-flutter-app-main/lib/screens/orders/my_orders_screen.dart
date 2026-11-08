import 'package:flutter/material.dart';

import '../../services/api_service.dart';
import '../../utils/colors.dart';
import '../../widgets/buyer_bottom_navigation_bar.dart';

class MyOrdersScreen extends StatefulWidget {
  const MyOrdersScreen({super.key, this.apiService});

  final ApiService? apiService;
  @override
  State<MyOrdersScreen> createState() => _MyOrdersScreenState();
}

class _MyOrdersScreenState extends State<MyOrdersScreen> {
  ApiService get _api => widget.apiService ?? ApiService.instance;

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
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final page = await _api.getBuyerOrdersPage(
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
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<void> _loadMore() async {
    if (_loadingMore || _currentPage >= _lastPage) return;
    setState(() => _loadingMore = true);
    try {
      final page = await _api.getBuyerOrdersPage(
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
      setState(() {
        _loadingMore = false;
        _error = error.toString();
      });
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
    final s =
        n == n.roundToDouble() ? n.toInt().toString() : n.toStringAsFixed(2);
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
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── HEADER ────────────────────────────────────────────
            _buildHeader(),

            // ── STATUS TABS ────────────────────────────────────────
            _buildTabs(),

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
                              padding:
                                  const EdgeInsets.fromLTRB(14, 12, 14, 24),
                              itemCount:
                                  _orders.length + (_loadingMore ? 1 : 0),
                              itemBuilder: (context, index) {
                                if (index >= _orders.length) {
                                  return const Padding(
                                    padding: EdgeInsets.all(16),
                                    child: Center(
                                      child: SizedBox(
                                        width: 22,
                                        height: 22,
                                        child: CircularProgressIndicator(
                                            strokeWidth: 2),
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
      color: AppColors.background,
      padding: const EdgeInsets.fromLTRB(16, 12, 12, 8),
      child: Row(
        children: [
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'My Orders',
                  style: TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 21,
                    fontWeight: FontWeight.w700,
                    color: AppColors.wine,
                    height: 1.15,
                  ),
                ),
                SizedBox(height: 3),
                Text(
                  'Track and manage your purchases',
                  style: TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 11,
                    color: AppColors.textSubtle,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Filter by date',
            style: IconButton.styleFrom(
              fixedSize: const Size(40, 40),
              backgroundColor:
                  _dateFrom == null ? AppColors.white : AppColors.softRose,
              foregroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(13),
              ),
            ),
            icon: const Icon(Icons.calendar_month_rounded, size: 19),
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
              style: IconButton.styleFrom(
                fixedSize: const Size(40, 40),
                backgroundColor: AppColors.dangerSoft,
                foregroundColor: AppColors.danger,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(13),
                ),
              ),
              icon: const Icon(Icons.close_rounded, size: 19),
              onPressed: () {
                setState(() {
                  _dateFrom = null;
                  _dateTo = null;
                });
                _loadOrders();
              },
            ),
          IconButton(
            tooltip: 'Sort',
            style: IconButton.styleFrom(
              fixedSize: const Size(40, 40),
              backgroundColor: AppColors.white,
              foregroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(13),
              ),
            ),
            icon: const Icon(Icons.tune_rounded, size: 19),
            onPressed: () async {
              const options = ['newest', 'oldest', 'highest', 'lowest'];
              final value = await showModalBottomSheet<String>(
                context: context,
                shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
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
      color: AppColors.background,
      padding: const EdgeInsets.fromLTRB(16, 8, 0, 12),
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
        height: 35,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        margin: const EdgeInsets.only(right: 8),
        decoration: BoxDecoration(
          color: isActive ? AppColors.primary : AppColors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isActive ? AppColors.primary : AppColors.borderNeutral,
          ),
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: AppColors.primary.withValues(alpha: 0.14),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ]
              : null,
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            fontFamily: 'Poppins',
            fontSize: 12,
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
        .whereType<Map<String, dynamic>>()
        .toList();
    final totalQty = items.fold(
      0,
      (sum, item) =>
          sum + (int.tryParse(item['quantity']?.toString() ?? '') ?? 0),
    );
    final first = items.isNotEmpty ? items.first : null;
    final product = first?['product'] is Map<String, dynamic>
        ? first!['product'] as Map<String, dynamic>
        : <String, dynamic>{};
    final productName = product['name']?.toString() ??
        (items.length > 1 ? '${items.length} products' : 'Order #$id');
    final image = product['image']?.toString() ?? '';
    final imageUrl = image.isEmpty ? '' : _api.resolveImageUrl(image);
    final total = _fmtPrice(json['total_amount'] ?? json['subtotal']);
    final date = _fmtDate(json['created_at']?.toString());
    final extra = items.length > 1 ? ' +${items.length - 1} more' : '';
    final colour = _statusColour(rawStatus);
    final bgColour = _statusBgColour(rawStatus);

    return GestureDetector(
      onTap: () =>
          Navigator.pushNamed(context, '/order_details', arguments: id),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(15),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.borderNeutral),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withValues(alpha: 0.035),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Order number, date, and status
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Order #$id',
                        style: const TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: AppColors.darkGray,
                        ),
                      ),
                      if (date.isNotEmpty) ...[
                        const SizedBox(height: 3),
                        Row(
                          children: [
                            const Icon(
                              Icons.schedule_rounded,
                              size: 12,
                              color: AppColors.textSubtle,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              date,
                              style: const TextStyle(
                                fontFamily: 'Poppins',
                                fontSize: 10,
                                color: AppColors.textSubtle,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: bgColour,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          color: colour,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        status,
                        style: TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: colour,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 12),
              child: Divider(height: 1, color: AppColors.borderNeutral),
            ),
            // Product summary
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(13),
                  child: SizedBox(
                    width: 60,
                    height: 60,
                    child: imageUrl.isEmpty
                        ? Container(
                            color: AppColors.surfaceNeutral,
                            child: const Icon(
                              Icons.inventory_2_outlined,
                              color: AppColors.primary,
                              size: 23,
                            ),
                          )
                        : Image(
                            image: NetworkImage(imageUrl),
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              color: AppColors.surfaceNeutral,
                              child: const Icon(
                                Icons.inventory_2_outlined,
                                color: AppColors.primary,
                                size: 23,
                              ),
                            ),
                          ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Product name remains tappable to open product detail.
                      GestureDetector(
                        onTap: () {
                          final firstItem =
                              items.isNotEmpty ? items.first : null;
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
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.darkGray,
                            height: 1.3,
                          ),
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        '$totalQty item${totalQty == 1 ? '' : 's'}',
                        style: const TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 11,
                          color: AppColors.gray,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  total,
                  style: const TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 14,
                    color: AppColors.primary,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 13),
            SizedBox(
              width: double.infinity,
              height: 42,
              child: OutlinedButton.icon(
                onPressed: () => Navigator.pushNamed(
                  context,
                  '/order_details',
                  arguments: id,
                ),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.primary,
                  backgroundColor: AppColors.surface,
                  side: const BorderSide(color: AppColors.borderStrong),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                iconAlignment: IconAlignment.end,
                icon: const Icon(Icons.arrow_forward_rounded, size: 16),
                label: Text(
                  _actionLabel(rawStatus),
                  style: const TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
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
