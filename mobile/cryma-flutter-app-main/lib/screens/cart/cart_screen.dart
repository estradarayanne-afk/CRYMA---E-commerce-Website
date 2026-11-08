import 'package:flutter/material.dart';

import '../../services/cart_store.dart';
import '../../utils/colors.dart';

class CartItem {
  CartItem({
    required this.id,
    required this.productId,
    this.variantId,
    required this.name,
    required this.variantLabel,
    required this.price,
    this.quantity = 1,
    required this.availableStock,
    required this.imagePath,
    required this.seller,
    this.selected = true,
  });

  final String id;
  final String productId;
  final String? variantId;
  final String name;

  /// Variant label (e.g. "Color: Red · Size: M"). Empty string for base items.
  final String variantLabel;

  final int price;
  int quantity;
  final int availableStock;
  final String imagePath;
  final String seller;
  bool selected;
}

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  List<CartItem> _cartItems = [];

  @override
  void initState() {
    super.initState();
    _loadCart();
  }

  Future<void> _loadCart() async {
    final stored = await CartStore.instance.items();
    if (!mounted) return;
    setState(() {
      _cartItems = stored.map((item) {
        // Reconstruct a human-readable variant label from available fields.
        final color = item['color']?.toString() ?? '';
        final variantLabel = item['variant_label']?.toString() ??
            (color.isNotEmpty && color != 'Standard' ? 'Color: $color' : '');
        final quantity =
            int.tryParse(item['quantity']?.toString() ?? '') ?? 1;
        final availableStock =
            int.tryParse(item['stock']?.toString() ?? '') ?? quantity;
        return CartItem(
          id: item['cart_key']?.toString() ?? item['id'].toString(),
          productId: (item['product_id'] ?? item['id']).toString(),
          variantId: item['variant_id']?.toString(),
          name: item['name']?.toString() ?? 'Product',
          variantLabel: variantLabel,
          price:
              (double.tryParse(item['price']?.toString() ?? '') ?? 0).round(),
          quantity: availableStock > 0
              ? quantity.clamp(1, availableStock)
              : 0,
          availableStock: availableStock,
          imagePath: item['image']?.toString() ?? '',
          seller: item['seller']?.toString() ?? 'Seller',
          selected: item['selected'] as bool? ?? true,
        );
      }).toList();
    });
  }

  Future<void> _persistCart() async {
    await CartStore.instance.save(
      _cartItems
          .map((item) => {
                'id': item.productId,
                'product_id': item.productId,
                'variant_id': item.variantId,
                'cart_key': item.id,
                'name': item.name,
                'variant_label': item.variantLabel,
                'price': item.price,
                'quantity': item.quantity,
                'stock': item.availableStock,
                'image': item.imagePath,
                'seller': item.seller,
                'selected': item.selected,
              })
          .toList(),
    );
  }

  void _toggleSelect(String id) {
    setState(() {
      final i = _cartItems.indexWhere((item) => item.id == id);
      if (i != -1) _cartItems[i].selected = !_cartItems[i].selected;
    });
    _persistCart();
  }

  void _toggleSelectAll() {
    setState(() {
      final allSelected = _cartItems.every((item) => item.selected);
      for (final item in _cartItems) {
        item.selected = !allSelected;
      }
    });
    _persistCart();
  }

  void _updateQuantity(String id, int delta) {
    final index = _cartItems.indexWhere((item) => item.id == id);
    if (index == -1 || _cartItems[index].availableStock < 1) return;
    setState(() {
      final item = _cartItems[index];
      item.quantity =
          (item.quantity + delta).clamp(1, item.availableStock);
    });
    _persistCart();
  }

  Future<void> _editQuantity(CartItem item) async {
    if (item.availableStock < 1) return;
    final quantity = await showDialog<int>(
      context: context,
      builder: (_) => _EditCartQuantityDialog(
        initialQuantity: item.quantity,
        maxQuantity: item.availableStock,
      ),
    );
    if (quantity == null || !mounted) return;
    setState(() {
      final index = _cartItems.indexWhere((cartItem) => cartItem.id == item.id);
      if (index != -1) {
        _cartItems[index].quantity = quantity;
      }
    });
    await _persistCart();
  }

  void _openProduct(CartItem item) {
    Navigator.pushNamed(context, '/product_detail', arguments: item.productId);
  }

  void _deleteItem(String id) {
    setState(() => _cartItems.removeWhere((item) => item.id == id));
    _persistCart();
  }

  void _deleteSelected() {
    setState(() => _cartItems.removeWhere((item) => item.selected));
    _persistCart();
  }

  Future<void> _confirmDeleteSelected() async {
    final count = _selectedItems.length;
    if (count == 0) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Remove selected items?'),
        content: Text(count == 1
            ? 'This item will be removed from your cart.'
            : 'These $count items will be removed from your cart.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Keep items'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) _deleteSelected();
  }

  String _fmt(int price) => price.toString().replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m.group(1)},');

  bool get _allSelected =>
      _cartItems.isNotEmpty && _cartItems.every((item) => item.selected);
  List<CartItem> get _selectedItems =>
      _cartItems.where((item) => item.selected).toList();
  int get _totalQty =>
      _selectedItems.fold(0, (sum, item) => sum + item.quantity);
  int get _subtotal =>
      _selectedItems.fold(0, (s, item) => s + item.price * item.quantity);

  // Group items by seller name for display.
  List<MapEntry<String, List<CartItem>>> get _grouped {
    final map = <String, List<CartItem>>{};
    for (final item in _cartItems) {
      map.putIfAbsent(item.seller, () => []).add(item);
    }
    return map.entries.toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            if (_cartItems.isNotEmpty) _buildSelectAllRow(),
            Expanded(
              child: _cartItems.isEmpty
                  ? _buildEmpty()
                  : ListView(
                      padding: const EdgeInsets.only(bottom: 8),
                      children: [
                        for (final entry in _grouped) ...[
                          _buildSellerHeader(entry.key),
                          for (final item in entry.value) _buildCartItem(item),
                          const SizedBox(height: 8),
                        ],
                        // Shipping note
                        const Padding(
                          padding:
                              EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          child: Text(
                            'Shipping fee and final total are calculated at checkout.',
                            style: TextStyle(
                              fontFamily: 'Poppins',
                              fontSize: 11,
                              color: AppColors.textSubtle,
                              height: 1.4,
                            ),
                          ),
                        ),
                      ],
                    ),
            ),
            _buildBottomBar(),
          ],
        ),
      ),
    );
  }

  // ── HEADER ─────────────────────────────────────────────────────────────────
  Widget _buildHeader() {
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      child: Row(
        children: [
          IconButton(
            tooltip: 'Back',
            onPressed: () {
              if (Navigator.of(context).canPop()) {
                Navigator.of(context).pop();
              } else {
                Navigator.pushNamedAndRemoveUntil(
                  context,
                  '/home',
                  (route) => false,
                );
              }
            },
            icon: const Icon(Icons.arrow_back_rounded),
            color: AppColors.primary,
          ),
          const Expanded(
            child: Text(
              'My Cart',
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppColors.wine,
              ),
            ),
          ),
          if (_selectedItems.isNotEmpty)
            Tooltip(
              message: 'Remove selected items',
              child: TextButton(
                onPressed: _confirmDeleteSelected,
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.danger,
                  minimumSize: Size.zero,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.delete_outline, size: 18),
                    SizedBox(width: 4),
                    Flexible(
                      child: Text(
                        'Remove selected',
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontFamily: 'Poppins', fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  // ── SELECT ALL ──────────────────────────────────────────────────────────────
  Widget _buildSelectAllRow() {
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.fromLTRB(8, 2, 16, 4),
      child: Row(
        children: [
          Checkbox(
            value: _allSelected,
            onChanged: (_) => _toggleSelectAll(),
            semanticLabel: 'Select all items',
          ),
          Expanded(
            child: Text(
              'Select all (${_cartItems.length})',
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontFamily: 'Poppins',
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── SELLER GROUP HEADER ─────────────────────────────────────────────────────
  Widget _buildSellerHeader(String seller) {
    return Container(
      color: AppColors.surface,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 6),
      child: Row(
        children: [
          const Icon(Icons.storefront_outlined,
              size: 15, color: AppColors.primary),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              seller,
              style: const TextStyle(
                fontFamily: 'Poppins',
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppColors.darkGray,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  // ── CART ITEM ───────────────────────────────────────────────────────────────
  Widget _buildCartItem(CartItem item) {
    return Dismissible(
      key: Key(item.id),
      direction: DismissDirection.endToStart,
      confirmDismiss: (_) async {
        // Quick swipe-to-delete with undo snackbar.
        return true;
      },
      onDismissed: (_) {
        _deleteItem(item.id);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${item.name} removed from cart.'),
            duration: const Duration(seconds: 3),
            action: SnackBarAction(
              label: 'Undo',
              textColor: AppColors.floralPink,
              onPressed: () async {
                // Re-add the item at the end.
                setState(() => _cartItems.add(item));
                await _persistCart();
              },
            ),
          ),
        );
      },
      background: Container(
        color: AppColors.dangerSoft,
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 18),
        child: const Icon(Icons.delete_outline_rounded,
            color: AppColors.danger, size: 24),
      ),
      child: Material(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.borderNeutral),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Checkbox(
                  value: item.selected,
                  onChanged: (_) => _toggleSelect(item.id),
                  semanticLabel: 'Select ${item.name}',
                ),
              ),
              InkWell(
                onTap: () => _openProduct(item),
                borderRadius: BorderRadius.circular(10),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: SizedBox(
                    width: 72,
                    height: 72,
                    child: item.imagePath.isEmpty
                        ? Container(
                            color: AppColors.softRose,
                            child: const Icon(
                                Icons.image_not_supported_outlined,
                                color: AppColors.borderStrong))
                        : Image(
                            image: item.imagePath.startsWith('http')
                                ? NetworkImage(item.imagePath)
                                : AssetImage(item.imagePath) as ImageProvider,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              color: AppColors.softRose,
                              child: const Icon(
                                  Icons.image_not_supported_outlined,
                                  color: AppColors.borderStrong),
                            ),
                          ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    InkWell(
                      onTap: () => _openProduct(item),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 2),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.name,
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
                            if (item.variantLabel.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(
                                item.variantLabel,
                                style: const TextStyle(
                                  fontFamily: 'Poppins',
                                  fontSize: 11,
                                  color: AppColors.textSubtle,
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                    if (item.availableStock == 0) ...[
                      const SizedBox(height: 4),
                      const Text(
                        'Out of stock',
                        style: TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.danger,
                        ),
                      ),
                    ],
                    const SizedBox(height: 6),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Flexible(
                          child: Text(
                            '₱${_fmt(item.price)}',
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontFamily: 'Poppins',
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        _QuantityStepper(
                          quantity: item.quantity,
                          onEdit: () => _editQuantity(item),
                          onDecrease: item.quantity > 1
                              ? () => _updateQuantity(item.id, -1)
                              : null,
                          onIncrease: item.quantity < item.availableStock
                              ? () => _updateQuantity(item.id, 1)
                              : null,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── BOTTOM BAR ──────────────────────────────────────────────────────────────
  Widget _buildBottomBar() {
    final hasSelection = _selectedItems.isNotEmpty;
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: const Border(top: BorderSide(color: AppColors.borderNeutral)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  hasSelection
                      ? 'Subtotal · $_totalQty item${_totalQty == 1 ? '' : 's'}'
                      : 'Select items to checkout',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 13,
                    color: hasSelection
                        ? AppColors.textSecondary
                        : AppColors.textSubtle,
                  ),
                ),
              ),
              if (hasSelection) ...[
                const SizedBox(width: 8),
                Text(
                  '₱${_fmt(_subtotal)}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: FilledButton(
              onPressed: hasSelection
                  ? () => Navigator.pushNamed(context, '/checkout')
                  : null,
              style: FilledButton.styleFrom(
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
                disabledBackgroundColor: AppColors.borderNeutral,
              ),
              child: Text(
                hasSelection ? 'Checkout ($_totalQty)' : 'No items selected',
                style: TextStyle(
                  fontFamily: 'Poppins',
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: hasSelection ? Colors.white : AppColors.textSubtle,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── EMPTY STATE ─────────────────────────────────────────────────────────────
  Widget _buildEmpty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: const BoxDecoration(
                color: AppColors.softRose,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.shopping_bag_outlined,
                  size: 38, color: AppColors.primary),
            ),
            const SizedBox(height: 18),
            const Text(
              'Your cart is empty',
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.darkGray,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Browse the shop and add items to get started.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: 13,
                color: AppColors.gray,
                height: 1.5,
              ),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: () => Navigator.pushReplacementNamed(context, '/home'),
              icon: const Icon(Icons.storefront_outlined, size: 18),
              label: const Text(
                'Shop now',
                style: TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 14,
                    fontWeight: FontWeight.w700),
              ),
              style: FilledButton.styleFrom(
                minimumSize: const Size(160, 48),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── QUANTITY STEPPER ────────────────────────────────────────────────────────
class _QuantityStepper extends StatelessWidget {
  const _QuantityStepper({
    required this.quantity,
    required this.onEdit,
    required this.onDecrease,
    required this.onIncrease,
  });

  final int quantity;
  final VoidCallback onEdit;
  final VoidCallback? onDecrease;
  final VoidCallback? onIncrease;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _StepBtn(
            icon: Icons.remove_rounded,
            onTap: onDecrease,
            tooltip: 'Decrease quantity'),
        Tooltip(
          message: 'Edit quantity',
          child: InkWell(
            onTap: onEdit,
            borderRadius: BorderRadius.circular(8),
            child: SizedBox(
              width: 32,
              height: 32,
              child: Center(
                child: Text(
                  '$quantity',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.darkGray,
                  ),
                ),
              ),
            ),
          ),
        ),
        _StepBtn(
            icon: Icons.add_rounded,
            onTap: onIncrease,
            tooltip: 'Increase quantity'),
      ],
    );
  }
}

class _EditCartQuantityDialog extends StatefulWidget {
  const _EditCartQuantityDialog({
    required this.initialQuantity,
    required this.maxQuantity,
  });

  final int initialQuantity;
  final int maxQuantity;

  @override
  State<_EditCartQuantityDialog> createState() =>
      _EditCartQuantityDialogState();
}

class _EditCartQuantityDialogState extends State<_EditCartQuantityDialog> {
  late final TextEditingController _controller;
  String? _error;

  @override
  void initState() {
    super.initState();
    _controller =
        TextEditingController(text: widget.initialQuantity.toString());
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    final quantity = int.tryParse(_controller.text.trim());
    if (quantity == null || quantity < 1 || quantity > widget.maxQuantity) {
      setState(() {
        _error = 'Enter a quantity from 1 to ${widget.maxQuantity}.';
      });
      return;
    }
    Navigator.pop(context, quantity);
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Edit quantity'),
      content: TextField(
        controller: _controller,
        autofocus: true,
        keyboardType: TextInputType.number,
        textInputAction: TextInputAction.done,
        onSubmitted: (_) => _submit(),
        decoration: InputDecoration(
          labelText: 'Quantity',
          helperText: 'Available: ${widget.maxQuantity}',
          errorText: _error,
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _submit,
          child: const Text('Update'),
        ),
      ],
    );
  }
}

class _StepBtn extends StatelessWidget {
  const _StepBtn(
      {required this.icon, required this.onTap, required this.tooltip});

  final IconData icon;
  final VoidCallback? onTap;
  final String tooltip;

  @override
  Widget build(BuildContext context) {
    final enabled = onTap != null;
    return Tooltip(
      message: tooltip,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: enabled ? AppColors.softRose : AppColors.borderNeutral,
            shape: BoxShape.circle,
          ),
          child: Icon(
            icon,
            size: 16,
            color: enabled ? AppColors.primary : AppColors.textSubtle,
          ),
        ),
      ),
    );
  }
}
