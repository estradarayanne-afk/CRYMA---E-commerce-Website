import 'package:flutter/material.dart';

import '../services/cart_store.dart';
import '../utils/colors.dart';

// ============================================================
// CART ITEM MODEL
// ============================================================
class CartItem {
  final String id;
  final String productId;
  final String? variantId;
  final String name;
  final String color;
  final int price;
  int quantity;
  final String imagePath;
  final String seller;
  bool selected;

  // ✅ TANGGALIN ANG const SA CONSTRUCTOR
  CartItem({
    required this.id,
    required this.productId,
    this.variantId,
    required this.name,
    required this.color,
    required this.price,
    this.quantity = 1,
    required this.imagePath,
    required this.seller,
    this.selected = true,
  });
}

// ============================================================
// CART SCREEN
// ============================================================
class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  int _selectedIndex = 2;

  // ✅ TANGGALIN ANG const DITO
  List<CartItem> _cartItems = [];

  @override
  void initState() {
    super.initState();
    _loadCart();
  }

  Future<void> _loadCart() async {
    final storedItems = await CartStore.instance.items();
    if (!mounted) return;
    setState(() {
      _cartItems = storedItems.map((item) {
        final image = item['image']?.toString() ?? '';
        return CartItem(
          id: item['cart_key']?.toString() ?? item['id'].toString(),
          productId: (item['product_id'] ?? item['id']).toString(),
          variantId: item['variant_id']?.toString(),
          name: item['name']?.toString() ?? 'Product',
          color: item['color']?.toString() ?? 'Standard',
          price: (double.tryParse(item['price']?.toString() ?? '') ?? 0)
              .round(),
          quantity: item['quantity'] as int? ?? 1,
          imagePath: image,
          seller: item['seller']?.toString() ?? 'CRYMA Seller',
          selected: item['selected'] as bool? ?? true,
        );
      }).toList();
    });
  }

  Future<void> _persistCart() async {
    await CartStore.instance.save(
      _cartItems.map((item) {
        final stored = {
          'id': item.productId,
          'product_id': item.productId,
          'variant_id': item.variantId,
          'cart_key': item.id,
          'name': item.name,
          'color': item.color,
          'price': item.price,
          'quantity': item.quantity,
          'image': item.imagePath,
          'seller': item.seller,
          'selected': item.selected,
        };
        return stored;
      }).toList(),
    );
  }

  void _toggleSelect(String id) {
    setState(() {
      final index = _cartItems.indexWhere((item) => item.id == id);
      if (index != -1) {
        _cartItems[index].selected = !_cartItems[index].selected;
      }
    });
    _persistCart();
  }

  void _toggleSelectAll() {
    setState(() {
      final allSelected = _cartItems.every((item) => item.selected);
      for (var item in _cartItems) {
        item.selected = !allSelected;
      }
    });
    _persistCart();
  }

  void _updateQuantity(String id, int change) {
    setState(() {
      final index = _cartItems.indexWhere((item) => item.id == id);
      if (index != -1) {
        _cartItems[index].quantity = (_cartItems[index].quantity + change)
            .clamp(1, 99);
      }
    });
    _persistCart();
  }

  void _deleteSelected() {
    setState(() {
      _cartItems = _cartItems.where((item) => !item.selected).toList();
    });
    _persistCart();
  }

  String _formatPrice(int price) {
    return price.toString().replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
      (match) => '${match.group(1)},',
    );
  }

  bool get _allSelected =>
      _cartItems.isNotEmpty && _cartItems.every((item) => item.selected);
  List<CartItem> get _selectedItems =>
      _cartItems.where((item) => item.selected).toList();
  int get _totalItems =>
      _selectedItems.fold(0, (sum, item) => sum + item.quantity);
  int get _subtotal =>
      _selectedItems.fold(0, (sum, item) => sum + (item.price * item.quantity));

  void _onNavItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });

    switch (index) {
      case 0:
        Navigator.pushReplacementNamed(context, '/home');
        break;
      case 1:
        Navigator.pushNamed(context, '/categories');
        break;
      case 2:
        break;
      case 3:
        Navigator.pushNamed(context, '/my_orders');
        break;
      case 4:
        Navigator.pushNamed(context, '/account');
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F5F5),
      body: SafeArea(
        child: Column(
          children: [
            // HEADER
            Container(
              color: AppColors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(
                          Icons.arrow_back,
                          size: 22,
                          color: AppColors.primary,
                        ),
                        onPressed: () => Navigator.pop(context),
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'Cart',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                          fontFamily: 'Poppins',
                          letterSpacing: 1,
                        ),
                      ),
                    ],
                  ),
                  GestureDetector(
                    onTap: () {},
                    child: const Text(
                      'Edit',
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.primary,
                        fontFamily: 'Poppins',
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // SELECT ALL ROW
            Container(
              color: AppColors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Column(
                children: [
                  Row(
                    children: [
                      GestureDetector(
                        onTap: _toggleSelectAll,
                        child: Row(
                          children: [
                            Container(
                              width: 18,
                              height: 18,
                              decoration: BoxDecoration(
                                color: _allSelected
                                    ? AppColors.primary
                                    : AppColors.white,
                                border: Border.all(
                                  color: _allSelected
                                      ? AppColors.primary
                                      : AppColors.gray,
                                  width: 2,
                                ),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: _allSelected
                                  ? const Icon(
                                      Icons.check,
                                      size: 12,
                                      color: AppColors.white,
                                    )
                                  : null,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Select All (${_cartItems.length})',
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppColors.gray,
                                fontFamily: 'Poppins',
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Spacer(),
                      GestureDetector(
                        onTap: _deleteSelected,
                        child: const Icon(
                          Icons.delete_outline,
                          size: 20,
                          color: AppColors.danger,
                        ),
                      ),
                    ],
                  ),
                  const Divider(color: AppColors.lightGray, height: 12),
                ],
              ),
            ),

            // CART ITEMS LIST
            Expanded(
              child: _cartItems.isEmpty
                  ? _buildEmptyState()
                  : ListView.builder(
                      padding: const EdgeInsets.only(bottom: 20),
                      itemCount: _cartItems.length,
                      itemBuilder: (context, index) {
                        final item = _cartItems[index];
                        final showSeller = index == 0;
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (showSeller)
                              Container(
                                color: AppColors.white,
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 8,
                                ),
                                child: Text(
                                  item.seller,
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.darkGray,
                                    fontFamily: 'Poppins',
                                  ),
                                ),
                              ),
                            _buildCartItem(item),
                          ],
                        );
                      },
                    ),
            ),

            // BOTTOM CONTAINER
            Container(
              color: AppColors.white,
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Subtotal ($_totalItems items)',
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.gray,
                          fontFamily: 'Poppins',
                        ),
                      ),
                      Text(
                        '₱${_formatPrice(_subtotal)}',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _selectedItems.isEmpty
                          ? null
                          : () {
                              Navigator.pushNamed(context, '/checkout');
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        disabledBackgroundColor: AppColors.gray,
                      ),
                      child: Text(
                        'Checkout ($_totalItems)',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: _selectedItems.isEmpty
                              ? AppColors.white.withValues(alpha: 0.5)
                              : AppColors.white,
                          fontFamily: 'Poppins',
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.white,
          border: Border(top: BorderSide(color: AppColors.lightGray, width: 1)),
        ),
        child: BottomNavigationBar(
          currentIndex: _selectedIndex,
          onTap: _onNavItemTapped,
          type: BottomNavigationBarType.fixed,
          backgroundColor: AppColors.white,
          selectedItemColor: AppColors.primary,
          unselectedItemColor: AppColors.gray,
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
              icon: Icon(Icons.shopping_cart),
              label: 'Cart',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.list_alt_outlined),
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

  Widget _buildCartItem(CartItem item) {
    return Container(
      color: AppColors.white,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => _toggleSelect(item.id),
            child: Container(
              width: 18,
              height: 18,
              decoration: BoxDecoration(
                color: item.selected ? AppColors.primary : AppColors.white,
                border: Border.all(
                  color: item.selected ? AppColors.primary : AppColors.gray,
                  width: 2,
                ),
                borderRadius: BorderRadius.circular(4),
              ),
              child: item.selected
                  ? const Icon(Icons.check, size: 12, color: AppColors.white)
                  : null,
            ),
          ),
          const SizedBox(width: 10),
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(6),
              color: AppColors.lightGray,
              image: item.imagePath.startsWith('http')
                  ? DecorationImage(
                      image: NetworkImage(item.imagePath),
                      fit: BoxFit.cover,
                    )
                  : DecorationImage(
                      image: AssetImage(item.imagePath),
                      fit: BoxFit.cover,
                    ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.name,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.darkGray,
                    fontFamily: 'Poppins',
                  ),
                ),
                Text(
                  'Color: ${item.color}',
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.gray,
                    fontFamily: 'Poppins',
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      '₱${_formatPrice(item.price)}',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                        fontFamily: 'Poppins',
                      ),
                    ),
                    Row(
                      children: [
                        GestureDetector(
                          onTap: () => _updateQuantity(item.id, -1),
                          child: Container(
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.lightGray),
                            ),
                            child: const Center(
                              child: Text(
                                '−',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${item.quantity}',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            fontFamily: 'Poppins',
                          ),
                        ),
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: () => _updateQuantity(item.id, 1),
                          child: Container(
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.lightGray),
                            ),
                            child: const Center(
                              child: Text(
                                '+',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.shopping_cart_outlined,
            size: 64,
            color: AppColors.gray.withValues(alpha: 0.5),
          ),
          const SizedBox(height: 16),
          const Text(
            'Your cart is empty',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppColors.darkGray,
              fontFamily: 'Poppins',
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Start shopping to add items',
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
