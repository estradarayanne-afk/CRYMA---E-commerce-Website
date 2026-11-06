import 'dart:convert';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/api_service.dart';
import '../services/cart_store.dart';
import '../utils/colors.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
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
      final checkoutData = await ApiService.instance.getCheckoutData();
      final addresses = (checkoutData['addresses'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .toList();
      final selectedAddress =
          addresses.cast<Map<String, dynamic>?>().firstWhere(
                (address) => address?['is_default'] == true,
                orElse: () => addresses.isEmpty ? null : addresses.first,
              );
      final selectedItems = cartItems.where((item) => item['selected'] == true).toList();
      final selectedAddressId = int.tryParse(selectedAddress?['id']?.toString() ?? '');
      final key = await _getOrCreateCheckoutKey(selectedItems, selectedAddressId, _voucherCode);
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

  String _idempotencyKey() {
    final random = Random.secure();
    String segment(int length) => List.generate(
          length,
          (_) => random.nextInt(16).toRadixString(16),
        ).join();
    return '${segment(8)}-${segment(4)}-4${segment(3)}-'
        '${(8 + random.nextInt(4)).toRadixString(16)}${segment(3)}-'
        '${segment(12)}';
  }

  Future<String> _getOrCreateCheckoutKey(List<Map<String, dynamic>> items, int? addressId, String? voucher) async {
    final prefs = await SharedPreferences.getInstance();
    final normalized = items.map((item) => {
      'product_id': item['product_id'] ?? item['id'],
      'variant_id': item['variant_id'],
      'quantity': item['quantity'],
    }).toList()..sort((a, b) => a.toString().compareTo(b.toString()));
    final fingerprint = '$addressId|${jsonEncode(normalized)}|${voucher ?? ''}';
    final existing = prefs.getString('cryma_pending_checkout');
    if (existing != null) {
      try {
        final data = jsonDecode(existing) as Map<String, dynamic>;
        if (data['fingerprint'] == fingerprint && data['key'] is String) return data['key'] as String;
      } catch (_) {}
    }
    final key = _idempotencyKey();
    await prefs.setString('cryma_pending_checkout', jsonEncode({'fingerprint': fingerprint, 'key': key}));
    return key;
  }

  Future<void> _refreshCheckoutKey() async {
    final key = await _getOrCreateCheckoutKey(_cartItems, _addressId, _voucherCode);
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
    ]
        .where((part) => part != null && part.toString().trim().isNotEmpty)
        .join(', ');
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
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Add a delivery address before checkout.'),
        ),
      );
      return;
    }
    final availableAddressIds = _addresses
        .map((address) => int.tryParse(address['id']?.toString() ?? ''))
        .whereType<int>()
        .toSet();
    if (!availableAddressIds.contains(_addressId)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Choose a valid saved delivery address.')),
      );
      return;
    }
    if (_cartItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Your cart has no selected items.')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final items = _orderItems();
      final selectedAddress = _addresses.firstWhere(
        (address) => int.tryParse(address['id'].toString()) == _addressId,
      );
      final result = await ApiService.instance.createOrder(
        addressId: _addressId!,
        deliveryAddress: _addressLabel(selectedAddress),
        paymentMethod: _paymentMethod,
        items: items,
        idempotencyKey: _checkoutKey!,
        voucherCode: _voucherCode,
      );
      final preferences = await SharedPreferences.getInstance();
      await preferences.remove('cryma_pending_checkout');
      final existingItems = await CartStore.instance.items();
      await CartStore.instance.save(
        existingItems.where((item) => item['selected'] != true).toList(),
      );
      if (!mounted) return;
      Navigator.pushNamedAndRemoveUntil(
        context,
        '/order_success',
        (route) => route.settings.name == '/home',
        arguments: result['data'],
      );
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Unable to place order: $error')),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final subtotal = _cartItems.fold<double>(
      0,
      (sum, item) =>
          sum +
          ((double.tryParse(item['price'].toString()) ?? 0) *
              (item['quantity'] as int? ?? 1)),
    );
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Checkout'),
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
                          onPressed: _loadCheckout,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                )
              : _addresses.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Text('Add a delivery address to continue.'),
                          const SizedBox(height: 12),
                          ElevatedButton(
                            onPressed: () async {
                              final saved = await Navigator.pushNamed<bool>(
                                context,
                                '/add_address',
                              );
                              if (saved == true && mounted) {
                                await _loadCheckout();
                              }
                            },
                            child: const Text('Add Address'),
                          ),
                        ],
                      ),
                    )
                  : ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Voucher',
                                    style:
                                        TextStyle(fontWeight: FontWeight.bold)),
                                const SizedBox(height: 8),
                                if (_voucherCode == null)
                                  OutlinedButton.icon(
                                    onPressed: _submitting || _cartItems.isEmpty
                                        ? null
                                        : _selectVoucher,
                                    icon:
                                        const Icon(Icons.local_offer_outlined),
                                    label: const Text('Select a voucher'),
                                  )
                                else ...[
                                  Text(
                                      '$_voucherCode · server-validated discount ₱${_voucherDiscount ?? '0.00'}'),
                                  Row(children: [
                                    TextButton(
                                        onPressed:
                                            _submitting ? null : _selectVoucher,
                                        child: const Text('Change')),
                                    TextButton(
                                        onPressed: _submitting ? null : () async {
                                          setState(() { _voucherCode = null; _voucherDiscount = null; });
                                          await _refreshCheckoutKey();
                                        },
                                        child: const Text('Remove')),
                                  ]),
                                ],
                                const Text(
                                    'The server revalidates voucher eligibility and the final discount when you place the order.',
                                    style: TextStyle(
                                        fontSize: 12, color: Colors.black54)),
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
                                  'Delivery Address',
                                  style: TextStyle(fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 8),
                                DropdownButtonFormField<int>(
                                  initialValue: _addressId,
                                  isExpanded: true,
                                  items: _addresses.map((address) {
                                    final id =
                                        int.parse(address['id'].toString());
                                    final label = address['label']?.toString();
                                    return DropdownMenuItem(
                                      value: id,
                                      child: Text(
                                        '${label == null ? '' : '$label: '}${_addressLabel(address)}',
                                        maxLines: 3,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    );
                                  }).toList(),
                                  onChanged: (value) async {
                                    setState(() => _addressId = value);
                                    await _refreshCheckoutKey();
                                  },
                                ),
                              ],
                            ),
                          ),
                        ),
                        const Card(
                          child: ListTile(
                            leading: Icon(Icons.payments_outlined),
                            title: Text('Cash on Delivery'),
                            subtitle: Text('Pay when your order is delivered.'),
                            trailing: Icon(Icons.check_circle,
                                color: AppColors.success),
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
                                for (final item in _cartItems)
                                  ListTile(
                                    contentPadding: EdgeInsets.zero,
                                    title: Text(item['name'].toString()),
                                    subtitle:
                                        Text('Quantity: ${item['quantity']}'),
                                    trailing: Text(
                                      '₱${((double.tryParse(item['price'].toString()) ?? 0) * (item['quantity'] as int? ?? 1)).toStringAsFixed(2)}',
                                    ),
                                  ),
                                const Divider(),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text('Subtotal'),
                                    Text('₱${subtotal.toStringAsFixed(2)}'),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                const Text(
                                  'Shipping and final totals are calculated by the server.',
                                  style: TextStyle(
                                      fontSize: 12, color: Colors.black54),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
      bottomNavigationBar: _loading || _error != null || _addresses.isEmpty
          ? null
          : SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: SizedBox(
                  height: 50,
                  child: ElevatedButton(
                    onPressed: _submitting ? null : _placeOrder,
                    child: _submitting
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text('Place Order'),
                  ),
                ),
              ),
            ),
    );
  }
}
