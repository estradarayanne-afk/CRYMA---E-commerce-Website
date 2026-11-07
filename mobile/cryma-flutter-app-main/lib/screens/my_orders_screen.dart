import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../utils/colors.dart';
import '../widgets/buyer_bottom_navigation_bar.dart';

// ============================================================
// ORDER MODEL
// ============================================================
class Order {
  final String id;
  final String orderNumber;
  final String status;
  final String productName;
  final String quantity;
  final int price;
  final String imagePath;

  const Order({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.productName,
    required this.quantity,
    required this.price,
    required this.imagePath,
  });
}

// ============================================================
// MY ORDERS SCREEN
// ============================================================
class MyOrdersScreen extends StatefulWidget {
  const MyOrdersScreen({super.key});

  @override
  State<MyOrdersScreen> createState() => _MyOrdersScreenState();
}

class _MyOrdersScreenState extends State<MyOrdersScreen> {
  String _activeTab = '';
  List<Order> _allOrders = [];
  bool _loading = true;
  String? _error;
  int _currentPage = 1;
  int _lastPage = 1;
  bool _loadingMore = false;
  final TextEditingController _searchController = TextEditingController();
  String _sort = 'newest';
  String? _dateFrom;
  String? _dateTo;

  static const _statusOptions = <String, String>{
    '': 'All Orders',
    'pending': 'Pending',
    'placed': 'Placed',
    'confirmed': 'Confirmed',
    'preparing': 'Preparing',
    'ready_for_pickup': 'Ready for Pickup',
    'picked_up': 'Picked Up',
    'at_sorting_center': 'At Sorting Center',
    'sorted': 'Sorted',
    'assigned_to_rider': 'Assigned to Rider',
    'out_for_delivery': 'Out for Delivery',
    'delivered': 'Delivered',
    'completed': 'Completed',
    'delivery_failed': 'Delivery Failed',
    'returned': 'Returned',
  };

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadOrders() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final page = await ApiService.instance.getBuyerOrdersPage(
          search: _searchController.text,
          status: _activeTab.isEmpty ? null : _activeTab,
          sort: _sort,
          dateFrom: _dateFrom,
          dateTo: _dateTo);
      if (!mounted) return;
      setState(() {
        _allOrders = page.items.map(_orderFromJson).toList();
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
      final page = await ApiService.instance.getBuyerOrdersPage(
          page: _currentPage + 1,
          search: _searchController.text,
          status: _activeTab.isEmpty ? null : _activeTab,
          sort: _sort,
          dateFrom: _dateFrom,
          dateTo: _dateTo);
      if (!mounted) return;
      setState(() {
        _allOrders.addAll(page.items.map(_orderFromJson));
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

  Order _orderFromJson(Map<String, dynamic> json) {
    final items = json['items'] is List ? json['items'] as List : const [];
    final first = items.isNotEmpty && items.first is Map<String, dynamic>
        ? items.first as Map<String, dynamic>
        : <String, dynamic>{};
    final product = first['product'] is Map<String, dynamic>
        ? first['product'] as Map<String, dynamic>
        : <String, dynamic>{};
    final quantity = items.fold<int>(0, (sum, item) {
      return sum +
          (item is Map<String, dynamic>
              ? int.tryParse(item['quantity'].toString()) ?? 0
              : 0);
    });
    final rawStatus = json['status']?.toString().trim() ?? '';
    final status = rawStatus.isEmpty
        ? 'Unknown'
        : _statusOptions[rawStatus.toLowerCase()] ??
            rawStatus
                .replaceAll(RegExp(r'[_-]+'), ' ')
                .split(RegExp(r'\s+'))
                .where((word) => word.isNotEmpty)
                .map(
                  (word) =>
                      '${word[0].toUpperCase()}${word.substring(1).toLowerCase()}',
                )
                .join(' ');
    final image = product['image']?.toString() ?? '';
    return Order(
      id: json['id'].toString(),
      orderNumber: '#${json['id']}',
      status: status,
      productName: product['name']?.toString() ??
          (items.length > 1 ? '${items.length} products' : 'Order'),
      quantity: 'x$quantity',
      price: (double.tryParse(
                (json['total_amount'] ?? json['subtotal'] ?? 0).toString(),
              ) ??
              0)
          .round(),
      imagePath:
          image.isEmpty ? '' : ApiService.instance.resolveImageUrl(image),
    );
  }

  List<Order> get _filteredOrders {
    return _allOrders;
  }

  String _formatPrice(int price) {
    return price.toString().replaceAllMapped(
          RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
          (match) => '${match.group(1)},',
        );
  }

  Color _getStatusColor(String status) {
    // Match the web's status-badge colour system using the normalised label.
    switch (status.toLowerCase().replaceAll(' ', '_')) {
      case 'pending':
      case 'placed':
        return const Color(0xFF79520D); // warning
      case 'confirmed':
      case 'preparing':
      case 'ready_for_pickup':
        return AppColors.primary;
      case 'picked_up':
      case 'at_sorting_center':
      case 'sorted':
      case 'assigned_to_rider':
      case 'out_for_delivery':
        return const Color(0xFF285C76); // info blue
      case 'delivered':
      case 'completed':
        return AppColors.success;
      case 'cancelled':
      case 'delivery_failed':
      case 'returned':
        return AppColors.danger;
      default:
        return AppColors.primary;
    }
  }

  Color _getStatusBgColor(String status) {
    switch (status.toLowerCase().replaceAll(' ', '_')) {
      case 'pending':
      case 'placed':
        return const Color(0xFFFFF6DF); // warning-soft
      case 'confirmed':
      case 'preparing':
      case 'ready_for_pickup':
        return AppColors.softRose;
      case 'picked_up':
      case 'at_sorting_center':
      case 'sorted':
      case 'assigned_to_rider':
      case 'out_for_delivery':
        return const Color(0xFFEDF6FA); // info-soft
      case 'delivered':
      case 'completed':
        return const Color(0xFFEDF7F2); // success-soft
      case 'cancelled':
      case 'delivery_failed':
      case 'returned':
        return const Color(0xFFFFF0F2); // danger-soft
      default:
        return AppColors.lightGray;
    }
  }

  // ============================================================
  // BOTTOM NAVIGATION
  // ============================================================
  void _onNavItemTapped(int index) {
    BuyerBottomNavigationBar.navigateToTab(context, index, 3);
  }

  // ============================================================
  // OPEN ORDER DETAILS
  // ============================================================
  void _openOrderDetails(String orderId) {
    Navigator.pushNamed(context, '/order_details', arguments: orderId);
  }

  // ============================================================
  // BUILD
  // ============================================================
  @override
  Widget build(BuildContext context) {
    final filteredOrders = _filteredOrders;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ======================================================
            // MY ORDERS HEADER
            // ======================================================
            Container(
              width: double.infinity,
              color: AppColors.white,
              padding: const EdgeInsets.fromLTRB(24, 10, 16, 12),
              child: Row(children: [
                const Expanded(
                    child: Text(
                  'My Orders',
                  textAlign: TextAlign.left,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                    fontFamily: 'Poppins',
                    letterSpacing: 0,
                  ),
                )),
                IconButton(
                    tooltip: 'Filter by date',
                    icon:
                        const Icon(Icons.date_range, color: AppColors.primary),
                    onPressed: () async {
                      final range = await showDateRangePicker(
                          context: context,
                          firstDate: DateTime(2020),
                          lastDate: DateTime.now(),
                          initialDateRange: _dateFrom == null
                              ? null
                              : DateTimeRange(
                                  start: DateTime.parse(_dateFrom!),
                                  end: DateTime.parse(_dateTo!)));
                      if (range != null && mounted) {
                        setState(() {
                          _dateFrom =
                              range.start.toIso8601String().substring(0, 10);
                          _dateTo =
                              range.end.toIso8601String().substring(0, 10);
                        });
                        _loadOrders();
                      }
                    }),
                if (_dateFrom != null)
                  IconButton(
                      tooltip: 'Clear date filter',
                      icon: const Icon(Icons.filter_alt_off,
                          color: AppColors.primary),
                      onPressed: () {
                        setState(() {
                          _dateFrom = null;
                          _dateTo = null;
                        });
                        _loadOrders();
                      }),
                IconButton(
                    tooltip: 'Change order sorting',
                    icon: const Icon(Icons.sort, color: AppColors.primary),
                    onPressed: () async {
                      const options = ['newest', 'oldest', 'highest', 'lowest'];
                      final value = await showModalBottomSheet<String>(
                          context: context,
                          builder: (context) => SafeArea(
                                  child: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                    for (final option in options)
                                      ListTile(
                                          title: Text(switch (option) {
                                            'newest' => 'Newest',
                                            'oldest' => 'Oldest',
                                            'highest' => 'Highest total',
                                            _ => 'Lowest total'
                                          }),
                                          trailing: _sort == option
                                              ? const Icon(Icons.check)
                                              : null,
                                          onTap: () =>
                                              Navigator.pop(context, option))
                                  ])));
                      if (value != null && mounted) {
                        setState(() => _sort = value);
                        _loadOrders();
                      }
                    }),
              ]),
            ),

            Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                child: TextField(
                    controller: _searchController,
                    textInputAction: TextInputAction.search,
                    onSubmitted: (_) => _loadOrders(),
                    decoration: InputDecoration(
                        hintText: 'Search order number or product',
                        prefixIcon: const Icon(Icons.search),
                        suffixIcon: IconButton(
                            tooltip: 'Search',
                            onPressed: _loadOrders,
                            icon: const Icon(Icons.arrow_forward)),
                        filled: true,
                        fillColor: AppColors.white,
                        border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide.none)))),

            // ======================================================
            // STATUS TABS
            // ======================================================
            Container(
              width: double.infinity,
              color: AppColors.white,
              padding: const EdgeInsets.fromLTRB(20, 4, 0, 10),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                child: Row(
                  children: _statusOptions.entries
                      .map((option) => _buildTab(option.key, option.value))
                      .toList(),
                ),
              ),
            ),

            // ======================================================
            // DIVIDER
            // ======================================================
            const Divider(color: AppColors.lightGray, height: 1, thickness: 1),

            // ======================================================
            // ORDER LIST
            // ======================================================
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _error != null
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Padding(
                                padding: const EdgeInsets.all(20),
                                child:
                                    Text(_error!, textAlign: TextAlign.center),
                              ),
                              TextButton(
                                onPressed: _loadOrders,
                                child: const Text('Retry'),
                              ),
                            ],
                          ),
                        )
                      : filteredOrders.isEmpty
                          ? _buildEmptyState()
                          : ListView.builder(
                              physics: const BouncingScrollPhysics(),
                              padding:
                                  const EdgeInsets.fromLTRB(20, 14, 20, 20),
                              itemCount: filteredOrders.length +
                                  (_currentPage < _lastPage ? 1 : 0),
                              itemBuilder: (context, index) {
                                if (index == filteredOrders.length) {
                                  return Padding(
                                      padding: const EdgeInsets.all(16),
                                      child: Center(
                                          child: OutlinedButton.icon(
                                              onPressed: _loadingMore
                                                  ? null
                                                  : _loadMore,
                                              icon: _loadingMore
                                                  ? const SizedBox(
                                                      width: 16,
                                                      height: 16,
                                                      child:
                                                          CircularProgressIndicator(
                                                              strokeWidth: 2))
                                                  : const Icon(
                                                      Icons.expand_more),
                                              label: Text(_loadingMore
                                                  ? 'Loading…'
                                                  : 'Load older orders'))));
                                }
                                final order = filteredOrders[index];

                                return _buildOrderCard(order);
                              },
                            ),
            ),
          ],
        ),
      ),

      // ============================================================
      // BOTTOM NAVIGATION
      // ============================================================
      bottomNavigationBar: BuyerBottomNavigationBar(
        currentIndex: 3,
        onDestinationSelected: _onNavItemTapped,
      ),
    );
  }

  // ============================================================
  // TAB WIDGET
  // ============================================================
  Widget _buildTab(String value, String label) {
    final bool isActive = _activeTab == value;

    return GestureDetector(
      onTap: () {
        if (_activeTab == value) return;
        setState(() {
          _activeTab = value;
        });
        _loadOrders();
      },
      child: Container(
        height: 42,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        margin: const EdgeInsets.only(right: 10),
        decoration: BoxDecoration(
          color: isActive ? AppColors.primary : AppColors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(
            color: isActive ? AppColors.primary : AppColors.lightGray,
            width: 1,
          ),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: isActive ? AppColors.white : AppColors.darkGray,
            fontFamily: 'Poppins',
          ),
        ),
      ),
    );
  }

  // ============================================================
  // ORDER CARD
  // ============================================================
  Widget _buildOrderCard(Order order) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        _openOrderDetails(order.id);
      },
      child: Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.fromLTRB(14, 14, 14, 12),
        decoration: BoxDecoration(
          color: AppColors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.lightGray, width: 1),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 3,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ======================================================
            // ORDER NUMBER + STATUS
            // ======================================================
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  order.orderNumber,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: AppColors.darkGray,
                    fontFamily: 'Poppins',
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: _getStatusBgColor(order.status),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    order.status,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: _getStatusColor(order.status),
                      fontFamily: 'Poppins',
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),

            // ======================================================
            // PRODUCT INFO
            // ======================================================
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // LOCAL IMAGE
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: AppColors.lightGray,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: order.imagePath.isEmpty
                      ? const Icon(Icons.image_not_supported_outlined,
                          color: AppColors.gray, size: 30)
                      : Image(
                          image: order.imagePath.startsWith('http')
                              ? NetworkImage(order.imagePath)
                              : AssetImage(order.imagePath),
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const Icon(
                              Icons.image_not_supported_outlined,
                              color: AppColors.gray,
                              size: 30),
                        ),
                ),

                const SizedBox(width: 14),

                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        order.productName,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: AppColors.darkGray,
                          fontFamily: 'Poppins',
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        order.quantity,
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.gray,
                          fontFamily: 'Poppins',
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '₱${_formatPrice(order.price)}',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),

            // ======================================================
            // DIVIDER
            // ======================================================
            const Divider(color: AppColors.lightGray, height: 1),

            const SizedBox(height: 10),

            // ======================================================
            // ACTION BUTTON
            // ======================================================
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [_buildActionButton(order.status, order.id)],
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // ACTION BUTTON
  // ============================================================
  Widget _buildActionButton(String status, String orderId) {
    // Map display label to contextual action so the button communicates
    // what happens next rather than always saying "View".
    final normalised = status.toLowerCase().replaceAll(' ', '_');

    final String label;
    switch (normalised) {
      case 'delivered':
        label = 'Confirm Receipt';
        break;
      case 'completed':
        label = 'Rate Order';
        break;
      case 'pending':
      case 'placed':
        label = 'View / Cancel';
        break;
      default:
        label = 'View Order';
    }

    return OutlinedButton(
      onPressed: () => _openOrderDetails(orderId),
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(120, 44),
        side: const BorderSide(color: AppColors.primary, width: 1.5),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: AppColors.primary,
          fontFamily: 'Poppins',
        ),
      ),
    );
  }

  // ============================================================
  // EMPTY STATE
  // ============================================================
  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.inbox_outlined,
            size: 60,
            color: AppColors.gray.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          const Text(
            'No orders found',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.darkGray,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Start shopping to place an order',
            style: TextStyle(
              fontSize: 13,
              color: AppColors.gray,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(height: 20),
          if (_currentPage < _lastPage)
            OutlinedButton.icon(
                onPressed: _loadingMore ? null : _loadMore,
                icon: const Icon(Icons.expand_more),
                label: Text(_loadingMore ? 'Loading…' : 'Load older orders'))
          else
            ElevatedButton(
              onPressed: () {
                Navigator.pushReplacementNamed(context, '/home');
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                padding:
                    const EdgeInsets.symmetric(horizontal: 30, vertical: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              child: const Text(
                'Shop Now',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppColors.white,
                  fontFamily: 'Poppins',
                ),
              ),
            ),
        ],
      ),
    );
  }
}
