import 'dart:convert';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../services/api_service.dart';
import '../../services/cart_store.dart';
import '../../utils/colors.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key, this.apiService});

  final ApiService? apiService;

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  ApiService get _api => widget.apiService ?? ApiService.instance;

  List<Map<String, dynamic>> _cartItems = [];
  List<Map<String, dynamic>> _addresses = [];
  int? _addressId;
  final String _paymentMethod = 'cash_on_delivery';
  bool _loading = true;
  bool _submitting = false;
  String? _error;
  String? _checkoutKey;
  String? _voucherCode;
  String? _voucherDiscount;

  @override
  void initState() {
    super.initState();
    _loadCheckout();
  }

  Future<void> _loadCheckout() async {
    if (mounted) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }
    try {
      final cartItems = await CartStore.instance.items();
      final checkoutData = await _api.getCheckoutData();
      final addresses = (checkoutData['addresses'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .toList();
      final selectedAddress =
          addresses.cast<Map<String, dynamic>?>().firstWhere(
                (a) => a?['is_default'] == true,
                orElse: () => addresses.isEmpty ? null : addresses.first,
              );
      final selectedItems =
          cartItems.where((i) => i['selected'] == true).toList();
      final selectedAddressId =
          int.tryParse(selectedAddress?['id']?.toString() ?? '');
      final key = await _getOrCreateCheckoutKey(
          selectedItems, selectedAddressId, _voucherCode);
      if (!mounted) return;
      setState(() {
        _cartItems = selectedItems;
        _addresses = addresses;
        _addressId = selectedAddressId;
        _checkoutKey = key;
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

  String _generateIdempotencyKey() {
    final r = Random.secure();
    String seg(int n) =>
        List.generate(n, (_) => r.nextInt(16).toRadixString(16)).join();
    return '${seg(8)}-${seg(4)}-4${seg(3)}-'
        '${(8 + r.nextInt(4)).toRadixString(16)}${seg(3)}-${seg(12)}';
  }

  Future<String> _getOrCreateCheckoutKey(
      List<Map<String, dynamic>> items, int? addressId, String? voucher) async {
    final prefs = await SharedPreferences.getInstance();
    final normalized = (items
        .map((item) => {
              'product_id': item['product_id'] ?? item['id'],
              'variant_id': item['variant_id'],
              'quantity': item['quantity'],
            })
        .toList()
      ..sort((a, b) => a.toString().compareTo(b.toString())));
    final fingerprint = '$addressId|${jsonEncode(normalized)}|${voucher ?? ''}';
    final existing = prefs.getString('cryma_pending_checkout');
    if (existing != null) {
      try {
        final data = jsonDecode(existing) as Map<String, dynamic>;
        if (data['fingerprint'] == fingerprint && data['key'] is String) {
          return data['key'] as String;
        }
      } catch (_) {}
    }
    final key = _generateIdempotencyKey();
    await prefs.setString('cryma_pending_checkout',
        jsonEncode({'fingerprint': fingerprint, 'key': key}));
    return key;
  }

  Future<void> _refreshCheckoutKey() async {
    final key =
        await _getOrCreateCheckoutKey(_cartItems, _addressId, _voucherCode);
    if (mounted) setState(() => _checkoutKey = key);
  }

  String _addressLabel(Map<String, dynamic> address) {
    return [
      address['label'],
      address['recipient_name'],
      address['phone'],
      address['house_number'],
      address['building_name'],
      address['unit_number'],
      address['street'],
      address['barangay'],
      address['municipality'],
      address['province'],
      address['region'],
      address['postal_code'],
    ].where((p) => p != null && p.toString().trim().isNotEmpty).join(', ');
  }

  String _addressLocation(Map<String, dynamic> address) {
    return [
      address['house_number'],
      address['building_name'],
      address['unit_number'],
      address['street'],
      address['barangay'],
      address['municipality'],
      address['province'],
      address['region'],
      address['postal_code'],
    ]
        .where((part) => part != null && part.toString().trim().isNotEmpty)
        .join(', ');
  }

  Map<String, dynamic>? get _selectedAddress {
    for (final address in _addresses) {
      if (int.tryParse(address['id']?.toString() ?? '') == _addressId) {
        return address;
      }
    }
    return null;
  }

  List<Map<String, dynamic>> _orderItems() => _cartItems.map((item) {
        final value = <String, dynamic>{
          'product_id':
              int.parse((item['product_id'] ?? item['id']).toString()),
          'quantity': item['quantity'] as int? ?? 1,
        };
        if (item['variant_id'] != null) {
          value['variant_id'] = item['variant_id'];
        }
        return value;
      }).toList();

  Future<void> _selectVoucher() async {
    final selected = await Navigator.pushNamed<Map<String, dynamic>>(
      context,
      '/voucher_selection',
      arguments: _orderItems(),
    );
    if (selected == null || !mounted) return;
    setState(() {
      _voucherCode = selected['code']?.toString();
      _voucherDiscount = selected['discount_amount']?.toString();
    });
    await _refreshCheckoutKey();
  }

  Future<void> _placeOrder() async {
    if (_submitting) return;
    if (_addressId == null) {
      _snack('Add a delivery address before checkout.');
      return;
    }
    final validIds = _addresses
        .map((a) => int.tryParse(a['id']?.toString() ?? ''))
        .whereType<int>()
        .toSet();
    if (!validIds.contains(_addressId)) {
      _snack('Choose a valid saved delivery address.');
      return;
    }
    if (_cartItems.isEmpty) {
      _snack('Your cart has no selected items.');
      return;
    }

    // Show a confirmation bottom sheet with the order summary.
    final confirmed = await _showConfirmSheet();
    if (confirmed != true || !mounted) return;

    setState(() => _submitting = true);
    try {
      final selectedAddress = _addresses
          .firstWhere((a) => int.tryParse(a['id'].toString()) == _addressId);
      final result = await _api.createOrder(
        addressId: _addressId!,
        deliveryAddress: _addressLabel(selectedAddress),
        paymentMethod: _paymentMethod,
        items: _orderItems(),
        idempotencyKey: _checkoutKey!,
        voucherCode: _voucherCode,
      );
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('cryma_pending_checkout');
      final existingItems = await CartStore.instance.items();
      await CartStore.instance
          .save(existingItems.where((i) => i['selected'] != true).toList());
      if (!mounted) return;
      Navigator.pushNamedAndRemoveUntil(
        context,
        '/order_success',
        (route) => route.settings.name == '/home',
        arguments: result['data'],
      );
    } on ApiException catch (error) {
      if (mounted) _snack(error.message);
    } catch (error) {
      if (mounted) _snack('Unable to place order: $error');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<bool?> _showConfirmSheet() {
    final subtotal = _effectiveSubtotal;
    final discount = double.tryParse(_voucherDiscount ?? '') ?? 0;
    final total = subtotal - discount;
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(22))),
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.borderStrong,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Confirm your order',
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.wine,
              ),
            ),
            const SizedBox(height: 16),
            _summaryRow('Subtotal', '₱${subtotal.toStringAsFixed(2)}'),
            if (discount > 0)
              _summaryRow(
                  'Voucher discount', '−₱${discount.toStringAsFixed(2)}',
                  valueColor: AppColors.success),
            const Divider(height: 20),
            _summaryRow(
              'Total payable',
              '₱${total.toStringAsFixed(2)}',
              bold: true,
              valueColor: AppColors.primary,
            ),
            const SizedBox(height: 6),
            const Text(
              'Payment: Cash on Delivery',
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: 12,
                color: AppColors.textSubtle,
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: FilledButton(
                onPressed: () => Navigator.pop(context, true),
                style: FilledButton.styleFrom(
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                ),
                child: const Text(
                  'Place order',
                  style: TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: TextButton(
                onPressed: () => Navigator.pop(context, false),
                child: const Text(
                  'Review order',
                  style: TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 14,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _summaryRow(String label, String value,
      {bool bold = false, Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: 14,
                color: AppColors.textSecondary,
                fontWeight: bold ? FontWeight.w700 : FontWeight.normal,
              )),
          Text(value,
              style: TextStyle(
                fontFamily: 'Poppins',
                fontSize: bold ? 16 : 14,
                fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
                color: valueColor ?? AppColors.darkGray,
              )),
        ],
      ),
    );
  }

  double get _effectiveSubtotal => _cartItems.fold<double>(0, (sum, item) {
        final discounted = item['discounted_price'];
        final price = discounted != null
            ? double.tryParse(discounted.toString()) ?? 0
            : double.tryParse(item['price'].toString()) ?? 0;
        return sum + price * (item['quantity'] as int? ?? 1);
      });

  void _snack(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text('Checkout'),
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
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.wifi_off_rounded,
                            size: 42, color: AppColors.danger),
                        const SizedBox(height: 12),
                        Text(_error!,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                                color: AppColors.textSecondary,
                                fontFamily: 'Poppins')),
                        const SizedBox(height: 14),
                        FilledButton(
                            onPressed: _loadCheckout,
                            child: const Text('Retry')),
                      ],
                    ),
                  ),
                )
              : _addresses.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(28),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.location_on_outlined,
                                size: 48, color: AppColors.primary),
                            const SizedBox(height: 12),
                            const Text(
                              'No delivery address',
                              style: TextStyle(
                                fontFamily: 'Poppins',
                                fontSize: 17,
                                fontWeight: FontWeight.w700,
                                color: AppColors.darkGray,
                              ),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'Add an address to continue checkout.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                  fontFamily: 'Poppins',
                                  color: AppColors.gray,
                                  height: 1.4),
                            ),
                            const SizedBox(height: 20),
                            FilledButton.icon(
                              icon: const Icon(Icons.add),
                              label: const Text('Add address'),
                              onPressed: () async {
                                final saved = await Navigator.pushNamed<bool>(
                                    context, '/add_address');
                                if (saved == true && mounted) _loadCheckout();
                              },
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView(
                      padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                      children: [
                        // ── VOUCHER ──────────────────────────────────
                        _buildSection(
                          icon: Icons.local_offer_outlined,
                          title: 'Voucher',
                          child: _voucherCode == null
                              ? OutlinedButton.icon(
                                  onPressed: _submitting || _cartItems.isEmpty
                                      ? null
                                      : _selectVoucher,
                                  icon: const Icon(Icons.local_offer_outlined,
                                      size: 17),
                                  label: const Text('Select a voucher'),
                                  style: OutlinedButton.styleFrom(
                                      minimumSize:
                                          const Size(double.infinity, 44)),
                                )
                              : Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: AppColors.successSoft,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                        color: AppColors.success
                                            .withValues(alpha: 0.3)),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.check_circle_outline,
                                          color: AppColors.success, size: 18),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              _voucherCode!,
                                              style: const TextStyle(
                                                fontFamily: 'Poppins',
                                                fontSize: 13,
                                                fontWeight: FontWeight.w700,
                                                color: AppColors.success,
                                              ),
                                            ),
                                            Text(
                                              'Discount: −₱${_voucherDiscount ?? '0.00'} (server-confirmed)',
                                              style: const TextStyle(
                                                fontFamily: 'Poppins',
                                                fontSize: 11,
                                                color: AppColors.textSecondary,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      TextButton(
                                        onPressed:
                                            _submitting ? null : _selectVoucher,
                                        child: const Text('Change'),
                                      ),
                                      TextButton(
                                        onPressed: _submitting
                                            ? null
                                            : () async {
                                                setState(() {
                                                  _voucherCode = null;
                                                  _voucherDiscount = null;
                                                });
                                                await _refreshCheckoutKey();
                                              },
                                        child: const Text('Remove'),
                                      ),
                                    ],
                                  ),
                                ),
                        ),
                        const SizedBox(height: 12),

                        // ── DELIVERY ADDRESS ─────────────────────────
                        _buildSection(
                          icon: Icons.location_on_outlined,
                          title: 'Delivery address',
                          child: Column(
                            children: [
                              DropdownButtonFormField<int>(
                                initialValue: _addressId,
                                isExpanded: true,
                                decoration: const InputDecoration(
                                  border: OutlineInputBorder(),
                                  contentPadding: EdgeInsets.symmetric(
                                      horizontal: 12, vertical: 12),
                                ),
                                items: _addresses.map((address) {
                                  final id =
                                      int.parse(address['id'].toString());
                                  final lbl = address['label']
                                          ?.toString()
                                          .toUpperCase() ??
                                      '';
                                  return DropdownMenuItem(
                                    value: id,
                                    child: Text(
                                      lbl.isNotEmpty
                                          ? '$lbl · ${address['recipient_name'] ?? ''}'
                                          : _addressLabel(address),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                          fontFamily: 'Poppins', fontSize: 13),
                                    ),
                                  );
                                }).toList(),
                                onChanged: (val) async {
                                  setState(() => _addressId = val);
                                  await _refreshCheckoutKey();
                                },
                              ),
                              if (_selectedAddress case final address?) ...[
                                const SizedBox(height: 10),
                                _selectedAddressCard(address),
                              ],
                              const SizedBox(height: 8),
                              Align(
                                alignment: Alignment.centerLeft,
                                child: TextButton.icon(
                                  onPressed: () async {
                                    final saved =
                                        await Navigator.pushNamed<bool>(
                                            context, '/add_address');
                                    if (saved == true && mounted) {
                                      await _loadCheckout();
                                    }
                                  },
                                  icon: const Icon(Icons.add, size: 16),
                                  label: const Text('Add new address',
                                      style: TextStyle(
                                          fontFamily: 'Poppins', fontSize: 13)),
                                  style: TextButton.styleFrom(
                                    minimumSize: Size.zero,
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 4),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),

                        // ── PAYMENT ──────────────────────────────────
                        _buildSection(
                          icon: Icons.payments_outlined,
                          title: 'Payment method',
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 12),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(10),
                              border:
                                  Border.all(color: AppColors.borderNeutral),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.payments_outlined,
                                    color: AppColors.primary, size: 20),
                                SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    'Cash on Delivery',
                                    style: TextStyle(
                                      fontFamily: 'Poppins',
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.darkGray,
                                    ),
                                  ),
                                ),
                                Icon(Icons.check_circle_rounded,
                                    color: AppColors.success, size: 18),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),

                        // ── ORDER ITEMS ──────────────────────────────
                        _buildSection(
                          icon: Icons.shopping_bag_outlined,
                          title: 'Items (${_cartItems.length})',
                          child: Column(
                            children: [
                              for (final item in _cartItems)
                                _buildOrderItem(item),
                              const Divider(height: 16),
                              // Subtotal line
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text(
                                    'Subtotal',
                                    style: TextStyle(
                                      fontFamily: 'Poppins',
                                      fontSize: 14,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                  Text(
                                    '₱${_effectiveSubtotal.toStringAsFixed(2)}',
                                    style: const TextStyle(
                                      fontFamily: 'Poppins',
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.darkGray,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              const Text(
                                'Shipping fee and final total are confirmed by the server when you place your order.',
                                style: TextStyle(
                                  fontFamily: 'Poppins',
                                  fontSize: 11,
                                  color: AppColors.textSubtle,
                                  height: 1.4,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
      bottomNavigationBar: _loading || _error != null || _addresses.isEmpty
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(18, 12, 16, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Items subtotal',
                            style: TextStyle(
                              fontFamily: 'Poppins',
                              fontSize: 11,
                              color: AppColors.textSubtle,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '₱${_effectiveSubtotal.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontFamily: 'Poppins',
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 14),
                    SizedBox(
                      height: 50,
                      width: 164,
                      child: FilledButton(
                        onPressed: _submitting ? null : _placeOrder,
                        style: FilledButton.styleFrom(
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14)),
                        ),
                        child: _submitting
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2, color: Colors.white))
                            : const Text(
                                'Place Order',
                                style: TextStyle(
                                  fontFamily: 'Poppins',
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildSection({
    required IconData icon,
    required String title,
    required Widget child,
  }) {
    return Container(
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
            children: [
              Icon(icon, size: 16, color: AppColors.primary),
              const SizedBox(width: 7),
              Text(
                title,
                style: const TextStyle(
                  fontFamily: 'Poppins',
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: AppColors.darkGray,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }

  Widget _selectedAddressCard(Map<String, dynamic> address) {
    final label = address['label']?.toString().trim() ?? '';
    final recipient = address['recipient_name']?.toString().trim() ?? '';
    final phone = address['phone']?.toString().trim() ?? '';
    final location = _addressLocation(address);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.lightGray),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.location_on_outlined,
              color: AppColors.primary, size: 19),
          const SizedBox(width: 9),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 7,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    if (label.isNotEmpty)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppColors.softRose,
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: Text(
                          label.toUpperCase(),
                          style: const TextStyle(
                            fontFamily: 'Poppins',
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    if (recipient.isNotEmpty)
                      Text(
                        recipient,
                        style: const TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppColors.darkGray,
                        ),
                      ),
                    if (phone.isNotEmpty)
                      Text(
                        phone,
                        style: const TextStyle(
                          fontFamily: 'Poppins',
                          fontSize: 11,
                          color: AppColors.textSecondary,
                        ),
                      ),
                  ],
                ),
                if (location.isNotEmpty) ...[
                  const SizedBox(height: 5),
                  Text(
                    location,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontFamily: 'Poppins',
                      fontSize: 11,
                      height: 1.35,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderItem(Map<String, dynamic> item) {
    final name = item['name']?.toString() ?? 'Product';
    final qty = item['quantity'] as int? ?? 1;
    final discounted = item['discounted_price'];
    final price = discounted != null
        ? double.tryParse(discounted.toString()) ?? 0
        : double.tryParse(item['price'].toString()) ?? 0;
    final image = item['image']?.toString() ?? '';
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: SizedBox(
              width: 48,
              height: 48,
              child: image.isEmpty
                  ? Container(
                      color: AppColors.softRose,
                      child: const Icon(Icons.image_not_supported_outlined,
                          size: 20, color: AppColors.borderStrong))
                  : Image(
                      image: image.startsWith('http')
                          ? NetworkImage(image)
                          : AssetImage(image) as ImageProvider,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                          color: AppColors.softRose,
                          child: const Icon(Icons.image_not_supported_outlined,
                              size: 20, color: AppColors.borderStrong)),
                    ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              name,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontFamily: 'Poppins',
                fontSize: 13,
                color: AppColors.darkGray,
                height: 1.3,
              ),
            ),
          ),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '×$qty',
                style: const TextStyle(
                    fontFamily: 'Poppins',
                    fontSize: 11,
                    color: AppColors.textSubtle),
              ),
              Text(
                '₱${(price * qty).toStringAsFixed(2)}',
                style: const TextStyle(
                  fontFamily: 'Poppins',
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
