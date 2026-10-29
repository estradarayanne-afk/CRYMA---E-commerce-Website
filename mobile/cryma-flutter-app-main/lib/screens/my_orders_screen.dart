import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../utils/colors.dart';

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
  String _activeTab = 'All';
  List<Order> _allOrders = [];
  bool _loading = true;
  String? _error;

  final List<String> _tabs = [
    'All',
    'To Pay',
    'To Ship',
    'In Transit',
    'Delivered',
  ];

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final rows = await ApiService.instance.getBuyerOrders();
      if (!mounted) return;
      setState(() {
        _allOrders = rows.map(_orderFromJson).toList();
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
    final rawStatus = json['status']?.toString() ?? 'PENDING';
    final status = switch (rawStatus) {
      'PENDING' => 'To Pay',
      'CONFIRMED' ||
      'READY_FOR_PICKUP' ||
      'PICKED_UP' ||
      'AT_SORTING_CENTER' =>
        'To Ship',
      'OUT_FOR_DELIVERY' => 'In Transit',
      'DELIVERED' || 'COMPLETED' => 'Delivered',
      'CANCELLED' || 'DELIVERY_FAILED' => 'Cancelled',
      _ => rawStatus
          .toLowerCase()
          .split('_')
          .map(
            (word) => word.isEmpty
                ? word
                : '${word[0].toUpperCase()}${word.substring(1)}',
          )
          .join(' '),
    };
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
      imagePath: image.isEmpty
          ? 'assets/image/headphones.jpg'
          : ApiService.instance.resolveImageUrl(image),
    );
  }

  List<Order> get _filteredOrders {
    if (_activeTab == 'All') {
      return _allOrders;
    }

    return _allOrders.where((order) => order.status == _activeTab).toList();
  }

  String _formatPrice(int price) {
    return price.toString().replaceAllMapped(
          RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
          (match) => '${match.group(1)},',
        );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'In Transit':
        return const Color(0xFF2196F3);

      case 'Delivered':
        return const Color(0xFF4CAF50);

      case 'Cancelled':
        return const Color(0xFFF44336);

      default:
        return AppColors.primary;
    }
  }

  Color _getStatusBgColor(String status) {
    switch (status) {
      case 'In Transit':
        return const Color(0xFFE3F2FD);

      case 'Delivered':
        return const Color(0xFFE8F5E9);

      case 'Cancelled':
        return const Color(0xFFFFEBEE);

      default:
        return AppColors.lightGray;
    }
  }

  // ============================================================
  // BOTTOM NAVIGATION
  // ============================================================
  void _onNavItemTapped(int index) {
    switch (index) {
      case 0:
        Navigator.pushReplacementNamed(context, '/home');
        break;

      case 1:
        Navigator.pushNamed(context, '/categories');
        break;

      case 2:
        Navigator.pushNamed(context, '/cart');
        break;

      case 3:
        break;

      case 4:
        Navigator.pushNamed(context, '/account');
        break;
    }
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
      backgroundColor: const Color(0xFFF5F5F5),
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
              child: const Align(
                alignment: Alignment.centerLeft,
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
                ),
              ),
            ),

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
                  children: _tabs.map((tab) {
                    return _buildTab(tab);
                  }).toList(),
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
                              itemCount: filteredOrders.length,
                              itemBuilder: (context, index) {
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
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.white,
          border: Border(top: BorderSide(color: AppColors.lightGray, width: 1)),
        ),
        child: BottomNavigationBar(
          currentIndex: 3,
          onTap: _onNavItemTapped,
          type: BottomNavigationBarType.fixed,
          backgroundColor: AppColors.white,
          selectedItemColor: AppColors.primary,
          unselectedItemColor: AppColors.gray,
          elevation: 0,
          selectedLabelStyle: const TextStyle(
            fontFamily: 'Poppins',
            fontSize: 10,
            fontWeight: FontWeight.w600,
          ),
          unselectedLabelStyle: const TextStyle(
            fontFamily: 'Poppins',
            fontSize: 10,
          ),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.grid_view_outlined),
              label: 'Categories',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.shopping_cart_outlined),
              label: 'Cart',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.list_alt),
              label: 'Orders',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outlined),
              label: 'Account',
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // TAB WIDGET
  // ============================================================
  Widget _buildTab(String tab) {
    final bool isActive = _activeTab == tab;

    return GestureDetector(
      onTap: () {
        setState(() {
          _activeTab = tab;
        });
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
          tab,
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
                  child: Image(
                    image: order.imagePath.startsWith('http')
                        ? NetworkImage(order.imagePath)
                        : AssetImage(order.imagePath),
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return const Icon(
                        Icons.image_outlined,
                        color: AppColors.gray,
                        size: 30,
                      );
                    },
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
    String label;
    VoidCallback onTap;

    switch (status) {
      case 'In Transit':
      case 'Delivered':
      case 'Cancelled':
        label = 'View Order';
        onTap = () => _openOrderDetails(orderId);
        break;

      default:
        label = 'View';

        onTap = () {
          _openOrderDetails(orderId);
        };

        break;
    }

    return OutlinedButton(
      onPressed: onTap,
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
          ElevatedButton(
            onPressed: () {
              Navigator.pushReplacementNamed(context, '/home');
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              padding: const EdgeInsets.symmetric(horizontal: 30, vertical: 12),
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
