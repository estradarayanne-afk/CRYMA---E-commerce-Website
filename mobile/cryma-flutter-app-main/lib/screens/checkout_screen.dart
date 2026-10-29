import 'dart:math';

import 'package:flutter/material.dart';

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
  String _paymentMethod = 'cash_on_delivery';
  bool _loading = true;
  bool _submitting = false;
  String? _error;
  String? _checkoutKey;

  @override
  void initState() {
    super.initState();
    _checkoutKey = _idempotencyKey();
    _loadCheckout();
  }

  Future<void> _loadCheckout() async {
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
      if (!mounted) return;
      setState(() {
        _cartItems =
            cartItems.where((item) => item['selected'] == true).toList();
        _addresses = addresses;
        _addressId = int.tryParse(selectedAddress?['id']?.toString() ?? '');
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
    if (_cartItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Your cart has no selected items.')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      final items = _cartItems.map((item) {
        final value = <String, dynamic>{
          'product_id': int.parse(
            (item['product_id'] ?? item['id']).toString(),
          ),
          'quantity': item['quantity'] as int? ?? 1,
        };
        if (item['variant_id'] != null) {
          value['variant_id'] = item['variant_id'];
        }
        return value;
      }).toList();
      final selectedAddress = _addresses.firstWhere(
        (address) => int.tryParse(address['id'].toString()) == _addressId,
      );
      final result = await ApiService.instance.createOrder(
        addressId: _addressId!,
        deliveryAddress: _addressLabel(selectedAddress),
        paymentMethod: _paymentMethod,
        items: items,
        idempotencyKey: _checkoutKey!,
      );
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
      backgroundColor: const Color(0xFFF5F5F5),
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
                            onPressed: () =>
                                Navigator.pushNamed(context, '/add_address'),
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
                                  onChanged: (value) =>
                                      setState(() => _addressId = value),
                                ),
                              ],
                            ),
                          ),
                        ),
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(8),
                            child: RadioGroup<String>(
                              groupValue: _paymentMethod,
                              onChanged: (value) {
                                if (value != null) {
                                  setState(() => _paymentMethod = value);
                                }
                              },
                              child: const Column(
                                children: [
                                  RadioListTile<String>(
                                    value: 'cash_on_delivery',
                                    title: Text('Cash on Delivery'),
                                  ),
                                  RadioListTile<String>(
                                    value: 'gcash',
                                    title: Text('GCash'),
                                  ),
                                ],
                              ),
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
